import { DataSourceType } from "../fetch/data-source"
import { Language } from "../query/query-interfaces"
import { IRI } from "../rdf-types"

/**
 * The initial configuration of the StateManager
 */
interface RdfViewerConfig {
    /** Data source definitoins that will be used for fetching data */
    dataSources: DataSourceDefinition[]
    /** Plugin module definitions that will add plugins for displaying data */
    pluginModules: PluginModuleDefinition[]

    entityIri: IRI

    languages: Language[]

    appLanguage: Language


}

interface DataSourceDefinition {
    type: DataSourceType,
    url: IRI
} 

interface PluginModuleDefinition {
    url: IRI
}

/**
 * The initial configuration of the RDF Viewer
 */
const rdfViewerConfig: RdfViewerConfig = {
  
  dataSources: [
    {type: DataSourceType.Sparql, url: "https://data.gov.cz/sparql"},

    {type: DataSourceType.Ldp, url: "https://rero.datapod.igrant.io/"},
    
    { type: DataSourceType.RemoteFile, url: "https://www.w3.org/2009/08/skos-reference/skos.rdf"},
    { type: DataSourceType.RemoteFile, url: "https://www.w3.org/ns/dcat3.ttl"},
    { type: DataSourceType.RemoteFile, url: "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl"},
    
    { type: DataSourceType.LocalFile, url: "vocabularies/data-theme-skos.rdf"},
    { type: DataSourceType.LocalFile, url: "vocabularies/foaf.rdf"}
  ],

  pluginModules: [
    { url: "plugins/dcat-plugins-v1.js"},
    { url: "plugins/generic-plugin-v1-gemini.js"},
    { url: "plugins/ldp-plugin-v1-gemini.js"}
  ],

  entityIri: "https://data.gov.cz/zdroj/datové-sady/00231151/25b6ed9faca088ebbb1064a05a24d010",

  languages: ["cs", "en"],

  appLanguage: "cs"
}

export { rdfViewerConfig }