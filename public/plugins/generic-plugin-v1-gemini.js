// Definice jmenných prostorů pro snadnější práci
const RDFS = "http://www.w3.org/2000/01/rdf-schema#"
const SKOS = "http://www.w3.org/2004/02/skos/core#"
const DCTERMS = "http://purl.org/dc/terms/"
const FOAF = "http://xmlns.com/foaf/0.1/"
const SCHEMA = "http://schema.org/"

const LABELS = [
    SKOS + "prefLabel",
    RDFS + "label",
    DCTERMS + "title",
    FOAF + "name",
    SCHEMA + "name"
];

export function registerPlugins() {
    return [
        {
            label: { "en": "Generic Viewer", "cs": "Obecný prohlížeč" },
            v1: createGenericPlugin()
        }
    ]
}

function createGenericPlugin() {
    return {
        setup(context) {

        },
        async checkCompatibility(context, subject) {
            return {
                isCompatible: true,
                priority: 0 
            }
        },
        createPluginInstance(context, subject) {
            let mountedToElement = null;

            return {
                mount(element) {
                    mountedToElement = element;
                    
                    (async () => {
                        // 1. Creation of a container
                        const container = document.createElement("div");
                        container.className = "generic-rdf-plugin";
                        element.appendChild(container);

                        // 2. Loading all main subject data (all predicates)
                        await context.data.fetch.quads([subject], undefined, context.configuration.languages);

                        const subjectNavigator = context.data.fetched.subject(subject);
                        const predicates = subjectNavigator.predicates();
                        
                        // Collecting IRIs for labeling
                        const irisToLabel = new Set();
                        irisToLabel.add(subject); // Chceme label i pro hlavní subjekt
                        
                        predicates.forEach(predicate => {
                            irisToLabel.add(predicate); // Label for predicate
                            const objects = subjectNavigator.predicate(predicate);
                            objects.forEach(obj => {
                                if (obj.value.termType === "NamedNode") {
                                    irisToLabel.add(obj.value.value); // Label for object
                                }
                            });
                        });

                        if (irisToLabel.size > 0) {
                            await context.data.fetch.quads(Array.from(irisToLabel), LABELS, context.configuration.languages);
                        }

                        // 5. Header
                        const subjectLabel = getLabel(subject, LABELS, context);
                        const header = document.createElement("h1");
                        header.style.borderBottom = "1px solid #ccc";
                        header.style.paddingBottom = "10px";
                        header.appendChild(createLabelElement(subject, subjectLabel, true));
                        container.appendChild(header);

                        // 6. Render a list of predicates
                        const dl = document.createElement("dl");
                        dl.style.display = "grid";
                        dl.style.gridTemplateColumns = "max-content auto"; // predicate left, value right
                        dl.style.gap = "10px 20px";
                        dl.style.alignItems = "baseline";

                        // Alphabetical ordering
                        const sortedPredicates = predicates.sort((a, b) => {
                            const labelA = getLabel(a, LABELS, context);
                            const labelB = getLabel(b, LABELS, context);
                            const textA = labelA.value?.value ?? labelA;
                            const textB = labelB.value?.value ?? labelB;
                            return textA.localeCompare(textB);
                        });

                        sortedPredicates.forEach(predicate => {
                            const objects = subjectNavigator.predicate(predicate);
                            if (objects.length === 0) return;

                            // DT - predicate
                            const dt = document.createElement("dt");
                            dt.style.fontWeight = "bold";
                            dt.style.color = "#555";
                            dt.style.gridColumn = "1"; 
                            
                            const predicateLabel = getLabel(predicate, LABELS, context);
                            dt.appendChild(createLabelElement(predicate, predicateLabel));
                            dl.appendChild(dt);

                            // DD - objects
                            const dd = document.createElement("dd");
                            dd.style.margin = "0";
                            dd.style.gridColumn = "2"; 
                            
                            const ul = document.createElement("ul");
                            ul.style.listStyle = "none";
                            ul.style.padding = "0";
                            ul.style.margin = "0";

                            objects.forEach(obj => {
                                const li = document.createElement("li");
                                li.style.marginBottom = "4px";

                                if (obj.value.termType === "NamedNode") {
                                    const objIri = obj.value.value;
                                    const objLabel = getLabel(objIri, LABELS, context);
                                    li.appendChild(createLabelElement(objIri, objLabel));
                                } else if (obj.value.termType === "Literal") {
                                    li.appendChild(createLabelElement(null, obj));
                                } else {
                                    // Blank node etc.
                                    li.textContent = obj.value.value;
                                }
                                ul.appendChild(li);
                            });

                            dd.appendChild(ul);
                            dl.appendChild(dd);
                        });

                        container.appendChild(dl);

                    })();
                },
                unmount() {
                    if (mountedToElement !== null) {
                        mountedToElement.replaceChildren();
                        mountedToElement = null;
                    }
                }
            }
        }
    }
}

