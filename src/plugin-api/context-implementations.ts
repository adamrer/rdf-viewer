import { DataSource } from "../fetch/data-source";
import { renderEntityWithPlugin } from "../render-entity-with-plugin";
import { StructuredQuads, Fetcher, fetcher, mergeStructuredQuads } from "../fetch/fetcher";
import { queryBuilder } from "../query/query-builder";
import { Language, Query } from "../query/query-interfaces";
import { graphNavigator } from "./graph-navigator-implementation";
import { notifier, NotifierService } from "../ui/notifier";
import { PluginV1Vocabulary, PluginV1InstanceContext, PluginV1DataContext, PluginV1CompatibilityContext, PluginV1Handler, PluginV1SetupContext } from "./plugin-api-interfaces";
import { IRI } from "../rdf-types";
import { RdfViewerState } from "../rdf-viewer-state";
import { createSpinner } from "../ui/spinner";

function createInstanceContext(app: RdfViewerState, vocabulary: PluginV1Vocabulary): PluginV1InstanceContext {
  const data = createDataContext(app.getDataSources(), vocabulary)
  return new PluginV1InstanceContextImpl(data, app.getLanguages(), notifier)
}

function createDataContext(dataSources: readonly DataSource[], vocabulary: PluginV1Vocabulary): PluginV1DataContext {
  return new PluginV1DataContextImpl(dataSources, vocabulary);
}

function createCompatibilityContext(dataSources: readonly DataSource[], vocabulary: PluginV1Vocabulary): PluginV1CompatibilityContext {
  return { data: createDataContext(dataSources, vocabulary) }
} 

class PluginV1InstanceContextImpl implements PluginV1InstanceContext {

  data: PluginV1InstanceContext["data"];
  configuration: PluginV1InstanceContext["configuration"];
  notification: PluginV1InstanceContext["notification"];
  interoperability: PluginV1InstanceContext["interoperability"];
  html: PluginV1InstanceContext["html"];

  constructor(dataContext: PluginV1DataContext, languages: readonly Language[], notification: NotifierService){
    this.data = dataContext;
    this.notification = notification;
    this.configuration = {
      languages: languages
    }
    this.interoperability = {
      renderSubject: this.renderSubject.bind(this)
    };
    this.html = {
      renderLoading: this.renderLoading.bind(this)
    }
  }
  async renderSubject(subjectIri: IRI, element: HTMLElement): Promise<PluginV1Handler|null> {
    // find compatible plugin in order of state manager plugins and use the first one

    const app = RdfViewerState.getInstance();
    for (const plugin of app.getPlugins()){
      const compatibility = await plugin.v1.checkCompatibility(createCompatibilityContext(app.getDataSources(), this.data.vocabulary), subjectIri)
        if (compatibility.isCompatible){
          const handler = renderEntityWithPlugin(plugin, subjectIri, element)
          return handler;
        }
      }
    return null;
  }

  renderLoading(element: HTMLElement) {
    element.appendChild(createSpinner())
  }

}

class PluginV1DataContextImpl implements PluginV1DataContext {

  private fetchedStructured: StructuredQuads = {};
  private fetcher: Fetcher;
  
  fetched = graphNavigator(this.fetchedStructured);
  
  fetch: PluginV1DataContext["fetch"]
  query: PluginV1DataContext["query"]
  vocabulary: PluginV1DataContext["vocabulary"];

  constructor(dataSources: readonly DataSource[], vocabulary: PluginV1Vocabulary) {
    this.fetcher = fetcher(dataSources);
    this.query = {
      builder: queryBuilder,
      execute: this.execute.bind(this)
    }
    this.fetch = {
      types: this.types.bind(this),
      quads: this.quads.bind(this),
      // labels: this.labels.bind(this)
 
    }
    this.vocabulary = vocabulary;
    
  }
  async execute(query: Query) {
    const structuredQuads = await this.fetcher.fetchStructuredQuads(query);
    this.addFetched(structuredQuads)
    const navigator = graphNavigator(structuredQuads);
    return navigator
  }
  
  async types(subject: IRI) {
    const typePredicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

    const builder = this.fetcher.builder()
    const query = builder.subjects([subject]).predicates([typePredicate]).objects().build();
    const typesQuads = this.fetcher.fetchStructuredQuads(query);
    this.addFetched(await typesQuads)
    const navigator = graphNavigator(await typesQuads);
    return navigator.subject(subject).predicate(typePredicate);
  }
  async quads(subjects: IRI[], predicates?: IRI[], languages?: Language[]) {
    if (subjects.length === 0)
      throw new Error("Subject for fetching data is not set")
    const builder = this.fetcher.builder()
    let queryStep = builder.subjects(subjects).predicates(predicates).objects();
    if (languages)
      queryStep = queryStep.langs(languages)
    const query = queryStep.build()

    const predsQuads = this.fetcher.fetchStructuredQuads(query);
    this.addFetched(await predsQuads)
    const navigator = graphNavigator(await predsQuads);
    return navigator;
  }
 
  addFetched(quads: StructuredQuads){
    this.fetchedStructured = mergeStructuredQuads(this.fetchedStructured, quads)
    this.fetched = graphNavigator(this.fetchedStructured)
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
  createCompatibilityContext,
  createSetupContext,
  createDataContext,
  createInstanceContext
};