import { Quad_Object } from "n3";
import {
  Query,
  SimpleQueryStepBuilder,
  simpleQueryStepBuilder,
} from "./query-builder";
import { DataSource, DataSourceFetchResult } from "./data-source-implementations";

/**
 * Interface for fetching quads from multiple data sources
 *
 * @see DataSource
 */
interface Fetcher {
  /** Array of data sources to fetch from */
  dataSources: Array<DataSource>;
  /**
   * Fetches RDF quads from all of the specified data sources
   *
   * @param query - Query which specifies the desired quads to fetch.
   */
  fetchQuads(query: Query): Promise<DataSourceFetchResult[]>;

  /**
   * Fetches RDF quads from all of the specified data sources and returns them as StructuredQuads
   *
   * @param query - Query which specifies the desired quads to fetch.
   * @see StructuredQuads
   */
  fetchStructuredQuads(query: Query): Promise<StructuredQuads>;

  /**
   * @returns a query builder for creating the query
   */
  builder(): SimpleQueryStepBuilder;
}

const DEFAULT_GRAPH = "default";
/**
 * Class implementing the QuadsFetcher interface.
 *
 * @see Fetcher
 */
class FetcherImpl implements Fetcher {
  dataSources: Array<DataSource>;

  constructor(dataSources: Array<DataSource>) {
    this.dataSources = dataSources;
  }

  async fetchQuads(query: Query): Promise<DataSourceFetchResult[]> {
    const results = await Promise.allSettled(
      this.dataSources.map((ds) => ds.fetchQuads(query)),
    );

    const successfulResults: DataSourceFetchResult[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      } else {
        console.error(`DataSource ${index} failed:`, result.reason);
      }
    });

    return successfulResults;
  }

  async fetchStructuredQuads(query: Query): Promise<StructuredQuads> {
    const fetchResult = await this.fetchQuads(query);
    return this.structureQuads(fetchResult);
  }

  structureQuads(fetchResult: DataSourceFetchResult[]): StructuredQuads {
    const result: StructuredQuads = {};

    for (const { identifier: sourceId, quads } of fetchResult) {
      for (const quad of quads) {
        const subjectIri = quad.subject.value;
        const predicateIri = quad.predicate.value;
        const object = quad.object;
        const graph = quad.graph.value || DEFAULT_GRAPH;

        if (!result[subjectIri]) {
          result[subjectIri] = {};
        }
        if (!result[subjectIri][predicateIri]) {
          result[subjectIri][predicateIri] = {};
        }
        const existing = result[subjectIri][predicateIri][object.value];
        if (existing) {
          if (!existing.sourceIds.includes(sourceId)) {
            existing.sourceIds.push(sourceId);
          }
          if (!existing.graphs.includes(graph)) {
            existing.graphs.push(graph);
          }
        } else {
          const newObject: SourcedObject = {
            term: object,
            sourceIds: [sourceId],
            graphs: [graph],
          };
          result[subjectIri][predicateIri][object.value] = newObject;
        }
      }
    }

    return result;
  }

  builder(): SimpleQueryStepBuilder {
    return simpleQueryStepBuilder();
  }
}

/**
 * Interface to hold the information from where the term was fetched and from which graph it is
 */
interface SourcedObject {
  term: Quad_Object;
  sourceIds: string[];
  graphs: string[];
}

/**
 * Interface for quads fetched from data sources.
 * Hierarchical structure, deduplicated quads.
 */
interface StructuredQuads {
  [subjectIri: string]: {
    [predicateIri: string]: {
      [objectValue: string]: SourcedObject;
    };
  };
}
/**
 * Merges two implementations of StructuredQuads into one
 *
 * @param a - StructuredQuads to merge into
 * @param b - StructuredQuads that will be merged to a
 * @returns merged StructuredQuads
 */
function mergeStructuredQuads(
  a: StructuredQuads,
  b: StructuredQuads,
): StructuredQuads {
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
          objA.sourceIds = Array.from(
            new Set([...objA.sourceIds, ...objB.sourceIds]),
          );

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
export type { Fetcher, StructuredQuads, SourcedObject };

export { FetcherImpl, mergeStructuredQuads };