// --- Helper functions ---

/**
 * Returns the first label that is from predicate semantically similar from dcterms:title from context.data.fetched
 * 
 * @param {IRI} subject - the subject to label
 * @param {*} context - plugin instance context
 * @returns label for the subject
 */
function getLabel(subject, labelPredicates, context) {
    let subjectLabel = subject;
    const labelLiterals = [];
    
    for (const lp of labelPredicates) {
        const labels = context.data.fetched.subject(subject).predicate(lp);
        if (labels.length > 0) {
            for (const label of labels) {
                if (label.value.termType === "Literal") {
                    labelLiterals.push(label);
                }
            }
        }
    }

    if (labelLiterals.length !== 0) {
        return getByLanguagePriority(labelLiterals, context.configuration.languages) ?? subjectLabel;
    }
    return subjectLabel;
}

function getByLanguagePriority(items, priority) {
    for (const lang of priority) {
        const found = items.find(item => item.value.language === lang);
        if (found) return found;
    }

    return items[0] || null;
}

/**
 * Creates DOM element for displaying a value
 * with buttons for copying and redirecting (if it is an IRI)
 * @param {string|null} iri - IRI of a subject (for link/copy), or null if it's a literal without an IRI
 * @param {object|string} sourcedLabel - Object literal from N3, or string
 * @param {boolean} isHeader - If it is the main header
 */
function createLabelElement(iri, sourcedLabel, isHeader = false) {
    const container = document.createElement("div");
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.gap = "5px";

    const valueElement = document.createElement("span");
    
    const literal = sourcedLabel.value ?? sourcedLabel;
    const textValue = literal.value ?? literal;
    
    valueElement.textContent = textValue;
    if (isHeader) valueElement.style.fontWeight = "bold";
    container.appendChild(valueElement);

    if (literal.language || (literal.datatype && literal.datatype.value !== "http://www.w3.org/2001/XMLSchema#string")) {
        const metaElement = document.createElement("small");
        metaElement.style.color = "#888";
        metaElement.style.fontSize = "0.8em";
        metaElement.style.marginLeft = "4px";
        metaElement.style.border = "1px solid #ddd";
        metaElement.style.borderRadius = "3px";
        metaElement.style.padding = "0 2px";
        
        let metaText = "";
        if (literal.language) {
            metaText = literal.language;
        } else if (literal.datatype) {
            const split = literal.datatype.value.split("#");
            metaText = split.length > 1 ? split[1] : literal.datatype.value;
            if (metaText === literal.datatype.value) {
                const splitSlash = literal.datatype.value.split("/");
                metaText = splitSlash[splitSlash.length - 1];
            }
        }
        metaElement.textContent = metaText;
        container.appendChild(metaElement);
    }
    
    if (iri) {
        addLinkButton(container, iri);
        addCopyButton(container, iri);
    }

    return container;
}

function addCopyButton(element, iri) {
    const copyButton = document.createElement("span");
    copyButton.textContent = "📋";
    copyButton.style.cursor = "pointer";
    copyButton.title = "Copy IRI to clipboard";
    copyButton.style.fontSize = "0.9em";
    copyButton.style.marginLeft = "5px";

    copyButton.style.opacity = "0";
    copyButton.style.transition = "opacity 0.2s ease";
    
    element.addEventListener("mouseenter", () => copyButton.style.opacity = "1");
    element.addEventListener("mouseleave", () => copyButton.style.opacity = "0");

    copyButton.onclick = async (e) => {
        e.stopPropagation();
        const originalText = copyButton.textContent;
        try {
            await navigator.clipboard.writeText(iri);
            copyButton.textContent = "✓";
        } catch {
            copyButton.textContent = "❌";
        }
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 1500);
    };

    element.appendChild(copyButton);
}

function addLinkButton(element, iri) {
    const linkElement = document.createElement("a");
    linkElement.href = iri;
    linkElement.target = "_blank";
    linkElement.rel = "noopener noreferrer";
    linkElement.textContent = "🔗";
    linkElement.style.textDecoration = "none";
    linkElement.style.fontSize = "0.9em";
    
    linkElement.style.opacity = "0";
    linkElement.style.transition = "opacity 0.2s ease";

    element.addEventListener("mouseenter", () => linkElement.style.opacity = "1");
    element.addEventListener("mouseleave", () => linkElement.style.opacity = "0");

    element.appendChild(linkElement);
}