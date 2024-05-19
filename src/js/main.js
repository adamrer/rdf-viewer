window.onload = function() {
    // example data source
    document.getElementById('add-data-source-text').value = 'https://data.gov.cz/sparql';
    addDataSource();
};

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

async function fetchTriples() {
    const endpointUrls = [];
    const dataSourcesElements = document.getElementById('data-sources').children;
    for (let i = 0; i < dataSourcesElements.length; i++){
        endpointUrls.push(dataSourcesElements[i].children[0].textContent);
    }
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
            
        } catch (error) {
            console.error('Error fetching data:', error);
            document.getElementById('results').innerHTML = `<div>Error fetching data: ${error.message}</div>`;
        }
    });
}