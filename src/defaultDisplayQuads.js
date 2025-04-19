const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] 


export async function displayQuads(entityIri, fetcher, resultsDiv) {
    
    const builder = fetcher.builder()
    const query = builder.subject(entityIri).build()
    const quadsBySource = await fetcher.fetchQuads(query)

    quadsBySource.forEach(fetchedQuads => {
        
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.dataSourceTitle;
        
        resultsDiv.appendChild(endpointTitle);
        
        const list = document.createElement("ul");
        fetchedQuads?.quads.forEach(async (quad) => {
            console.log(quad)
            const predicateTitle = await getTitle(quad.predicate.value, fetcher)
            
            const object = quad.object.value;
            let objectTitle = object
            
            let objectHTML = object
            if (quad.object.termType !== 'Literal'){
                objectTitle = await getTitle(object, fetcher)
                objectHTML = `<a href=${object}>${objectTitle}</a>`
            }

            const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectHTML}</li>`;
            list.innerHTML += QuadListItem;
            resultsDiv.appendChild(list);
        });
    });
}

async function getTitle(iri, fetcher){
    const builder = fetcher.builder()
    builder.subject(iri)
    builder.predicates(titlePredicates)
    const quadsBySource = await fetcher.fetchQuads(builder.build())
    let title = iri
    quadsBySource.forEach(fetchedQuads =>{
        if (fetchedQuads.quads.length !== 0){
            title = fetchedQuads.quads[0].object.value
            return
        }
    })
    return title
}