import { Quad } from "n3";
import { Query } from "./query";
import { IRI } from "./rdf-types";

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
  identifier: IRI | string;
  /**
   * Fetches RDF quads from data source corresponding to the query.
   *
   * @param query - Query which specifies the desired quads to fetch.
   * @returns DataSourceFetchResult Promise which contains the quads.
   * @see DataSourceFetchResult
   */
  fetchQuads(query: Query): Promise<Array<Sourced<Quad>>>;
}
interface Sourced<T> {
  value: T
  sources: IRI[]
  graphs?: IRI[]
}


export type {
    DataSource,
    Sourced
    
}
export {
    DataSourceType
}