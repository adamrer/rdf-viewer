
import { PluginV1, PluginV1InstanceContext } from "./plugin-api";
import { notifier } from "./notifier";
import { StateManager } from "./app-state";
import { FetcherImpl } from "./fetcher";
import {
  renderingContext,
  RenderingContext
} from "./rendering-context"
import { Language, NO_LANG_SPECIFIED } from "./query-interfaces";
import { IRI } from "./rdf-types";

/**
 * Is responsible for displaying the entity with a plugin to the user.
 * 
 * @param plugin plugin to use
 * @returns void
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
  return null as any; // TODO: implement
}


/**
 * Creates RenderingContext for plugin
 *
 * @param app - AppState instance from which the RenderingContext will be created
 * @param resultElement - HTML element where the plugin will be mounted
 * @returns RenderingContext from AppState instance
 * @see RenderingContext
 */
// TODO: refactor to createInstanceContext, DataContext etc.
function createContextFromAppState(
  app: StateManager,
  resultElement: HTMLElement,
): RenderingContext {
  const entityIri = app.entityIri;
  const fetcher: FetcherImpl = new FetcherImpl(app.dataSources);
  const langs: Language[] = app.languages;
  langs.push(NO_LANG_SPECIFIED);
  return renderingContext(entityIri, fetcher, langs, resultElement);
}


export { display };
