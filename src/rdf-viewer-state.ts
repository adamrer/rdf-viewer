import { rdfViewerConfig } from "./config/rdf-viewer.config";
import { dataSourceFactory } from "./fetch/data-source-factory";
import {
  DataSource,
  DataSourceType
} from "./fetch/data-source-implementations";
import { createSetupContext } from "./plugin-api/context-implementations";
import { LabeledPlugin, PluginModule } from "./plugin-api/plugin-api-interfaces";
import { Language } from "./query/query-interfaces";
import { IRI } from "./rdf-types";

// const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL;

type Listener = () => void;
type StateMember =
  | "entityIri"
  | "languages"
  | "dataSources"
  | "plugins"
  | "selectedPluginIndex"
  | "appLanguage";
type Subscription = { keys: StateMember[]; listener: Listener };

interface LabeledPluginWithId extends LabeledPlugin {
  id: number
}

/**
 * Holds and manages data set by user in the UI for RDF display configuration. 
 * Observable Singleton class.
 */
class RdfViewerState {

  private static _instance: RdfViewerState;
  subscriptions: Subscription[] = [];
  
  private plugins: LabeledPluginWithId[] = [];
  private selectedPluginIndex: number = 0;
  private nextPluginId = 0
  
  private dataSources: DataSource[] = [];

  private entityIri: IRI = "";

  // TODO: when empty, retrieve all languages? or retrieve only objects withou a language tag?
  private languages: Language[] = [];
  private appLanguage: Language = ""
  

  private constructor() {
    this.loadConfiguration()
  }

  /**
   * 
   * @returns the instance of the RdfViewerState
  */
 static getInstance(): RdfViewerState {
   if (!RdfViewerState._instance) {
     RdfViewerState._instance = new RdfViewerState();
    }
    return RdfViewerState._instance;
  }
  
  /**
   * Loads the initial configuration from rdfViewerConfig
   * @see rdfViewerConfig
   */
  private async loadConfiguration() {
    rdfViewerConfig.dataSources.forEach(dsd => this.addDataSource(dsd.url, dsd.type))
    const pluginPromises = rdfViewerConfig.pluginModules.map(md => this.addPluginsFromModule(md.url))
    this.setEntityIri(rdfViewerConfig.entityIri)
    this.setLanguages(rdfViewerConfig.languages)
    this.setAppLanguage(rdfViewerConfig.appLanguage)
    await Promise.all(pluginPromises)
  }

  
  
  /**
   * Subscribe to changes. Provide an array of state member keys to listen to.
   * If `keys` is empty or omitted, the listener will be notified for any change.
   */
  subscribe(listener: Listener, keys?: StateMember[], notifyImmediately = false) {
    this.subscriptions.push({ keys: keys ?? [], listener });
    if (notifyImmediately) {
      listener();
    }
  }
  

  /**
   * Notify listeners. If `changed` is omitted, notify all listeners.
   * Otherwise only those whose subscribed keys intersect `changed` (or who subscribed to all keys) are called.
   */
  notify(changed?: StateMember[]) {
    if (!changed || changed.length === 0) {
      this.subscriptions.forEach((s) => s.listener());
      return;
    }
    const changedSet = new Set(changed);
    this.subscriptions.forEach((s) => {
      if (s.keys.length === 0) {
        s.listener();
        return;
      }
      for (const k of s.keys) {
        if (changedSet.has(k)) {
          s.listener();
          return;
        }
      }
    });
  }

  
  // ===  P L U G I N   S T A T E  ===

  /**
   * 
   * @returns the plugin that is set to be selected
   */
  getSelectedPlugin(): LabeledPluginWithId {
    return this.plugins[this.selectedPluginIndex];
  }

  /**
   * 
   * @returns a new ID for a newly added plugin
   */
  private getNextId(){
    const nextId = this.nextPluginId
    this.nextPluginId++
    return nextId
  }
  
