const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel', "http://www.w3.org/2006/vcard/ns#fn" ] 
const dcterms = "http://purl.org/dc/terms/"
const dcat = "http://www.w3.org/ns/dcat#"

export async function displayQuads(entityIri, fetcher, language, resultsEl) {
    const messageEl = document.createElement('p');
    resultsEl.appendChild(messageEl);

    const builder = fetcher.builder()
    const query = 
        builder.subject(entityIri)
            .lang([language, ""])
            .build()
    
    messageEl.textContent = 'Loading data...';
    
    const quadsBySource = await fetcher.fetchQuads(query)
    
    
    const resultTitle = document.createElement('h1');
    resultTitle.textContent = getObjectFromQuads(quadsBySource, titlePredicates[0])
    resultsEl.appendChild(resultTitle);
    
    const publisherEl = document.createElement("h2")
    const publisherTitle = await getTitle(getObjectFromQuads(quadsBySource, dcterms + "publisher"), fetcher, language)
    publisherEl.innerText = publisherTitle
    resultsEl.appendChild(publisherEl);
    
    const descriptionEl = document.createElement("p")
    descriptionEl.innerText = getObjectFromQuads(quadsBySource, dcterms + "description")
    resultsEl.appendChild(descriptionEl)
    
    const descriptionListEl = await createDescriptionList(quadsBySource, fetcher, language)
    resultsEl.appendChild(descriptionListEl)
    
    messageEl.textContent = 'Data successfully loaded!';

}
async function createDescriptionList(quadsBySource, fetcher, language){
    const descriptionListEl = document.createElement("dl")
    
    
    addDescription(descriptionListEl, "Téma", getObjectFromQuads(quadsBySource, dcat + "theme"), fetcher)
    
    addDescription(descriptionListEl, "Dokumentace", getObjectFromQuads(quadsBySource, "http://xmlns.com/foaf/0.1/page"))
    
    const periodicity = await getTitle(getObjectFromQuads(quadsBySource, dcterms + "accrualPeriodicity"), fetcher, language)
    addDescription(descriptionListEl, "Periodicita aktualizace", periodicity)
    
    addDescription(descriptionListEl, "Související geografické území", getObjectFromQuads(quadsBySource, dcterms + "spatial"))
    
    const contactPointIri = getObjectFromQuads(quadsBySource, dcat + "contactPoint")
    if (contactPointIri !== null){
        const contactPoint = await getTitle(contactPointIri, fetcher, language)
        addDescription(descriptionListEl, "Kontaktní bod", contactPoint)
    }
    return descriptionListEl
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

async function getTitle(iri, fetcher, language){
    const builder = fetcher.builder()
    builder.subject(iri)
        .predicates(titlePredicates)
        .lang([language, ""])
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