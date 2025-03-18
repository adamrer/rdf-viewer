const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables
const dcterms = "http://purl.org/dc/terms/"
const dcat = "http://www.w3.org/ns/dcat#"

export async function printQuads(quadsBySource, fetcher, resultsDiv) {
    const entityIri = quadsBySource[0].quads[0].subject.value
    const resultTitle = document.createElement('h1');
    resultTitle.textContent = getObjectFromQuads(quadsBySource, titlePredicates[0])
    resultsDiv.appendChild(resultTitle);

    const publisherEl = document.createElement("h2")
    publisherEl.innerText = await fetcher.getTitle(getObjectFromQuads(quadsBySource, dcterms + "publisher"))
    resultsDiv.appendChild(publisherEl);

    const descriptionEl = document.createElement("p")
    descriptionEl.innerText = getObjectFromQuads(quadsBySource, dcterms + "description")
    resultsDiv.appendChild(descriptionEl)

    const descriptionListEl = document.createElement("dl")
    
    addDescription(descriptionEl, "Téma", await fetcher.getTitle(getObjectFromQuads(quadsBySource, "https://www.w3.org/ns/dcat#theme")))
    
    addDescription(descriptionEl, "Dokumentace", getObjectFromQuads(quadsBySource, "http://xmlns.com/foaf/0.1/page"))
    
    const periodicityQuads = await fetcher.fetchQuads(getObjectFromQuads(quadsBySource, dcterms + "accrualPeriodicity"))
    addDescription(descriptionEl, "Periodicita aktualizace", getObjectFromQuads(periodicityQuads, "http://www.w3.org/2004/02/skos/core#prefLabel"))
    
    addDescription(descriptionEl, "Související geografické území", getObjectFromQuads(quadsBySource, dcterms + "spatial"))
    
    const contactPointQuads = await fetcher.fetchQuads(getObjectFromQuads(quadsBySource, dcat + "contactPoint"))
    addDescription(descriptionEl, "Kontaktní bod", getObjectFromQuads(contactPointQuads, "http://www.w3.org/2006/vcard/ns#fn" ))
    
    resultsDiv.appendChild(descriptionEl)


}

function addDescription(dlElement, term, description){
    const dt = document.createElement("dt")
    dt.innerHTML = term.bold()
    const dd = document.createElement("dd")
    dd.innerText = description

    dlElement.appendChild(dt)
    dlElement.appendChild(dd)
}


function getObjectFromQuads(fetchedQuads, predicate){
    let object = null
    fetchedQuads.forEach(fetchedQuad => {
        fetchedQuad.quads.forEach(quad => {
            if (quad.predicate.value == predicate)
                object = quad.object.value
                return
        })
        
    });
    return object
}
