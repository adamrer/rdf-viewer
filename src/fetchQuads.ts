import N3 from 'n3'
import { Quad } from 'n3'
import { QueryBuilder, Query, SimpleQueryBuilder, simpleBuilder } from "./queryBuilder";
import { Quadstore } from 'quadstore';
import { MemoryLevel } from 'memory-level';
import { AbstractLevel } from 'abstract-level'
import { Engine } from 'quadstore-comunica'


export interface DataSource {
    fetchQuads(query: Query): Promise<DataSourceFetchResult>
}

export interface DataSourceFetchResult{
    dataSourceTitle: string

    quads: Array<Quad>
}


interface ResultNamedNode {
    type: string; 
    value: string;
}

interface ResultLiteral {
    type: string; 
    value: string; 
    "xml:lang"?: string;
}

interface ResultQuad{
    graph: ResultNamedNode
    subject: ResultNamedNode
    predicate: ResultNamedNode; 
    object: ResultLiteral|ResultNamedNode; 
}
export class SparqlDataSource implements DataSource {
    endpointUrl: URL;

    constructor(endpointUrl: URL){
        this.endpointUrl = endpointUrl
    }

    parseJsonQuads(jsonQuads: any): Quad[]{
        return jsonQuads.map((quad: ResultQuad) => {
                const graph = quad.graph !== undefined ? N3.DataFactory.namedNode(quad.graph?.value) : undefined
                const predicate = N3.DataFactory.namedNode(quad.predicate.value)
                
                const object = quad.object.type === 'literal' ? N3.DataFactory.literal(quad.object.value, (quad.object as ResultLiteral)["xml:lang"]) : 
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
                const result: DataSourceFetchResult = { dataSourceTitle: this.endpointUrl.toString(), quads: quads}
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
                const result = {dataSourceTitle: this.file.name, quads: quads}
                resolve(result)
            })
        })
    }
}




export interface QuadsFetcher {
    dataSources: Array<DataSource>
    fetchQuads(query: Query): Promise<(DataSourceFetchResult)[]>
    builder(): QueryBuilder
}

export class SimpleFetcher implements QuadsFetcher {
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


