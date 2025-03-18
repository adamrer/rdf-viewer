import N3 from "n3";
import {DataSource, 
    SparqlDataSource, 
    FileDataSource, 
    Fetcher, 
    FetchedQuads } from './fetchQuads'
import {DisplayPlugin, 
    DisplayPluginModule, 
    loadDefaultPlugins } from './plugin'

window.onload = function() {
    addEventListeners();
    // example data source
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.gov.cz/sparql';
    addDataSource();
    loadDefaultPlugins();
};
function addEventListeners(): void {
    document.getElementById('add-data-source-btn')!.onclick = addDataSource; //add sparql data source
    document.getElementById('fetch-btn')!.onclick = showQuads
    
}

function getDataSources(): Array<DataSource> {
    const endpointUrls = getEndpointUrls()
    const dataSources: Array<DataSource> = endpointUrls.map(url => new SparqlDataSource(new URL(url)))
    const dataSourceFiles = getDataSourceFiles()
    dataSources.push(...dataSourceFiles.map(file => new FileDataSource(file)))

    return dataSources

}

function getEntityIri(): string {
    return (document.getElementById('target-resource')! as HTMLInputElement).value
}


function addDataSource(): void {
    const source : HTMLInputElement = document.getElementById('add-data-source-text') as HTMLInputElement;
    const dataSourcesList  = document.getElementById('data-sources')!;

    const sourceItem = document.createElement("li");
    sourceItem.innerHTML = `<span>${source.value}</span>`;

    const deleteBtn : HTMLButtonElement = document.createElement('button') as HTMLButtonElement;
    deleteBtn.textContent = 'Remove';
    deleteBtn.onclick = function(){
        deleteBtn!.parentNode!.parentNode!.removeChild(deleteBtn!.parentNode!);
    };
    sourceItem.appendChild(deleteBtn);
    dataSourcesList.appendChild(sourceItem);

    source.value = '';

}


function getDataSourceFiles() : Array<File> {
    const files : FileList = (document.getElementById('source-input') as HTMLInputElement).files!;
    return Array.from(files);

}
function getEndpointUrls() : Array<string>{
    const endpointUrls: Array<string> = [];
    const dataSourcesElements = document.getElementById('data-sources')!.children;
    for (let i = 0; i < dataSourcesElements.length; i++){
        endpointUrls.push(dataSourcesElements[i].children[0].textContent!);
    }
    return endpointUrls;
}


async function printQuads(quadsBySource : Array<FetchedQuads>, fetcher: Fetcher, resultsDiv : HTMLDivElement): Promise<void> {
    quadsBySource.forEach(fetchedQuads => {
        
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.dataSourceTitle;
        
        resultsDiv.appendChild(endpointTitle);
        
        const list = document.createElement("ul");
        fetchedQuads.quads.forEach(async (quad) => {
            // const subject = resourceUrl;
            const entityIri = getEntityIri()
            
            const predicateTitle = await fetcher.getTitle(entityIri)
            
            const object = quad.object.value;
            let objectTitle = object
            
            let objectHTML = object
            if (quad.object.termType !== 'Literal'){
                objectTitle = await fetcher.getTitle(object)
                objectHTML = `<a href=${object}>${objectTitle}</a>`
            }

            const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectHTML}</li>`;
            list.innerHTML += QuadListItem;
            resultsDiv.appendChild(list);
        });
    });
}
async function showQuads(): Promise<void> {
    const entityIri = getEntityIri()
    const fetcher: Fetcher = new Fetcher(getDataSources())

    const resultsDiv : HTMLDivElement = document.getElementById('results') as HTMLDivElement;

    // Clear previous results
    resultsDiv.innerHTML = ``;
    
    // get display
    const displayModule: DisplayPluginModule = await import(localStorage.getItem("selectedPlugin")!)

    const quadsBySource: (FetchedQuads|null)[] = await fetcher.fetchQuads(entityIri)
    displayModule.printQuads(quadsBySource, fetcher, resultsDiv)
}


