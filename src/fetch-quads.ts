import N3, { Quad, Quad_Object } from 'n3'
import { SimpleQueryStepBuilder, simpleQueryStepBuilder, Query } from './simple-query-step-builder';
import { Readable } from 'readable-stream';
import { rdfParser } from 'rdf-parse';
import { queryProcessor } from './query-processor';

/**
 * Types of DataSource
 */
enum DataSourceType {
    Sparql = 'SPARQL',
    LocalFile = 'LOCAL_FILE',
    RemoteFile = 'REMOTE_FILE'
}
/**
 * Interface for a data source from which it is possible to fetch RDF quads.
 */
interface DataSource {
    type: DataSourceType
    identifier: string
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
    type = DataSourceType.Sparql
    endpointUrl: string;
    identifier: string

    constructor(endpointUrl: string){
        this.endpointUrl = endpointUrl
        this.identifier = endpointUrl
    }

    /**
     * 
     * @param jsonQuads - Result JSON of the queried quads
     * @returns Array of parsed quads
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseJsonQuads(jsonQuads: any): Quad[]{
        return jsonQuads.map((quad: ResultQuad) => {
                const graph = quad.graph !== undefined ? N3.DataFactory.namedNode(quad.graph?.value) : undefined
                const predicate = N3.DataFactory.namedNode(quad.predicate.value)
                
                
                const object = quad.object.type === 'uri' ? N3.DataFactory.namedNode(quad.object.value) : 
                    quad.object.type === 'bnode' ? N3.DataFactory.blankNode(quad.object.value) : 
                    N3.DataFactory.literal(quad.object.value, (quad.object as ResultTerm)["xml:lang"] ||
                        (quad.object.datatype !== undefined ? N3.DataFactory.namedNode((quad.object).datatype) : undefined))
                
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
                reject(error);
                throw new Error(`Error fetching data from ${this.identifier}`)
            })
        })
    }
}


class FileDataSource implements DataSource {
    type: DataSourceType.LocalFile|DataSourceType.RemoteFile
    quads?: Quad[]
    file?: File;
    url?: string
    fileLoaded: boolean = false
    identifier: string
    
    constructor(fileOrUrl: File|string){
        if (fileOrUrl instanceof File){
            this.file = fileOrUrl
            this.identifier = fileOrUrl.name
            this.type = DataSourceType.LocalFile
        }
        else {
            this.url = fileOrUrl
            this.identifier = fileOrUrl
            this.type = DataSourceType.RemoteFile
        }
    }

    /**
     * Fetches file from given URL
     * 
     * @param url 
     * @returns 
     */
    async fetchFile(url: string): Promise<File> {
        const response = await fetch(url)
        const blob = await response.blob()
        return new File([blob], url)
    }

    /**
     * Parses quads from file to array
     * 
     * @returns 
     */
    async parseQuads(): Promise<void> {
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
        await this.parseQuads()
        if (!this.quads){
            throw new Error('Failed to load quads from file')
        }
        const processor = queryProcessor()
        const filteredQuads:Quad[] = processor.filter(this.quads, query)
        return {identifier: this.file!.name, quads: filteredQuads}
    }
}

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
     * Fetches RDF quads from all of the specified data sources and returns them as StructuredQuads
     * 
     * @param query - Query which specifies the desired quads to fetch.
     * @see StructuredQuads
     */
    fetchStructuredQuads(query: Query): Promise<StructuredQuads>

    /**
     * @returns a query builder for creating the query
     */
    builder(): SimpleQueryStepBuilder
}

const DEFAULT_GRAPH = 'default'
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

    async fetchQuads(query: Query): Promise<DataSourceFetchResult[]> {
        const results = await Promise.allSettled(
            this.dataSources.map(ds => ds.fetchQuads(query))
        );

        const successfulResults: DataSourceFetchResult[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulResults.push(result.value);
            } else {
                console.error(`DataSource ${index} failed:`, result.reason);
            }
        });

        return successfulResults;
    }
    
    async fetchStructuredQuads(query: Query): Promise<StructuredQuads> {
        const fetchResult = await this.fetchQuads(query)
        return this.structureQuads(fetchResult)
    }

    structureQuads(fetchResult: DataSourceFetchResult[]): StructuredQuads{
        const result: StructuredQuads = {}
        
        for (const {identifier: sourceId, quads} of fetchResult){
            for (const quad of quads) {
                const subjectIri = quad.subject.value
                const predicateIri = quad.predicate.value
                const object = quad.object
                const graph = quad.graph.value || DEFAULT_GRAPH

                if (!result[subjectIri]){
                    result[subjectIri] = {}
                }
                if (!result[subjectIri][predicateIri]){
                    result[subjectIri][predicateIri] = {}
                }
                const existing = result[subjectIri][predicateIri][object.value]
                if (existing){
                    if (!existing.sourceIds.includes(sourceId)){
                        existing.sourceIds.push(sourceId)
                    }
                    if (!existing.graphs.includes(graph)){
                        existing.graphs.push(graph)
                    }
                }
                else{
                    const newObject: SourcedObject = {
                        term: object,
                        sourceIds: [sourceId],
                        graphs: [graph]
                    }
                    result[subjectIri][predicateIri][object.value] = newObject
                }

            }
        }
        
        return result
    }



    builder() : SimpleQueryStepBuilder {
        return simpleQueryStepBuilder()
    }
}

/**
 * Interface to hold the information from where the term was fetched and from which graph it is
 */
interface SourcedObject {
    term: Quad_Object
    sourceIds: string[]
    graphs: string[]
}

/**
 * Interface for quads fetched from data sources.
 * Hierarchical structure, deduplicated quads.
 */
interface StructuredQuads {
    [subjectIri: string]: {
        [predicateIri: string]: {
            [objectValue: string]: SourcedObject
        }
    }
}
/**
 * Merges two implementations of StructuredQuads into one
 * 
 * @param a - StructuredQuads to merge into
 * @param b - StructuredQuads that will be merged to a
 * @returns merged StructuredQuads
 */
function mergeStructuredQuads(a: StructuredQuads, b: StructuredQuads): StructuredQuads {
  const result: StructuredQuads = JSON.parse(JSON.stringify(a)); // deep clone a

  for (const subject in b) {
    if (!result[subject]) {
      result[subject] = {};
    }

    const predicatesB = b[subject];
    const predicatesResult = result[subject];

    for (const predicate in predicatesB) {
      if (!predicatesResult[predicate]) {
        predicatesResult[predicate] = {};
      }

      const objectsB = predicatesB[predicate];
      const objectsResult = predicatesResult[predicate];

      for (const objectKey in objectsB) {
        const objB = objectsB[objectKey];

        if (objectsResult[objectKey]) {
          const objA = objectsResult[objectKey];

          // Merge sourceIds
          objA.sourceIds = Array.from(new Set([...objA.sourceIds, ...objB.sourceIds]));

          // Merge graphs
          objA.graphs = Array.from(new Set([...objA.graphs, ...objB.graphs]));

        } else {
          objectsResult[objectKey] = objB;
        }
      }
    }
  }

  return result;
}
export type {
    DataSource,
    DataSourceFetchResult,
    QuadsFetcher,
    StructuredQuads,
    SourcedObject
}

export {
    DataSourceType,
    SparqlDataSource,
    FileDataSource,
    Fetcher,
    mergeStructuredQuads
}