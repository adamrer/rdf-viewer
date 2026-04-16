import { renderEntityWithPlugin } from "../core/render-entity-with-plugin";
import { notifier } from "../view/notifier";
import { LabeledPluginWithId, RdfViewerState } from "../core/rdf-viewer-state";
import { withLoading } from "../view/spinner";
import { SearchParams } from "./setup-window";
import { Language } from "../query/query";

/**
 * Setups the HTML elements that are in the main settings of the UI
 */
function setupMainSettingsElements() {
  setupIriElement();
  setupCompatiblePluginsButton();
  setupPluginSelect();
  setupLanguageInput();
  setupDisplayButton(document.getElementById("results") as HTMLDivElement);
}

/**
 * Binds the text input for setting the language preferences to the RdfViewerState
 * @see RdfViewerState
 */
function setupLanguageInput() {
  const languagesEl = document.getElementById("languages") as HTMLInputElement;
  if (languagesEl === null) {
    return;
  }
  const app = RdfViewerState.getInstance();

  app.subscribe(
    () => {
      languagesEl.value = app.getLanguages().join(", ");
    },
    ["languages"],
    true,
  );

  // bind change of languages input to RdfViewerState
  languagesEl.addEventListener("change", () => {
    const languagesText = languagesEl.value;
    const whitespacesRE: RegExp = /[\s,]+\s*/g;
    const languages = languagesText.split(whitespacesRE);
    app.setLanguages(languages);
  });
}

/**
 * Binds the IRI element to the RdfViewerState
 * @see RdfViewerState
 */
function setupIriElement() {
  const iriEl = document.getElementById("iri") as HTMLInputElement;
  if (iriEl === null) {
    return;
  }
  const app = RdfViewerState.getInstance();

  // bind change of IRI input to RdfViewerState
  iriEl.addEventListener("change", () => {
    const iriText = iriEl.value;
    const errorElement = document.getElementById("invalid-iri-error");
    try {
      errorElement?.classList.add("u-hidden");
      app.setEntityIri(iriText);
    } catch {
      errorElement?.classList.remove("u-hidden");
    }
  });

  app.subscribe(
    () => {
      iriEl.value = app.getEntityIri();
    },
    ["entityIri"],
    true,
  );
}

/**
 * Setups the button for dividing the plugins to compatible and non-compatible
 */
function setupCompatiblePluginsButton() {
  const app = RdfViewerState.getInstance();

  const compatiblePluginsWrapper = document.getElementById(
    "compatible-plugins-wrapper",
  ) as HTMLDivElement;
  const compatiblePluginsBtn = document.getElementById(
    "compatible-plugins-btn",
  ) as HTMLButtonElement;

  const pluginSelectEl = document.getElementById(
    "choose-plugin",
  ) as HTMLSelectElement;

  if (
    compatiblePluginsBtn === null ||
    pluginSelectEl === null ||
    compatiblePluginsWrapper === null
  ) {
    return;
  }

  // setup compatible plugins button
  compatiblePluginsBtn.addEventListener("click", async () => {
    withLoading(compatiblePluginsWrapper, async () => {
      // IRI validation
      const iri = app.getEntityIri();
      if (!iri) {
        notifier.notify(
          "Please enter an IRI to find compatible plugins.",
          "error",
        );
        return;
      }
      const isInvalidIri = !document
        .getElementById("invalid-iri-error")
        ?.classList.contains("u-hidden");
      if (isInvalidIri) {
        notifier.notify("Please enter a valid IRI.", "error");
        return;
      }

      compatiblePluginsBtn.disabled = true;
      const compatibilityResult = await app.getPluginsCompatibility(iri);
      const pluginsWithCompatibility = compatibilityResult.compatibilities;
      const errors = compatibilityResult.errors;

      if (errors.length > 0) {
        compatibilityResult.errors.forEach((err) => {
          notifier.notify(err.message, "error");
        });
      }

      const compatiblePlugins = pluginsWithCompatibility.filter(
        (plugin) => plugin.isCompatible,
      );
      const nonComatiblePlugins = pluginsWithCompatibility.filter(
        (plugin) => !plugin.isCompatible,
      );

      if (compatiblePlugins.length === 0) {
        notifier.notify("No compatible plugins found.", "warning");
      }

      // Divide plugins by compatibility in select element
      const compatibleOptGroup = document.createElement("optgroup");
      compatibleOptGroup.label = "Compatible";
      const nonCompatibleOptGroup = document.createElement("optgroup");
      nonCompatibleOptGroup.label = "Not Compatible";
      const compatibleOptions = compatiblePlugins.map((plugin) =>
        createPluginOption(plugin),
      );
      const nonCompatibleOptions = nonComatiblePlugins.map((plugin) =>
        createPluginOption(plugin),
      );

      compatibleOptGroup.replaceChildren(...compatibleOptions);
      nonCompatibleOptGroup.replaceChildren(...nonCompatibleOptions);

      pluginSelectEl.replaceChildren(
        ...[compatibleOptGroup, nonCompatibleOptGroup],
      );
      const firstCompatiblePluginId = compatiblePlugins[0].id;
      app.setSelectedPlugin(firstCompatiblePluginId);

      notifier.notify(
        `Found ${compatiblePlugins.length} compatible plugin(s).`,
        "success",
      );

      compatiblePluginsBtn.disabled = false;
    });
  });
}

