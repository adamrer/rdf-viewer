import { IRI } from "./rdf-types";
import { RenderingContext } from "./rendering-context";

/**
 * Interface representing a recorded plugin in the memory.
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



export type { DisplayPlugin, DisplayPluginModule };
export { fetchPlugin };
