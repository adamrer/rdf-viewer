import { DataSourceType } from "../fetch/data-source";
import { Language } from "../query/query";
import { IRI } from "../core/rdf-types";

/**
 * The initial configuration of the RdfViewerState
 */
interface RdfViewerConfig {
  /** Data source definitoins that will be used for fetching data */
  dataSources: DataSourceDefinition[];
  /** Plugin module definitions that will add plugins for displaying data */
  pluginModules: PluginModuleDefinition[];

  entityIri: IRI;

  languages: Language[];

  appLanguage: Language;
}

interface DataSourceDefinition {
  type: DataSourceType;
  url: IRI;
}

interface PluginModuleDefinition {
  url: IRI;
}

export type { RdfViewerConfig };
