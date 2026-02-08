
export function registerPlugins(){
    return [labelPlugin(createPlugin())];
}

function labelPlugin(plugin){
    return {
        label: {"en": "Test Plugin V1"},
        v1: plugin
    }
}

function createPlugin(){
    
    return {
        setup(context) { },
        createPluginInstance(context, subject) {
            let mountedToElement = null;
            return {
                mount(element) {
                    mountedToElement = element;
                    // Render loading ...
                    // context.html.renderLoading(element);
                    // Now we go asynchronous ...
                    (async () => {
                        let label = undefined;
                        // Try all predicates we can use as rdfs.label and search for a label.
                        for (const predicate of context.data.vocabulary.getSemanticallySimilar(rdfs.label)) {
                            // NOTE: jednotlivé dotazy na podobné predikáty všech IRI by mohl být problém
                            label = (await context.data.fetch.objects(subject, predicate).first())?.value;
                            if (label !== undefined) {
                                break
                            }
                        }
                        // Now we can render.
                        element.innerHTML = context.html.h`<div> <h1>${label}</h1> </div>`;
                        // NOTE: v čem přesně je výhoda používat `h`? Co v té funkci budeme dělat?
                        // security risks (XSS) (může zde vlastně k něčemu dojít?)
                        // ruší event listeners child komponent
                    })();
                },
                unmount() {
                if (mountedToElement !== null) {
                    mountedToElement.innerHTML = "";
                    mountedToElement = null;
                }
                },
            }
        },
        async checkCompatibility(context, subject) {
            return {
                isCompatible: true,
                priority: 0,
            }
        },
    }
    
}