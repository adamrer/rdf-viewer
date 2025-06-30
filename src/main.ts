import { Fetcher } from './fetch-quads'
import { DisplayPluginModule, fetchPlugin, renderingContext } from './plugin'
import { displayQuads } from './default-display'
import { AppState } from './app-state';
import { Language, NO_LANG_SPECIFIED } from './query/query-interfaces';
import { bind } from './ui-binding';

window.onload = () => {
    bind()
}

async function display(): Promise<void> {
    const app = AppState.getInstance()
    const entityIri = app.entityIri
    const fetcher: Fetcher = new Fetcher(app.dataSources)
    const langs: Language[] = app.languages
    langs.push(NO_LANG_SPECIFIED)
    const selectedPlugin = app.getSelectedPlugin()
    const resultsEl : HTMLDivElement = document.getElementById('results') as HTMLDivElement;
    // Clear previous results
    resultsEl.innerHTML = ``;

    // get display plugin
    try{
        if (!selectedPlugin)
            throw new Error('Plugin not selected')
        const displayModule: DisplayPluginModule = await fetchPlugin(app.getSelectedPlugin())
        const context = renderingContext(entityIri, fetcher, langs, resultsEl)
        return displayModule.displayQuads(context)
    }
    catch (error){
        const messageParagraph = document.createElement('p')
        messageParagraph.innerText = "Failed to load plugin. Using default display."
        resultsEl.appendChild(messageParagraph)
        displayQuads(entityIri, fetcher, langs, resultsEl)
        console.error(error)
    }

}

export {
    display
}