/**
 * Setups the button for displaying plugin with set entity IRI in the RdfViewerState
 * @param resultsEl - the element where the plugin should render the entity
 * @see RdfViewerState
 */
function setupDisplayButton(resultsEl: HTMLDivElement) {
  const displayBtn = document.getElementById(
    "display-btn",
  ) as HTMLButtonElement;

  if (displayBtn === null) {
    return;
  }

  const app = RdfViewerState.getInstance();

  // handle display button click
  displayBtn.addEventListener("click", async () => {
    await handleEntityRender(displayBtn, resultsEl);
    pushViewState(
      app.getEntityIri(),
      app.getSelectedPlugin().id,
      app.getLanguages(),
    );
  });
}
/**
 * Handles errors and gives notifications to the user
 * rendering an entity with a plugin from RdfViewerState.
 *
 * @param displayBtn - button that will start the render
 * @param resultsEl - HTML element that will contain the results of the render
 */
async function handleEntityRender(
  displayBtn: HTMLButtonElement,
  resultsEl: HTMLElement,
) {
  const app = RdfViewerState.getInstance();

  displayBtn.disabled = true;
  const selectedPlugin = app.getSelectedPlugin();
  const invalidIriElement = document.getElementById("invalid-iri-error");
  const iriIsInvalid = !invalidIriElement?.classList.contains("u-hidden");
  try {
    if (selectedPlugin) {
      if (!iriIsInvalid) {
        const handler = await renderEntityWithPlugin(
          selectedPlugin,
          app.getEntityIri(),
          resultsEl,
        );
        if (handler == null) {
          notifier.notify("No available plugin for this entity.", "error");
          return;
        }
        const errors = handler.errors;
        errors.forEach((err) => {
          notifier.notify(err.message, "error");
        });
      } else {
        notifier.notify("Please enter a valid IRI.", "error");
      }
    } else {
      notifier.notify("No plugin selected.", "error");
    }
  } catch {
    notifier.notify("Couldn't display entity", "error");
  } finally {
    displayBtn.disabled = false;
  }
}
function pushViewState(
  iri: string,
  pluginId: number,
  languages: readonly Language[],
) {
  const url = new URL(window.location.href);
  url.searchParams.set(SearchParams.iri.toString(), iri);
  url.searchParams.set(SearchParams.plugin.toString(), pluginId.toString());
  url.searchParams.set(SearchParams.languages.toString(), languages.toString());
  history.pushState(
    {
      iri: iri,
      plugin: pluginId,
      languages: languages,
    },
    "",
    url.toString(),
  );
}

/**
 * Setups the element for selecting a plugin
 */
function setupPluginSelect() {
  const pluginSelectEl = document.getElementById(
    "choose-plugin",
  ) as HTMLSelectElement;
  if (pluginSelectEl === null) {
    return;
  }
  const app = RdfViewerState.getInstance();

  app.subscribe(
    () => {
      const optionElements = app.getPlugins().map(createPluginOption);
      pluginSelectEl.replaceChildren(...optionElements);
      if (optionElements.length > 0) {
        const pluginId = Number(
          pluginSelectEl.options[pluginSelectEl.selectedIndex].value,
        );
        app.setSelectedPlugin(pluginId);
      }
    },
    ["plugins", "appLanguage"],
    true,
  );

  // handle plugin selection change
  pluginSelectEl.addEventListener("change", () => {
    const pluginId = Number(
      pluginSelectEl.options[pluginSelectEl.selectedIndex].value,
    );
    app.setSelectedPlugin(pluginId);
  });
}

/**
 * Creates HTMLOptionElement for given plugin
 * @param plugin - Plugin to create option for
 * @returns the HTMLOptionElement representing the plugin
 */
function createPluginOption(plugin: LabeledPluginWithId): HTMLOptionElement {
  const app = RdfViewerState.getInstance();
  const language = app.getAppLanguage();

  const label = plugin.label[language] ?? Object.values(plugin.label)[0];
  const option = document.createElement("option");
  option.value = plugin.id.toString();
  option.textContent = label;
  return option;
}

export { setupMainSettingsElements, handleEntityRender };
