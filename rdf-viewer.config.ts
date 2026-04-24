import { RdfViewerConfig } from "./src/config/config-interfaces";
import { DataSourceType } from "./src/fetch/data-source";

/**
 * The initial configuration of the RDF Viewer
 */
const rdfViewerConfig: RdfViewerConfig = {
  dataSources: [
    { type: DataSourceType.Sparql, url: "https://data.gov.cz/sparql" },

    {
      type: DataSourceType.RemoteFile,
      url: "https://www.w3.org/2009/08/skos-reference/skos.rdf",
    },
    { type: DataSourceType.RemoteFile, url: "https://www.w3.org/ns/dcat3.ttl" },
    {
      type: DataSourceType.RemoteFile,
      url: "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl",
    },

    { type: DataSourceType.LocalFile, url: "vocabularies/data-theme-skos.rdf" },
    { type: DataSourceType.LocalFile, url: "vocabularies/foaf.rdf" },
  ],

  pluginModules: [
    {
      url: "https://adamrer.github.io/rdf-viewer-plugins/dcat-plugins-v1.js",
    },
    {
      url: "https://adamrer.github.io/rdf-viewer-plugins/generic-plugin-v1-gemini.js",
    },
    {
      url: "https://adamrer.github.io/rdf-viewer-plugins/ldp-plugin-v1-gemini.js",
    },
    {
      url: "https://adamrer.github.io/rdf-viewer-plugins/image-plugin-v1.js",
    },
  ],

  entityIri:
    "https://data.gov.cz/zdroj/datové-sady/00025593/79eea1096761baa84f3677d8e3d64fe4",

  languages: ["cs", "en"],

  appLanguage: "cs",
};

export { rdfViewerConfig };
