export function registerPlugins() {
    return [
        {
            label: {"en": "Dataset Plugin"},
            v1: createDatasetPlugin()
        },
        {
            label: {"en": "Distribution Plugin"},
            v1: createDistributionPlugin()
        }
    ]
}


function createDatasetPlugin() {
    const dcat = {
        dcat: "http://www.w3.org/ns/dcat#",
        Dataset: this.dcat+"Dataset",
        distribution: this.dcat+"distribution"
    }
    const dcterms = {
        dcterms: "http://purl.org/dc/terms/",
        title: this.dcterms+"title"
    }
    const rdfs = {
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        label: this.rdfs+"label"
    }
    const skos = {
        skos: "http://www.w3.org/2004/02/skos/core#",
        prefLabel: this.skos+"prefLabel"
    }
    const vcard = {
        vcard: "http://www.w3.org/2006/vcard/ns#",
        fn: this.vcard+"fn"
    }
    const dcat_ap_cz = {
        dcat_ap_cz: "https://ofn.gov.cz/dcat-ap-cz-rozhraní-katalogů-dat#",
        DatovaSada: this.dcat_ap_cz+"DatováSada"
    }

    return {
        setup(context) {
            context.vocabulary.addSemanticallySimilar(dcterms.title, rdfs.label, skos.prefLabel, vcard.fn)
            context.vocabulary.addSemanticallySimilar(dcat.Dataset, dcat_ap_cz.DatovaSada)
        },
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            return {
                mount(element) {
                    mountedToElement = element;
                    // load dataset data
                    (async () => {
                        await context.data.fetch.predicates(subject)
                    })()
                    
                    // get dataset label
                    const labelPredicates = context.vocabulary.getSemanticallySimilar(dcterms.title)
                    let datasetLabel = subject
                    for (const lp of labelPredicates) {
                        const labels = context.data.fetched.subject(subject).predicate(lp)
                        if (labels.length > 0) {
                            for (const label of labels) {
                                if (label.object.termType === "Literal") {
                                    datasetLabel = label.object.value;
                                    break;
                                }
                            }
                        }
                    }
                    // render dataset label
                    const titleElement = document.createElement("h2")
                    titleElement.textContent = datasetLabel
                    element.appendChild(titleElement)

                    // render distributions
                    const distributionElement = document.createElement("div")
                    const distributions = context.data.fetched.subject(subject).predicate(subject, dcat.distribution)
                    const distributionIris = distributions.filter(q => q.object.termType === "NamedNode").map(q => q.object.value)
                    distributionIris.forEach(iri => {
                        context.interoperability.renderSubject(iri, distributionElement)
                    })
                    element.appendChild(distributionElement)
                },
                unmount() {
                    if (mountedToElement !== null) {
                        mountedToElement.innerHTML = "";
                        mountedToElement = null;
                    }
                }
            }
        },
        async checkCompatibility(context, subject) {
            const subjectTypes = await context.data.fetch.types(subject)
            const subjectTypeValues = subjectTypes.map(t => t.value)

            return {
                isCompatible: subjectTypeValues.includes(dcat.Dataset),
                priority: 1000
            }
        }
    }
}


function createDistributionPlugin() {

}