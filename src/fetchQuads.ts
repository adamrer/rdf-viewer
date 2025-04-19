import N3, { StreamParser, Quad } from "n3";
import { QueryBuilder, Query, SimpleQueryBuilder, simpleBuilder } from "./queryBuilder";


export interface DataSource {
    fetchQuads(query: Query): Promise<DataSourceFetchResult | null>
}

export interface DataSourceFetchResult{
    dataSourceTitle: string

    quads: Array<N3.Quad>
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

    async fetchQuads(query: Query): Promise<DataSourceFetchResult | null> {

        const queryUrl = `${this.endpointUrl}?query=${encodeURIComponent(query.str())}`;
        
        try {
            const response = await fetch(queryUrl, {
                headers: {
                    'Accept': 'application/sparql-results+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const json = await response.json();
            const jsonQuads = json.results.bindings;

            const quads = jsonQuads.map((
                quad: ResultQuad) => {
                    const graph = quad.graph !== undefined ? N3.DataFactory.namedNode(quad.graph?.value) : undefined
                    const predicate = N3.DataFactory.namedNode(quad.predicate.value)
                    
                    const object = quad.object.type === 'literal' ? N3.DataFactory.literal(quad.object.value, (quad.object as ResultLiteral)["xml:lang"]) : 
                    quad.object.type === 'blankNode' ? N3.DataFactory.blankNode(quad.object.value) : N3.DataFactory.namedNode(quad.object.value)
                    
                    return N3.DataFactory.quad(N3.DataFactory.namedNode(quad.subject.value), predicate, object, graph)
            }
            )
            return { dataSourceTitle: this.endpointUrl.toString(), 
                quads: quads}
        } catch (error : any) {
            console.error('Error fetching data:', error);
            document.getElementById('results')!.innerHTML = `<div>Error fetching data: ${error!.message}</div>`;
            return null;
        }
    }
}


export class FileDataSource implements DataSource {
    file: File;

    constructor(file: File){
        this.file = file
    }

    async fetchQuads(query: Query): Promise<DataSourceFetchResult | null> { // TODO: query quads store
        // const reader = new FileReader();
        // reader.onerror = () => {
        //     console.error("Error reading file:", reader.error);
        // };
        
        // const quads : Array<N3.Quad> = [];
    
        // const parser = new N3.Parser();
        // parser.parse(await this.file.text(), 
        //     (error, quad) => {
        //         if (quad){
        //             if (entityIri === null || (predicates === null && entityIri === quad.subject.value) 
        //                 || (predicates !== null && entityIri === quad.subject.value && predicates.includes(quad.predicate.value))){
        //                 quads.push(quad);
        //             }
        //         } 
        //         if (error){
        //             console.log(error.message);
        //         }
        //     }
        // );
    
        return {dataSourceTitle: this.file.name, quads: []};
    }
}




export interface QuadsFetcher {
    dataSources: Array<DataSource>
    fetchQuads(query: Query): Promise<(DataSourceFetchResult | null)[]>
    builder(): QueryBuilder
}

export class SimpleFetcher implements QuadsFetcher {
    dataSources: Array<DataSource>

    constructor(dataSources: Array<DataSource>){
        this.dataSources = dataSources
    }

    async fetchQuads(query: Query): Promise<(DataSourceFetchResult | null)[]> {
        const promises = this.dataSources.map(ds => ds.fetchQuads(query))
        return Promise.all(promises)
    }
    
    builder() : SimpleQueryBuilder{
        return simpleBuilder()
    }



}


