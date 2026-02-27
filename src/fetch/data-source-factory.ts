import { IRI } from "../rdf-types";
import { DataSource, DataSourceType } from "./data-source";
import { FileDataSource, LdpDataSource, SparqlDataSource } from "./data-source-implementations";


/**
 * Creates a data source of the given type from the given URL or File
 * 
 * @param type - The type of the data source
 * @param urlOrFile - The URL or File of the data source
 * @returns the created data source
 * @see DataSource
 */
function dataSourceFactory(type: DataSourceType, urlOrFile: IRI|File): DataSource {
    
    if (type === DataSourceType.LocalFile && !(urlOrFile instanceof File) )
        throw new Error("Expected to get a File but got an URL")

    switch (type) {
        case DataSourceType.Sparql: {
            return new SparqlDataSource(urlOrFile as IRI)
        }
        case DataSourceType.LocalFile:
        case DataSourceType.RemoteFile: {
            return new FileDataSource(urlOrFile)
        }
        
        case DataSourceType.Ldp: {
            return new LdpDataSource(urlOrFile as IRI)
        }

        default:
            throw new Error(`Unsupported data source type: ${type}`);
  }
}

export { dataSourceFactory }