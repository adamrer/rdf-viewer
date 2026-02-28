// definitions for VSCode type hinting
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1} PluginV1 */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1InstanceContext} PluginV1InstanceContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1CompatibilityContext} PluginV1CompatibilityContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').LabeledPlugin} LabeledPlugin */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1Instance} PluginV1Instance */
/** @typedef {string} IRI */

/**
 * Registers DCAT-specific plugins for Datasets and Distributions.
 * @returns {LabeledPlugin[]}
 */
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

// Namespace constants for easier access to RDF properties
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

/**
 * Logic for the dcat:Dataset viewer.
 * @returns {PluginV1}
 */
function createDatasetPlugin() {
    return {
        setup(context) {
            // No global setup required for this plugin
        },

        /**
         * Creates a visual representation of a Dataset.
         * @param {PluginV1InstanceContext} context 
         * @param {IRI} subject 
         * @returns {PluginV1Instance}
         */
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            return {
                mount(element) {
                    mountedToElement = element;
                    
                    (async () => {
                        context.html.renderLoading(element)
                        // Define which predicates we want to display and which we use for labels
                        const chosenPredicates = [dcterms.accessRights, dcterms.spatial, dcat.theme, dcat.contactPoint, foaf.page, dcterms.accrualPeriodicity]
                        const labelPredicates = [dcterms.title, rdfs.label, skos.prefLabel, vcard.fn]

                        // Initial fetch: all data for the subject + labels for known common terms
                        await context.data.fetch.quads([subject], undefined, context.configuration.languages)
                        await context.data.fetch.quads([dcat.distribution, ...chosenPredicates], labelPredicates, context.configuration.languages)

                        // Collect IRIs that appeared as objects so we can fetch their human-readable labels
                        const objectIrisToFetchLabelsFor = []
                        chosenPredicates.forEach(predicate => {
                            const objects = context.data.fetched.subject(subject).predicate(predicate)
                            objects.forEach(object => {
                                if (object.value.termType.toLowerCase() === "namednode"){
                                    objectIrisToFetchLabelsFor.push(object.value.value)
                                }
                            })
                        })
                        
                        // Batch fetch labels for all found object IRIs
                        if (objectIrisToFetchLabelsFor.length > 0) {
                            await context.data.fetch.quads(objectIrisToFetchLabelsFor, labelPredicates, context.configuration.languages)
                        }
                        element.replaceChildren()
                        // Render Title (h1)
                        const datasetLabel = getLabel(subject, [dcterms.title, skos.prefLabel, rdfs.label], context);
                        const titleElement = document.createElement("h1")
                        titleElement.appendChild(createLabelElement(subject, datasetLabel))
                        element.appendChild(titleElement)
                        
                        // Render Description (p)
                        const descriptionElement = document.createElement("p")
                        descriptionElement.textContent = context.data.fetched.subject(subject).predicate(dcterms.description)[0]?.value?.value ?? "No description"
                        element.appendChild(descriptionElement)

                        // Render main metadata table (Description List)
                        const dl = createPredicatesDescriptionList(subject, chosenPredicates, context)
                        element.appendChild(dl)
                        
                        // Header for Distributions
                        const distributionTitle = document.createElement("h2")
                        distributionTitle.appendChild(createLabelElement(dcat.Distribution, getLabel(dcat.distribution, [rdfs.label, skos.prefLabel], context)))
                        element.appendChild(distributionTitle)

                        // Container for Distribution child plugins
                        const distributionsWrapper = document.createElement("div")
                        const distributions = context.data.fetched.subject(subject).predicate(dcat.distribution)
                        const distributionIris = distributions.filter(q => q.value.termType === "NamedNode").map(q => q.value.value)
                        
                        // For each distribution IRI, try to render it using another compatible plugin (Interoperability)
                        distributionIris.forEach(async (iri) => {
                            const distributionElement = document.createElement("div")
                            distributionElement.style.marginBottom = "20px";
                            distributionElement.style.paddingLeft = "15px";
                            distributionElement.style.borderLeft = "3px solid #eee";
                            
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

        /**
         * Checks if the subject is an instance of dcat:Dataset (or similar).
         */
        async checkCompatibility(context, subject) {
            const subjectTypes = await context.data.fetch.types(subject)
            const subjectTypeValues = subjectTypes.map(t => t.value.value)
            // Use vocabulary service to check for semantically equivalent classes
            const datasetTypeIris = context.data.vocabulary.getSemanticallySimilar(dcat.Dataset)
            return {
                isCompatible: subjectTypeValues.some(t => datasetTypeIris.includes(t)),
                priority: 1000
            }
        }
    }
}

/**
 * Logic for the dcat:Distribution viewer.
 * @returns {PluginV1}
 */
function createDistributionPlugin() {
    return {
        setup(context) {},
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            return {
                mount(element) {
                    mountedToElement = element;
                    
                    (async () => {
                        const fieldset = document.createElement("fieldset")
                        fieldset.style.borderRadius = "8px";
                        fieldset.style.border = "1px solid #ddd";
                        element.appendChild(fieldset)

                        // Fetch all available data about this distribution
                        await context.data.fetch.quads([subject])
                        
                        // Fetch labels for specific DCAT/DCTerms fields used in distributions
                        await context.data.fetch.quads([dcterms.format, dcat.mediaType, dcat.downloadURL, dcat.accessURL], [dcterms.title, skos.prefLabel, rdfs.label], context.configuration.languages)
                        
                        const formats = context.data.fetched.subject(subject).predicate(dcterms.format)
                        const formatIris = formats.map(object => object.value.value)
                        // Fetch labels for the formats themselves (e.g. "JSON", "CSV")
                        if (formatIris.length > 0) {
                            await context.data.fetch.quads(formatIris, [skos.prefLabel], context.configuration.languages)
                        }
                        
                        const distributionLabel = getLabel(subject, [dcterms.title, skos.prefLabel, rdfs.label], context);
                        
                        // Render Title (h2) if the label is different from the IRI
                        const titleElement = document.createElement("h2")
                        if (subject !== distributionLabel){
                            titleElement.appendChild(createLabelElement(subject, distributionLabel))
                            fieldset.appendChild(titleElement)
                        }

                        // Render Format/MediaType fields
                        const predicatesDl = createPredicatesDescriptionList(subject, [dcterms.format, dcat.mediaType], context)
                        // Render Download/Access links
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

        /**
         * Checks if the subject is an instance of dcat:Distribution (or similar).
         */
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

// --- Rendering Helpers ---

/**
 * Appends a DT/DD pair to a description list where DD contains clickable links.
 */
function appendLinkDefinitionToList(termElement, links, descriptionList){
    const dt = document.createElement("dt")
    dt.appendChild(termElement)
    dt.style.fontWeight = "bold"
    descriptionList.appendChild(dt)

    links.forEach(link => {
        const dd = document.createElement("dd")
        const linkElement = document.createElement("a")
        linkElement.href = link
        linkElement.textContent = link
        dd.appendChild(linkElement)
        descriptionList.appendChild(dd)
    })
}

/**
 * Helper to select the literal matching user's language priority.
 */
function getByLanguagePriority(items, priority) {
  for (const lang of priority) {
    const found = items.find(item => item.value.language === lang)
    if (found) return found
  }
  return null
}

/**
 * Finds the best label for a given subject using a priority list of predicates.
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

/**
 * Creates a <dl> specialized for displaying URL links (Download/Access URLs).
 */
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

/**
 * Creates a <dl> for a list of RDF predicates and their corresponding values (labels).
 */
function createPredicatesDescriptionList(subject, predicates, context){
    const descriptionList = document.createElement("dl")
    const labelPredicates = [dcat.title, skos.prefLabel, rdfs.label, vcard.fn]
    const predicateTermsDefinitions = []
    
    // Preparation phase: create DT elements and their associated DD elements
    const descriptionTerms = predicates.map(
        predicate => {
            const dt = document.createElement("dt")
            dt.appendChild(createLabelElement(predicate, getLabel(predicate, labelPredicates, context)))
            dt.style.fontWeight = "bold"
            
            const objects = context.data.fetched.subject(subject).predicate(predicate)
            const descriptionDefinitions = objects.map(object => {
                const dd = document.createElement("dd")
                // Render the object's label if it's a NamedNode
                dd.appendChild(createLabelElement(object.value.value, getLabel(object.value.value, labelPredicates, context)))
                return dd    
            })
            predicateTermsDefinitions.push(descriptionDefinitions)

            return dt
        }
    )

    // Mount phase: add to DOM only if there's actually data for the predicate
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

/**
 * Creates a standard UI component for a label with Copy and Link buttons.
 */
function createLabelElement(iri, sourcedLabel){
    const container = document.createElement("div")
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.gap = "4px";

    const valueElement = document.createElement("span")
    const literal = sourcedLabel.value ?? sourcedLabel
    valueElement.textContent = literal.value ?? literal
    container.appendChild(valueElement)

    // Display language or datatype info if present
    if (literal.language || (literal.datatype && literal.datatype.value !== "http://www.w3.org/2001/XMLSchema#string")){
        const languageElement = document.createElement("small")
        languageElement.style.color = "#666";
        let langOrDatatype = literal.language;
        if (!langOrDatatype) {
            langOrDatatype = literal.datatype.value.split("#")[1];
        }
        languageElement.textContent = ` (${langOrDatatype}) `;
        container.appendChild(languageElement)
    }
    
    // Add interaction buttons for IRIs
    addLinkButton(container, iri)
    addCopyButton(container, iri)

    return container
}

/**
 * Adds a clipboard copy button that shows success state temporarily.
 */
function addCopyButton(element, iri) {
  const copyButton = document.createElement("span");
  copyButton.textContent = "📋";
  copyButton.style.cursor = "pointer";
  copyButton.title = "Copy IRI to clipboard";

  copyButton.onclick = async () => {
    const originalText = copyButton.textContent;
    try {
      await navigator.clipboard.writeText(iri);
      copyButton.textContent = "✓";
      setTimeout(() => { copyButton.textContent = originalText; }, 1500);
    } catch {
      copyButton.textContent = "❌";
      setTimeout(() => { copyButton.textContent = originalText; }, 1500);
    }
  };

  // Hover effect: only show button when parent is hovered
  copyButton.style.opacity = "0";
  copyButton.style.transition = "opacity 0.3s ease";
  element.addEventListener("mouseenter", () => { copyButton.style.opacity = "1"; });
  element.addEventListener("mouseleave", () => { copyButton.style.opacity = "0"; });
  
  element.appendChild(copyButton);
}

/**
 * Adds an external link icon.
 */
function addLinkButton(element, iri) {
  const linkElement = document.createElement("a");
  linkElement.href = iri;
  linkElement.target = "_blank";
  linkElement.rel = "noopener noreferrer";
  linkElement.textContent = "🔗";
  linkElement.style.textDecoration = "none";

  // Hover effect
  linkElement.style.opacity = "0";
  linkElement.style.transition = "opacity 0.3s ease";
  element.addEventListener("mouseenter", () => { linkElement.style.opacity = "1"; });
  element.addEventListener("mouseleave", () => { linkElement.style.opacity = "0"; });
  
  element.appendChild(linkElement);
}