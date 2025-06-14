import { QuadsFetcher } from "./fetch-quads"
import { Language } from "./query-builder"

const pluginBaseUrl = import.meta.env.VITE_PLUGIN_BASE_URL

/**
 * Interface representing a recorded plugin in the memory.
 */
export interface DisplayPlugin {
    /** URL from which is the plugin accessible */
    url: string
    /** Label which will be displayed to the user */
    label: string
    /** Classes which the plugin can display */
    classes: Array<string>
}

/**
 * Interface representing the display plugin for displaying an RDF entity.
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
    displayQuads(entityIri: string, fetcher: QuadsFetcher, languages: Language[], resultsEl: HTMLElement): Promise<void>
}

function getPluginUrl(pluginName: string): string {
    return pluginBaseUrl+pluginName
} 

/**
 * Loads default display plugins.
 */
export function loadDefaultPlugins(): void {
    const plugins: Array<DisplayPlugin> = [
        { url: getPluginUrl('default-merge-plugin.js'), label: 'Default Merge Plugin', classes: [] },
        { url: getPluginUrl('default-table-plugin.js'), label: 'Default Table Plugin', classes: [] },
        { url: getPluginUrl('dataset-plugin.js'), label: 'Dataset Plugin', classes: ["https://www.w3.org/ns/dcat#Dataset"] }
    ]
    const selectedPluginUrl = plugins[0].url

    localStorage.setItem("plugins", JSON.stringify(plugins))
    localStorage.setItem("selectedPlugin", selectedPluginUrl.toString())
}

