import { createCompatibilityContext, createSetupContext} from "../plugin-api/context-implementations";
import { renderEntityWithPlugin } from "../render-entity-with-plugin";
import { notifier } from "./notifier";
import { IRI } from "../rdf-types";
import { LabeledPluginWithId, StateManager } from "../state-manager";


/**
 * Setups the HTML elements that are in the main settings of the UI
 */
function setupMainSettingsElements(){
  setupIriElement();
  setupLanguageInput();
  setupPluginSelect();
  setupDisplayButton();
}


/**
 * Binds the text input for setting the language preferences to the StateManager
 * @see StateManager
 */
function setupLanguageInput() {
  const languagesEl = document.getElementById("languages")! as HTMLInputElement;
  const app = StateManager.getInstance();

  app.subscribe(() => {
    languagesEl.value = app.getLanguages().join(", ");
  }, ["languages"], true);  

  // bind change of languages input to StateManager
  languagesEl.addEventListener("change", () => {
    const languagesText = languagesEl.value;
    const whitespacesRE: RegExp = /[\s,]+\s*/g;
    const languages = languagesText.split(whitespacesRE);
    app.setLanguages(languages);
  });
}

/**
 * Binds the IRI element to the StateManager
 * @see StateManager
 */
function setupIriElement(){
  const iriEl = document.getElementById("iri")! as HTMLInputElement;
  const app = StateManager.getInstance()

  // bind change of IRI input to StateManager
  iriEl.addEventListener("change", () => {
    const iriText = iriEl.value;
    app.setEntityIri(iriText);
  });

  app.subscribe(() => {
    iriEl.value = app.getEntityIri();
  }, ["entityIri"], true);

}


/**
 * Setups the button for displaying plugin with set entity IRI in the StateManager
 * @see StateManager
 */
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
        renderEntityWithPlugin(selectedPlugin, app.getEntityIri(), resultsEl);
      }
      else {
        notifier.notify("No plugin selected.", "error");
      }
    } catch (err) {
      notifier.notify("Couldn't display entity", "error")
    } finally {
      displayBtn.disabled = false;
    }
  });
}

/**
 * Setups the element for selecting a plugin
 */
function setupPluginSelect() {
  const pluginSelectEl = document.getElementById(
    "choose-plugin",
  ) as HTMLSelectElement;
  const app = StateManager.getInstance()
  
  app.subscribe(() => {
    const optionElements = app.plugins.map(createPluginOption);
    pluginSelectEl.replaceChildren(...optionElements);
    if (optionElements.length > 0){
      const pluginId = Number(pluginSelectEl.options[pluginSelectEl.selectedIndex].value)
      app.setSelectedPlugin(pluginId)
    }
  }, ["plugins"], true);
  
  // handle plugin selection change
  pluginSelectEl.addEventListener("change", () => {
    const pluginId = Number(pluginSelectEl.options[pluginSelectEl.selectedIndex].value)
    app.setSelectedPlugin(pluginId);
  });
  const compatiblePluginsBtn = document.getElementById(
    "compatible-plugins-btn",
  ) as HTMLButtonElement;
  
  // setup compatible plugins button
  compatiblePluginsBtn.addEventListener("click", async () => {
    const iri = app.getEntityIri();
    if (!iri) {
      notifier.notify("Please enter an IRI to find compatible plugins.", "error");
      return;
    }
    compatiblePluginsBtn.disabled = true;
    try {
      const pluginsWithCompatibility = await getPluginsCompatibility(iri);
      const compatiblePlugins = pluginsWithCompatibility.filter(plugin => plugin.isCompatible)
      const nonComatiblePlugins = pluginsWithCompatibility.filter(plugin => !plugin.isCompatible)

      const compatibleOptGroup = document.createElement("optgroup")
      compatibleOptGroup.label = "Compatible"
      const nonCompatibleOptGroup = document.createElement("optgroup")
      nonCompatibleOptGroup.label = "Not Compatible"
      const compatibleOptions = compatiblePlugins.map(plugin => createPluginOption(plugin.plugin))
      const nonCompatibleOptions = nonComatiblePlugins.map(plugin => createPluginOption(plugin.plugin))
      
      compatibleOptGroup.replaceChildren(...compatibleOptions)
      nonCompatibleOptGroup.replaceChildren(...nonCompatibleOptions)
      
      pluginSelectEl.replaceChildren(...[compatibleOptGroup, nonCompatibleOptGroup])
      const firstCompatiblePluginId = compatiblePlugins[0].plugin.id
      app.setSelectedPlugin(firstCompatiblePluginId)

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
function createPluginOption(plugin: LabeledPluginWithId): HTMLOptionElement {
  const app = StateManager.getInstance()
  const language = app.getAppLanguage()

  const label = plugin.label[language] ?? Object.values(plugin.label)[0]
  const option = document.createElement("option");
  option.value = plugin.id.toString();
  option.textContent = label;
  return option;
}



type CompatiblePlugin = {
  plugin: LabeledPluginWithId;
  isCompatible: boolean;
  priority: number;
}

/**
 * Checks compatibility of all plugins with the given IRI and returns 
 * the compatible plugins sorted by their priority.
 * 
 * @param iri - IRI of the entity to find compatible plugins for
 * @returns list of plugins with information about compatibility and sorted by their priority
 */
async function getPluginsCompatibility(iri: IRI): Promise<CompatiblePlugin[]> {
  const app = StateManager.getInstance();
  const context = createCompatibilityContext(app.getDataSources(), createSetupContext().vocabulary.getReadableVocabulary());
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
  compatiblePlugins.sort((a, b) => b.priority - a.priority);
  return compatiblePlugins;
}


export {
    setupMainSettingsElements
}