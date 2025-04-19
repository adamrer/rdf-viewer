import { SimpleFetcher } from "./fetchQuads"


export interface DisplayPlugin {
    url: URL
    name: string
    classes: Array<string>
}

export interface DisplayPluginModule {
    displayQuads(entityIri: string, fetcher: SimpleFetcher, resultsDiv: HTMLElement): Promise<void>
}

export function loadDefaultPlugins(): void {
    const plugins: Array<DisplayPlugin> = [
        { url: new URL('http://localhost:3000/plugins/defaultPlugin.js'), name: 'Default Plugin', classes: [] },
        { url: new URL('http://localhost:3000/plugins/datasetPlugin.js'), name: 'Dataset Plugin', classes: ["https://www.w3.org/ns/dcat#Dataset"] }
    ]
    const selectedPluginUrl = plugins[1].url

    localStorage.setItem("plugins", JSON.stringify(plugins))
    localStorage.setItem("selectedPlugin", selectedPluginUrl.toString())
}

