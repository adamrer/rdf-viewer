import N3, { Quad } from "n3";
import { Readable } from "readable-stream";
import { rdfParser } from "rdf-parse";
import { queryProcessor } from "../query-processor";
import pLimit from "p-limit";
import { Query, simpleQueryStepBuilder } from "../simple-query-step-builder";
/**
 * Types of DataSource
 */
enum DataSourceType {
  Sparql = "SPARQL",
  LocalFile = "LOCAL_FILE",
  RemoteFile = "REMOTE_FILE",
  LDP = "LDP",
}
/**
 * Interface for a data source from which it is possible to fetch RDF quads.
 */
interface DataSource {
  type: DataSourceType;
  identifier: string;
  /**
   * Fetches RDF quads from data source corresponding to the query.
   *
   * @param query - Query which specifies the desired quads to fetch.
   * @returns DataSourceFetchResult Promise which contains the quads.
   * @see DataSourceFetchResult
   */
  fetchQuads(query: Query): Promise<DataSourceFetchResult>;
}

/**
 * Interface for the result of fetching quads from a data source.
 */
interface DataSourceFetchResult {
  /** Unique identifier of the data source from which the result origins. */
  identifier: string;
  /** Array of quads obtained from the data source. */
  quads: Array<Quad>;
}

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

  async fetchQuads(query: Query): Promise<DataSourceFetchResult> {
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
          const result: DataSourceFetchResult = {
            identifier: this.endpointUrl.toString(),
            quads: quads,
          };
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
  url?: string;
  fileLoaded: boolean = false;
  identifier: string;

  constructor(fileOrUrl: File | string) {
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
  async fetchFile(url: string): Promise<File> {
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

  async fetchQuads(query: Query): Promise<DataSourceFetchResult> {
    await this.parseQuads();
    if (!this.quads) {
      throw new Error("Failed to load quads from file");
    }
    const processor = queryProcessor();
    const filteredQuads: Quad[] = processor.filter(this.quads, query);
    return { identifier: this.file!.name, quads: filteredQuads };
  }
}

class LdpDataSource implements DataSource {
  type = DataSourceType.LDP;
  identifier: string;
  url: string;
  quads: Quad[] = [];
  quadsLoaded: boolean = false;
  constructor(url: string) {
    this.url = url;
    this.identifier = url;
  }

  async fetchLdp(contentType = "text/turtle"): Promise<Response> {
    return fetch(this.url, {
      headers: {
        Accept: contentType,
      },
    });
  }
  async loadAllResourcesLimited(
    urls: string[],
    concurrency: number = 5,
    contentType: string = "text/turtle",
  ): Promise<Quad[]> {
    const limit = pLimit(concurrency);
    const tasks = urls.map((url) =>
      limit(async () => {
        const response = await fetch(url);
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
    const contentType = "text/turtle";
    const response = await this.fetchLdp(contentType);
    const result = await response.text();
    const parser = new N3.Parser({ format: contentType, baseIRI: this.url });
    this.quads.push(...parser.parse(result));
    const ldp = "http://www.w3.org/ns/ldp#";
    const subResourcesQuery = simpleQueryStepBuilder()
      .subjects(containerIris)
      .predicates([ldp + "contains"])
      .objects()
      .build();
    const processor = queryProcessor();
    const subResources = processor
      .filter(this.quads, subResourcesQuery)
      .map((quad) => quad.object) // get objects
      .filter((object) => object.termType === "NamedNode") // that are NamedNodes
      .map((object) => object.value); // their IRIs
    if (subResources.length === 0) {
      return;
    }
    this.quads.push(
      ...(await this.loadAllResourcesLimited(subResources, 5, contentType)),
    );
    this.loadContainers(subResources);
  }
  async fetchQuads(query: Query): Promise<DataSourceFetchResult> {
    if (!this.quadsLoaded) {
      await this.loadContainers([this.url]);
      this.quadsLoaded = true;
    }
    const processor = queryProcessor();
    const filteredQuads: Quad[] = processor.filter(this.quads, query);
    return { identifier: this.url, quads: filteredQuads };
  }
}

export type { DataSource, DataSourceFetchResult };
export { DataSourceType, SparqlDataSource, FileDataSource, LdpDataSource };
