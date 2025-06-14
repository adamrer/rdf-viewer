import { Fetcher } from './fetch-quads'
import { DisplayPluginModule } from './plugin'
import { displayQuads } from './default-display'
import { AppState } from './app-state';
import { Language } from './query';


async function display(): Promise<void> {
    const app = AppState.getInstance()
    const entityIri = app.entityIri
    const fetcher: Fetcher = new Fetcher(app.dataSources)
    const langs: Language[] = app.languages
    const resultsEl : HTMLDivElement = document.getElementById('results') as HTMLDivElement;
    const selectedPlugin = app.getSelectedPlugin()
    // Clear previous results
    resultsEl.innerHTML = ``;
    
    // get display plugin
    try{
        if (!selectedPlugin)
            throw new Error('Plugin not selected')
        const displayModule: DisplayPluginModule = await import(selectedPlugin.url)
        displayModule.displayQuads(entityIri, fetcher, langs, resultsEl)
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
