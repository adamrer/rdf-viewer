
const labelPredicates = [ 
    'http://purl.org/dc/terms/title', 
    'http://www.w3.org/2000/01/rdf-schema#label', 
    'http://www.w3.org/2004/02/skos/core#prefLabel',
    'http://schema.org/givenName'
]
// TODO: fetch labels in one query for all predicates/objects


/**
 * @typedef {Object} Term
 * @property {string} termType
 * @property {string} value
 */

/**
 * @typedef {Object} Quad
 * @property {Term} subject
 * @property {Term} predicate
 * @property {Term} object
 * @property {Term} graph
 */

/**
 * @typedef {Object} FetchedQuads
 * @property {string} identifier
 * @property {Quad[]} quads
 */

/**
 * @callback BuilderFn
 */
/**
 * @callback FetchQuadsFn
 * @returns {Promise<FetchedQuads[]>}
 */
/**
 * @typedef {Object} Fetcher
 * @property {BuilderFn} builder
 * @property {FetchQuadsFn} fetchQuads
 */

/**
 * 
 * @param {string} entityIri - IRI of an entity to display
 * @param {Fetcher} fetcher - For accessing the data sources for fetching data
 * @param {string[]} languages - Allowed languages for the display
 * @param {Element} resultsEl - Element for displaying the entity
 */
export async function displayQuads(entityIri, fetcher, languages, resultsEl){
    const messageEl = document.createElement('p');
    resultsEl.appendChild(messageEl);
    
    languages = [...languages, '']
    const builder = fetcher.builder();
    const query = builder
        .subjects([entityIri])
        .predicates()
        .objects()
        .langs(languages)
        .build()
    try{
        messageEl.textContent = "Loading data..."
        // fetch
        const quadsBySource = await fetcher.fetchQuads(query)
        const entityLabel = getLabelFromQuads(entityIri, quadsBySource);

        // label
        await Promise.all(
            quadsBySource.map(async (source) => {
                source.quads = await Promise.all(
                    source.quads.map(quad => labelQuad(quad, fetcher, languages))
                )
            })
        )
        messageEl.textContent = "Data loaded successfully!"
        
        // merge
        const mergedQuads = mergeQuads(quadsBySource)
        
        // display
        const sources = quadsBySource.map(source => source.identifier)
        resultsEl.appendChild(createLegend(sources))
        const resultTitle = document.createElement('h2');
        resultsEl.appendChild(resultTitle);
        resultTitle.textContent = entityLabel;
        resultsEl.appendChild(createDescriptionList(mergedQuads))

    }
    catch(error){
        messageEl.textContent = `Error while displaying data`
        console.error(error)
    }
}

/**
 * 
 * @param {string[]} sources - List of data source identifiers
 * @returns {Element} HTML element showing sources with their indices which can be used as reference
 */
function createLegend(sources){
    const list = document.createElement('div')
    for (let i = 0; i < sources.length; i++){
        const item = document.createElement('div')
        item.textContent = `[${i}] - ${sources[i]}`
        list.appendChild(item)
    }
    return list
}
/**
 * Creates description list HTML element
 * 
 * @param {Map<string, Map<string, number[]>>} mergedQuads 
 * @returns {Element} dl HTML element with given mergedQuads 
 */
function createDescriptionList(mergedQuads){
    const list = document.createElement("dl")

    for (const [predicate, objects] of mergedQuads){
        addDescription(list, predicate, objects)
    }

    return list

}
/**
 * 
 * @param {Element} dlElement - Description list HTML element to add description to
 * @param {string} term - The term to describe
 * @param {Map<string, number[]>} descriptions - Descriptions of the term with their source indices 
 */
function addDescription(dlElement, term, descriptions){
    const dt = document.createElement("dt")
    dt.style.marginBottom = ".6em"
    const termSpan = document.createElement('span')
    termSpan.innerHTML = `<b>${term}</b>`
    dt.appendChild(termSpan)
    dlElement.appendChild(dt)

    for (const [predicate, objects] of descriptions){
        const dd = document.createElement("dd")
        dd.style.marginBottom = ".3em"
        dd.innerHTML = `${predicate} [${objects.join('], [')}]`
        dlElement.appendChild(dd)
    }

}
/**
 * 
 * @param {FetchedQuads[]} quadsBySource 
 * @returns {Map<string, Map<string, number[]>>} a map where keys are predicates and values are maps of objects for the given predicate
 */
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

/**
 * 
 * @param {Term} object - The object to get the display of
 * @param {Fetcher} fetcher - For fetching label
 * @param {string} languages - Allowed languages of the label 
 * @returns {Promise<string>}
 */
async function getTermDisplay(object, fetcher, languages){
    if (object.termType === 'Literal') {
        return `<span>${object.value} <small>${object.lang ? object.lang : ""}</small><span>`;
    }
    
    const {label, language} = await labelTerm(object.value, fetcher, languages);
    return `<a href="${object.value}" title="${object.value}">${label}</a> <small>${language}</small>`;
}
/**
 * 
 * @param {Quad} quad - Quad to label
 * @param {Fetcher} fetcher - For fetching label
 * @param {string[]} languages - Allowed languages of the label
 * @returns { {predicate: { value: string }, object {value: string }} }
 */
async function labelQuad(quad, fetcher, languages){
    const predicateLabel = await getTermDisplay(quad.predicate, fetcher, languages)
    const object = await getTermDisplay(quad.object, fetcher, languages)
    return { predicate: { value: predicateLabel }, object: { value: object } }

}

/**
 * Fetches values of label predicates defined in labelPredicates and 
 * returns the first found
 * 
 * @param {string} iri - IRI of the term to label
 * @param {Fetcher} fetcher - For fetching label
 * @param {string} languages - Allowed languages of the label
 * @returns {Promise<{label: string, language: string}>} - The corresponding label
 */
async function labelTerm(iri, fetcher, languages){
    const builder = fetcher.builder()
    const query = builder.subjects([iri])
        .predicates(labelPredicates)
        .objects()
        .langs(languages)
        .build()
    const quadsBySource = await fetcher.fetchQuads(query)
    const withQuads = quadsBySource.find(fetchedQuads => fetchedQuads.quads.length > 0)
    const labelTerm = withQuads ? withQuads.quads[0].object : { value: iri, language: ""}
    
    return {label: labelTerm.value, language: labelTerm.language }

}

/**
 * Searches for label predicates in given quads and returns the first found value
 * 
 * @param {string} entityIri - IRI to get the label for
 * @param {FetchedQuads[]} fetchedQuads - quads where to look for the label
 * @returns {string} - the first value of labelPredicates from the fetchedQuads
 */
function getLabelFromQuads(entityIri, fetchedQuads) {
  const withQuads = fetchedQuads.find(source =>
    source.quads.some(quad => labelPredicates.includes(quad.predicate.value))
  );

  if (!withQuads) {
    return entityIri;
  }
  const titleQuad = withQuads.quads.find(
    quad =>
      quad.subject.value === decodeURIComponent(entityIri) &&
      labelPredicates.includes(quad.predicate.value)
  );

  return titleQuad ? titleQuad.object.value : entityIri;
}