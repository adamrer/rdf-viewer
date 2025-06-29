const dcterms = "http://purl.org/dc/terms/"
const dcat = "http://www.w3.org/ns/dcat#"
const skos = "http://www.w3.org/2004/02/skos/core#"
const vcard = "http://www.w3.org/2006/vcard/ns#"
const rdfs = "http://www.w3.org/2000/01/rdf-schema#"
const foaf = "http://xmlns.com/foaf/0.1/"
const labelPredicates = [ dcterms+'title', rdfs+'label', skos+'prefLabel', vcard+"fn", 'https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-název-orgánu-veřejné-moci' ] 


export async function displayQuads(context){
    await context.loadData(labelPredicates)
    await loadDistributionData(context)
    console.log(context.data)
    context.mount(createDatasetHtml(context))
}
async function loadDistributionData(context){
    const distributionIris = context.getObjects(dcat+'distribution')
    const promises = distributionIris.map(sourcedObject => context.loadData(labelPredicates, sourcedObject.term.value))
    return Promise.all(promises)
}
function createDistributionsHtml(context){
    const wrapper = document.createElement('div')
    const heading = document.createElement('h2')
    const distrLabel = context.getLabel(dcat+'distribution')
    if (distrLabel)
        heading.appendChild(createLabelHtml(dcat+'distribution', distrLabel))
    else
        heading.textContent = 'Distributions'
    const distributions = context.getObjects(dcat+'distribution')
    const distributionsElement = document.createElement('div')
    for (const distr of distributions){
        distributionsElement.appendChild(createDistributionFieldSet(distr.term.value, context))
    }
    wrapper.appendChild(heading)
    wrapper.appendChild(distributionsElement)
    return wrapper
}
function createDistributionFieldSet(distributionIri, context){
    const fieldSet = document.createElement('fieldset')
    const legend = document.createElement('legend')
    const label = context.getLabel(distributionIri)
    if (label){
        const bold = document.createElement('b')
        const labelHtml = createLabelHtml(distributionIri, label)
        bold.appendChild(labelHtml)
        legend.appendChild(bold)
    }
    else
        legend.textContent = distributionIri

    const distributionPredicates = [dcterms+'title', dcterms+'format', dcat+'downloadURL']
    fieldSet.appendChild(legend)
    fieldSet.appendChild(createDl(context, distributionPredicates, distributionIri))
    return fieldSet
}
function createDatasetHtml(context){
    const resultElement = document.createElement('div')
    resultElement.appendChild(createHeading(context))
    resultElement.appendChild(createSubHeading(context))
    const datasetPredicates = [dcterms+'spatial', dcterms+'publisher', dcat+'keyword', dcat+'theme', dcterms+'temporal', dcterms+'accrualPeriodicity', foaf+'page', dcat+'contactPoint']
    resultElement.appendChild(createDl(context, datasetPredicates, context.subjectIri))
    resultElement.appendChild(createDistributionsHtml(context))
    return resultElement
}
function createHeading(context){

    const titleElement = document.createElement('h1')
    const label = context.getLabel()
    if (label)
        titleElement.appendChild(createLabelHtml(context.subjectIri, label))
    else
        titleElement.textContent = context.subjectIri
    return titleElement
}
function createSubHeading(context){
    const descriptionElement = document.createElement('h2')
    const description = context.getObjects(dcterms+'description')
    if (description.length > 0)
        descriptionElement.appendChild(createLabelHtml(description[0].term.value, description[0]))
    
    return descriptionElement

}
function createDl(context, predicateIris, subjectIri){
    const dlElement = document.createElement("dl")
    
    for (const predicateIri of predicateIris){
        if (context.getObjects(predicateIri, subjectIri).length > 0)
            addPredicateToDl(context, predicateIri, subjectIri, dlElement)
    }
    return dlElement
}

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
function createLabelHtml(iri, sourcedObjectLabel){
    const literal = sourcedObjectLabel.term
    const bold = document.createElement('div')
    const valueElement = document.createElement('span')
    valueElement.textContent = literal.value + ' '
    const small = document.createElement('small')
    small.textContent = `(${literal.language || literal.datatype.value}) `
    // const sourcesSmall = document.createElement('small')
    // sourcesSmall.textContent = `[${Array.from({ length: sourcedObjectLiteral.sourceIds.length }, (_, i) => i).join(",")}]`
    
    const copyButton = document.createElement('button')
    copyButton.textContent = '📋'
    copyButton.onclick = () => {
        navigator.clipboard.writeText(iri)
    }
    const linkElement = document.createElement('a')
    linkElement.href = iri
    linkElement.textContent = '🔗'



    bold.appendChild(valueElement)
    bold.appendChild(small)
    // bold.appendChild(linkElement)
    // bold.appendChild(copyButton)
    // bold.appendChild(sourcesSmall)

    return bold
}
async function getTimeInterval(iri, fetcher){
    const query = fetcher.builder().subjects([iri]).predicates([dcat+'startDate', dcat+'endDate']).objects().build()
    const structuredQuads = await fetcher.fetchStructuredQuads(query)
    const startDate = Object.values(structuredQuads[iri][dcat+'startDate'])[0].term.value
    const endDate = Object.values(structuredQuads[iri][dcat+'endDate'])[0].term.value
    return `${startDate} - ${endDate}`
}
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


