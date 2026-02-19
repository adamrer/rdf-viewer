import { DataSource } from "../fetch/data-source";
import { renderEntityWithPlugin } from "../render-entity-with-plugin";
import { StructuredQuads, Fetcher, fetcher, mergeStructuredQuads } from "../fetch/fetcher";
import { queryBuilder } from "../query/query-builder";
import { Language, Query } from "../query/query-interfaces";
import { graphNavigator } from "../graph-navigator";
import { notifier, NotifierService } from "../ui/notifier";
import { PluginV1Vocabulary, PluginV1InstanceContext, PluginV1DataContext, PluginV1CompatibilityContext, PluginV1Handler, PluginV1SetupContext } from "./interfaces";
import { IRI } from "../rdf-types";
import { StateManager } from "../state-manager";

function createInstanceContext(app: StateManager, vocabulary: PluginV1Vocabulary): PluginV1InstanceContext {
  const data = createDataContext(app.getDataSources(), vocabulary)
  return new PluginV1InstanceContextImpl(data, app.getLanguages(), notifier)
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
      const compatibility = await plugin.v1.checkCompatibility(createCompatibilityContext(app.getDataSources(), this.data.vocabulary), subjectIri)
        if (compatibility.isCompatible){
          const handler = renderEntityWithPlugin(plugin, subjectIri, element)
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

  // async labels(labelPredicates: IRI[], subjects?: IRI[], languages?: Language[]): Promise<Map<IRI, Sourced<Literal>[]>> {
  //   let iris: IRI[] = []
  //   if (subjects)
  //     iris = subjects
  //   else 
  //     iris = this.collectIris(this.fetchedStructured)
  //   const builder = this.fetcher.builder()
  //   let queryStep = builder.subjects(iris).predicates(labelPredicates).objects()
  //   if (languages)
  //     queryStep = queryStep.langs(languages)
  //   const query = queryStep.build()
  //   const queryResult = await this.fetcher.fetchStructuredQuads(query)
  //   const labelMap = new Map<IRI, Sourced<Literal>[]>()
  //   iris.forEach(iri => {
  //     labelPredicates.forEach(predicate => {
  //       if (queryResult[iri][predicate]) {
  //         labelMap.set(iri, Object.values(queryResult[iri][predicate]))
  //       }
  //     })
  //   })

  //   return labelMap

  // }
 
  addFetched(quads: StructuredQuads){
    this.fetchedStructured = mergeStructuredQuads(this.fetchedStructured, quads)
    this.fetched = graphNavigator(this.fetchedStructured)
  }

  // private collectIris(structuredQuads: StructuredQuads) {
  //   const iris = [];
  //   for (const subjectIri in structuredQuads) {
  //     iris.push(subjectIri);
  //     const predicates = structuredQuads[subjectIri];
  //     for (const predicateIri in predicates) {
  //       iris.push(predicateIri);
  //       const objectKeys = predicates[predicateIri];
  //       for (const objectKey in objectKeys) {
  //         const object = objectKeys[objectKey].value;
  //         if (object.termType !== "Literal") {
  //           iris.push(object.value);
  //         }
  //       }
  //     }
  //   }
  //   return iris;
  // }
  
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