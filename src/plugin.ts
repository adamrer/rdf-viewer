import { SimpleFetcher } from "./fetch-quads"

const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL

export interface DisplayPlugin {
    url: URL
    name: string
    classes: Array<string>
}

export interface DisplayPluginModule {
    displayQuads(entityIri: string, fetcher: SimpleFetcher, language: string, resultsDiv: HTMLElement): Promise<void>
}

export function loadDefaultPlugins(): void {
    const plugins: Array<DisplayPlugin> = [
        { url: new URL(`${pluginBaseUrl}default-table-plugin.js`), name: 'Default Table Plugin', classes: [] },
        { url: new URL(`${pluginBaseUrl}dataset-plugin.js`), name: 'Dataset Plugin', classes: ["https://www.w3.org/ns/dcat#Dataset"] }
    ]
    const selectedPluginUrl = plugins[1].url

    localStorage.setItem("plugins", JSON.stringify(plugins))
    localStorage.setItem("selectedPlugin", selectedPluginUrl.toString())
}

