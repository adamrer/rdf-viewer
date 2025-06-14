import { Fetcher } from "./fetch-quads";
import { Language, NO_LANG_SPECIFIED, SimpleQueryStepBuilder } from "./simple-query-step-builder";

const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] 


export async function displayQuads(entityIri: string, fetcher: Fetcher, languages: Language[], resultsEl: HTMLElement) {
    

    const builder = (fetcher.builder('step') as SimpleQueryStepBuilder)
    const query = builder.subjects([entityIri])
                        .predicates()
                        .objects()
                        .langs([...languages, NO_LANG_SPECIFIED])
                        .build()
    const quadsBySource = await fetcher.fetchQuads(query)

    quadsBySource.forEach(fetchedQuads => {
        
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.identifier;
        
        resultsEl.appendChild(endpointTitle);
        
        const list = document.createElement("ul");
        fetchedQuads?.quads.forEach(async (quad) => {
            const predicateTitle = await getTitle(quad.predicate.value, fetcher, languages)
            
            const object = quad.object.value;
            let objectTitle = object
            
            let objectHTML = object
            if (quad.object.termType !== 'Literal'){
                objectTitle = await getTitle(object, fetcher, languages)
                objectHTML = `<a href=${object}>${objectTitle}</a>`
            }

            const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectHTML}</li>`;
            list.innerHTML += QuadListItem;
            resultsEl.appendChild(list);
        });
    });
}

async function getTitle(iri: string, fetcher: Fetcher, languages: Language[]){
    const builder = fetcher.builder('step') as SimpleQueryStepBuilder
    const query = builder.subjects([iri])
        .predicates(titlePredicates)
        .objects()
        .langs([...languages, NO_LANG_SPECIFIED])
        .build()
    const quadsBySource = await fetcher.fetchQuads(query)
    let title = iri
    quadsBySource.forEach(fetchedQuads =>{
        if (fetchedQuads.quads.length !== 0){
            title = fetchedQuads.quads[0].object.value
            return
        }
    })
    return title
}