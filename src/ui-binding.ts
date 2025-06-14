import { AppState } from "./app-state";
import { DataSourceType } from "./fetch-quads";
import { display } from "./main";


const app = AppState.getInstance()


type PluginType = "url"

const addSourceFormEl = document.getElementById('add-source-form') as HTMLFormElement
const addPluginFormEl = document.getElementById('add-plugin-form') as HTMLFormElement
const iriEl = document.getElementById('iri') as HTMLInputElement
const languagesEl = document.getElementById('languages') as HTMLInputElement
const pluginSelectEl = document.getElementById('choose-plugin') as HTMLSelectElement
const dataSourcesContainer = document.getElementById('source-list') as HTMLElement
const displayBtn = document.getElementById('display-btn') as HTMLButtonElement

window.onload = () => {
    initialize()
}

function initialize(){
    addEventListeners()
    setupRadioTextToggle('source-option')
    setupRadioTextToggle('plugin-option')
    loadAppState()
}

function loadAppState(){
    iriEl.textContent = app.entityIri
    languagesEl.textContent = app.languages.join(', ')
    app.dataSources.forEach(ds => createSourceEntry(ds.type, ds.identifier, dataSourcesContainer))
    app.plugins.forEach(plugin => addPluginOption(plugin.label, plugin.url, pluginSelectEl))
}

function addEventListeners(){
    addSourceFormEl?.addEventListener('submit', (event: SubmitEvent) => {
        event.preventDefault()
        const formData = new FormData(addSourceFormEl)
        addDataSourceFromFormData(formData)
        addSourceFormEl.reset()
        // prevent refresh
        return false
    })
    
    addPluginFormEl?.addEventListener('submit', (event: SubmitEvent) => {
        event.preventDefault()
        const formData = new FormData(addPluginFormEl)
        addPluginFromFormData(formData)
        addPluginFormEl.reset()
        // prevent refresh
        return false
    })

    iriEl?.addEventListener('change', () => {
        const iriText = iriEl.value
        app.setEntityIRI(iriText)
    })

    languagesEl?.addEventListener('change', () => {
        const languagesText = languagesEl.value
        const whitespacesRE: RegExp = /(\s+|(\s*,\s*))/
        const languages = languagesText.split(whitespacesRE)
        app.setLanguages(languages)
    })

    pluginSelectEl?.addEventListener('change', () => {
        const selectedValue = pluginSelectEl.value
        app.setSelectedPlugin(selectedValue)
    })



    displayBtn?.addEventListener('click', () => {
        display()
    })

}
function addPluginFromFormData(formData: FormData){
    const pluginType: PluginType = formData.get('plugin') as PluginType
    switch (pluginType) {
        case "url":
            const url = formData.get('url-plugin') as string|null
            if (!url)
                throw new Error('Missing url for plugin in form data')
            const label = formData.get('label-plugin') as string|null
            if (!label)
                throw new Error('Missing label for plugin in form data')
            app.addPlugin(label, url)
            addPluginOption(label, url, pluginSelectEl)
            break;
    
        default:
            throw new Error('Unknown plugin type')
    }
}
function addDataSourceFromFormData(formData: FormData){
    const dsType: DataSourceType = formData.get('source') as DataSourceType
    switch (dsType) {
        case "sparql":
            const sparqlUrl = formData.get('sparql-source-text') as string | null
            if (!sparqlUrl)
                throw new Error('Missing url for sparql endpoint in form data')
            app.addSparqlDataSource(sparqlUrl)
            createSourceEntry("sparql", sparqlUrl, dataSourcesContainer)
            break;
        case "file":
            const files = formData.getAll('file-source-files') as File[]
            files.forEach(file => {
                app.addFileDataSource(file)
                createSourceEntry("file", file.name, dataSourcesContainer)
            })
            break;
        case "remote-file":
            const fileUrl = formData.get('remote-file-source-text') as string | null
            if (!fileUrl)
                throw new Error('Missing url for remote file in form data')
            app.addFileDataSource(fileUrl)
            createSourceEntry("remote-file", fileUrl, dataSourcesContainer)
            break;
    
        default:
            throw new Error('Unknown data source type')
        
    }
    
}
/**
 * Sets the text/file inputs with radio input disabled if radio input is not selected
 * 
 * @param containerClass - class of the container that holds radio input with text or file input that will be disabled
 */
function setupRadioTextToggle(containerClass: string) {
  const containers = Array.from(
    document.querySelectorAll<HTMLElement>(`.${containerClass}`)
  );

  function sync() {
    for (const container of containers) {
      const radio = container.querySelector<HTMLInputElement>('input[type="radio"]')!;
      const input = container.querySelector<
        HTMLInputElement
      >('input[type="text"], input[type="file"]')!;
      input.disabled = !radio.checked;
    }
  }

  for (const radio of document.querySelectorAll<HTMLInputElement>(
    `.${containerClass} input[type="radio"]`
  )) {
    radio.addEventListener('change', sync);
  }

  sync();
}
function createSourceEntry(type: DataSourceType, identifier: string, containerEl: HTMLElement){
    const entryEl = document.createElement('div')
    entryEl.className = 'source-entry'
    let typeLabel
    switch (type) {
        case 'file':
            typeLabel = 'File'
            break;
        case 'remote-file':
            typeLabel = 'Remote File'
            break;
        case 'sparql':
            typeLabel = 'SPARQL Endpoint'
            break;
        default:
            break;
    }
    entryEl.textContent = `${typeLabel}: ${identifier}`
    const removeButton = document.createElement('button')
    removeButton.className = 'remove-btn'
    removeButton.textContent = '×'
    removeButton.addEventListener('click', () => {
        entryEl.remove()
        app.removeDataSource(identifier)
    })
    entryEl.appendChild(removeButton)
    containerEl.appendChild(entryEl)
}

function addPluginOption(label: string, url: string, selectEl: HTMLSelectElement){
    const option = document.createElement('option')
    option.value = url
    option.textContent = label
    selectEl.appendChild(option)
}

app.subscribe(() => {
    console.log(app)
})