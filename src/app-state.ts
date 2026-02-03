import {
  DataSource,
  FileDataSource,
  LdpDataSource,
  SparqlDataSource,
} from "./data-source-implementations";
import { DisplayPlugin } from "./plugin-api";
import { Language } from "./query-interfaces";
import { IRI } from "./rdf-types";

const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL;

type Listener = () => void;
//TODO: rename AppState
/**
 * Holds and manages data set by user in the UI. Is Observable.
 */
class StateManager {
  private static _instance: StateManager;

  entityIri: IRI = "https://rero.datapod.igrant.io/";
  languages: Language[] = ["cs", "en"];
  dataSources: DataSource[] = [
    new SparqlDataSource("https://data.gov.cz/sparql"),
    new FileDataSource("https://www.w3.org/2009/08/skos-reference/skos.rdf"),
    new FileDataSource("https://www.w3.org/ns/dcat3.ttl"),
    new FileDataSource(
      "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl",
    ),
    new LdpDataSource("https://rero.datapod.igrant.io/"),
  ];
  plugins: DisplayPlugin[] = [
    {
      url: getPluginUrl("ldp-plugin.js"),
      label: "LDP Plugin",
      classes: [],
    },
    {
      url: getPluginUrl("dataset-plugin.js"),
      label: "Dataset Plugin",
      classes: ["https://www.w3.org/ns/dcat#Dataset"],
    },
    {
      url: getPluginUrl("default-plugin.js"),
      label: "Default Plugin",
      classes: [],
    },
  ];
  selectedPluginIndex: number = 0;

  listeners: Listener[] = [];

  private constructor() {}

  static getInstance(): StateManager {
    if (!StateManager._instance) {
      StateManager._instance = new StateManager();
    }
    return StateManager._instance;
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }

  getSelectedPlugin() {
    return this.plugins[this.selectedPluginIndex];
  }

  setEntityIRI(iri: IRI) {
    this.entityIri = decodeURIComponent(iri);
    this.notify();
  }
  // TODO: merge adding functions to one with a parameter
  addFileDataSource(fileOrUrl: File | IRI) {
    const fds = new FileDataSource(fileOrUrl);
    this.dataSources.push(fds);
    this.notify();
  }

  addSparqlDataSource(endpointUrl: IRI) {
    const sds = new SparqlDataSource(endpointUrl);
    this.dataSources.push(sds);
    this.notify();
  }

  addLDPDataSource(url: IRI) {
    const lds = new LdpDataSource(url);
    this.dataSources.push(lds);
    this.notify();
  }

  removeDataSource(identifier: IRI) {
    this.dataSources = this.dataSources.filter(
      (ds) => ds.identifier !== identifier,
    );
    this.notify();
  }

  addPlugin(label: string, url: IRI) {
    const plugin: DisplayPlugin = { label: label, url: url, classes: [] };
    this.plugins.push(plugin);
    this.notify();
  }

  setSelectedPlugin(url: IRI) {
    this.selectedPluginIndex = this.plugins.findIndex(
      (plugin) => plugin.url === url,
    );
    this.notify();
  }

  setLanguages(languages: Language[]) {
    this.languages = languages;
    this.notify();
  }
}
function getPluginUrl(pluginName: string): string {
  return pluginBaseUrl + pluginName;
}

export { StateManager };
