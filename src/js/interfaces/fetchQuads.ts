import N3 from "n3";


export interface DataSource {
    endpointUrl?: URL
    file?: File
    fetchQuads(entityIri: string): Promise<FetchedQuads | null>
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

    async fetchQuads(entityIri: string): Promise<FetchedQuads | null> {
        const decoded_target = decodeURIComponent(JSON.parse('"' + entityIri.replace(/\"/g, '\\"' + '"') + '"'))
        const query = `
        SELECT ?predicate ?object
        WHERE {
            <${decoded_target}> ?predicate ?object .
        }
    `;
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
            const quads = json.results.bindings;
    
            return { dataSourceTitle: this.endpointUrl.toString(), quads: quads};
            
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

    async fetchQuads(entityIri: string): Promise<FetchedQuads | null> {
        const reader = new FileReader();
        reader.onerror = () => {
            console.error("Error reading file:", reader.error);
        };
        
        const quads : Array<N3.Quad> = [];
    
        const parser = new N3.Parser();
        parser.parse(await this.file.text(), 
            (error, quad) => {
                if (quad){
                    if (entityIri === null || (entityIri === quad.subject.value)){
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

export interface QuadsRequest {
    entityIri: string
    dataSources: Array<DataSource>
}


export interface QuadsFetcher {
    fetchQuads(request: QuadsRequest): Promise<(FetchedQuads | null)[]>
}

export class Fetcher implements QuadsFetcher {
    async fetchQuads(request: QuadsRequest): Promise<(FetchedQuads | null)[]> {
        const promises = request.dataSources.map(ds => ds.fetchQuads(request.entityIri))
        return Promise.all(promises)
    }
}


// -----------

export interface DisplayPlugin {
    url: URL
    forClass: string
    name: string
}


export interface QuadsDisplayer {
    display(quads: Array<N3.Quad>, plugin: DisplayPlugin, element: HTMLElement): void
}