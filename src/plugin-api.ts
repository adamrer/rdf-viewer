import { IRI, LanguageString } from "./rdf-types";
import { RenderingContext } from "./rendering-context";
import { NotifierService } from "./notifier";
import { GraphNavigator } from "./graph-navigator";
import { Sourced } from "./data-source";
import { Quad_Object } from "n3";
import { QueryBuilder } from "./query-builder";
import { Query } from "./query";

/**
 * Interface representing a recorded plugin in the memory.
 * 
 * TODO: get rid of this interface in favor of PluginV1
 */
interface DisplayPlugin {
  /** URL from which is the plugin accessible */
  url: IRI;
  /** Label which will be displayed to the user */
  label: string;
  /** Classes which the plugin can display */
  classes: Array<string>;
}

/**
 * Interface representing the display plugin for displaying an RDF entity.
 * TODO: get rid of this interface in favor of PluginModule
*/
interface DisplayPluginModule {
  /**
   * Displays the specified entity
   *
   * @param entityIri - IRI of an entity to be observed
   * @param fetcher - QuadsFetcher used for fetching the quads
   * @param language - The preferred language to display the quads
   * @param resultsEl - HTML element where to display the quads
   */
  displayQuads(context: RenderingContext): Promise<void>;
}

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
     *
     * TODO: We may replace this with skos:broader or skos:narrower ...
     */
    addSemanticallySimilar(original: IRI, similar: IRI): void;

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

interface PluginV1InstanceContext {
  
  /**
   * Data access and query capabilities
   */
  data: PluginV1DataContext;

  /**
   * Services to use other suitable plugins in a plugin
   */
  interoperability: {
      renderSubject: (subject: IRI, element: HTMLElement) => PluginV1Handler;
  }

  /**
   * Configuration options
   */
  configuration: {
      /**
       * Languages preferred by the user, sorted by priority
       */
      languages: string[];
  }

  /**
   * Notification service to notify the user
   */
  notification: NotifierService
}

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
    types: (subject: IRI) => Sourced<IRI>[]
    /**
     * 
     * @param subject - IRI of the subject
     * @returns list of predicates for the given subject
     */
    predicates: (subject: IRI) => Sourced<IRI>[]
    /**
     * 
     * @param subject - IRI of the subject
     * @param predicate - IRI of the predicate
     * @returns list of objects for the given subject and predicate
     */
    objects: (subject: IRI, predicate: IRI) => Sourced<Quad_Object>[]
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
     * @param query query to evaluate on data sources
     * @returns queried data
     */
    execute: (query: Query) => Promise<GraphNavigator>
  }
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
 * Fetches the given plugin
 *
 * @param plugin - plugin to be fetched
 * @returns the plugin module
 */
async function fetchPlugin(
  plugin: DisplayPlugin,
): Promise<DisplayPluginModule> {
  return import(/* @vite-ignore */ plugin.url);
}



export type { 
  DisplayPlugin, 
  DisplayPluginModule,
  PluginModule,
  PluginV1InstanceContext

};
export { fetchPlugin };
