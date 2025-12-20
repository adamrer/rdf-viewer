import N3, { Quad } from "n3";
import { Readable } from "readable-stream";
import { rdfParser } from "rdf-parse";
import { queryProcessor } from "./query-processor";
import pLimit from "p-limit";
import { Query, simpleQueryStepBuilder } from "./query-builder";
import { DataSource, DataSourceType, Sourced } from "./data-source";
import { IRI } from "./rdf-types";


/** SPARQL JSON result RDF term types */
type ResultType = "uri" | "literal" | "bnode";

/**
 * Interface for a node, which can be a named node, literal or blank node, from JSON SPARQL result.
 *
 * @see https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/#select-encode-terms
 */
interface ResultTerm {
  /** Type of the node */
  type: ResultType;
  /** Value of the node */
  value: IRI | string;
  /** If the node is of a type literal, this represents a language tag */
  "xml:lang"?: string;
  /** If the node is of a type literal, this represents the type of the literal */
  datatype?: IRI | string;
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
  type = DataSourceType.Sparql;
  endpointUrl: string;
  identifier: string;

  constructor(endpointUrl: string) {
    this.endpointUrl = endpointUrl;
    this.identifier = endpointUrl;
  }

  /**
   *
   * @param jsonQuads - Result JSON of the queried quads
   * @returns Array of parsed quads
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseJsonQuads(jsonQuads: any): Quad[] {
    return jsonQuads.map((quad: ResultQuad) => {
      const graph =
        quad.graph !== undefined
          ? N3.DataFactory.namedNode(quad.graph?.value)
          : undefined;
      const predicate = N3.DataFactory.namedNode(quad.predicate.value);

      const object =
        quad.object.type === "uri"
          ? N3.DataFactory.namedNode(quad.object.value)
          : quad.object.type === "bnode"
            ? N3.DataFactory.blankNode(quad.object.value)
            : N3.DataFactory.literal(
                quad.object.value,
                (quad.object as ResultTerm)["xml:lang"] ||
                  (quad.object.datatype !== undefined
                    ? N3.DataFactory.namedNode(quad.object.datatype)
                    : undefined),
              );

      return N3.DataFactory.quad(
        N3.DataFactory.namedNode(quad.subject.value),
        predicate,
        object,
        graph,
      );
    });
  }

  async fetchQuads(query: Query): Promise<Array<Sourced<Quad>>> {
    const queryUrl = `${this.endpointUrl}?query=${encodeURIComponent(query.toSparql())}`;
    return new Promise((resolve, reject) => {
      fetch(queryUrl, {
        headers: {
          Accept: "application/sparql-results+json",
        },
      })
        .then((response) => response.json())
        .then((jsonResponse) => {
          const jsonQuads = jsonResponse.results.bindings;

          const quads = this.parseJsonQuads(jsonQuads);
          const result: Array<Sourced<Quad>> = quads.map(quad => {
            return {
              value: quad, 
              sources: [this.endpointUrl.toString()]
            }
          })
          resolve(result);
        })
        .catch((error) => {
          reject(error);
          throw new Error(`Error fetching data from ${this.identifier}`);
        });
    });
  }
}

class FileDataSource implements DataSource {
  type: DataSourceType.LocalFile | DataSourceType.RemoteFile;
  quads?: Quad[];
  file?: File;
  url?: IRI;
  fileLoaded: boolean = false;
  identifier: IRI | string;

  constructor(fileOrUrl: File | IRI) {
    if (fileOrUrl instanceof File) {
      this.file = fileOrUrl;
      this.identifier = fileOrUrl.name;
      this.type = DataSourceType.LocalFile;
    } else {
      this.url = fileOrUrl;
      this.identifier = fileOrUrl;
      this.type = DataSourceType.RemoteFile;
    }
  }

  /**
   * Fetches file from given URL
   *
   * @param url
   * @returns
   */
  async fetchFile(url: IRI): Promise<File> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], url);
  }
  /**
   * Parses quads from file to array
   *
   * @returns
   */
  async parseQuads(): Promise<void> {
    if (this.fileLoaded) {
      return;
    }
    if (this.url) {
      this.file = await this.fetchFile(this.url);
    }
    if (!this.file) {
      throw Error("File is missing");
    }
    const fileText = await this.file.text();
    const stream = Readable.from([fileText]);
    this.quads = [];
    return new Promise<void>((resolve, reject) => {
      if (!this.file) {
        const err = new Error("File is missing");
        reject(err);
        throw err;
      }
      rdfParser
        .parse(stream, { path: this.file.name, baseIRI: this.identifier })
        .on("data", (quad) => {
          this.quads?.push(quad);
        })
        .on("error", (err) => {
          console.error("Error while parsing file", err);
          reject(err);
        })
        .on("end", async () => {
          this.fileLoaded = true;
          resolve();
        });
    });
  }

  async fetchQuads(query: Query): Promise<Array<Sourced<Quad>>> {
    await this.parseQuads();
    if (!this.quads) {
      throw new Error("Failed to load quads from file");
    }
    const processor = queryProcessor();
    const filteredQuads: Quad[] = processor.filter(this.quads, query);
    const sourcedQuads: Array<Sourced<Quad>> = filteredQuads.map(quad => {
      return {
        value: quad,
        sources: [this.file!.name]
      }
    })
    return sourcedQuads;
  }
}
function isRdfType(contentType: string) {
  return [
    "text/turtle",
    "application/ld+json",
    "application/rdf+xml",
    "application/n-triples",
  ].includes(contentType);
}
class LdpDataSource implements DataSource {
  type = DataSourceType.LDP;
  identifier: IRI | string;
  url: IRI;
  quads: Quad[] = [];
  quadsLoaded: boolean = false;
  constructor(url: IRI) {
    this.url = url;
    this.identifier = url;
  }

