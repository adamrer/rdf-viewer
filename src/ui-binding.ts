import { StateManager } from "./state-manager";
import { DataSourceType } from "./data-source-implementations";
import { createCompatibilityContext, createSetupContext, display } from "./display";
import { notifier } from "./notifier";
import { LabeledPlugin } from "./plugin-api";
import { IRI } from "./rdf-types";

type PluginType = "url";

const addSourceFormEl = document.getElementById(
  "add-source-form",
)! as HTMLFormElement;
const addPluginFormEl = document.getElementById(
  "add-plugin-form",
)! as HTMLFormElement;
const iriEl = document.getElementById("iri")! as HTMLInputElement;
const compatiblePluginsBtn = document.getElementById(
  "compatible-plugins-btn",
)! as HTMLButtonElement;
const languagesEl = document.getElementById("languages")! as HTMLInputElement;
const pluginSelectEl = document.getElementById(
  "choose-plugin",
)! as HTMLSelectElement;
const dataSourcesContainer = document.getElementById(
  "source-list",
)! as HTMLElement;
const displayBtn = document.getElementById("display-btn")! as HTMLButtonElement;
const configBtn = document.getElementById(
  "show-config-btn",
)! as HTMLButtonElement;
const configModal = document.getElementById(
  "config-modal",
)! as HTMLDialogElement;
const resultsEl: HTMLDivElement = document.getElementById(
  "results",
) as HTMLDivElement;
const notificationContainer = document.getElementById(
  "notification-container",
)! as HTMLElement;

/**
 * Binds UI to StateManager. Should be called once on application startup.
 */
function bind() {
  addEventListeners();
  setupRadioTextToggle("source-option");
  setupRadioTextToggle("plugin-option");
  createSubscriptions();
  notifier.setNotificationContainer(notificationContainer)
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

/** 
 * Creates subscriptions to StateManager changes to update the UI
 */
function createSubscriptions() {
  const app = StateManager.getInstance();

  app.subscribe(() => {
    const optionElements = app.plugins.map(createPluginOption);
    pluginSelectEl.replaceChildren(...optionElements);
  }, ["plugins"], true);
  
  app.subscribe(() => {
    iriEl.value = app.entityIri;
  }, ["entityIri"], true);

  app.subscribe(() => {
    languagesEl.value = app.languages.join(", ");
  }, ["languages"], true);  

  app.subscribe(() => {
    const dataSourcesElements = app.dataSources.map((ds) => {
      return createDataSourceEntry(ds.type, ds.identifier);
    })
    dataSourcesContainer.replaceChildren(...dataSourcesElements);
  }, ["dataSources"], true);
}

/**
 * Adds all event listeners to UI elements
 */
function addEventListeners() {
  const app = StateManager.getInstance();

  // handle adding data source form submission
  addSourceFormEl.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(addSourceFormEl);
    addDataSourceFromFormData(formData);
    addSourceFormEl.reset();
    // prevent refresh
    return false;
  });

  // handle resetting data source form - disable text/file inputs
  addSourceFormEl.addEventListener("reset", () => {
    // will run after reseting the form
    setTimeout(() => {
      const radios = addSourceFormEl.querySelectorAll('input[type="radio"]');
      radios.forEach((radio) => {
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  });

  // handle adding plugin form submission
  addPluginFormEl.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(addPluginFormEl);
    addPluginsFromFormData(formData);
    addPluginFormEl.reset();
    // prevent refresh
    return false;
  });

  // bind change of IRI input to StateManager
  iriEl.addEventListener("change", () => {
    const iriText = iriEl.value;
    app.setEntityIRI(iriText);
  });


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
      notifier.notify(`Found ${compatiblePlugins.length} compatible plugin(s).`, "success");
    } catch (err) {
      console.error("Error while finding compatible plugins", err);
      notifier.notify("Failed to find compatible plugins. Please check the console for more details.", "error");
    } finally {
      compatiblePluginsBtn.disabled = false;
    }

  });

  // bind change of languages input to StateManager
  languagesEl.addEventListener("change", () => {
    const languagesText = languagesEl.value;
    const whitespacesRE: RegExp = /[\s,]+\s*/g;
    const languages = languagesText.split(whitespacesRE);
    app.setLanguages(languages);
  });

  // handle plugin selection change
  pluginSelectEl.addEventListener("change", () => {
    app.setSelectedPlugin(pluginSelectEl.selectedIndex);
  });

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

  // show configuration modal on button click
  configBtn.addEventListener("click", () => {
    configModal.showModal();
  });

  // close modal when clicking outside of it
  configModal.addEventListener("click", (event) => {
    // ::backdrop of the modal is clicked
    if (event.target === configModal) {
      configModal.close();
    }
  });
}
/**
 * Adds plugin defined in formData to StateManager and UI
 *
 * @param formData - FormData with information about new plugin
 */
