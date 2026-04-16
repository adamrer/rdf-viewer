import { RdfViewerState } from "../core/rdf-viewer-state";
import { handleEntityRender } from "./setup-main-settings-elements";

function setupWindow() {
  const displayBtn = document.getElementById(
    "display-btn",
  ) as HTMLButtonElement;
  const resultsEl = document.getElementById("results") as HTMLElement;

  if (displayBtn === null || resultsEl === null) {
    return;
  }
  window.addEventListener("popstate", () => {
    renderEntityFromSearchParams(
      async () => await handleEntityRender(displayBtn, resultsEl),
    );
  });
}

enum SearchParams {
  plugin,
  iri,
  languages,
}

function renderEntityFromSearchParams(displayFunction: () => void) {
  const app = RdfViewerState.getInstance();
  const params = new URLSearchParams(window.location.search);
  const pluginId = params.get(SearchParams.plugin.toString());
  const iri = params.get(SearchParams.iri.toString());
  const languages = params.get(SearchParams.languages.toString());
  if (iri === null || pluginId === null || languages === null) {
    return;
  }
  app.setEntityIri(iri);
  app.setSelectedPlugin(Number(pluginId));
  displayFunction();
}

export { setupWindow, SearchParams };
