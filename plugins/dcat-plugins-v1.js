
export function registerPlugins() {
    return [
        {
            label: {"en": "Dataset Plugin", "cs": "Datová sada"},
            v1: createDatasetPlugin()
        },
        {
            label: {"en": "Distribution Plugin", "cs": "Distribuce"},
            v1: createDistributionPlugin()
        }
    ]
}

const DCAT = "http://www.w3.org/ns/dcat#"
const dcat = {
    Dataset: DCAT+"Dataset",
    distribution: DCAT+"distribution",
    Distribution: DCAT+"Distribution"
}

const DCTERMS = "http://purl.org/dc/terms/"
const dcterms = {
    title: DCTERMS+"title"
}

const RDFS = "http://www.w3.org/2000/01/rdf-schema#"
const rdfs = {
    label: RDFS+"label"
}
const SKOS = "http://www.w3.org/2004/02/skos/core#"
const skos = {
    prefLabel: SKOS+"prefLabel"
}

const VCARD = "http://www.w3.org/2006/vcard/ns#"
const vcard = {
    fn: VCARD+"fn"
}

const DCAT_AP_CZ = "https://ofn.gov.cz/dcat-ap-cz#"
const dcat_ap_cz = {
    DatovaSada: DCAT_AP_CZ+"DatováSada",
    distribuce: DCAT_AP_CZ+"distribuce",
    Distribuce: DCAT_AP_CZ+"Distribuce"
}


function createDatasetPlugin() {


    return {
        setup(context) {

        },
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            return {
                mount(element) {
                    mountedToElement = element;
                    // load dataset data
                    (async () => {
                        await context.data.fetch.quads([subject], undefined, context.configuration.languages)
                        const datasetLabel = getLabel(subject, [dcterms.title, skos.prefLabel, rdfs.label], context);
                        
                        // render dataset label
                        const titleElement = document.createElement("h1")
                        titleElement.textContent = datasetLabel
                        element.appendChild(titleElement)
                        
                        
                        // render distributions
                        const distributionsWrapper = document.createElement("div")
                        const distributions = context.data.fetched.subject(subject).predicate(dcat.distribution)
                        const distributionIris = distributions.filter(q => q.value.termType === "NamedNode").map(q => q.value.value)
                        distributionIris.forEach(async (iri) => {
                            const distributionElement = document.createElement("div")
                            const handler = await context.interoperability.renderSubject(iri, distributionElement)
                            if (handler == null){
                                distributionElement.textContent = `No compatible plugin available for ${iri}`
                            }
                            
                            distributionsWrapper.appendChild(distributionElement)
                        })
                        element.appendChild(distributionsWrapper)
                    })()
                },
                unmount() {
                    if (mountedToElement !== null) {
                        mountedToElement.replaceChildren();
                        mountedToElement = null;
                    }
                }
            }
        },
        async checkCompatibility(context, subject) {
            const subjectTypes = await context.data.fetch.types(subject)
            const subjectTypeValues = subjectTypes.map(t => t.value.value)
            const datasetTypeIris = context.data.vocabulary.getSemanticallySimilar(dcat.Dataset)
            return {
                isCompatible: subjectTypeValues.some(t => datasetTypeIris.includes(t)),
                priority: 1000
            }
        }
    }
}


function createDistributionPlugin() {

    return {
        setup(context) {
            
        },
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            return {
                mount(element) {
                    mountedToElement = element;
                    element.style.border = '1em solid black';

                    // load distribution data
                    (async () => {
                        await context.data.fetch.quads([subject])
                        
                        // get distribution label
                        const distributionLabel = getLabel(subject, [dcterms.title, skos.prefLabel, rdfs.label], context);
                        
                        // render dataset label
                        const titleElement = document.createElement("h2")
                        titleElement.textContent = distributionLabel
                        element.appendChild(titleElement)
                    })()
                },
                unmount() {
                    if (mountedToElement !== null) {
                        mountedToElement.replaceChildren();
                        mountedToElement = null;
                    }
                }
            }
        },
        async checkCompatibility(context, subject) {
            const subjectTypes = await context.data.fetch.types(subject)
            const subjectTypeValues = subjectTypes.map(t => t.value.value)
            const distributionTypeIris = context.data.vocabulary.getSemanticallySimilar(dcat.Distribution)

            return {
                isCompatible: subjectTypeValues.some(t => distributionTypeIris.includes(t)),
                priority: 1000
            }
        }
    }
}

/**
 * Returns the first label that is from predicate semantically similar from dcterms:title from context.data.fetched
 * 
 * @param {ÏRI} subject - the subject to label
 * @param {*} context - plugin instance context
 * @returns label for the subject
 */
function getLabel(subject, labelPredicates, context){
    let subjectLabel = subject
    for (const lp of labelPredicates) {
        const labels = context.data.fetched.subject(subject).predicate(lp)
        if (labels.length > 0) {
            for (const label of labels) {
                if (label.value.termType === "Literal") {
                    subjectLabel = label.value.value;
                    return subjectLabel;
                }
            }
        }
    }
    return label;

}