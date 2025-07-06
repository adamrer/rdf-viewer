import { AppState } from "./app-state";
import { DataSourceType } from "./fetch-quads/data-sources";
import { display } from "./main";
import { fetchPlugin } from "./plugin";

const app = AppState.getInstance();

type PluginType = "url";

const addSourceFormEl = document.getElementById(
  "add-source-form",
)! as HTMLFormElement;
const addPluginFormEl = document.getElementById(
  "add-plugin-form",
)! as HTMLFormElement;
const iriEl = document.getElementById("iri")! as HTMLInputElement;
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

/**
 * Binds UI to AppState
 */
function bind() {
  addEventListeners();
  setupRadioTextToggle("source-option");
  setupRadioTextToggle("plugin-option");
  loadAppState();
}
/**
 * Loads values from AppState to UI
 */
function loadAppState() {
  iriEl.value = app.entityIri;
  languagesEl.value = app.languages.join(", ");
  app.dataSources.forEach((ds) =>
    createSourceEntry(ds.type, ds.identifier, dataSourcesContainer),
  );
  app.plugins.forEach((plugin) =>
    addPluginOption(plugin.label, plugin.url, pluginSelectEl),
  );
}
/**
 * Adds all event listeners to UI elements
 */
function addEventListeners() {
  addSourceFormEl.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(addSourceFormEl);
    addDataSourceFromFormData(formData);
    addSourceFormEl.reset();
    // prevent refresh
    return false;
  });

  addSourceFormEl.addEventListener("reset", () => {
    // will run after resetting the form
    setTimeout(() => {
      const radios = addSourceFormEl.querySelectorAll('input[type="radio"]');
      radios.forEach((radio) => {
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  });

  addPluginFormEl.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(addPluginFormEl);
    addPluginFromFormData(formData);
    addPluginFormEl.reset();
    // prevent refresh
    return false;
  });

  iriEl.addEventListener("change", () => {
    const iriText = iriEl.value;
    app.setEntityIRI(iriText);
  });

  languagesEl.addEventListener("change", () => {
    const languagesText = languagesEl.value;
    const whitespacesRE: RegExp = /[\s,]+\s*/g;
    const languages = languagesText.split(whitespacesRE);
    app.setLanguages(languages);
  });

  pluginSelectEl.addEventListener("change", () => {
    const selectedValue = pluginSelectEl.value;
    app.setSelectedPlugin(selectedValue);
  });

  displayBtn.addEventListener("click", async () => {
    displayBtn.disabled = true;
    const selectedPlugin = app.getSelectedPlugin();
    try {
      if (selectedPlugin) {
        const pluginModule = await fetchPlugin(selectedPlugin);
        await display(pluginModule);
      }
    } catch (err) {
      console.error("Error while displaying", err);
    } finally {
      displayBtn.disabled = false;
    }
  });

  configBtn.addEventListener("click", () => {
    configModal.showModal();
  });
  
  configModal.addEventListener("click", (event) => {
    // ::backdrop of the modal is clicked
    if (event.target === configModal){
      configModal.close();
    }
  });
}
/**
 * Adds plugin defined in formData to AppState and UI
 *
 * @param formData - FormData with information about new plugin
 */
function addPluginFromFormData(formData: FormData) {
  const pluginType: PluginType = formData.get("plugin") as PluginType;
  switch (pluginType) {
    case "url": {
      const url = formData.get("url-plugin") as string | null;
      if (!url) throw new Error("Missing url for plugin in form data");
      const label = formData.get("label-plugin") as string | null;
      if (!label) throw new Error("Missing label for plugin in form data");
      app.addPlugin(label, url);
      addPluginOption(label, url, pluginSelectEl);
      break;
    }

    default:
      throw new Error("Unknown plugin type");
  }
}
/**
 * Adds DataSource defined in formData to AppState and UI
 *
 * @param formData - FormData with information about new DataSource
 */
function addDataSourceFromFormData(formData: FormData) {
  const dsType: DataSourceType = formData.get("source") as DataSourceType;
  switch (dsType) {
    case DataSourceType.Sparql: {
      const sparqlUrl = formData.get("sparql-source-text") as string | null;
      if (!sparqlUrl)
        throw new Error("Missing url for sparql endpoint in form data");
      app.addSparqlDataSource(sparqlUrl);
      createSourceEntry(DataSourceType.Sparql, sparqlUrl, dataSourcesContainer);
      break;
    }
    case DataSourceType.LocalFile: {
      const files = formData.getAll("file-source-files") as File[];
      files.forEach((file) => {
        app.addFileDataSource(file);
        createSourceEntry(
          DataSourceType.LocalFile,
          file.name,
          dataSourcesContainer,
        );
      });
      break;
    }
    case DataSourceType.RemoteFile: {
      const fileUrl = formData.get("remote-file-source-text") as string | null;
      if (!fileUrl) throw new Error("Missing url for remote file in form data");
      app.addFileDataSource(fileUrl);
      createSourceEntry(
        DataSourceType.RemoteFile,
        fileUrl,
        dataSourcesContainer,
      );
      break;
    }
    case DataSourceType.LDP: {
      const ldpUrl = formData.get("ldp-source-text") as string | null
      if (!ldpUrl) throw new Error("Missing url for LDP data source in form data")
        app.addLDPDataSource(ldpUrl)
      createSourceEntry(
        DataSourceType.LDP,
        ldpUrl,
        dataSourcesContainer
      )
      break
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
 * Adds DataSource to the list of defined DataSources
 *
 * @param type - type of the DataSource
 * @param identifier - Identifier of the DataSource (URL or filename)
 * @param containerEl - Element containing the list of DataSources
 */
function createSourceEntry(
  type: DataSourceType,
  identifier: string,
  containerEl: HTMLElement,
) {
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
      typeLabel = "LDP Server"
      break
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
  containerEl.appendChild(entryEl);
}
/**
 * Adds new plugin option to HTML Select element
 *
 * @param label - label for the plugin
 * @param url - URL of the plugin
 * @param selectEl - HTML Select element for plugin selection
 */
function addPluginOption(
  label: string,
  url: string,
  selectEl: HTMLSelectElement,
) {
  const option = document.createElement("option");
  option.value = url;
  option.textContent = label;
  selectEl.appendChild(option);
}

export { bind };
