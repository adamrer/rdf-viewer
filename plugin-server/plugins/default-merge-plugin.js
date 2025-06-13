const titlePredicates = [ 
    'http://purl.org/dc/terms/title', 
    'https://www.w3.org/2000/01/rdf-schema#label', 
    'http://www.w3.org/2004/02/skos/core#prefLabel',
    'http://schema.org/givenName'
]

export async function displayQuads(entityIri, fetcher, language, resultsEl){
    const messageEl = document.createElement('p');
    resultsEl.appendChild(messageEl);

    const builder = fetcher.builder('step');
    const query = builder
        .subjects([entityIri])
        .predicates()
        .objects()
        .langs([language])
        .build()

    try{
        messageEl.textContent = "Loading data..."
        const quadsBySource = await fetcher.fetchQuads(query)
        let entityLabel = getLabelFromQuads(quadsBySource);
        if (!entityLabel) {
            entityLabel = entityIri;
        }
        
        const sources = quadsBySource.map(source => source.identifier)
        resultsEl.appendChild(createLegend(sources))
        
        const resultTitle = document.createElement('h2');
        resultsEl.appendChild(resultTitle);

        resultTitle.textContent = entityLabel;
        await Promise.all(
            quadsBySource.map(async (source) => {
                source.quads = await Promise.all(
                source.quads.map(quad => labelQuad(quad, fetcher, language))
                )
            })
        )
        
        messageEl.textContent = "Data loaded successfully!"

        const mergedQuads = mergeQuads(quadsBySource)
        resultsEl.appendChild(createDescriptionList(mergedQuads))

    }
    catch(error){
        messageEl.textContent = `Error while displaying data`
        console.error(error)
    }
}

function createLegend(sources){
    const list = document.createElement('div')
    for (let i = 0; i < sources.length; i++){
        const item = document.createElement('div')
        item.textContent = `[${i}] - ${sources[i]}`
        list.appendChild(item)
    }
    return list
}
function createDescriptionList(mergedQuads){
    const list = document.createElement("dl")

    for (const [key, value] of mergedQuads){
        addDescription(list, key, value)
    }

    return list

}
function addDescription(dlElement, term, descriptions){
    const dt = document.createElement("dt")
    dt.style.marginBottom = ".6em"

    dt.innerHTML = term.bold()
    dlElement.appendChild(dt)

    for (const [key, value] of descriptions){
        const dd = document.createElement("dd")
        dd.style.marginBottom = ".3em"
        dd.innerHTML = `${key} [${value.join('], [')}]`
        dlElement.appendChild(dd)
    }

}
function mergeQuads(quadsBySource){
    const mergedQuads = new Map()
    quadsBySource.forEach((source, index) => {
        source.quads.forEach(quad => {
            const predicateValues = mergedQuads.get(quad.predicate.value)
            if (predicateValues == undefined){
                // values with list of sources they are from
                const valueSourceMap = new Map() 
                valueSourceMap.set(quad.object.value, [index])
                mergedQuads.set(quad.predicate.value, valueSourceMap)
            }
            else{
                const value = predicateValues.get(quad.object.value)
                if (value == undefined){
                    predicateValues.set(quad.object.value, [index])
                }
                else{
                    // data source have the same value
                    value.push(index) 
                }
            }
        })
    })
    return mergedQuads
}


async function getObjectDisplay(object, fetcher, language){
    if (object.termType === 'Literal') {
        return object.value;
    }
    const title = await getTitle(object.value, fetcher, language);
    return `<a href="${object.value}">${title}</a>`;
}
async function labelQuad(quad, fetcher, language){
    const predicate = await getTitle(quad.predicate.value, fetcher, language)

    let object = await getObjectDisplay(quad.object, fetcher, language)
    return { predicate: { value: predicate }, object: { value: object } }

}

async function getTitle(iri, fetcher, language){
    const builder = fetcher.builder('step')
    const query = builder
        .subjects([iri])
        .predicates(titlePredicates)
        .objects()
        .langs([language])
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

function getLabelFromQuads(fetchedQuads){
    if (fetchedQuads.length!==0){
        let title = null
        fetchedQuads.forEach(fetchedQuad => {
            fetchedQuad.quads.forEach(quad => {
                if (titlePredicates.includes(quad.predicate.value))
                    title = quad.object.value
                    return
            })
            
        });
        return title
    }
    else {
        return ''
    }
}