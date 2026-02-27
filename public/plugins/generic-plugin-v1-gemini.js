// definitions for VSCode type hinting
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1} PluginV1 */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1InstanceContext} PluginV1InstanceContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1CompatibilityContext} PluginV1CompatibilityContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').LabeledPlugin} LabeledPlugin */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1Instance} PluginV1Instance */
/** @typedef {string} IRI */

// Namespace constants
const RDFS = "http://www.w3.org/2000/01/rdf-schema#"
const SKOS = "http://www.w3.org/2004/02/skos/core#"
const DCTERMS = "http://purl.org/dc/terms/"
const FOAF = "http://xmlns.com/foaf/0.1/"
const SCHEMA = "http://schema.org/"

// Predicates used to find human-readable labels
const LABELS = [
    SKOS + "prefLabel",
    RDFS + "label",
    DCTERMS + "title",
    FOAF + "name",
    SCHEMA + "name"
];

/**
 * Registers the Generic Viewer plugin.
 * @returns {LabeledPlugin[]}
 */
export function registerPlugins() {
    return [
        {
            label: { "en": "Generic Viewer", "cs": "Obecný prohlížeč" },
            v1: createGenericPlugin()
        }
    ]
}

/**
 * Creates the plugin logic.
 * @returns {PluginV1}
 */