async function addPluginsFromFormData(formData: FormData) {
  const app = StateManager.getInstance();
  const pluginType: PluginType = formData.get("plugin") as PluginType;
  switch (pluginType) {
    case "url": {
      const url = formData.get("url-plugin") as IRI | null;
      if (!url) throw new Error("Missing url for plugin in form data");
      
      try{
        await app.addPlugins(url);
      }
      catch(err){
        console.error("Error while loading plugin", err);
        notifier.notify("Failed to load plugin. Please check the console for more details.", "error");
      }
      break;
    }

    default:
      throw new Error("Unknown plugin type");
  }
}
/**
 * Adds DataSource defined in formData to StateManager and UI
 *
 * @param formData - FormData with information about new DataSource
 */
function addDataSourceFromFormData(formData: FormData) {
  const app = StateManager.getInstance();
  const dsType: DataSourceType = formData.get("source") as DataSourceType;
  switch (dsType) {
    case DataSourceType.Sparql: {
      const sparqlUrl = formData.get("sparql-source-text") as IRI | null;
      if (!sparqlUrl)
        throw new Error("Missing url for sparql endpoint in form data");
      app.addDataSource(sparqlUrl, DataSourceType.Sparql);
      break;
    }
    case DataSourceType.LocalFile: {
      const files = formData.getAll("file-source-files") as File[];
      files.forEach((file) => {
        app.addDataSource(file, DataSourceType.LocalFile);
      });
      break;
    }
    case DataSourceType.RemoteFile: {
      const fileUrl = formData.get("remote-file-source-text") as IRI | null;
      if (!fileUrl) throw new Error("Missing url for remote file in form data");
      app.addDataSource(fileUrl, DataSourceType.RemoteFile);
      
      break;
    }
    case DataSourceType.LDP: {
      const ldpUrl = formData.get("ldp-source-text") as IRI | null;
      if (!ldpUrl)
        throw new Error("Missing url for LDP data source in form data");
      app.addDataSource(ldpUrl, DataSourceType.LDP);
      break;
    }

    default:
      throw new Error("Unknown data source type");
  }
}
/**
 * Sets the text/file inputs with radio input disabled if radio input is not selected
 *
 * @param containerClass - class of the container that holds radio input with text or file input that will be disabled
 */
function setupRadioTextToggle(containerClass: string) {
  const containers = Array.from(
    document.querySelectorAll<HTMLElement>(`.${containerClass}`),
  );

  function sync() {
    for (const container of containers) {
      const radio = container.querySelector<HTMLInputElement>(
        'input[type="radio"]',
      )!;
      const input = container.querySelector<HTMLInputElement>(
        'input[type="text"], input[type="file"]',
      )!;
      input.disabled = !radio.checked;
    }
  }

  for (const radio of document.querySelectorAll<HTMLInputElement>(
    `.${containerClass} input[type="radio"]`,
  )) {
    radio.addEventListener("change", sync);
  }

  sync();
}
/**
 * Creates an HTML element representing a DataSource entry in the UI
 *
 * @param type - type of the DataSource
 * @param identifier - Identifier of the DataSource (URL or filename)
 * @returns the HTMLElement representing the DataSource entry
 */
function createDataSourceEntry(
  type: DataSourceType,
  identifier: IRI | string
): HTMLElement {
  const app = StateManager.getInstance();
  const entryEl = document.createElement("div");
  entryEl.className = "source-entry";
  let typeLabel;
  switch (type) {
    case DataSourceType.LocalFile:
      typeLabel = "File";
      break;
    case DataSourceType.RemoteFile:
      typeLabel = "Remote File";
      break;
    case DataSourceType.Sparql:
      typeLabel = "SPARQL Endpoint";
      break;
    case DataSourceType.LDP:
      typeLabel = "LDP Server";
      break;
    default:
      break;
  }
  entryEl.innerHTML = `<b>${typeLabel}</b>: <span>${identifier}</span>`;
  // add remove button for data source
  const removeButton = document.createElement("button");
  removeButton.className = "remove-btn";
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => {
    entryEl.remove();
    app.removeDataSource(identifier);
  });
  entryEl.appendChild(removeButton);
  return entryEl;
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


export { bind };
