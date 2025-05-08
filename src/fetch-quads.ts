import N3 from 'n3'
import { Quad } from 'n3'
import { QueryBuilder, Query, SimpleQueryBuilder, simpleBuilder } from "./query-builder";
import { Quadstore } from 'quadstore';
import { MemoryLevel } from 'memory-level';
import { AbstractLevel } from 'abstract-level'
import { Engine } from 'quadstore-comunica'

/**
 * Interface for a data source from which it is possible to fetch RDF quads.
 */
export interface DataSource {
    /**
     * Fetches RDF quads from data source corresponding to the query. 
     * 
     * @param query - Query which specifies the desired quads to fetch.
     * @returns DataSourceFetchResult Promise which contains the quads.
     * @see DataSourceFetchResult
     */
    fetchQuads(query: Query): Promise<DataSourceFetchResult>
}

/**
 * Interface for the result of fetching quads from a data source.
 */
export interface DataSourceFetchResult{
    /** Unique identifier of the data source from which the result origins. */
    identifier: string
    /** Array of quads obtained from the data source. */
    quads: Array<Quad>
}

/** SPARQL JSON result RDF term types */
type ResultType = "uri" | "literal" | "bnode"


/**
 * Interface for a node, which can be a named node, literal or blank node, from JSON SPARQL result.
 * 
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/#select-encode-terms
 */
interface ResultTerm {
    /** Type of the node */
    type: ResultType; 
    /** Value of the node */
    value: string; 
    /** If the node is of a type literal, this represents a language tag */
    "xml:lang"?: string;
    /** If the node is of a type literal, this represents the type of the literal */
    datatype?: string;
}

/**
 * Interface for a quad obtained from JSON SPARQL result.
 */
interface ResultQuad {
    /** Term representing the graph of the quad */
    graph: ResultTerm;
    /** Term representing the subject of the quad */
    subject: ResultTerm;
    /** Term representing the predicate of the quad */
    predicate: ResultTerm; 
    /** Term representing the object of the quad */
    object: ResultTerm; 
}

/**
 * Class for fetching RDF quads from SPARQL endpoint.
 * 
 * @see DataSource
 */
export class SparqlDataSource implements DataSource {
    endpointUrl: URL;

    constructor(endpointUrl: URL){
        this.endpointUrl = endpointUrl
    }

    /**
     * 
     * @param jsonQuads - Result JSON of the queried quads
     * @returns Array of parsed quads
     */
    parseJsonQuads(jsonQuads: any): Quad[]{
        return jsonQuads.map((quad: ResultQuad) => {
                const graph = quad.graph !== undefined ? N3.DataFactory.namedNode(quad.graph?.value) : undefined
                const predicate = N3.DataFactory.namedNode(quad.predicate.value)
                
                const object = quad.object.type === 'literal' ? N3.DataFactory.literal(quad.object.value, (quad.object as ResultTerm)["xml:lang"]) : 
                quad.object.type === 'bnode' ? N3.DataFactory.blankNode(quad.object.value) : N3.DataFactory.namedNode(quad.object.value)
                
                return N3.DataFactory.quad(N3.DataFactory.namedNode(quad.subject.value), predicate, object, graph)
            })
    }

    async fetchQuads(query: Query): Promise<DataSourceFetchResult> {
        
        const queryUrl = `${this.endpointUrl}?query=${encodeURIComponent(query.str())}`;
        return new Promise((resolve, reject) =>{
            fetch(queryUrl, {
                headers: {
                    'Accept': 'application/sparql-results+json'
                }
            })
            .then((response) => response.json())
            .then((jsonResponse) => {
                const jsonQuads = jsonResponse.results.bindings;

                const quads = this.parseJsonQuads(jsonQuads)
                const result: DataSourceFetchResult = { identifier: this.endpointUrl.toString(), quads: quads}
                resolve(result)
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
                document.getElementById('results')!.innerHTML = `<div>Error fetching data: ${error!.message}</div>`;
                reject(error);
            })
        })
    }
}

/**
 * Class for fetching RDF quads from an RDF file.
 * 
 * @see DataSource
 */
export class FileDataSource implements DataSource {
    file: File;

    constructor(file: File){
        this.file = file
    }

    async fetchQuads(query: Query): Promise<DataSourceFetchResult> { 
        
        const backend = new MemoryLevel() as AbstractLevel<string, string>
        const dataFactory = N3.DataFactory
        const store = new Quadstore({backend, dataFactory})
        const engine = new Engine(store)

        await store.open()
        const reader = new FileReader();
        reader.onerror = () => {
            console.error("Error reading file: ", reader.error);
            throw reader.error
        };
        
        const parser = new N3.Parser();
        const fileText = await this.file.text();
        parser.parse(fileText, (err, quad) => {
          if (err) {
            console.error("Error parsing file: ", err);
            throw err
        }
          else if (quad) store.put(quad);
        });

        const bindingsStream = await engine.queryBindings(query.str())
        return new Promise<DataSourceFetchResult>((resolve, reject) =>{
            const quads: Quad[] = []
            bindingsStream.on('data', binding => {
                const entries = binding.entries
                const graph = entries.get('graph') !== undefined ? N3.DataFactory.namedNode(entries.get('graph')?.value) : undefined
                const quad = N3.DataFactory.quad(entries.get('subject'), entries.get('predicate'), entries.get('object'), graph)
                quads.push(quad)
    
            })
            .on('error', error => {
                console.error(`Error getting result from ${this.file.name} source: `, error)
                reject(error)
            })
            .on('end', () => {
                const result = {identifier: this.file.name, quads: quads}
                resolve(result)
            })
        })
    }
}



/**
 * Interface for fetching quads from multiple data sources 
 * 
 * @see DataSource
 */
export interface QuadsFetcher {
    /** Array of data sources to fetch from */
    dataSources: Array<DataSource>
    /**
     * Fetches RDF quads from all of the specified data sources
     * 
     * @param query - Query which specifies the desired quads to fetch.
     */
    fetchQuads(query: Query): Promise<(DataSourceFetchResult)[]>

    /**
     * @returns a query builder for creating the query
     */
    builder(): QueryBuilder
}

/**
 * Class implementing the QuadsFetcher interface.
 * 
 * @see QuadsFetcher
 */
export class Fetcher implements QuadsFetcher {
    dataSources: Array<DataSource>

    constructor(dataSources: Array<DataSource>){
        this.dataSources = dataSources
    }

    async fetchQuads(query: Query): Promise<(DataSourceFetchResult)[]> {
        const promises = this.dataSources.map(ds => ds.fetchQuads(query))
        return Promise.all(promises)
    }
    
    builder() : SimpleQueryBuilder{
        return simpleBuilder()
    }
}


