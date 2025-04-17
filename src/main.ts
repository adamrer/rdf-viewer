import {Fetcher, FetchedQuads } from './fetchQuads'
import {DisplayPluginModule, loadDefaultPlugins } from './plugin'
import {addDataSource, createPluginMenu, getEntityIri, getDataSources } from './ui'
import {displayQuads} from './defaultDisplayQuads.js'

window.onload = function() {
    addEventListeners();
    // example data source
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.gov.cz/sparql';
    addDataSource();
    loadDefaultPlugins();
    createPluginMenu();
};

function addEventListeners(): void {
    document.getElementById('add-data-source-btn')!.onclick = addDataSource; //add sparql data source
    document.getElementById('fetch-btn')!.onclick = showQuads
    
}

async function showQuads(): Promise<void> {
    console.log("Selected plugin: "+localStorage.getItem("selectedPlugin"))
    const entityIri = getEntityIri()
    const fetcher: Fetcher = new Fetcher(getDataSources())

    const resultsEl : HTMLDivElement = document.getElementById('results') as HTMLDivElement;

    // Clear previous results
    resultsEl.innerHTML = ``;
    
    const quadsBySource: (FetchedQuads|null)[] = await fetcher.fetchQuads(entityIri)
    // get display
    try{
        const displayModule: DisplayPluginModule = await import(localStorage.getItem("selectedPlugin")!)
        displayModule.displayQuads(quadsBySource, fetcher, resultsEl)

    }
    catch{
        displayQuads(quadsBySource, fetcher, resultsEl)
    }

}


