import { Fetcher } from "./fetch-quads";
import { NO_LANG_SPECIFIED } from "./query-builder";

const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] 


export async function displayQuads(entityIri: string, fetcher: Fetcher, language: string, resultsEl: HTMLElement) {
    

    const builder = fetcher.builder()
    const query = builder.subject(entityIri)
                        .lang([language, ""])
                        .build()
    const quadsBySource = await fetcher.fetchQuads(query)

    quadsBySource.forEach(fetchedQuads => {
        
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.identifier;
        
        resultsEl.appendChild(endpointTitle);
        
        const list = document.createElement("ul");
        fetchedQuads?.quads.forEach(async (quad) => {
            const predicateTitle = await getTitle(quad.predicate.value, fetcher, language)
            
            const object = quad.object.value;
            let objectTitle = object
            
            let objectHTML = object
            if (quad.object.termType !== 'Literal'){
                objectTitle = await getTitle(object, fetcher, language)
                objectHTML = `<a href=${object}>${objectTitle}</a>`
            }

            const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectHTML}</li>`;
            list.innerHTML += QuadListItem;
            resultsEl.appendChild(list);
        });
    });
}

async function getTitle(iri: string, fetcher: Fetcher, language: string){
    const builder = fetcher.builder()
    builder.subject(iri)
        .predicates(titlePredicates)
        .lang([language, NO_LANG_SPECIFIED])
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