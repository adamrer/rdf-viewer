
import { LabeledPlugin, PluginV1Handler } from "./plugin-api/interfaces";
import { StateManager } from "./state-manager";
import { IRI } from "./rdf-types";
import { createInstanceContext, createSetupContext } from "./plugin-api/context-implementations";

/**
 * Is responsible for displaying the entity with a plugin to the user.
 * 
 * @param plugin - plugin to use
 * @param entityIri - IRI of the entity to display
 * @param element - HTML element to display the entity in
 * @returns handler for the displayed plugin instance, or null if the instance couldn't be created
 * @see PluginV1InstanceContext
 * @see PluginV1Handler
 */
function renderEntityWithPlugin(plugin: LabeledPlugin, entityIri: IRI, element: HTMLElement): PluginV1Handler | null {
  const app = StateManager.getInstance();

  const instanceContext = createInstanceContext(app, createSetupContext().vocabulary.getReadableVocabulary());
  const pluginInstance = plugin.v1.createPluginInstance(instanceContext, entityIri)
  if (pluginInstance == null){
    throw new Error("Failed to create plugin instance.")
    
  }
  const usedPluginElement = document.createElement("span")
  const contentElement = document.createElement("div")

  if (app.getAppLanguage() in plugin.label)
    usedPluginElement.textContent = "Plugin: " + plugin.label[app.getAppLanguage()]
  else
    usedPluginElement.textContent = Object.values(plugin.label)[0]

  element.replaceChildren();
  element.appendChild(usedPluginElement)
  element.appendChild(contentElement)
  pluginInstance.mount(contentElement);

  return {
    pluginLabel: plugin.label,
    unmount: pluginInstance.unmount
  }

}

export { 
  renderEntityWithPlugin
};
