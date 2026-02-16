import { LabeledPluginWithId, StateManager } from "./state-manager";
import { DataSourceType } from "./data-source-implementations";
import { createCompatibilityContext, createSetupContext, display } from "./display";
import { notifier } from "./notifier";
import { LabeledPlugin } from "./plugin-api";
import { IRI } from "./rdf-types";
import Sortable from "sortablejs"

enum PluginType {
  Url = "url",
  File = "file"
};


const iriEl = document.getElementById("iri")! as HTMLInputElement;
const compatiblePluginsBtn = document.getElementById(
  "compatible-plugins-btn",
) as HTMLButtonElement;
const languagesEl = document.getElementById("languages")! as HTMLInputElement;
const pluginSelectEl = document.getElementById(
  "choose-plugin",
) as HTMLSelectElement;
const dataSourcesContainer = document.getElementById(
  "source-list",
) as HTMLElement;
const configBtn = document.getElementById(
  "show-config-btn",
) as HTMLButtonElement;
const configModal = document.getElementById(
  "config-modal",
) as HTMLDialogElement;


const pluginListEl = document.getElementById(
  "plugin-list"
) as HTMLElement

/**
 * Binds UI to StateManager. Should be called once on application startup.
 */
function bind() {
  addEventListeners();
  setupDisplayButton();
  setupDataSourceSelect();
  setupPluginSelect();
  createSubscriptions();
  setupNotifier();

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

function setupNotifier(){
  const notificationContainer = document.getElementById(
    "notification-container",
  ) as HTMLElement;
  notifier.setNotificationContainer(notificationContainer);
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
    const listItems = app.plugins.map((plugin) => {
      // TODO: language preference
      return createPluginEntry(plugin)
    })
    pluginListEl.replaceChildren(...listItems)
  })
  
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

// TODO: Divide more conceptualy, not functionaly
/**
 * Adds all event listeners to UI elements
 */
function addEventListeners() {
    const app = StateManager.getInstance();



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

/**
 * Adds plugin defined in formData to StateManager and UI
 *
 * @param formData - FormData with information about new plugin
 */
async function addPluginsFromFormData(formData: FormData) {
  const app = StateManager.getInstance();
  const pluginType: PluginType = formData.get("plugin-add-type") as PluginType;
  switch (pluginType) {
    case PluginType.Url: {
      const url = formData.get("url-input") as IRI | null;
      if (!url) 
        throw new Error("Missing plugin url");
      
      try{
        await app.addPlugins(url);
      }
      catch(err){
        console.error("Error while loading plugin", err);
        notifier.notify("Failed to load plugin", "error");
      }
      break;
    }
    case PluginType.File: 
      const files = formData.getAll("file-input")
      if (files.length === 0) 
        throw new Error("Missing plugin file")

      try{
        const promises = files.map(file => app.addPlugins(file))
        await Promise.all(promises)
      }
      catch(err){
        console.error("Error while loading plugin", err);
        notifier.notify("Failed to load plugin", "error");
      }
      
      break;

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
  const dsType: DataSourceType = formData.get("data-source-select") as DataSourceType;
  switch (dsType) {
    case DataSourceType.Sparql: {
      const sparqlUrl = formData.get("url-input") as IRI | null;
      if (!sparqlUrl)
        throw new Error("Missing url for sparql endpoint in form data");
      app.addDataSource(sparqlUrl, DataSourceType.Sparql);
      break;
    }
    case DataSourceType.LocalFile: {
      const files = formData.getAll("file-input") as File[];
      files.forEach((file) => {
        app.addDataSource(file, DataSourceType.LocalFile);
      });
      break;
    }
    case DataSourceType.RemoteFile: {
      const fileUrl = formData.get("url-input") as IRI | null;
      if (!fileUrl) throw new Error("Missing url for remote file in form data");
      app.addDataSource(fileUrl, DataSourceType.RemoteFile);
      
      break;
    }
    case DataSourceType.Ldp: {
      const ldpUrl = formData.get("url-input") as IRI | null;
      if (!ldpUrl)
        throw new Error("Missing url for LDP data source in form data");
      app.addDataSource(ldpUrl, DataSourceType.Ldp);
      break;
    }

    default:
      throw new Error("Unknown data source type");
  }
}
function switchInput(input1: HTMLInputElement, input2: HTMLInputElement){
  input1.disabled = !input1.disabled
  input2.disabled = !input1.disabled
  if (input1.disabled){
    input1.style.display = "none"
    input2.style.display = "block"
  }
  else{
    input1.style.display = "block"
    input2.style.display = "none"
  }
}
function setupDataSourceSelect() {
  const addSourceFormEl = document.getElementById(
  "add-source-form",
) as HTMLFormElement;
  const select = addSourceFormEl.querySelector("#data-source-select") as HTMLSelectElement
  const urlTextInput = addSourceFormEl.querySelector("#data-source-url-input") as HTMLInputElement
  const fileInput = addSourceFormEl.querySelector("#data-source-file-input") as HTMLInputElement
  fileInput.style.display = "none"
  select.addEventListener("change", () => {
    const dataSourceType: DataSourceType = select.value as DataSourceType
    switch (dataSourceType) {
      case DataSourceType.Sparql:
        console.log("sparql ds")
        if (urlTextInput.disabled)
          switchInput(urlTextInput, fileInput)
        break;
      case DataSourceType.RemoteFile:
        if (urlTextInput.disabled)
          switchInput(urlTextInput, fileInput)
        break;
      case DataSourceType.LocalFile:
        if (fileInput.disabled)
          switchInput(urlTextInput, fileInput)
        break;      
      case DataSourceType.Ldp:
        if (urlTextInput.disabled)
          switchInput(urlTextInput, fileInput)
        break;
    
      default:
        break;
    }
  })

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
    if(urlTextInput.disabled)
      switchInput(urlTextInput, fileInput)
  });
  
}

