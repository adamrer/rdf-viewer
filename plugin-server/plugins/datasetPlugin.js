const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel', "http://www.w3.org/2006/vcard/ns#fn" ] //TODO: no global variables
const dcterms = "http://purl.org/dc/terms/"
const dcat = "http://www.w3.org/ns/dcat#"

export async function displayQuads(entityIri, fetcher, language, resultsDiv) {//TODO: get all quads from fetcher with builder
    
    const builder = fetcher.builder()
    const query = builder.subject(entityIri)
                        .lang([language])
                        .quadsWithoutLang()
                        .build()
    
    const quadsBySource = await fetcher.fetchQuads(query)
    
    const resultTitle = document.createElement('h1');
    resultTitle.textContent = getObjectFromQuads(quadsBySource, titlePredicates[0])
    resultsDiv.appendChild(resultTitle);

    const publisherEl = document.createElement("h2")
    publisherEl.innerText = await getTitle(getObjectFromQuads(quadsBySource, dcterms + "publisher"), fetcher, language)
    resultsDiv.appendChild(publisherEl);

    const descriptionEl = document.createElement("p")
    descriptionEl.innerText = getObjectFromQuads(quadsBySource, dcterms + "description")
    resultsDiv.appendChild(descriptionEl)

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
    console.log("ještě funguje")
    
    resultsDiv.appendChild(descriptionListEl)


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
        .lang([language])
        .quadsWithoutLang()
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