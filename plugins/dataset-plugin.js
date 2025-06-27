const dcterms = "http://purl.org/dc/terms/"
const dcat = "http://www.w3.org/ns/dcat#"
const skos = "http://www.w3.org/2004/02/skos/core#"
const vcard = "http://www.w3.org/2006/vcard/ns#"
const rdfs = "http://www.w3.org/2000/01/rdf-schema#"
const foaf = "http://xmlns.com/foaf/0.1/"
const labelPredicates = [ dcterms+'title', rdfs+'label', skos+'prefLabel', vcard+"fn" ] 

class RenderingContext{

    constructor(subjectIri, fetcher, preferredLanguages){
        this.subjectIri = subjectIri
        this.fetcher = fetcher
        this.preferredLanguages = preferredLanguages
    }

    async initialize(){
        const query = this.fetcher.builder()
            .subjects([this.subjectIri]).predicates().objects().langs(this.preferredLanguages).build()

        this.data = await this.fetcher.fetchStructuredQuads(query)

        const iris = this.collectIris(this.data)
        const labelQuery = this.fetcher.builder()
            .subjects(iris)
            .predicates(labelPredicates)
            .objects()
            .langs(this.preferredLanguages)
            .build()
        this.labels = await this.fetcher.fetchStructuredQuads(labelQuery)
    }
    getLabel(iri) {
        const labelPredicates = this.labels[iri];
        if (!labelPredicates) return undefined;

        for (const predicate in labelPredicates) {
        const labelObjects = Object.values(labelPredicates[predicate]);
        const literals = labelObjects.filter(o => o.term.termType === 'Literal');

        literals.sort((a, b) => {
            const langA = a.term.language || '';
            const langB = b.term.language || '';
            return this.getLangPriority(langA) - this.getLangPriority(langB);
        });

        if (literals.length > 0) return literals[0].term;
        }

        return undefined;
    }

    getLangPriority(lang) {
        const index = this.preferredLanguages.indexOf(lang || '');
        return index === -1 ? this.preferredLanguages.length : index;
    }
    collectIris(structuredQuads){
        const iris = []
        for (const subjectIri in structuredQuads){
            iris.push(subjectIri)
            const predicates = structuredQuads[subjectIri]
            for (const predicateIri in predicates){
                iris.push(predicateIri)
                const objectKeys = predicates[predicateIri]
                for (const objectKey in objectKeys){
                    const object = objectKeys[objectKey].term
                    if (object.termType !== 'Literal'){
                        iris.push(object.value)
                    }
                }
            }
        }
        return iris

    }

}
export async function displayQuads(entityIri, fetcher, languages, resultsEl){
    const ctx = new RenderingContext(entityIri, fetcher, languages)
    await ctx.initialize()
    console.log(ctx.labels)
    const dl = createDl(ctx)
    resultsEl.appendChild(dl)
}

function createDl(ctx){
    const dlElement = document.createElement("dl")
    const predicates = [dcterms+'spatial', dcterms+'publisher', dcat+'keyword', dcat+'theme', dcterms+'temporal', dcterms+'accrualPeriodicity', foaf+'page', dcat+'contactPoint']
    
    for (const predicateIri of predicates){
        addPredicateToDl(ctx, predicateIri, dlElement)
    }


    return dlElement
}
function addPredicateToDl(ctx, predicateIri, dlElement){
    const dtElement = document.createElement('dt')
    const termElement = document.createElement('b')
    const label = ctx.getLabel(predicateIri)
    if (label !== undefined){
        dtElement.appendChild(createLiteralHtml(label)) 
    }
    else{
        dtElement.textContent = predicateIri
    }
    termElement.appendChild(dtElement)
    dlElement.appendChild(termElement)
    const objects = ctx.data[ctx.subjectIri][predicateIri]
    for (const objectKey in objects){
        addObjectToDl(ctx, objects[objectKey].term, dlElement)
    }
    
}
function createLiteralHtml(literal){
    const bold = document.createElement('div')
    const valueElement = document.createElement('span')
    valueElement.textContent = literal.value + '\t\t'
    const small = document.createElement('small')
    small.textContent = `(${literal.language || literal.datatype})`

    bold.appendChild(valueElement)
    bold.appendChild(small)

    return bold
}
function addObjectToDl(ctx, object, dlElement){
    const ddElement = document.createElement('dd')
    if (object.termType === 'Literal'){
        ddElement.appendChild(createLiteralHtml(object))
    }
    else{
        const label = ctx.getLabel(object.value)
        if (label !== undefined){
            ddElement.appendChild(createLiteralHtml(label))
        }
        else{
            ddElement.textContent = object.value
        }
    }
    dlElement.appendChild(ddElement)
}


