import { QuadsFetcher } from "./fetch-quads"
import { Language } from "./query-builder"

const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL

export interface DisplayPlugin {
    url: string
    name: string
    classes: Array<string>
}

/**
 * Interface for representing the display plugin for displaying RDF quads.
 */
export interface DisplayPluginModule {
    /**
     * Displays the specified entity
     * 
     * @param entityIri - IRI of an entity to be observed
     * @param fetcher - QuadsFetcher used for fetching the quads
     * @param language - The preferred language to display the quads
     * @param resultsEl - HTML element where to display the quads
     */
    displayQuads(entityIri: string, fetcher: QuadsFetcher, language: Language, resultsEl: HTMLElement): Promise<void>
}

function getPluginUrl(pluginName: string): string {
    return pluginBaseUrl+pluginName
} 

/**
 * Loads default display plugins.
 */
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

