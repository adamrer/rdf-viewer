import N3, { Quad } from 'n3'
import { QueryBuilder, Query, simpleBuilder } from "./query-builder";
import { SimpleQueryStepBuilder, simpleQueryStepBuilder } from './simple-query-step-builder';
import { Readable } from 'readable-stream';
import { rdfParser } from 'rdf-parse';
import { queryProcessor } from './query-processor';
/**
 * Interface for a data source from which it is possible to fetch RDF quads.
 */
interface DataSource {
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
interface DataSourceFetchResult{
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
class SparqlDataSource implements DataSource {
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
        
        const queryUrl = `${this.endpointUrl}?query=${encodeURIComponent(query.toSparql())}`;
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


class FileDataSource implements DataSource {
    quads?: Quad[]
    file?: File;
    url?: string
    fileLoaded: boolean = false
    
    constructor(fileOrUrl: File|string){
        if (fileOrUrl instanceof File){
            this.file = fileOrUrl
        }
        else {
            this.url = fileOrUrl
        }
    }

    async fetchFile(url: string): Promise<File> {
        const response = await fetch(url)
        const blob = await response.blob()
        return new File([blob], url)
    }

    async loadQuads(): Promise<void> {
        if (this.fileLoaded){
            return
        }
        if (this.url){
            this.file = await this.fetchFile(this.url)
        }
        if (!this.file){
            throw Error('File is missing')
        }
        const fileText = await this.file.text()
        const stream = Readable.from([fileText])
        this.quads = []
        return new Promise<void>((resolve, reject) => {
            if (!this.file) {
                const err = new Error("File is missing")
                reject(err)
                throw err
            }
            rdfParser
                .parse(stream, { path: this.file.name })
                .on('data', (quad) => {
                    this.quads?.push(quad)
                })
                .on('error', (err) => {
                    console.error('Error while parsing file', err);
                    reject(err);
                })
                .on('end', async () => {
                    this.fileLoaded = true
                    resolve()
                });
        });
    }


    async fetchQuads(query: Query): Promise<DataSourceFetchResult> {
        await this.loadQuads()
        if (!this.quads){
            throw new Error('Failed to load quads from file')
        }
        const processor = queryProcessor()
        const filteredQuads:Quad[] = processor.filter(this.quads, query)
        return {identifier: this.file!.name, quads: filteredQuads}
    }
}

type BuilderType = 'simple'|'step'
/**
 * Interface for fetching quads from multiple data sources 
 * 
 * @see DataSource
 */
interface QuadsFetcher {
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
    builder(type: BuilderType): QueryBuilder|SimpleQueryStepBuilder
}

/**
 * Class implementing the QuadsFetcher interface.
 * 
 * @see QuadsFetcher
 */
class Fetcher implements QuadsFetcher {
    dataSources: Array<DataSource>

    constructor(dataSources: Array<DataSource>){
        this.dataSources = dataSources
    }

    async fetchQuads(query: Query): Promise<(DataSourceFetchResult)[]> {
        const promises = this.dataSources.map(ds => ds.fetchQuads(query))
        return Promise.all(promises)
    }
    
    builder(type: BuilderType = 'simple') : QueryBuilder|SimpleQueryStepBuilder {
        switch (type) {
            case 'simple':
                return simpleBuilder()
            case 'step':
                return simpleQueryStepBuilder()
        }
    }
}



export type {
    DataSource,
    DataSourceFetchResult,
    QuadsFetcher
}

export {
    SparqlDataSource,
    FileDataSource,
    Fetcher
}