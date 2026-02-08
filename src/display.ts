
import { PluginV1, PluginV1CompatibilityContext, PluginV1DataContext, PluginV1Handler, PluginV1InstanceContext } from "./plugin-api";
import { notifier, NotifierService } from "./notifier";
import { StateManager } from "./state-manager";
import { Fetcher, fetcher, mergeStructuredQuads, StructuredQuads } from "./fetcher";
import { Language, Query } from "./query-interfaces";
import { IRI } from "./rdf-types";
import { queryBuilder } from "./query-builder";
import { DataSource } from "./data-source";
import { graphNavigator } from "./graph-navigator";

/**
 * Is responsible for displaying the entity with a plugin to the user.
 * 
 * @param plugin plugin to use
 */
async function display(plugin: PluginV1, entityIri: IRI): Promise<void> {
  const app = StateManager.getInstance();
  const pluginInstance = plugin.createPluginInstance(createInstanceContext(app), entityIri)
  if (pluginInstance == null){
    // error msg - couldn't create plugin instance
    notifier.notify("Failed to create plugin instance.", "error");
    // TODO: what to do with displayQuads? What default behavior to do?
    return;
  }
  const resultsEl: HTMLDivElement = document.getElementById(
    "results",
  ) as HTMLDivElement;
  pluginInstance?.mount(resultsEl);

}

function createInstanceContext(app: StateManager): PluginV1InstanceContext {
  const data = createDataContext(app.dataSources)
  return new PluginV1InstanceContextImpl(data, app.languages, notifier)
}

function createDataContext(dataSources: DataSource[]): PluginV1DataContext {
  return new PluginV1DataContextImpl(dataSources);
}

function createCompatibilityContext(app: StateManager): PluginV1CompatibilityContext {
  const data = createDataContext(app.dataSources)
  return { data: data}
} 

class PluginV1InstanceContextImpl implements PluginV1InstanceContext {

  data: PluginV1InstanceContext["data"];
  configuration: PluginV1InstanceContext["configuration"];
  notification: PluginV1InstanceContext["notification"];
  interoperability: PluginV1InstanceContext["interoperability"];

  constructor(dataContext: PluginV1DataContext, languages: Language[], notification: NotifierService){
    this.data = dataContext;
    this.notification = notification;
    this.configuration = {
      languages: languages
    }
    this.interoperability = {
      renderSubject: this.renderSubject.bind(this)
    };
  }
  async renderSubject(subjectIri: IRI, element: HTMLElement): Promise<PluginV1Handler|null> {
    // find compatible plugin in order of state manager plugins and use the first one

    const app = StateManager.getInstance();
    for (const plugin of app.plugins){
      const compatibility = await plugin.v1.checkCompatibility(createCompatibilityContext(app), subjectIri)
        if (compatibility.isCompatible){
          const handler = display(plugin, subjectIri, element)
          return handler;
        }
      }
    return null;
  }

}

class PluginV1DataContextImpl implements PluginV1DataContext {

  private fetchedStructured: StructuredQuads = {};
  private fetcher: Fetcher;

  fetched = graphNavigator(this.fetchedStructured);

  fetch: PluginV1DataContext["fetch"]
  query: PluginV1DataContext["query"]

  constructor(dataSources: DataSource[]) {
    this.fetcher = fetcher(dataSources);
    this.query = {
      builder: queryBuilder,
      execute: this.execute.bind(this)
    }
    this.fetch = {
      types: this.types.bind(this),
      predicates: this.predicates.bind(this),
      objects: this.objects.bind(this)
    }
    
  }
  async execute(query: Query) {
    const structuredQuads = await this.fetcher.fetchStructuredQuads(query);
    this.fetchedStructured = structuredQuads;
    return graphNavigator(structuredQuads);
  }
  
  async types(subject: IRI) {
    const typePredicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    const builder = this.fetcher.builder()
    const query = builder.subjects([subject]).predicates([typePredicate]).objects().build();
    const typesQuads = this.fetcher.fetchStructuredQuads(query);
    this.fetchedStructured = mergeStructuredQuads(this.fetchedStructured, await typesQuads);
    const navigator = graphNavigator(await typesQuads);
    return navigator.subject(subject).predicate(typePredicate);
  }
  async predicates(subject: IRI) {
    const builder = this.fetcher.builder()
    const query = builder.subjects([subject]).predicates().objects().build();
    const predsQuads = this.fetcher.fetchStructuredQuads(query);
    this.fetchedStructured = mergeStructuredQuads(this.fetchedStructured, await predsQuads);
    const navigator = graphNavigator(await predsQuads);
    return Object.keys(navigator.subject(subject).predicates());
  }
  // TODO: language preferences?
  async objects(subject: IRI, predicate: IRI) {
    const builder = this.fetcher.builder()
    const query = builder.subjects([subject]).predicates([predicate]).objects().build()
    const objsQuads = this.fetcher.fetchStructuredQuads(query);
    this.fetchedStructured = mergeStructuredQuads(this.fetchedStructured, await objsQuads);
    const navigator = graphNavigator(await objsQuads);
    return navigator.subject(subject).predicate(predicate);
  }

  
}


export { 
  display,
  createCompatibilityContext 
};
