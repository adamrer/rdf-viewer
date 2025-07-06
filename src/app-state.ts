import { DataSource, FileDataSource, LdpDataSource, SparqlDataSource } from "./fetch-quads/data-sources";
import { DisplayPlugin } from "./plugin";
import { Language } from "./query/query-interfaces";

const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL;

type Listener = () => void;

/**
 * Holds data set by user in the UI. Is Observable
 */
class AppState {
  private static _instance: AppState;

  entityIri: string =
    "my-pod.ttl";
  languages: Language[] = ["cs", "en"];
  dataSources: DataSource[] = [
    new SparqlDataSource("https://data.gov.cz/sparql"),
    new FileDataSource("https://www.w3.org/2009/08/skos-reference/skos.rdf"),
    new FileDataSource("https://www.w3.org/ns/dcat3.ttl"),
    new FileDataSource(
      "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl",
    ),
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

  static getInstance(): AppState {
    if (!AppState._instance) {
      AppState._instance = new AppState();
    }
    return AppState._instance;
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

  setEntityIRI(iri: string) {
    this.entityIri = decodeURIComponent(iri);
    this.notify();
  }

  addFileDataSource(fileOrUrl: File | string) {
    const fds = new FileDataSource(fileOrUrl);
    this.dataSources.push(fds);
    this.notify();
  }

  addSparqlDataSource(endpointUrl: string) {
    const sds = new SparqlDataSource(endpointUrl);
    this.dataSources.push(sds);
    this.notify();
  }

  addLDPDataSource(url: string) {
    const lds = new LdpDataSource(url)
    this.dataSources.push(lds)
    this.notify()
  }

  removeDataSource(identifier: string) {
    this.dataSources = this.dataSources.filter(
      (ds) => ds.identifier !== identifier,
    );
    this.notify();
  }

  addPlugin(label: string, url: string) {
    const plugin: DisplayPlugin = { label: label, url: url, classes: [] };
    this.plugins.push(plugin);
    this.notify();
  }

  setSelectedPlugin(url: string) {
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

export { AppState };
