import { SimpleFetcher } from "./fetch-quads"

const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL

export interface DisplayPlugin {
    url: string
    name: string
    classes: Array<string>
}

export interface DisplayPluginModule {
    displayQuads(entityIri: string, fetcher: SimpleFetcher, language: string, resultsDiv: HTMLElement): Promise<void>
}

function getPluginUrl(pluginName: string): string {
    return pluginBaseUrl+pluginName
} 

export function loadDefaultPlugins(): void {
    const plugins: Array<DisplayPlugin> = [
        { url: getPluginUrl('default-merge-plugin.js'), name: 'Default Merge Plugin', classes: [] },
        { url: getPluginUrl('default-table-plugin.js'), name: 'Default Table Plugin', classes: [] },
        { url: getPluginUrl('dataset-plugin.js'), name: 'Dataset Plugin', classes: ["https://www.w3.org/ns/dcat#Dataset"] }
    ]
    const selectedPluginUrl = plugins[0].url

    localStorage.setItem("plugins", JSON.stringify(plugins))
    localStorage.setItem("selectedPlugin", selectedPluginUrl.toString())
}

