/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1} PluginV1 */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1InstanceContext} PluginV1InstanceContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1CompatibilityContext} PluginV1CompatibilityContext */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').LabeledPlugin} LabeledPlugin */
/** @typedef {import('../../src/plugin-api/plugin-api-interfaces').PluginV1Instance} PluginV1Instance */
/** @typedef {string} IRI */

// Namespace constants
const LDP = "http://www.w3.org/ns/ldp#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const DCTERMS = "http://purl.org/dc/terms/";
const SKOS = "http://www.w3.org/2004/02/skos/core#";

const ldp = {
    Container: LDP + "Container",
    BasicContainer: LDP + "BasicContainer",
    contains: LDP + "contains"
};

const LABEL_PREDICATES = [DCTERMS + "title", SKOS + "prefLabel", RDFS + "label"];

/**
 * Registers the Hierarchical LDP Explorer plugin.
 * @returns {LabeledPlugin[]}
 */
export function registerPlugins() {
    return [
        {
            label: { "en": "LDP File Explorer", "cs": "LDP Průzkumník souborů" },
            v1: createLdpExplorerPlugin()
        }
    ];
}

/**
 * Creates the LDP Container Explorer plugin with support for nested containers.
 * @returns {PluginV1}
 */
function createLdpExplorerPlugin() {
    return {
        setup(context) {},

        /**
         * Checks if the given subject is an LDP Container.
         * @param {PluginV1CompatibilityContext} context
         * @param {IRI} subject
         */
        async checkCompatibility(context, subject) {
            const types = await context.data.fetch.types(subject);
            const typeValues = types.map(t => t.value.value);
            const containerTypes = context.data.vocabulary.getSemanticallySimilar(ldp.Container);
            
            const isCompatible = typeValues.some(t => 
                containerTypes.includes(t) || t === ldp.BasicContainer
            );

            return { isCompatible, priority: 2500 };
        },

        /**
         * @param {PluginV1InstanceContext} context
         * @param {IRI} subject
         * @returns {PluginV1Instance}
         */
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            // Keep track of active sub-plugins to unmount them properly
            const activeSubPlugins = new Map(); 

            return {
                mount(element) {
                    mountedToElement = element;
                    
                    (async () => {
                        context.html.renderLoading(element)

                        const rootContainer = document.createElement("div");
                        rootContainer.style.paddingLeft = "10px";
                        
                        // 1. Fetch metadata for the container
                        await context.data.fetch.quads([subject], undefined, context.configuration.languages);
                        
                        // 2. Identify all members
                        const members = context.data.fetched.subject(subject).predicate(ldp.contains)
                            .filter(obj => obj.value.termType === "NamedNode")
                            .map(obj => obj.value.value);

                        // 3. Batch fetch for members
                        if (members.length > 0) {
                            await context.data.fetch.quads(members, LABEL_PREDICATES, context.configuration.languages);
                            for (const member of members) {
                                await context.data.fetch.types(member);
                            }
                        }

                        
                        element.replaceChildren(rootContainer);

                        // Rendering the list of items
                        const list = document.createElement("div");
                        list.style.display = "flex";
                        list.style.flexDirection = "column";
                        list.style.gap = "4px";

                        const sortedMembers = await sortMembers(members, context);

                        for (const memberIri of sortedMembers) {
                            const itemRow = document.createElement("div");
                            itemRow.style.border = "1px solid #f0f0f0";
                            itemRow.style.borderRadius = "4px";
                            itemRow.style.padding = "4px 8px";

                            const header = document.createElement("div");
                            header.style.display = "flex";
                            header.style.alignItems = "center";
                            header.style.justifyContent = "space-between";

                            const labelArea = document.createElement("div");
                            labelArea.style.display = "flex";
                            labelArea.style.alignItems = "center";
                            labelArea.style.gap = "8px";

                            const isSubContainer = await isContainer(memberIri, context);
                            const label = getLabel(memberIri, context);

                            // Container for the nested plugin
                            const subContentDiv = document.createElement("div");
                            subContentDiv.style.display = "none";
                            subContentDiv.style.marginLeft = "20px";
                            subContentDiv.style.marginTop = "8px";
                            subContentDiv.style.borderLeft = "2px solid #ddd";

                            // Toggle Button (only for containers)
                            if (isSubContainer) {
                                const toggleBtn = document.createElement("button");
                                toggleBtn.textContent = "▶"; // Collapsed icon
                                toggleBtn.style.background = "none";
                                toggleBtn.style.border = "none";
                                toggleBtn.style.cursor = "pointer";
                                toggleBtn.style.width = "20px";


                                toggleBtn.onclick = async () => {
                                    const isOpening = subContentDiv.style.display === "none";
                                    
                                    if (isOpening) {
                                        toggleBtn.textContent = "▼"; // Expanded icon
                                        subContentDiv.style.display = "block";
                                        
                                        // Ask interoperability service to render this sub-container
                                        const handler = await context.interoperability.renderSubject(memberIri, subContentDiv);
                                        if (handler) {
                                            activeSubPlugins.set(memberIri, handler);
                                        } else {
                                            subContentDiv.textContent = "No plugin found for this folder.";
                                        }
                                    } else {
                                        toggleBtn.textContent = "▶";
                                        subContentDiv.style.display = "none";
                                        
                                        // Unmount and clean up
                                        const handler = activeSubPlugins.get(memberIri);
                                        if (handler) {
                                            handler.unmount();
                                            activeSubPlugins.delete(memberIri);
                                        }
                                        subContentDiv.replaceChildren();
                                    }
                                };
                                labelArea.appendChild(toggleBtn);
                            } else {
                                const spacer = document.createElement("span");
                                spacer.style.width = "20px";
                                labelArea.appendChild(spacer);
                            }

                            // Icon and Text
                            const icon = document.createElement("span");
                            icon.textContent = isSubContainer ? "📁" : "📄";
                            labelArea.appendChild(icon);

                            const nameText = document.createElement("span");
                            const labelSplit = label.split("/")
                            nameText.textContent = labelSplit[labelSplit.length-2] ?? "" +"/"+ labelSplit[labelSplit.length-1];
                            labelArea.appendChild(nameText);

                            header.appendChild(labelArea);

                            // Actions (IRI link + Copy)
                            const actions = document.createElement("div");
                            actions.style.display = "flex";
                            actions.style.gap = "8px";
                            addLinkButton(actions, memberIri);
                            addCopyButton(actions, memberIri);
                            header.appendChild(actions);

                            itemRow.appendChild(header);

                            // Placeholder for nested folder content
                            if (isSubContainer) {
                                // @ts-ignore - defined inside the toggle logic scope
                                itemRow.appendChild(subContentDiv);
                            }

                            list.appendChild(itemRow);
                        }

                        rootContainer.appendChild(list);
                    })();
                },
                unmount() {
                    // Properly unmount all active sub-plugins
                    activeSubPlugins.forEach(handler => handler.unmount());
                    activeSubPlugins.clear();

                    if (mountedToElement !== null) {
                        mountedToElement.replaceChildren();
                        mountedToElement = null;
                    }
                }
            };
        }
    };
}

