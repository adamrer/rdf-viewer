
import { DisplayPluginModule } from "./plugin-api";
import { displayQuads } from "./default-display";
import { notifier } from "./notifier";
import { AppState } from "./app-state";
import { FetcherImpl } from "./fetcher";
import {
  renderingContext,
  RenderingContext
} from "./rendering-context"
import { Language, NO_LANG_SPECIFIED } from "./query-interfaces";

/**
 * Calls the display function of plugin module
 *
 * @returns a promise to show the plugins result
 */
async function display(pluginModule: DisplayPluginModule): Promise<void> {
  const app = AppState.getInstance();
  const resultsEl: HTMLDivElement = document.getElementById(
    "results",
  ) as HTMLDivElement;

  const context = createContextFromAppState(app, resultsEl);
  // Clear previous results
  resultsEl.innerHTML = "";

  try {
    return pluginModule.displayQuads(context);
  } catch (error) {
    const messageParagraph = document.createElement("p");
    notifier.notify("Failed to load plugin. Using default display.", "error");
    resultsEl.appendChild(messageParagraph);
    console.error(error);
    return displayQuads(context);
  }
}


/**
 * Creates RenderingContext for plugin
 *
 * @param app - AppState instance from which the RenderingContext will be created
 * @param resultElement - HTML element where the plugin will be mounted
 * @returns RenderingContext from AppState instance
 * @see RenderingContext
 */
function createContextFromAppState(
  app: AppState,
  resultElement: HTMLElement,
): RenderingContext {
  const entityIri = app.entityIri;
  const fetcher: FetcherImpl = new FetcherImpl(app.dataSources);
  const langs: Language[] = app.languages;
  langs.push(NO_LANG_SPECIFIED);
  return renderingContext(entityIri, fetcher, langs, resultElement);
}


export { display };
