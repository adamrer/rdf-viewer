
const labelPredicates = [ 
    'http://purl.org/dc/terms/title', 
    'http://www.w3.org/2000/01/rdf-schema#label', 
    'http://www.w3.org/2004/02/skos/core#prefLabel',
    'http://schema.org/givenName'
]

export async function displayQuads(context){
    await context.loadData(labelPredicates)

    context.mount(createDisplayHtml(context))

}

function createDisplayHtml(context){
    const result = document.createElement('div')
    const heading = createHeading(context)
    const dl = createDl(context)
    result.appendChild(heading)
    result.appendChild(dl)
    return result
}
/**
 * Creates H1 heading for the main subject of a context
 * 
 * @param {*} context - Rendering context
 * @returns {HTMLElement}
 */
function createHeading(context){

    const titleElement = document.createElement('h1')
    const label = context.getLabel()
    if (label)
        titleElement.appendChild(createLabelHtml(context.subjectIri, label))
    else
        titleElement.textContent = context.subjectIri
    return titleElement
}
/**
 * Creates HTML dl element based on predicates of the main subject of the Rendering context
 * 
 * @param {*} context - Rendering context
 * @returns {HTMLDListElement}
 */
function createDl(context){
    const dlElement = document.createElement("dl")
    for (const predicateIri of context.getPredicates()){
        if (context.getObjects(predicateIri).length > 0)
            addPredicateToDl(context, predicateIri, context.subjectIri, dlElement)
    }
    return dlElement
}
/**
 * Adds a predicate of a subject to given dl HTML element
 * 
 * @param {*} context - Rendering context
 * @param {string} predicateIri 
 * @param {string} subjectIri 
 * @param {HTMLDListElement} dlElement 
 */
function addPredicateToDl(context, predicateIri, subjectIri, dlElement){
    const dtElement = document.createElement('dt')
    const termElement = document.createElement('b')
    const label = context.getLabel(predicateIri)
    if (label){
        dtElement.appendChild(createLabelHtml(predicateIri, label)) 
    }
    else{
        dtElement.textContent = predicateIri
    }
    termElement.appendChild(dtElement)
    dlElement.appendChild(termElement)
    const objects = context.getObjects(predicateIri, subjectIri)
    for (const object of objects){
        addSourcedObjectToDl(context, object, dlElement)
    }
    
}
/**
 * Creates HTML for a subject with a label
 * 
 * @param {string} iri - IRI of the labeled subject
 * @param {*} sourcedObjectLabel - Label returned by context
 * @returns {HTMLElement}
 */
function createLabelHtml(iri, sourcedObjectLabel){
    const literal = sourcedObjectLabel.term
    const bold = document.createElement('div')
    const valueElement = document.createElement('span')
    valueElement.textContent = literal.value + ' '
    const small = document.createElement('small')
    small.textContent = `(${literal.language || literal.datatype.value}) `
    // const sourcesSmall = document.createElement('small')
    // sourcesSmall.textContent = `[${Array.from({ length: sourcedObjectLiteral.sourceIds.length }, (_, i) => i).join(",")}]`
    

    bold.appendChild(valueElement)
    bold.appendChild(small)
    addCopyRedirectButtons(bold, iri)

    // bold.appendChild(sourcesSmall)

    return bold
}
function addCopyRedirectButtons(element, iri){
    const copyButton = document.createElement('span')
    copyButton.textContent = '📋'
    copyButton.onclick = () => {
        navigator.clipboard.writeText(iri)
    }
    copyButton.style.cursor = 'pointer'
    copyButton.title = 'Copy IRI to clipboard'
    const linkElement = document.createElement('a')
    linkElement.href = iri
    linkElement.textContent = '🔗'
    linkElement.style.textDecoration = 'none'
    copyButton.style.opacity = '0'
    linkElement.style.opacity = '0'
    copyButton.style.transition = 'opacity 0.3s ease'
    linkElement.style.transition = 'opacity 0.3s ease'
    element.addEventListener('mouseenter', () => {
        copyButton.style.opacity = '1'
        linkElement.style.opacity = '1'
    })
    element.addEventListener('mouseleave', () => {
        copyButton.style.opacity = '0'
        linkElement.style.opacity = '0'
    })
    element.appendChild(linkElement)
    element.appendChild(copyButton)
}
/**
 * Adds a sourcedObject to dl HTML element
 * 
 * @param {*} context - Rendering context
 * @param {SourcedObject} sourcedObject 
 * @param {HTMLDListElement} dlElement 
 */
function addSourcedObjectToDl(context, sourcedObject, dlElement){
    const ddElement = document.createElement('dd')
    const object = sourcedObject.term
    if (object.termType === 'Literal'){
        const literalHtml = createLabelHtml(sourcedObject.value, sourcedObject)
        ddElement.appendChild(literalHtml)
    }
    else{
        const label = context.getLabel(object.value)
        if (label){
            ddElement.appendChild(createLabelHtml(object.value, label))
        }
        else{
            ddElement.textContent = object.value
        }
    }
    dlElement.appendChild(ddElement)
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