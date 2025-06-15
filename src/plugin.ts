import { QuadsFetcher } from "./fetch-quads"
import { Language } from "./query"

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

export async function fetchPlugin(plugin: DisplayPlugin): Promise<DisplayPluginModule> {
    return import(plugin.url)
}

