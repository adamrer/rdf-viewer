import N3 from "n3";

window.onload = function() {
  // example data source
    addEventListeners();
    (document.getElementById('add-data-source-text')! as HTMLInputElement).value = 'https://data.gov.cz/sparql';
    addDataSource();
};
function addEventListeners(){
    document.getElementById('add-data-source-btn')!.onclick = addDataSource; //add sparql data source
    document.getElementById('fetch-btn')!.onclick = fetchQuads; 
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
function getFiles() : ArrayLike<File> {
    const files : FileList = (document.getElementById('source-input')! as HTMLInputElement).files!;
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
    reader.readAsText(file);
    const quads : Array<N3.Quad> = [];
    
    reader.onload = async () => {
        const parser = new N3.Parser();
        let text = reader.result as string;
        parser.parse(text, 
            (error, quad, prefixes) => {
                if (quad){
                    if (target !== null && target === quad.subject.value)
                        quads.push(quad);
                } else {
                    const resultsDiv : HTMLDivElement = document.getElementById('results') as HTMLDivElement;
                    printQuads(quads, file.name, resultsDiv);
                    console.log("Prefixes:", prefixes);
                }
                if (error){
                    console.log(error.message);
                }
            }
        );
    };
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
    };
    return quads;

}
function printQuads(quads : Array<N3.Quad>, endpointUrl : string, resultsDiv : HTMLDivElement){
    const endpointTitle = document.createElement("h3");
    endpointTitle.textContent = endpointUrl;
    resultsDiv.appendChild(endpointTitle);
    const list = document.createElement("ul");
    quads.forEach(quad => {
        // const subject = resourceUrl;
        const predicate = quad.predicate.value;
        const object = quad.object.value;
        const QuadHTML = `<li><strong>Predicate:</strong> ${predicate} <strong>Object:</strong> ${object}</li>`;
        list.innerHTML += QuadHTML;
    });
    resultsDiv.appendChild(list);
}
async function fetchQuads() {
    const endpointUrls = getEndpointUrls();
    const resourceUri = (document.getElementById('target-resource')! as HTMLInputElement).value;

    const query = `
        SELECT ?predicate ?object
        WHERE {
            <${resourceUri}> ?predicate ?object
        }
    `;
    
    const resultsDiv : HTMLDivElement = document.getElementById('results') as HTMLDivElement;
    // Clear previous results
    resultsDiv.innerHTML = `<h2>Results for ${resourceUri}</h2>`;
    
    //fetch quads from file
    const selectedFiles = Array.prototype.slice.call(getFiles()); // gets Array from ArrayLike
    selectedFiles.forEach(async file => {
        await getQuadsFile(file, resourceUri);
        //printQuads(quads, file.name, resultsDiv);

    })

    //fetch quads from sparql endpoint
    endpointUrls.forEach(async (endpointUrl : string | null) => {
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
    
            
            printQuads(quads, endpointUrl!, resultsDiv);
            
        } catch (error : any) {
            console.error('Error fetching data:', error);
            document.getElementById('results')!.innerHTML = `<div>Error fetching data: ${error!.message}</div>`;
        }
    });
}