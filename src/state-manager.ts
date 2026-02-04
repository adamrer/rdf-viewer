import {
  DataSource,
  DataSourceType,
  FileDataSource,
  LdpDataSource,
  SparqlDataSource,
} from "./data-source-implementations";
import { LabeledPlugin, PluginModule } from "./plugin-api";
import { Language } from "./query-interfaces";
import { IRI } from "./rdf-types";

// const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL;

type Listener = () => void;
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
  plugins: LabeledPlugin[] = [];
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
  addDataSource(source: IRI | File, type: DataSourceType) {
    let ds: DataSource;
    switch (type) {
      case DataSourceType.Sparql:
        ds = new SparqlDataSource(source as IRI);
        break;
      case DataSourceType.LDP:
        ds = new LdpDataSource(source as IRI);
        break;
      case DataSourceType.LocalFile:
      case DataSourceType.RemoteFile:
        ds = new FileDataSource(source);
        break;
      default:
        throw new Error(`Unsupported data source type: ${type}`);
    }
    this.dataSources.push(ds);
    this.notify();
  }

  removeDataSource(identifier: IRI) {
    this.dataSources = this.dataSources.filter(
      (ds) => ds.identifier !== identifier,
    );
    this.notify();
  }

  async addPlugins(pluginModuleUrl: IRI): Promise<LabeledPlugin[]> {
    const pluginModule: PluginModule = await import(pluginModuleUrl);
    const newPlugins: LabeledPlugin[] = pluginModule.registerPlugins();
    this.plugins.push(...newPlugins);
    this.notify();

    return newPlugins;
  }

  setSelectedPlugin(label: string) {
    this.selectedPluginIndex = this.plugins.findIndex(
      (plugin) => Object.values(plugin.label).includes(label),
    );
    this.notify();
  }

  setLanguages(languages: Language[]) {
    this.languages = languages;
    this.notify();
  }
}


export { StateManager };
