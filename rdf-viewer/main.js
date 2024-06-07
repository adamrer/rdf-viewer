import rdfParser from "rdf-parse";
window.onload = function() {
  // example data source
    addEventListeners();
    document.getElementById('add-data-source-text').value = 'https://data.gov.cz/sparql';
    addDataSource();
};
function addEventListeners(){
    document.getElementById('add-data-source-btn').onclick = addDataSource;
    document.getElementById('fetch-btn').onclick = fetchTriples;

}
function addDataSource(){
    const source = document.getElementById('add-data-source-text');
    const dataSourcesList = document.getElementById('data-sources');

    const sourceItem = document.createElement("li");
    sourceItem.innerHTML = `<span>${source.value}</span>`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Remove';
    deleteBtn.onclick = function(){
        deleteBtn.parentNode.parentNode.removeChild(deleteBtn.parentNode);
    };
    sourceItem.appendChild(deleteBtn);
    dataSourcesList.appendChild(sourceItem);

    source.value = '';

}
function getFiles(){
    const files = document.getElementById('add-file-data-source-text').files;
    return Array.from(files);

}
function getEndpointUrls(){
    const endpointUrls = [];
    const dataSourcesElements = document.getElementById('data-sources').children;
    for (let i = 0; i < dataSourcesElements.length; i++){
        endpointUrls.push(dataSourcesElements[i].children[0].textContent);
    }
    return endpointUrls;
}
function fetchTriplesFromText(text){
    const inputStream = new Readable({
        read() {
            this.push(text);
            this.push(null);
        }
    });
    const quads = [];
    rdfParser.parse(inputStream, { contentType: 'text/turtle' })
        .on('data', (quad) => {
            quads.push(quad);
        })
        .on('error', (error) => {
            console.error(error);
        });
    
    return quads;
}
function readFile(file){
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            fetchTriplesFromText(text);
        };
        reader.readAsText(file);
    }
}
function printTriples(triples, endpointUrl, resultsDiv){
    const endpointTitle = document.createElement("h3");
    endpointTitle.textContent = endpointUrl;
    resultsDiv.appendChild(endpointTitle);
    const list = document.createElement("ul");
    triples.forEach(triple => {
        // const subject = resourceUrl;
        const predicate = triple.predicate.value;
        const object = triple.object.value;
        const tripleHTML = `<li><strong>Predicate:</strong> ${predicate}<br><strong>Object:</strong> ${object}</li>`;
        list.innerHTML += tripleHTML;
    });
    resultsDiv.appendChild(list);
}
async function fetchTriples() {
    const endpointUrls = getEndpointUrls();
    const resourceUrl = document.getElementById('target-resource').value;

    const query = `
        SELECT ?predicate ?object
        WHERE {
            <${resourceUrl}> ?predicate ?object
        }
    `;
    
    const resultsDiv = document.getElementById('results');
    // Clear previous results
    resultsDiv.innerHTML = `<h2>Results for ${resourceUrl}</h2>`;
    
    const selectedFiles = getFiles();
    selectedFiles.forEach(file =>{
        const triples = fetchTriplesFromText(file);
        console.log(triples)
        printTriples(triples, file.name, resultsDiv);

    })

    endpointUrls.forEach(async (endpointUrl) => {
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
            const triples = json.results.bindings;
    
            printTriples(triples, endpointUrl, resultsDiv);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            document.getElementById('results').innerHTML = `<div>Error fetching data: ${error.message}</div>`;
        }
    });
}
