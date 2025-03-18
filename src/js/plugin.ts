import { FetchedQuads, Fetcher } from "./fetchQuads"
import N3 from 'n3'

export interface DisplayPlugin {
    url: URL
    name: string
    classes: Array<string>
}

export interface DisplayPluginModule {
    printQuads(quads: Array<FetchedQuads|null>, fetcher: Fetcher, resultsDiv: HTMLElement): Promise<void>
}

export interface QuadsDisplayer {
    display(quads: Array<N3.Quad>, plugin: DisplayPlugin, element: HTMLElement): void
}

export function loadDefaultPlugins(): void {
    const plugins: Array<DisplayPlugin> = [
        { url: new URL('http://localhost:3000/plugins/defaultPlugin.js'), name: 'Default', classes: [] }
    ]
    const selectedPluginUrl = plugins[0].url

    localStorage.setItem("plugins", JSON.stringify(plugins))
    localStorage.setItem("selectedPlugin", selectedPluginUrl.toString())
}

