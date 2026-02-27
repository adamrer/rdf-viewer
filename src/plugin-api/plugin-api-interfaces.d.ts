import { IRI, LanguageString } from "../rdf-types";
import { NotifierService } from "../ui/notifier";
import { Sourced } from "../fetch/data-source";
import { Quad_Object } from "n3";
import { Language, QueryBuilder } from "../query/query-builder";
import { Query } from "../query/query";



/**
 * Interface representing the display plugin for displaying an RDF entity.
 */
interface PluginModule {
  /**
   * Registers the plugins provided by this module
   *
   * @returns List of registered plugins with their labels
   */
  registerPlugins(): LabeledPlugin[];
}


/**
 * Plugin with label information.
 */
interface LabeledPlugin {
  /**
   * Label to show in a plugin list.
   */
  label: LanguageString;
  /**
   * Version 1 interface.
   */
  v1: PluginV1,
}

/**
 * Representation of the plugin
 * 
 */
interface PluginV1 {

  /**
   * Setup the plugin (e.g., register vocabulary terms)
   * @param context - context for setting up the plugin
   */
  setup: (context: PluginV1SetupContext) => void;

  /**
   * Checks whether the given subject is compatible with the plugin
   * 
   * @param context - context in which the compatibility is checked
   * @param subject - IRI of the subject to check compatibility for
   * @returns if given subject is compatible with the plugin and its priority.
   * Priority is used when multiple plugins are compatible with the subject.
   */
  checkCompatibility: (context: PluginV1CompatibilityContext, subject: IRI) => Promise<{
    isCompatible: boolean;
    priority: PluginV1Match;
  }>

  /**
   * Creates an instance of the plugin for the given subject
   * 
   * @param context - context in which the plugin instance is created
   * @param subject - IRI of the subject to create the instance for
   * @returns the instance. If null, then the plugin can't be created
   */
  createPluginInstance: (
    context: PluginV1InstanceContext, 
    subject: IRI
  ) => PluginV1Instance | null;
}

/**
 * Context for setting up the plugin
 */
interface PluginV1SetupContext {

  /**
   * Writable interface, plugins should perform all modifications on load.
   */
  vocabulary: {

    /**
     * Add information that given IRI is semantically similar to the
     * original IRI, thus can be used instead of the original.
     */
    addSemanticallySimilar(original: IRI, ...similar: IRI[]): void;

    getReadableVocabulary(): PluginV1Vocabulary;
  };

}

/**
 * Context for checking compatibility of a plugin with a subject
 */
interface PluginV1CompatibilityContext {
  
  /**
   * Data access and query capabilities
   */
  data: PluginV1DataContext;

}

/**
 * Context for the creation of the plugin instance
 */
interface PluginV1InstanceContext {
  
  /**
   * Data access and query capabilities
   */
  data: PluginV1DataContext;

  /**
   * Services to use other suitable plugins in a plugin
   */
  interoperability: {
      renderSubject: (subject: IRI, element: HTMLElement) => Promise<PluginV1Handler|null>;
  }

  /**
   * Configuration options
   */
  configuration: {
      /**
       * Languages preferred by the user, sorted by priority
       */
      languages: readonly Language[];
  }

  /**
   * Notification service to notify the user
   */
  notification: NotifierService
}

/**
 * Context for fetching data in the plugins
 */
interface PluginV1DataContext {

  /**
   * Already fetched data from the data sources
   */
  fetched: GraphNavigator;

  /**
   * Simple interface for fetching data from data sources
   */
  fetch: {
    /**
     * 
     * @param subject - IRI of the subject
     * @returns list of types for the given subject
     */
    types: (subject: IRI) => Promise<Sourced<Quad_Object>[]>
    /**
     * Loads quads with the given subjects and predicates into the fetched data.
     * If predicates are not set, then fetch all quads
     * 
     * @param subject - IRI of the subject
     * @param predicates - IRIs of the predicates
     * @returns Graph navigator of the newly fetched quads
     * @see GraphNavigator
     */
    quads: (subjects: IRI[], predicates?: IRI[], languages?: Language[]) => Promise<GraphNavigator>
    
    /**
     * Loads labels for the given subjects and label predicates into the fetched data.
     * If subjects parameter is not given, labels for all IRIs in fetched are loaded.
     * 
     * @param labelPredicates - Predicates to use for labels
     * @param subjects - Subjects to get labels for. If not given, all subjects are considered.
     * @returns map of subject IRIs to their labels
     */
    // labels: (labelPredicates: IRI[], subjects?: IRI[]) => Promise<Map<IRI, Sourced<Literal>[]>>
  }

  /**
   * Querying interface for fetching data from data sources
   */
  query: {
    /**
     * 
     * @returns query builder for expressing a query for data sources
     */
    builder: () => QueryBuilder
    /**
     * 
     * @param query - query to evaluate on data sources
     * @returns queried data
     */
    execute: (query: Query) => Promise<GraphNavigator>
  }

  vocabulary: PluginV1Vocabulary;
}

interface PluginV1Vocabulary {

  /**
   * Return list of registered similar predicates.
   * Always return the given IRI as the first item.
   */
  getSemanticallySimilar(original: IRI): IRI[];

}

/**
 * Number representing how well the plugin matches the given subject
 */
enum PluginV1Match {
  Fallback = 0,
  Low = 1000,
  Medium = 2000,
  High = 3000,
}

interface PluginV1Handler {
  pluginLabel: LanguageString
  unmount: () => void;
}


/**
 * Instance of the plugin for a specific subject
 */
interface PluginV1Instance {
  /**
   * Mounts the plugin instance into the given HTML element
   * @param element - HTML element where to mount the plugin
   */
  mount: (element: HTMLElement) => void;
  /**
   * Unmounts the plugin instance and frees resources
   */
  unmount: () => void;
}

/**
 * For navigating through fetched quads
 */
interface GraphNavigator {
    /**
     * @returns all available subjects
     */
    subjects: () => IRI[]

    /**
     * Retrieves the subject navigator for the given subject
     * 
     * @param subject - IRI of the subject
     * @returns subject navigator for the given subject
     */
    subject: (subject: IRI) => SubjectNavigator
}

/**
 * Second step of the GraphNavigator. Retrieves objects of the given subject and predicates.
 * @see GraphNavigator
 */
interface SubjectNavigator {
    /**
     * @returns all predicates for the given subject
     */
    predicates: () => IRI[]

    /**
     * Retrieves all objects for the given predicate of the subject
     * 
     * @param predicate - IRI of the predicate to get objects for
     * @returns all objects for the given predicate
     */
    predicate: (predicate: IRI) => Sourced<Quad_Object>[]
}


export type { 
  PluginModule,
  PluginV1InstanceContext,
  PluginV1DataContext,
  PluginV1CompatibilityContext,
  PluginV1SetupContext,
  PluginV1Instance,
  PluginV1,
  PluginV1Handler,
  LabeledPlugin,
  PluginV1Vocabulary,
  GraphNavigator,
  SubjectNavigator

};