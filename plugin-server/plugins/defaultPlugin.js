const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables


export async function printQuads(quadsBySource, fetcher, resultsDiv) {
    
    const resultTitle = document.createElement('h2');
    resultsDiv.appendChild(resultTitle);
    
    resultTitle.textContent = `Results for ${getLabelFromQuads(quadsBySource)}`
    

    quadsBySource.forEach(fetchedQuads => {
        const endpointResultDiv = document.createElement("div");
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.dataSourceTitle;        
        console.log(fetchedQuads.dataSourceTitle)    
        endpointResultDiv.appendChild(endpointTitle);
        
        const list = document.createElement("ul");
        fetchedQuads.quads.forEach(async (quad) => {
            
            const predicateTitle = await fetcher.getTitle(quad.predicate.value)
            
            const object = quad.object.value;
            let objectTitle = object
            
            let objectHTML = object
            if (quad.object.termType !== 'Literal'){
                objectTitle = await fetcher.getTitle(object)
                objectHTML = `<a href=${object}>${objectTitle}</a>`
            }

            const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectHTML}</li>`;
            list.innerHTML += QuadListItem;
        });
        if (fetchedQuads.quads.length === 0){
            const noQuadsEl = document.createElement("p")
            noQuadsEl.innerText = "No data found from this data source"
            endpointResultDiv.appendChild(noQuadsEl)
        }
        endpointResultDiv.appendChild(list);
        resultsDiv.appendChild(endpointResultDiv)
    });
}

function getLabelFromQuads(fetchedQuads){
    let title = fetchedQuads[0].quads[0].subject.value
    fetchedQuads.forEach(fetchedQuad => {
        fetchedQuad.quads.forEach(quad => {
            if (quad.predicate.value == titlePredicates[0])
                title = quad.object.value
                return
        })
        
    });
    return title
}
