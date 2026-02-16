import Sortable from "sortablejs";
import { DataSourceType } from "./data-source";
import { IRI } from "./rdf-types";
import { LabeledPluginWithId, StateManager } from "./state-manager";
import { notifier } from "./notifier";

function setupConfigurationElements(){
  setupDataSourceForm();
  setupDatasourceList();
  setupPluginForm();
  setupPluginList();
  setupConfigModal();
}

function setupDatasourceList() {
  const app = StateManager.getInstance();

  const dataSourcesList = document.getElementById(
    "source-list",
  ) as HTMLElement;
  app.subscribe(() => {
    const dataSourcesElements = app.dataSources.map((ds) => {
      return createDataSourceEntry(ds.type, ds.identifier);
    })
    dataSourcesList.replaceChildren(...dataSourcesElements);
  }, ["dataSources"], true);
}

function setupPluginList() {
  const app = StateManager.getInstance();

  const pluginListEl = document.getElementById(
    "plugin-list"
  ) as HTMLElement

  app.subscribe(() => {
    const listItems = app.plugins.map((plugin) => {
      return createPluginEntry(plugin)
    })
    pluginListEl.replaceChildren(...listItems)
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

function setupConfigModal() {
  const configBtn = document.getElementById(
    "show-config-btn",
  ) as HTMLButtonElement;
  const configModal = document.getElementById(
    "config-modal",
  ) as HTMLDialogElement;

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



function setupDataSourceForm() {
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

// TODO: this should be maybe somewhere closer to plugin declaration
enum PluginType {
  Url = "url",
  File = "file"
};

function setupPluginForm(){


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


function createPluginEntry(plugin: LabeledPluginWithId): HTMLElement {
  const app = StateManager.getInstance()

  const entryEl = document.createElement("li")
  entryEl.setAttribute("data-id", plugin.id.toString())
  const textEl = document.createElement("span")
  // TODO: language preference
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


export {
    setupConfigurationElements
}