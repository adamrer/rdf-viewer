import N3 from "n3";

const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables


window.onload = function() {
  // example data source
    addEventListeners();
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.gov.cz/sparql';
    addDataSource();
};
function addEventListeners(){
    document.getElementById('add-data-source-btn')!.onclick = addDataSource; //add sparql data source
    document.getElementById('fetch-btn')!.onclick = showQuads;
    
}
function addDataSource(){
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
function getDataSourceFiles() : ArrayLike<File> {
    const files : FileList = (document.getElementById('source-input') as HTMLInputElement).files!;
    return Array.from(files);

}
function getEndpointUrls() : Array<string | null>{
    const endpointUrls = [];
    const dataSourcesElements = document.getElementById('data-sources')!.children;
    for (let i = 0; i < dataSourcesElements.length; i++){
        endpointUrls.push(dataSourcesElements[i].children[0].textContent);
    }
    return endpointUrls;
}


async function getQuadsFile(file : File, target : string | null = null) : Promise<Array<N3.Quad>>{
    const reader = new FileReader();
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
    };
    
    const quads : Array<N3.Quad> = [];

    const parser = new N3.Parser();
    parser.parse(await file.text(), 
        (error, quad) => {
            if (quad){
                if (target === null || (target === quad.subject.value)){
                    quads.push(quad);
                }
            } 
            if (error){
                console.log(error.message);
            }
        }
    );

    return quads;

}
async function printQuads(quads : Array<N3.Quad>, endpointUrl : string, resultsDiv : HTMLDivElement){
    const endpointTitle = document.createElement("h3");
    endpointTitle.textContent = endpointUrl;

    resultsDiv.appendChild(endpointTitle);

    const list = document.createElement("ul");
    quads.forEach(async (quad) => {
        // const subject = resourceUrl;
        const predicate = quad.predicate.value;
        let predicateTitle = await getTitleFor(predicate, endpointUrl); //TODO: use getQuadsFile aswell somehow
        if (predicateTitle === null || predicateTitle === undefined){
            predicateTitle = predicate;
        }
        const object = quad.object.value;
        let objectTitle : string | null | undefined = null;
        if (object.startsWith('http'))//TODO: can't use termType (don't know why), don't use startsWith
            objectTitle = await getTitleFor(object, endpointUrl);
        
        if (objectTitle === null || objectTitle === undefined)
            objectTitle = object;
        const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectTitle}</li>`;
        list.innerHTML += QuadListItem;
    });
    resultsDiv.appendChild(list);
}
async function showQuads() {
    const endpointUrls = getEndpointUrls();
    const resourceUri = (document.getElementById('target-resource')! as HTMLInputElement).value;
   
    const resultsDiv : HTMLDivElement = document.getElementById('results') as HTMLDivElement;

    // Clear previous results
    resultsDiv.innerHTML = ``;
    const resultTitle = document.createElement('h2');
    resultsDiv.appendChild(resultTitle);
    resultTitle.textContent = `Results for ${resourceUri}`
    
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


    //fetch quads from files
    const selectedFiles = Array.prototype.slice.call(getDataSourceFiles()); // gets Array from ArrayLike
    selectedFiles.forEach(async file => {
        const quads = await getQuadsFile(file, resourceUri);
        const titleQuad = getTitleFrom(quads);
        if (titleQuad){
            resultTitle.textContent = `Results for ${titleQuad}`;
        }
        printQuadsFunction(quads, file.name, resultsDiv);
        
        if (quads.length === 0) {
            resultsDiv.innerHTML += '<p>No results</p>';
        }

    })

    //fetch quads from sparql endpoints
    endpointUrls.forEach(async (endpointUrl : string | null) => {
        const quads = await getQuadsSparql(endpointUrl, resourceUri);
        if (quads && endpointUrl){
            const titleQuad = getTitleFrom(quads);
            
            if (titleQuad){
                resultTitle.textContent = `Results for ${titleQuad}`;
            }
            printQuadsFunction(quads, endpointUrl, resultsDiv);
            if (quads.length === 0) {
                resultsDiv.innerHTML += '<p>No results</p>';
            }
        }
        else{            
            resultsDiv.innerHTML += '<p>No results</p>';
        }
    });
}
async function getQuadsSparql(endpointUrl : string | null, target : string) : Promise<Array<N3.Quad> | null>{
    const query = `
    SELECT ?predicate ?object
    WHERE {
        <${target}> ?predicate ?object .
    }
`;
    const queryUrl = `${endpointUrl}?query=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(queryUrl, {
            headers: {
                // json will have the result in .results.bindings
                'Accept': 'application/sparql-results+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const quads = json.results.bindings;

        return quads;
        
    } catch (error : any) {
        console.error('Error fetching data:', error);
        document.getElementById('results')!.innerHTML = `<div>Error fetching data: ${error!.message}</div>`;
        return null;
    }
}
function getTitleFrom(quads : Array<N3.Quad>) : string | null{

    const titleQuad = quads.find(quad => titlePredicates.includes(quad.predicate.value))
    if (titleQuad){
        return titleQuad.object.value;
    }
    else{
        return null;
    }
}
async function getTitleFor(subject : string, sparqlEndpointUrl : string | null = null, file : File | null = null) : Promise<string|null|undefined>{
    let quads : Array<N3.Quad> | null = [];
    if (sparqlEndpointUrl){
        quads = await getQuadsSparql(sparqlEndpointUrl, subject);
    }
    else if (file){
        quads = await getQuadsFile(file, subject);
    }
    else{
        return null;
    }
    
    let titleQuad : N3.Quad | undefined = undefined;
    if (quads){
        titleQuad = quads.find(quad => titlePredicates.includes(quad.predicate.value))
        if (titleQuad !== undefined){
            return titleQuad.object.value;
        }
        else{
            return null;
        }
    }
}