function setupPluginSelect(){
  const addPluginFormEl = document.getElementById(
    "add-plugin-form",
  ) as HTMLFormElement;
  const select = addPluginFormEl.querySelector("#plugin-add-type-select") as HTMLSelectElement
  const urlInput = addPluginFormEl.querySelector("#plugin-add-url-input") as HTMLInputElement
  const fileInput = addPluginFormEl.querySelector("#plugin-add-file-input") as HTMLInputElement
  fileInput.style.display = "none"
  // show/hide inputs
  select.addEventListener("change", () => {
    const pluginType: PluginType = select.value as PluginType
    switch (pluginType) {
      case PluginType.Url:
        if (urlInput.disabled)
          switchInput(urlInput, fileInput)      
        break;
      case PluginType.File:
        if (fileInput.disabled)
          switchInput(urlInput, fileInput)
        break;
      default:
        break;
    }
  })


  // handle adding plugin form submission
  addPluginFormEl.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(addPluginFormEl);
    addPluginsFromFormData(formData);
    addPluginFormEl.reset();
    // prevent refresh
    return false;
  });

  addPluginFormEl.addEventListener("reset", () => {
    if (urlInput.disabled)
      switchInput(urlInput, fileInput)
  })

  // create sortable plugin list
  new Sortable(pluginListEl, {
    animation: 150,
    
    onEnd: (evt) => {
      const order: number[] = Array.from(evt.to.children).map(li => li.getAttribute("data-id")).filter(id => id !== null).map(id => Number(id))
      StateManager.getInstance().changePluginsOrder(order)
    }
  })

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
    case DataSourceType.Ldp:
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

function createPluginEntry(plugin: LabeledPluginWithId): HTMLElement {
  const app = StateManager.getInstance()

  const entryEl = document.createElement("li")
  entryEl.setAttribute("data-id", plugin.id.toString())
  const textEl = document.createElement("span")
  textEl.textContent = Object.values(plugin.label)[0]
  entryEl.appendChild(textEl)

  const removeButton = document.createElement("button");
  removeButton.className = "remove-btn";
  removeButton.textContent = "×";
  entryEl.appendChild(removeButton);
  removeButton.addEventListener("click", () => {
    const listElement = entryEl.parentElement
    if (listElement){
      const index = Array.from(listElement.children).indexOf(entryEl)

      entryEl.remove();
      app.removePlugin(index);
    }
  });
  return entryEl
}

export { bind };
