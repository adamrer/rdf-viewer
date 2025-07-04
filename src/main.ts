import { Fetcher } from "./fetch-quads";
import {
  DisplayPluginModule,
  renderingContext,
  RenderingContext,
} from "./plugin";
import { displayQuads } from "./default-display";
import { AppState } from "./app-state";
import { Language, NO_LANG_SPECIFIED } from "./query/query-interfaces";
import { bind } from "./ui-binding";
import { notify } from "./notify";

window.onload = () => {
  bind();
};
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
  const fetcher: Fetcher = new Fetcher(app.dataSources);
  const langs: Language[] = app.languages;
  langs.push(NO_LANG_SPECIFIED);
  return renderingContext(entityIri, fetcher, langs, resultElement);
}

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
    notify("Failed to load plugin. Using default display.", "error");
    resultsEl.appendChild(messageParagraph);
    console.error(error);
    return displayQuads(context);
  }
}

export { display };
