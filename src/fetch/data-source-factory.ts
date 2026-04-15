import { IRI } from "../core/rdf-types";
import { DataSourceType, DataSource } from "./data-source";
import {
  SparqlDataSource,
  FileDataSource,
  LdpDataSource,
} from "./data-source-implementations";

/**
 * Creates a data source of the given type from the given URL or File
 *
 * @param type - The type of the data source
 * @param urlOrFile - The URL or File of the data source
 * @returns the created data source
 * @see DataSource
 */
function dataSourceFactory(
  type: DataSourceType,
  urlOrFile: IRI | File,
): DataSource {
  switch (type) {
    case DataSourceType.Sparql: {
      return new SparqlDataSource(urlOrFile as IRI);
    }
    case DataSourceType.LocalFile: {
      if (urlOrFile instanceof File) {
        return new FileDataSource(urlOrFile as File);
      }
      return new FileDataSource(
        `${import.meta.env.BASE_URL}${urlOrFile as IRI}`,
      );
    }
    case DataSourceType.RemoteFile: {
      return new FileDataSource(urlOrFile);
    }

    case DataSourceType.Ldp: {
      return new LdpDataSource(urlOrFile as IRI);
    }

    default:
      throw new Error(`Unsupported data source type: ${type}`);
  }
}

export { dataSourceFactory };
