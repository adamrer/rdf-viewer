import {
  LabeledPlugin,
  PluginV1Handler,
} from "../plugin-api/plugin-api-interfaces";
import { RdfViewerState } from "./rdf-viewer-state";
import { IRI } from "./rdf-types";
import {
  createInstanceContext,
  createSetupContext,
} from "../plugin-api/context-implementations";
import { withLoading } from "../view/spinner";

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
async function renderEntityWithPlugin(
  plugin: LabeledPlugin,
  entityIri: IRI,
  element: HTMLElement,
): Promise<PluginV1Handler | null> {
  const app = RdfViewerState.getInstance();

  const instanceContext = createInstanceContext(
    app,
    createSetupContext().vocabulary.getReadableVocabulary(),
  );

  const usedPluginElement = document.createElement("span");
  const contentElement = document.createElement("div");

  element.replaceChildren();
  const pluginInstance = plugin.v1.createPluginInstance(
    instanceContext,
    entityIri,
  );
  if (pluginInstance == null) {
    return null;
  }
  usedPluginElement.textContent = "Plugin: ";
  if (app.getAppLanguage() in plugin.label)
    usedPluginElement.textContent += plugin.label[app.getAppLanguage()];
  else usedPluginElement.textContent = Object.values(plugin.label)[0];

  element.appendChild(usedPluginElement);
  element.appendChild(contentElement);

  await withLoading(contentElement, async () => {
    await pluginInstance.mount(contentElement);
  });

  return {
    pluginLabel: plugin.label,
    pluginPriority: plugin.v1.priority,
    unmount: pluginInstance.unmount,
  };
}

export { renderEntityWithPlugin };