// --- Internal Helper Functions ---

/**
 * Resolves the best human-readable label for a resource.
 */
function getLabel(iri, context) {
    const navigator = context.data.fetched.subject(iri);
    for (const pred of LABEL_PREDICATES) {
        const labels = navigator.predicate(pred);
        if (labels.length > 0) {
            for (const lang of context.configuration.languages) {
                const match = labels.find(l => l.value.language === lang);
                if (match) return match.value.value;
            }
            return labels[0].value.value;
        }
    }
    return iri.split(/[\/#]/).pop() || iri;
}

/**
 * Checks if a member is also a container.
 */
async function isContainer(iri, context) {
    const types = await context.data.fetch.types(iri);
    const containerTypes = context.data.vocabulary.getSemanticallySimilar(ldp.Container);
    return types.some(t => containerTypes.includes(t.value.value) || t.value.value === ldp.BasicContainer);
}

/**
 * Sorts members by type (folders first) and then by label.
 */
async function sortMembers(members, context) {
    const membersWithData = await Promise.all(members.map(async (iri) => ({
        iri,
        label: getLabel(iri, context),
        isFolder: await isContainer(iri, context)
    })));

    return membersWithData.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.label.localeCompare(b.label);
    }).map(m => m.iri);
}

/**
 * Adds a small copy icon next to text.
 */
function addCopyButton(parent, text) {
    const btn = document.createElement("span");
    btn.textContent = "📋";
    btn.style.cursor = "pointer";
    btn.title = "Copy IRI";
    btn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        const originalText = btn.textContent;
        btn.textContent = "✓";
        setTimeout(() => btn.textContent = originalText, 1000);
    };
    parent.appendChild(btn);
}

/**
 * Adds an external link icon.
 */
function addLinkButton(parent, iri) {
    const link = document.createElement("a");
    link.href = iri;
    link.target = "_blank";
    link.textContent = "🔗";
    link.style.textDecoration = "none";
    link.onclick = (e) => e.stopPropagation();
    parent.appendChild(link);
}