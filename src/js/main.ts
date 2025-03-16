import N3 from "n3";
import {DataSource, 
    SparqlDataSource, 
    FileDataSource, 
    QuadsRequest, 
    Fetcher, 
    FetchedQuads } from './fetchQuads'


window.onload = function() {
    addEventListeners();
    // example data source
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.gov.cz/sparql';
    addDataSource();
};
function addEventListeners(): void {
    document.getElementById('add-data-source-btn')!.onclick = addDataSource; //add sparql data source
    document.getElementById('fetch-btn')!.onclick = showQuads
    
}

function createQuadsRequest(): QuadsRequest {
    const endpointUrls = getEndpointUrls()
    const dataSources: Array<DataSource> = endpointUrls.map(url => new SparqlDataSource(new URL(url)))
    const dataSourceFiles = getDataSourceFiles()
    dataSources.push(...dataSourceFiles.map(file => new FileDataSource(file)))

    const entityIri = (document.getElementById('target-resource')! as HTMLInputElement).value

    return {entityIri: entityIri, dataSources: dataSources}

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


async function printQuads(quads : Array<N3.Quad>, endpointUrl : string, fetcher: Fetcher, resultsDiv : HTMLDivElement): Promise<void> {
    const endpointTitle = document.createElement("h3");
    endpointTitle.textContent = endpointUrl;

    resultsDiv.appendChild(endpointTitle);

    const list = document.createElement("ul");
    quads.forEach(async (quad) => {
        // const subject = resourceUrl;
        const predicate = quad.predicate.value;
        const request = createQuadsRequest()
        request.entityIri = predicate
        const predicateTitle = await fetcher.getTitle(request)

        const object = quad.object.value;
        let objectTitle = object
        
        let objectHTML = object
        if (quad.object.termType !== 'Literal'){
            request.entityIri = object
            objectTitle = await fetcher.getTitle(request)
            objectHTML = `<a href=${object}>${objectTitle}</a>`
        }

        const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectHTML}</li>`;
        list.innerHTML += QuadListItem;
    });
    resultsDiv.appendChild(list);
}
async function showQuads(): Promise<void> {
    const request = createQuadsRequest()
    const fetcher: Fetcher = new Fetcher()

    const resultsDiv : HTMLDivElement = document.getElementById('results') as HTMLDivElement;

    // Clear previous results
    resultsDiv.innerHTML = ``;
    const resultTitle = document.createElement('h2');
    resultsDiv.appendChild(resultTitle);
    resultTitle.textContent = `Results for ${await fetcher.getTitle(request)}`
    
    // get display
    const displayFile:File = (document.getElementById('display-input') as HTMLInputElement).files![0]
    let printQuadsFunction = printQuads;
    if (displayFile !== undefined){
        const fileContent = await displayFile.text();
        const blob = new Blob([fileContent], { type: "application/javascript" });
        const blobURL = URL.createObjectURL(blob)
        const displayModule = await import(blobURL)
        printQuadsFunction = displayModule.printQuads;
    }

    const quadsBySource: (FetchedQuads|null)[] = await fetcher.fetchQuads(request)
    quadsBySource.forEach(quads => {
        printQuadsFunction(quads!.quads, quads!.dataSourceTitle, fetcher, resultsDiv)
    });
}


