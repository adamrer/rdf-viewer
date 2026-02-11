
import { LabeledPlugin, PluginV1CompatibilityContext, PluginV1DataContext, PluginV1Handler, PluginV1InstanceContext, PluginV1SetupContext, PluginV1Vocabulary } from "./plugin-api";
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
 * @param plugin - plugin to use
 * @param entityIri - IRI of the entity to display
 * @param element - HTML element to display the entity in
 * @returns handler for the displayed plugin instance, or null if the instance couldn't be created
 * @see PluginV1InstanceContext
 * @see PluginV1Handler
 */
async function display(plugin: LabeledPlugin, entityIri: IRI, element: HTMLElement): Promise<PluginV1Handler | null> {
  const app = StateManager.getInstance();

  const instanceContext = createInstanceContext(app, createSetupContext().vocabulary.getReadableVocabulary());
  const pluginInstance = plugin.v1.createPluginInstance(instanceContext, entityIri)
  if (pluginInstance == null){
    
    throw new Error("Failed to create plugin instance.")
    // TODO: what to do with displayQuads? What default behavior to do?
    
  }
  element.replaceChildren();
  pluginInstance.mount(element);
  return {
    pluginLabel: plugin.label,
    unmount: pluginInstance.unmount
  }

}

function createInstanceContext(app: StateManager, vocabulary: PluginV1Vocabulary): PluginV1InstanceContext {
  const data = createDataContext(app.dataSources, vocabulary)
  return new PluginV1InstanceContextImpl(data, app.languages, notifier)
}

function createDataContext(dataSources: DataSource[], vocabulary: PluginV1Vocabulary): PluginV1DataContext {
  return new PluginV1DataContextImpl(dataSources, vocabulary);
}

function createCompatibilityContext(dataSources: DataSource[], vocabulary: PluginV1Vocabulary): PluginV1CompatibilityContext {
  return { data: createDataContext(dataSources, vocabulary) }
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
      const compatibility = await plugin.v1.checkCompatibility(createCompatibilityContext(app.dataSources, this.data.vocabulary), subjectIri)
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
  vocabulary: PluginV1DataContext["vocabulary"];

  constructor(dataSources: DataSource[], vocabulary: PluginV1Vocabulary) {
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
    this.vocabulary = vocabulary;
    
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

class PluginV1SetupContextImpl implements PluginV1SetupContext {
  
  data: Map<IRI, Set<IRI>> = new Map();
  
  vocabulary: PluginV1SetupContext["vocabulary"];


  constructor() {
    this.vocabulary = {
      addSemanticallySimilar: this.addSemanticallySimilar.bind(this),
      getReadableVocabulary: this.getReadableVocabulary.bind(this)
    }
  }

  addSemanticallySimilar(original: IRI, ...similar: IRI[]) {
    if (this.data.has(original)){
      const existing = this.data.get(original);
      if (existing){
        similar.forEach(iri => existing.add(iri));
      }
      else{
        this.data.set(original, new Set(similar));
      }
    }
  }

  getReadableVocabulary(): PluginV1Vocabulary {
    return {
      getSemanticallySimilar: (original: IRI) => {
        const similarSet = this.data.get(original);
        if (similarSet){
          const similarArray = Array.from(similarSet)
          similarArray.push(original)
          return similarArray;
        }
        return [original]
      }
    }
  }
}

function createSetupContext(): PluginV1SetupContext {
  return new PluginV1SetupContextImpl();
}

export { 
  display,
  createCompatibilityContext,
  createSetupContext,
  createDataContext
};
