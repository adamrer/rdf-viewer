const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables


export async function displayQuads(quadsBySource, fetcher, resultsDiv) {
    quadsBySource.forEach(fetchedQuads => {
        
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.dataSourceTitle;
        
        resultsDiv.appendChild(endpointTitle);
        
        const list = document.createElement("ul");
        fetchedQuads?.quads.forEach(async (quad) => {
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
            resultsDiv.appendChild(list);
        });
    });
}