  async addPluginsFromCode(code: string){
    const pluginModuleBlob = new Blob([code], {type: "text/javascript"})
    const pluginModuleUrl = URL.createObjectURL(pluginModuleBlob)
    const pluginModule: PluginModule = await import(/* @vite-ignore */ pluginModuleUrl)
    const newPlugins: LabeledPlugin[] = pluginModule.registerPlugins();
    newPlugins.forEach(plugin => plugin.v1.setup(createSetupContext()))

    const newPluginsWithIds = newPlugins.map((plugin) => {
      return {
        id: this.getNextId(),
        ...plugin
      }
    })
    // TODO: řadit podle priority
    // for (let i = 0; i < this.plugins.length; i++) {
    //   const plugin = this.plugins[i];
    //   plugin.v1.checkCompatibility()
    // }
    this.plugins.push(...newPluginsWithIds);
    this.notify(["plugins"]);

    return newPluginsWithIds
  }
  /**
   * 
   * @param pluginModuleUrlOrFile - URL or File of plugin module from which new plugins will be loaded
   * @returns a list of newly loaded plugins with their IDs assigned by the StateManger
   */
  async addPluginsFromModule(pluginModuleUrlOrFile: IRI|File): Promise<LabeledPluginWithId[]> {
    if (pluginModuleUrlOrFile instanceof File){
      const pluginModuleText = await pluginModuleUrlOrFile.text()
      return this.addPluginsFromCode(pluginModuleText)
    }
    const pluginModuleUrl: IRI = pluginModuleUrlOrFile
    const responseWithModule = await fetch(pluginModuleUrl)
    const pluginModuleText = await responseWithModule.text()
    return this.addPluginsFromCode(pluginModuleText)
  }


  /**
   * Removes a plugin from the RdfViewerState by it's ID
   * @param pluginId - ID of the plugin wished to be removed from the RdfViewerState
   */
  removePlugin(pluginId: number) {
    const index = this.plugins.findIndex((plugin) => plugin.id === pluginId)
    this.plugins.splice(index, 1)
    this.notify(["plugins"])
  }

  getPlugins(): readonly LabeledPluginWithId[] {
    return this.plugins
  }

  /**
   * Changes the order of plugins by the given order
   * @param order - IDs of plugins in the desired order
   */
  changePluginsOrder(order: number[]){
    const orderMap = new Map(order.map((id, index) => [id, index]));
    this.plugins.sort((a, b) => {
      const posA = orderMap.get(a.id) ?? Infinity;
      const posB = orderMap.get(b.id) ?? Infinity;
      return posA - posB;
    });
    this.setSelectedPlugin(0)

    this.notify(["plugins"])
  }

  /**
   * Sets the selected plugin by it's id
   * @param pluginId - ID of the plugin wished to be selected for displaying the entity
   */
  setSelectedPlugin(pluginId: number) {
    const index = this.plugins.findIndex((plugin) => plugin.id == pluginId)
    this.selectedPluginIndex = index
    this.notify(["selectedPluginIndex"]);
  }


  
  // ===  D A T A   S O U R C E S   S T A T E  ===


  /**
   * Adds a new data source to the RdfViewerState
   * @param source - IRI or a File of the new data source
   * @param type - The type of the new data source 
   */
  addDataSource(source: IRI | File, type: DataSourceType) {
    this.dataSources.push(dataSourceFactory(type, source));
    this.notify(["dataSources"]);
  }

  /**
   * Removes a data source with the given IRI
   * 
   * @param identifier - IRI of the data source to be removed from RdfViewerState
   */
  removeDataSource(identifier: IRI) {
    this.dataSources = this.dataSources.filter(
      (ds) => ds.identifier !== identifier,
    );
    this.notify(["dataSources"]);
  }

  /**
   * 
   * @returns a list of added data sources
   */
  getDataSources(): readonly DataSource[] {
    return this.dataSources
  }


  // ===  E N T I T Y   I R I   S T A T E  ===

  /**
   * Sets the entity that will be displayed by a plugin
   * @param iri - The IRI of an entity that is desired to be displayed by a plugin
   */
  setEntityIri(iri: IRI) {
    this.entityIri = decodeURIComponent(iri);
    this.notify(["entityIri"]);
  }

  /**
   * 
   * @returns the entity IRI
   */
  getEntityIri(): IRI {
    return this.entityIri
  }


  // ===  L A N G U A G E S   S T A T E  === 

  /**
   * Sets the preferred languages
   * @param languages - Array of language tags
   */
  setLanguages(languages: Language[]) {
    this.languages = languages;
    this.notify(["languages"]);
  }

  /**
   * 
   * @returns the preferred languages
   */
  getLanguages(): readonly Language[] {
    return this.languages
  }

  /**
   * 
   * @returns the language of the app
   */
  getAppLanguage(): Language {
    return this.appLanguage
  }

  /**
   * Sets a new language as the app language
   * @param language - Language tag to set the app language to
   */
  setAppLanguage(language: Language) {
    this.appLanguage = language
    this.notify(["appLanguage"])

  }
}


export type { LabeledPluginWithId }
export { RdfViewerState };
