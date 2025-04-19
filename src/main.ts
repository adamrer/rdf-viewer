import { SimpleFetcher } from './fetchQuads'
import { DisplayPluginModule, loadDefaultPlugins } from './plugin'
import { addDataSource, createPluginMenu, getEntityIri, getDataSources } from './ui'
import { displayQuads } from './defaultDisplayQuads.js'

window.onload = function() {
    addEventListeners();
    // example data source
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.gov.cz/sparql';
    addDataSource();
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.mf.gov.cz/lod/sparql';
    addDataSource();
    loadDefaultPlugins();
    createPluginMenu();
};

function addEventListeners(): void {
    document.getElementById('add-data-source-btn')!.onclick = addDataSource; //add sparql data source
    document.getElementById('fetch-btn')!.onclick = showQuads
    
}

async function showQuads(): Promise<void> {
    const entityIri = getEntityIri()
    const fetcher: SimpleFetcher = new SimpleFetcher(getDataSources())
    const resultsEl : HTMLDivElement = document.getElementById('results') as HTMLDivElement;

    // Clear previous results
    resultsEl.innerHTML = ``;
    
    // get display
    try{
        const displayModule: DisplayPluginModule = await import(localStorage.getItem("selectedPlugin")!)
        displayModule.displayQuads(entityIri, fetcher, resultsEl)
    }
    catch (error){
        displayQuads(entityIri, fetcher, resultsEl)
        console.error(error)
    }

}


