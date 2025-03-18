import N3 from "n3";

const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables


export interface DataSource {
    endpointUrl?: URL
    file?: File
    fetchQuads(entityIri: string, predicates: Array<string>|null): Promise<FetchedQuads | null>
}

export interface FetchedQuads{
    dataSourceTitle: string

    quads: Array<N3.Quad>
}

export class SparqlDataSource implements DataSource {
    endpointUrl: URL;

    constructor(endpointUrl: URL){
        this.endpointUrl = endpointUrl
    }

    async fetchQuads(entityIri: string, predicates: Array<string>|null = null): Promise<FetchedQuads | null> {
        const decoded_target = decodeURIComponent(entityIri)
        let whereClause = `<${decoded_target}> ?predicate ?object .`
        
        if (predicates){
            whereClause = ''
            predicates.forEach(predicate => {
                whereClause+=`<${decoded_target}> <${predicate}> ?object . \n`
            });
        }
        
        const query: string = 
        predicates === null ? 
        `
        SELECT ?predicate ?object
        WHERE {
            ${whereClause}
        }
        ` : 
        `
        SELECT ?object
        WHERE {
            ${whereClause}
        }
        `
        
        const queryUrl = `${this.endpointUrl}?query=${encodeURIComponent(query)}`;
        
        try {
            const response = await fetch(queryUrl, {
                headers: {
                    // json will have the result in .results.bindings
                    'Accept': 'application/sparql-results+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const json = await response.json();
            const jsonQuads = json.results.bindings;

            const quads = jsonQuads.map((
                quad: { 
                    predicate: {
                    type: string; value: string; 
                }; object: {
                    type: string; value: string; 
                }; }) => {
                    if (predicates){
                        quad.predicate = {type: 'namedNode', value: predicates[0]}
                    }   
                    const predicate = N3.DataFactory.namedNode(quad.predicate.value)
                    const object    = quad.object.type === 'literal' ? N3.DataFactory.literal(quad.object.value) : N3.DataFactory.namedNode(quad.object.value)
                    return N3.DataFactory.quad(N3.DataFactory.namedNode(entityIri), predicate, object)
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

    async fetchQuads(entityIri: string, predicates: Array<string>|null = null): Promise<FetchedQuads | null> {
        const reader = new FileReader();
        reader.onerror = () => {
            console.error("Error reading file:", reader.error);
        };
        
        const quads : Array<N3.Quad> = [];
    
        const parser = new N3.Parser();
        parser.parse(await this.file.text(), 
            (error, quad) => {
                if (quad){
                    if (entityIri === null || (predicates === null && entityIri === quad.subject.value) 
                        || (predicates !== null && entityIri === quad.subject.value && predicates.includes(quad.predicate.value))){
                        quads.push(quad);
                    }
                } 
                if (error){
                    console.log(error.message);
                }
            }
        );
    
        return {dataSourceTitle: this.file.name, quads: quads};
    }
}




export interface QuadsFetcher {
    dataSources: Array<DataSource>
    fetchQuads(entityIri: string): Promise<(FetchedQuads | null)[]>
}

export class Fetcher implements QuadsFetcher {
    dataSources: Array<DataSource>

    constructor(dataSources: Array<DataSource>){
        this.dataSources = dataSources
    }

    async fetchQuads(entityIri: string, predicates: Array<string>|null = null): Promise<(FetchedQuads | null)[]> {
        const promises = this.dataSources.map(ds => ds.fetchQuads(entityIri, predicates))
        return Promise.all(promises)
    }
    async getTitle(entityIri: string): Promise<string> {
        
        const predicateTitleQuads = await this.fetchQuads(entityIri, [titlePredicates[0]]);
        let title: string | undefined = ''
        if (predicateTitleQuads === null || predicateTitleQuads.length === 0){
            title = entityIri;
        }
        else {
            predicateTitleQuads.forEach(quads => {
                if (quads?.quads.length !== 0){
                    title = quads?.quads[0].object.value
                }
            });
            if (title === undefined || title === ''){
                title = entityIri
            }
        }
        return title
    }
}