  /**
   *
   * @param urls - URLs of resources to load
   * @param concurrency - how many resources can be fetched in parallel
   * @param contentType - content type for the fetch
   * @returns
   */
  async loadAllResources(
    urls: IRI[],
    concurrency: number = 5,
  ): Promise<Quad[]> {
    const limit = pLimit(concurrency);
    const tasks = urls.map((url) =>
      limit(async () => {
        const response = await fetch(url);
        const contentType =
          response.headers.get("content-type")?.split(";")[0] ?? "";
        if (!isRdfType(contentType)) {
          return [];
        }
        const text = await response.text();
        const parser = new N3.Parser({ format: contentType, baseIRI: url });
        return parser.parse(text);
      }),
    );
    const results = await Promise.allSettled(tasks);

    return results
      .filter(
        (r): r is PromiseFulfilledResult<Quad[]> => r.status === "fulfilled",
      )
      .flatMap((r) => r.value);
  }
  async loadContainers(containerIris: string[]) {
    const containerQuads = await this.loadAllResources(containerIris);
    this.quads.push(...containerQuads);
    const ldp = "http://www.w3.org/ns/ldp#";
    const subResourcesQuery = simpleQueryStepBuilder()
      .subjects(containerIris)
      .predicates([ldp + "contains"])
      .objects()
      .build();
    const processor = queryProcessor();
    const subResources = processor
      .filter(containerQuads, subResourcesQuery)
      .map((quad) => quad.object) // get objects
      .filter((object) => object.termType === "NamedNode") // that are NamedNodes
      .map((object) => object.value); // their IRIs
    if (subResources.length === 0) {
      return;
    }
    await this.loadContainers(subResources);
  }
  async fetchQuads(query: Query): Promise<Array<Sourced<Quad>>> {
    if (!this.quadsLoaded) {
      await this.loadContainers([this.url]);
      this.quadsLoaded = true;
    }
    const processor = queryProcessor();
    const filteredQuads: Quad[] = processor.filter(this.quads, query);
    const sourcedQuads: Array<Sourced<Quad>> = filteredQuads.map(quad =>{
      return {
        value: quad,
        sources: [this.url]
      }
    })
    return sourcedQuads;
  }
}

export type { 
  DataSource, 
};

export { 
  DataSourceType, 
  SparqlDataSource, 
  FileDataSource, 
  LdpDataSource 
};
