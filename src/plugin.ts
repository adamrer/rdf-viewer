import { Literal } from "n3"
import { mergeStructuredQuads, QuadsFetcher, SourcedObject, StructuredQuads } from "./fetch-quads"
import { Language } from "./query/query-interfaces"
import { NotificationType, notify } from "./notify"

/**
 * Interface representing a recorded plugin in the memory.
 */
interface DisplayPlugin {
    /** URL from which is the plugin accessible */
    url: string
    /** Label which will be displayed to the user */
    label: string
    /** Classes which the plugin can display */
    classes: Array<string>
}

/**
 * Interface representing the display plugin for displaying an RDF entity.
 */
interface DisplayPluginModule {
    /**
     * Displays the specified entity
     * 
     * @param entityIri - IRI of an entity to be observed
     * @param fetcher - QuadsFetcher used for fetching the quads
     * @param language - The preferred language to display the quads
     * @param resultsEl - HTML element where to display the quads
     */
    displayQuads(context: RenderingContext): Promise<void>
}

async function fetchPlugin(plugin: DisplayPlugin): Promise<DisplayPluginModule> {
    return import(/* @vite-ignore */ plugin.url)
}


interface RenderingContext {
    
    subjectIri: string

    loadData(labelPredicates: string[], subjectIri: string): Promise<void>
    getLabel(iri: string): SourcedObject|undefined
    getObjects(subjectIri: string, predicateIri: string): SourcedObject[]
    getPredicates(subjectIri: string): string[]
    fetcher(): QuadsFetcher
    preferredLanguages(): Language[]
    notifyUser(message: string, type: NotificationType): void
    mount(html: HTMLElement): void

}

class RenderingContextImpl implements RenderingContext{

    subjectIri: string
    fetcherInstance: QuadsFetcher
    prefLangs: Language[]
    data: StructuredQuads = {}
    labels: StructuredQuads = {}
    resultElement: HTMLElement

    constructor(subjectIri: string, fetcher: QuadsFetcher, preferredLanguages: Language[], resultElement: HTMLElement){
        this.subjectIri = subjectIri
        this.fetcherInstance = fetcher
        this.prefLangs = preferredLanguages
        this.resultElement = resultElement
    }

    async loadData(labelPredicates: string[] = [], subjectIri: string = this.subjectIri): Promise<void>{
        const query = this.fetcherInstance.builder()
            .subjects([subjectIri]).predicates().objects().langs(this.prefLangs).build()

        const newData = await this.fetcherInstance.fetchStructuredQuads(query)
        const newLabels = await this.loadLabels(newData, labelPredicates)

        this.data = mergeStructuredQuads(this.data, newData)
        this.labels = mergeStructuredQuads(this.labels, newLabels)
    }
    async loadLabels(structuredQuads: StructuredQuads, labelPredicates: string[] = []): Promise<StructuredQuads> {
        const iris = this.collectIris(structuredQuads)
        const labelQuery = this.fetcherInstance.builder()
            .subjects(iris)
            .predicates(labelPredicates)
            .objects()
            .langs(this.prefLangs)
            .build()
        return this.fetcherInstance.fetchStructuredQuads(labelQuery)
    }
    getLabel(iri: string = this.subjectIri): SourcedObject|undefined {
        const labelPredicates = this.labels[iri];
        if (!labelPredicates) 
            return undefined;
        for (const predicate in labelPredicates) {
            const labelObjects = Object.values(labelPredicates[predicate]);
            const literals = labelObjects.filter(o => o.term.termType === 'Literal');

            literals.sort((a, b) => {
                const langA = (a.term as Literal).language || '';
                const langB = (b.term as Literal).language || '';
                return this.getLangPriority(langA) - this.getLangPriority(langB);
            });

            if (literals.length > 0) 
                return literals[0];
        }

        return undefined;
    }
    getObjects(predicateIri: string, subjectIri: string = this.subjectIri): SourcedObject[] {
        const predicateMap = this.data[subjectIri]
        if (predicateMap){
            const objectsMap = predicateMap[predicateIri]
            if (objectsMap)
                return Object.values(objectsMap)
        }
                
        return []
    }
    getPredicates(subjectIri: string = this.subjectIri): string[] {
        return Object.keys(this.data[subjectIri])
    }
    fetcher(): QuadsFetcher {
        return this.fetcherInstance
    }
    preferredLanguages(): Language[]{
        return this.prefLangs
    }
    notifyUser(message: string, type: NotificationType){
        notify(message, type)
    }
    mount(html: HTMLElement): void {
        this.resultElement.appendChild(html)
    }

    getLangPriority(language: Language) {
        const index = this.prefLangs.indexOf(language || '');
        return index === -1 ? this.prefLangs.length : index;
    }
    collectIris(structuredQuads: StructuredQuads){
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

function renderingContext(subjectIri: string, fetcher: QuadsFetcher, preferredLanguages: Language[], resultElement: HTMLElement){
    return new RenderingContextImpl(subjectIri, fetcher, preferredLanguages, resultElement)
}

export type{
    DisplayPlugin,
    DisplayPluginModule,
    RenderingContext
}
export{
    fetchPlugin,
    renderingContext
}