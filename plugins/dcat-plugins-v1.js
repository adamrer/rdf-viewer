
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
    Distribution: DCAT+"Distribution",
    mediaType: DCAT+"mediaType",
    downloadURL: DCAT+"downloadURL",
    accessURL: DCAT+"accessURL",
    theme: DCAT+"theme",
    contactPoint: DCAT+"contactPoint"
}
const FOAF = "http://xmlns.com/foaf/0.1/"
const foaf = {
    page: FOAF+"page"
}

const DCTERMS = "http://purl.org/dc/terms/"
const dcterms = {
    title: DCTERMS+"title",
    format: DCTERMS+"format",
    accessRights: DCTERMS+"accessRights",
    spatial: DCTERMS+"spatial",
    accrualPeriodicity: DCTERMS+"accrualPeriodicity",
    description: DCTERMS+"description"

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
                        const chosenPredicates = [dcterms.accessRights, dcterms.spatial, dcat.theme, dcat.contactPoint, foaf.page, dcterms.accrualPeriodicity]
                        const labelPredicates = [dcterms.title, rdfs.label, skos.prefLabel, vcard.fn]

                        await context.data.fetch.quads([subject], undefined, context.configuration.languages)
                        await context.data.fetch.quads([dcat.distribution, ...chosenPredicates], labelPredicates, context.configuration.languages)

                        const objectIrisToFetchLabelsFor = []
                        chosenPredicates.forEach(predicate => {
                            const objects = context.data.fetched.subject(subject).predicate(predicate)
                            objects.forEach(object => {
                                if (object.value.termType.toLowerCase() === "namednode"){
                                    objectIrisToFetchLabelsFor.push(object.value.value)
                                }
                            })
                        })
                        // fetch labels for objects of chosenPredicates 
                        await context.data.fetch.quads(objectIrisToFetchLabelsFor, labelPredicates, context.configuration.languages)


                        const datasetLabel = getLabel(subject, [dcterms.title, skos.prefLabel, rdfs.label], context);
                        // render dataset label
                        const titleElement = document.createElement("h1")
                        titleElement.appendChild(createLabelElement(subject, datasetLabel))
                        element.appendChild(titleElement)
                        
                        // render dataset description
                        const descriptionElement = document.createElement("p")
                        descriptionElement.textContent = context.data.fetched.subject(subject).predicate(dcterms.description)[0]?.value?.value ?? "No description"
                        element.appendChild(descriptionElement)

                        const dl = createPredicatesDescriptionList(subject, chosenPredicates, context)
                        element.appendChild(dl)
                        
                        // render distributions
                        const distributionTitle = document.createElement("h2")
                        distributionTitle.appendChild(createLabelElement(dcat.Distribution, getLabel(dcat.distribution, [rdfs.label, skos.prefLabel], context)))
                        element.appendChild(distributionTitle)

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
                    
                    // load distribution data
                    (async () => {
                        const fieldset = document.createElement("fieldset")
                        element.appendChild(fieldset)
                        // fetch all quads about `subject`
                        await context.data.fetch.quads([subject])
                        // fetch labels for predicates
                        await context.data.fetch.quads([dcterms.format, dcat.mediaType, dcat.downloadURL, dcat.accessURL], [dcterms.title, skos.prefLabel, rdfs.label], context.configuration.languages)
                        const formats = context.data.fetched.subject(subject).predicate(dcterms.format)
                        const formatIris = formats.map(object => object.value.value)
                        // fetch format labels
                        await context.data.fetch.quads(formatIris, [skos.prefLabel], context.configuration.languages)
                        
                        // get distribution label
                        const distributionLabel = getLabel(subject, [dcterms.title, skos.prefLabel, rdfs.label], context);
                        
                        // render dataset label
                        const titleElement = document.createElement("h2")
                        if (subject !== distributionLabel){
                            titleElement.appendChild(createLabelElement(subject, distributionLabel))
                            fieldset.appendChild(titleElement)
                        }

                        const predicatesDl = createPredicatesDescriptionList(subject, [dcterms.format, dcat.mediaType], context)

                        const linksDl = createLinksDescriptionList(subject, [dcat.downloadURL, dcat.accessURL], context)

                        fieldset.appendChild(predicatesDl)
                        fieldset.appendChild(linksDl)
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

function appendLinkDefinitionToList(termElement, links, descriptionList){
    const dt = document.createElement("dt")

    dt.appendChild(termElement)
    dt.style.fontWeight = "bold"
    descriptionList.appendChild(dt)

    links.forEach(link => {
        const dd = document.createElement("dd")
        const linkElement = document.createElement("a")
        linkElement.href = link
        linkElement.textContent = linkElement.href
        dd.appendChild(linkElement)
    
        descriptionList.appendChild(dd)
    })
}

function getByLanguagePriority(items, priority) {
  for (const lang of priority) {
    const found = items.find(item => item.value.language === lang)
    if (found) return found
  }
  return null
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
    const labelLiterals = []
    for (const lp of labelPredicates) {
        const labels = context.data.fetched.subject(subject).predicate(lp)
        if (labels.length > 0) {
            for (const label of labels) {
                if (label.value.termType === "Literal") {
                    labelLiterals.push(label)
                }
            }
        }
    }
    if (labelLiterals.length !== 0)
        return getByLanguagePriority(labelLiterals, context.configuration.languages) ?? subjectLabel
    return subjectLabel;

}

function createLinksDescriptionList(subject, linkPredicates, context){
    const linksDl = document.createElement("dl")

    linkPredicates.forEach(predicate => {
        const objects = context.data.fetched.subject(subject).predicate(predicate).map(object => object.value.value)
        if (objects.length !== 0){
            const downloadElement = createLabelElement(predicate, getLabel(predicate, [rdfs.label], context))
            appendLinkDefinitionToList(downloadElement, objects, linksDl)
        }
    })

    return linksDl
}

function createPredicatesDescriptionList(subject, predicates, context){
    const descriptionList = document.createElement("dl")

    const labelPredicates = [dcat.title, skos.prefLabel, rdfs.label, vcard.fn]

    const predicateTermsDefinitions = []
    
    // create dt and dd elements
    const descriptionTerms = predicates.map(
        predicate => {
            const dt = document.createElement("dt")
            dt.appendChild(createLabelElement(predicate, getLabel(predicate, labelPredicates, context)))
            dt.style.fontWeight = "bold"
            const objects = context.data.fetched.subject(subject).predicate(predicate)
            const descriptionDefinitions = objects.map(object => {
                const dd = document.createElement("dd")
                dd.appendChild(createLabelElement(object.value.value, getLabel(object.value.value, labelPredicates, context)))
                return dd    
            })
            predicateTermsDefinitions.push(descriptionDefinitions)

            return dt
        }
    )

    // mount 
    for (let i = 0; i < descriptionTerms.length; i++) {
        const dt = descriptionTerms[i];
        const objects = context.data.fetched.subject(subject).predicate(predicates[i])

        if (objects.length !== 0){
            descriptionList.appendChild(dt)
            predicateTermsDefinitions[i].forEach(dd => {
                descriptionList.appendChild(dd)
            })
        }
    }
    return descriptionList

}

function createLabelElement(iri, sourcedLabel){
    const container = document.createElement("div")
    const valueElement = document.createElement("span")
    const literal = sourcedLabel.value ?? sourcedLabel
    valueElement.textContent = literal.value ?? literal
    container.appendChild(valueElement)

    if (literal.language || literal.datatype){
        const languageElement = document.createElement("small")
        let langOrDatatype = literal.language;
        if (!langOrDatatype) {
            langOrDatatype = literal.datatype.value.split("#")[1];
        }
        languageElement.textContent = ` (${langOrDatatype}) `;
        container.appendChild(languageElement)
    }
    
    addLinkButton(container, iri)
    addCopyButton(container, iri)

    return container

}
function addCopyButton(element, iri) {
  const copyButton = document.createElement("span");
  copyButton.textContent = "📋";
  copyButton.onclick = async () => {
    const originalText = copyButton.textContent;

    try {
      await navigator.clipboard.writeText(iri);
      copyButton.textContent = "✓";

      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    } catch {
      copyButton.textContent = "❌";

      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    }
  };
  copyButton.style.cursor = "pointer";
  copyButton.title = "Copy IRI to clipboard";

  copyButton.style.opacity = "0";
  copyButton.style.transition = "opacity 0.3s ease";
  element.addEventListener("mouseenter", () => {
    copyButton.style.opacity = "1";
  });
  element.addEventListener("mouseleave", () => {
    copyButton.style.opacity = "0";
  });
  element.appendChild(copyButton);
}
function addLinkButton(element, iri) {
  const linkElement = document.createElement("a");
  linkElement.href = iri;
  linkElement.target = "_blank";
  linkElement.rel = "noopener noreferrer";
  linkElement.textContent = "🔗";
  linkElement.style.textDecoration = "none";
  linkElement.style.opacity = "0";
  linkElement.style.transition = "opacity 0.3s ease";
  element.addEventListener("mouseenter", () => {
    linkElement.style.opacity = "1";
  });
  element.addEventListener("mouseleave", () => {
    linkElement.style.opacity = "0";
  });
  element.appendChild(linkElement);
}