import { Quad } from "n3";
import { Query } from "./query";

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

export type {
    DataSource,
    DataSourceFetchResult
    
}
export {
    DataSourceType
}