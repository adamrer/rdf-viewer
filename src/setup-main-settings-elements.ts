import { createCompatibilityContext, createSetupContext, display } from "./display";
import { notifier } from "./notifier";
import { LabeledPlugin } from "./plugin-api";
import { IRI } from "./rdf-types";
import { StateManager } from "./state-manager";

function setupMainSettingsElements(){
  setupIriElement();
  setupLanguageInput();
  setupPluginSelect();
  setupDisplayButton();
}


function setupLanguageInput() {
  const languagesEl = document.getElementById("languages")! as HTMLInputElement;
  const app = StateManager.getInstance();

  app.subscribe(() => {
    languagesEl.value = app.languages.join(", ");
  }, ["languages"], true);  

  // bind change of languages input to StateManager
  languagesEl.addEventListener("change", () => {
    const languagesText = languagesEl.value;
    const whitespacesRE: RegExp = /[\s,]+\s*/g;
    const languages = languagesText.split(whitespacesRE);
    app.setLanguages(languages);
  });
}


function setupIriElement(){
  const iriEl = document.getElementById("iri")! as HTMLInputElement;
  const app = StateManager.getInstance()

  // bind change of IRI input to StateManager
  iriEl.addEventListener("change", () => {
    const iriText = iriEl.value;
    app.setEntityIRI(iriText);
  });

  app.subscribe(() => {
    iriEl.value = app.entityIri;
  }, ["entityIri"], true);

}


function setupDisplayButton() {
  const app = StateManager.getInstance();
  const displayBtn = document.getElementById("display-btn")! as HTMLButtonElement;
  const resultsEl: HTMLDivElement = document.getElementById(
    "results",
  ) as HTMLDivElement;
  // handle display button click
  displayBtn.addEventListener("click", () => {
    displayBtn.disabled = true;
    const selectedPlugin = app.getSelectedPlugin();
    try {
      if (selectedPlugin) {
        display(selectedPlugin, app.entityIri, resultsEl);
      }
      else {
        notifier.notify("No plugin selected.", "error");
      }
    } catch (err) {
      console.error("Error while displaying", err);
    } finally {
      displayBtn.disabled = false;
    }
  });


}

function setupPluginSelect() {
  const pluginSelectEl = document.getElementById(
    "choose-plugin",
  ) as HTMLSelectElement;
  const app = StateManager.getInstance()
  
  app.subscribe(() => {
    const optionElements = app.plugins.map(createPluginOption);
    pluginSelectEl.replaceChildren(...optionElements);
  }, ["plugins"], true);
  
  // handle plugin selection change
  pluginSelectEl.addEventListener("change", () => {
    app.setSelectedPlugin(pluginSelectEl.selectedIndex);
  });
  const compatiblePluginsBtn = document.getElementById(
    "compatible-plugins-btn",
  ) as HTMLButtonElement;
  
  // setup compatible plugins button
  compatiblePluginsBtn.addEventListener("click", async () => {
    const iri = app.entityIri;
    if (!iri) {
      notifier.notify("Please enter an IRI to find compatible plugins.", "error");
      return;
    }
    compatiblePluginsBtn.disabled = true;
    try {
      const compatiblePlugins = await getCompatiblePlugins(iri);
      if (compatiblePlugins.length === 0) {
        notifier.notify("No compatible plugins found for the given IRI.", "info");
        return;
      }
      const options = compatiblePlugins.map((p) => createPluginOption(p.plugin));
      pluginSelectEl.replaceChildren(...options);
      pluginSelectEl.selectedIndex = 0;
      app.setSelectedPlugin(0)
      notifier.notify(`Found ${compatiblePlugins.length} compatible plugin(s).`, "success");
    } catch (err) {
      console.error("Error while finding compatible plugins", err);
      notifier.notify("Failed to find compatible plugins. Please check the console for more details.", "error");
    } finally {
      compatiblePluginsBtn.disabled = false;
    }

  });

}

/**
 * Creates HTMLOptionElement for given plugin
 * @param plugin - Plugin to create option for
 * @returns the HTMLOptionElement representing the plugin
 */
function createPluginOption(plugin: LabeledPlugin): HTMLOptionElement {
  // TODO: ability to set priority in label languages
  const label = Object.values(plugin.label)[0]
  const option = document.createElement("option");
  option.value = label;
  option.textContent = label;
  return option;
}



type CompatiblePlugin = {
  plugin: LabeledPlugin;
  isCompatible: boolean;
  priority: number;
}

/**
 * Checks compatibility of all plugins with the given IRI and returns 
 * the compatible plugins sorted by their priority.
 * 
 * @param iri - IRI of the entity to find compatible plugins for
 * @returns list of compatible plugins sorted by their priority
 */
async function getCompatiblePlugins(iri: IRI) {
  const app = StateManager.getInstance();
  const context = createCompatibilityContext(app.dataSources, createSetupContext().vocabulary.getReadableVocabulary());
  const compatiblePlugins: CompatiblePlugin[] = await Promise.all(
    app.plugins.map((plugin) =>
      plugin.v1.checkCompatibility(context, iri)
        .then((result) => ({ plugin, ...result }))
        .catch((err) => {
          console.error(`Error while checking compatibility for plugin ${Object.values(plugin.label)[0]}:`, err);
          return { plugin, isCompatible: false, priority: 0 };
        })
    ),
  );
  const filteredCompatiblePlugins = compatiblePlugins.filter((p) => p.isCompatible);
  filteredCompatiblePlugins.sort((a, b) => b.priority - a.priority);
  return filteredCompatiblePlugins;
}


export {
    setupMainSettingsElements
}