function createGenericPlugin() {
    return {
        /**
         * Setup function - not used for generic plugin, 
         * but required by interface.
         */
        setup(context) {
            // No vocabulary registration needed for generic view
        },

        /**
         * Checks if this plugin can display the subject.
         * The generic plugin is compatible with everything but has very low priority (0).
         * @param {PluginV1CompatibilityContext} context
         * @param {IRI} subject
         */
        async checkCompatibility(context, subject) {
            return {
                isCompatible: true,
                priority: 0 // Fallback priority
            }
        },

        /**
         * Creates the visual instance of the plugin.
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
                        // 1. Create the main container
                        const container = document.createElement("div");
                        container.className = "generic-rdf-plugin";
                        element.appendChild(container);

                        // 2. Fetch all data regarding the main subject (all predicates)
                        // undefined in the second argument means "fetch all predicates"
                        await context.data.fetch.quads([subject], undefined, context.configuration.languages);

                        // 3. Analyze fetched data to determine which extra IRIs need labels
                        const subjectNavigator = context.data.fetched.subject(subject);
                        const predicates = subjectNavigator.predicates();
                        
                        // Set used to store unique IRIs (Subject + Predicates + Objects) to fetch labels for
                        const irisToLabel = new Set();
                        irisToLabel.add(subject); // We need a label for the main subject
                        
                        predicates.forEach(predicate => {
                            irisToLabel.add(predicate); // We need labels for predicates
                            
                            const objects = subjectNavigator.predicate(predicate);
                            objects.forEach(obj => {
                                // If the object is an IRI (NamedNode), we want its label too
                                if (obj.value.termType === "NamedNode") {
                                    irisToLabel.add(obj.value.value); 
                                }
                            });
                        });

                        // 4. Batch fetch labels for all collected IRIs
                        // This prevents the "N+1 query problem" by fetching all metadata in one go
                        if (irisToLabel.size > 0) {
                            await context.data.fetch.quads(Array.from(irisToLabel), LABELS, context.configuration.languages);
                        }

                        // 5. Render Header (Subject Label)
                        const subjectLabel = getLabel(subject, LABELS, context);
                        const header = document.createElement("h1");
                        header.style.borderBottom = "1px solid #ccc";
                        header.style.paddingBottom = "10px";
                        // true = isHeader (applies bold styling)
                        header.appendChild(createLabelElement(subject, subjectLabel, true));
                        container.appendChild(header);

                        // 6. Render the list of properties
                        // Using a Description List (<dl>) with Grid layout for alignment
                        const dl = document.createElement("dl");
                        dl.style.display = "grid";
                        dl.style.gridTemplateColumns = "max-content auto"; // Column 1: Predicate (width: auto), Column 2: Value
                        dl.style.gap = "10px 20px";
                        dl.style.alignItems = "baseline";

                        // Sort predicates alphabetically by their display label for better UX
                        const sortedPredicates = predicates.sort((a, b) => {
                            const labelA = getLabel(a, LABELS, context);
                            const labelB = getLabel(b, LABELS, context);
                            // extracted value or the string itself
                            const textA = labelA.value?.value ?? labelA;
                            const textB = labelB.value?.value ?? labelB;
                            return textA.localeCompare(textB);
                        });

                        sortedPredicates.forEach(predicate => {
                            const objects = subjectNavigator.predicate(predicate);
                            if (objects.length === 0) return;

                            // -- DT: The Predicate Name --
                            const dt = document.createElement("dt");
                            dt.style.fontWeight = "bold";
                            dt.style.color = "#555";
                            dt.style.gridColumn = "1"; 
                            
                            const predicateLabel = getLabel(predicate, LABELS, context);
                            dt.appendChild(createLabelElement(predicate, predicateLabel));
                            dl.appendChild(dt);

                            // -- DD: The Object Values --
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
                                    // It is an IRI -> Resolve label + render with links
                                    const objIri = obj.value.value;
                                    const objLabel = getLabel(objIri, LABELS, context);
                                    li.appendChild(createLabelElement(objIri, objLabel));
                                } else if (obj.value.termType === "Literal") {
                                    // It is a Literal -> Render with language/datatype tag
                                    li.appendChild(createLabelElement(null, obj));
                                } else {
                                    // Fallback for Blank Nodes or other types
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
 * Helper to find the best matching label based on user language preferences.
 * * @param {IRI} subject - The subject IRI to find a label for.
 * @param {string[]} labelPredicates - List of predicates to check (e.g., skos:prefLabel).
 * @param {PluginV1InstanceContext} context - The plugin context containing fetched data and config.
 * @returns {any} The best label found (object or string) or the subject IRI if none found.
 */
function getLabel(subject, labelPredicates, context) {
    let subjectLabel = subject;
    const labelLiterals = [];
    
    // Iterate over all possible label predicates (skos:prefLabel, rdfs:label, etc.)
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

/**
 * Selects the best match from a list of literals based on language priority.
 * @param {any[]} items - List of literals.
 * @param {string[]} priority - List of language codes (e.g., ['en', 'cs']).
 * @returns {any} The best matching literal.
 */
function getByLanguagePriority(items, priority) {
    for (const lang of priority) {
        const found = items.find(item => item.value.language === lang);
        if (found) return found;
    }
    // Return the first one if no preferred language match is found
    return items[0] || null;
}

/**
 * Creates a DOM element for a value (Label or Literal).
 * Includes visual cues for language/datatype and action buttons (Copy/Link).
 * * @param {string|null} iri - IRI of the resource (if applicable), otherwise null.
 * @param {object|string} sourcedLabel - The value to display (N3 Literal object or string).
 * @param {boolean} isHeader - If true, applies header styling.
 * @returns {HTMLElement}
 */
function createLabelElement(iri, sourcedLabel, isHeader = false) {
    const container = document.createElement("div");
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.gap = "5px";

    const valueElement = document.createElement("span");
    
    // Extract value safely
    const literal = sourcedLabel.value ?? sourcedLabel;
    const textValue = literal.value ?? literal;
    
    valueElement.textContent = textValue;
    if (isHeader) valueElement.style.fontWeight = "bold";
    container.appendChild(valueElement);

    // Render metadata badge (Language or Datatype)
    // We ignore 'string' datatype as it is default
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
            // Extract the readable part of the datatype IRI (after # or /)
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
    
    // Add interaction buttons only if it is an IRI
    if (iri) {
        addLinkButton(container, iri);
        addCopyButton(container, iri);
    }

    return container;
}

/**
 * Appends a "Copy to Clipboard" button to the element.
 * @param {HTMLElement} element 
 * @param {string} iri 
 */
function addCopyButton(element, iri) {
    const copyButton = document.createElement("span");
    copyButton.textContent = "📋";
    copyButton.style.cursor = "pointer";
    copyButton.title = "Copy IRI to clipboard";
    copyButton.style.fontSize = "0.9em";
    copyButton.style.marginLeft = "5px";

    // Visual effect: show only on hover
    copyButton.style.opacity = "0";
    copyButton.style.transition = "opacity 0.2s ease";
    
    element.addEventListener("mouseenter", () => copyButton.style.opacity = "1");
    element.addEventListener("mouseleave", () => copyButton.style.opacity = "0");

    copyButton.onclick = async (e) => {
        e.stopPropagation(); // Prevent triggering parent click events
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

/**
 * Appends a "Open Link" button to the element.
 * @param {HTMLElement} element 
 * @param {string} iri 
 */
function addLinkButton(element, iri) {
    const linkElement = document.createElement("a");
    linkElement.href = iri;
    linkElement.target = "_blank";
    linkElement.rel = "noopener noreferrer";
    linkElement.textContent = "🔗";
    linkElement.style.textDecoration = "none";
    linkElement.style.fontSize = "0.9em";
    
    // Visual effect: show only on hover
    linkElement.style.opacity = "0";
    linkElement.style.transition = "opacity 0.2s ease";

    element.addEventListener("mouseenter", () => linkElement.style.opacity = "1");
    element.addEventListener("mouseleave", () => linkElement.style.opacity = "0");

    element.appendChild(linkElement);
}