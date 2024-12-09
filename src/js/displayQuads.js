const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables


export async function printQuads(quads, endpointUrl, resultsDiv){
    console.log("Dynamically imported printQuads")

    const endpointTitle = document.createElement("h3");
    endpointTitle.textContent = endpointUrl;

    resultsDiv.appendChild(endpointTitle);

    const list = document.createElement("ul");
    quads.forEach(async (quad) => {
        // const subject = resourceUrl;
        const predicate = quad.predicate.value;
        let predicateTitle = null
        if (predicateTitle === null || predicateTitle === undefined){
            predicateTitle = predicate;
        }
        const object = quad.object.value;
        let objectTitle = null;
        if (object.startsWith('http'))//TODO: can't use termType (don't know why), don't use startsWith
            objectTitle = null;
        
        if (objectTitle === null || objectTitle === undefined)
            objectTitle = object;
        const QuadListItem = `<li><strong>Predicate:</strong> ${predicateTitle} <strong>Object:</strong> ${objectTitle}</li>`;
        list.innerHTML += QuadListItem;
    });
    resultsDiv.appendChild(list);
}

async function getTitleFor(subject, quads){
    let titleQuad = undefined;
    titleQuad = quads.find(quad => titlePredicates.includes(quad.predicate.value) && quad.subject.value == subject)
    if (titleQuad !== undefined){
        return titleQuad.object.value;
    }
    else{
        return null;
    }
}