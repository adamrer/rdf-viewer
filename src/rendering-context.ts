import { Literal, Quad_Object } from "n3";
import { mergeStructuredQuads, Fetcher, StructuredQuads } from "./fetcher";
import { NotificationType, notifier } from "./notifier";
import { Language } from "./query-interfaces";
import { IRI } from "./rdf-types";
import { Sourced } from "./data-source";

/**
 * Interface for the plugin to use for rendering and fetching the data
 */
interface RenderingContext {
  /**
   * The main subject of the display
   */
  subjectIri: string;
  /**
   * Fetches data about given subject. Adds them to the already loaded data.
   *
   * @param labelPredicates - Predicate IRIs which objects can be used as labels of any fetched IRI
   * @param subjectIri - Subject IRI of the quads that will be fetched
   */
  loadData(labelPredicates: IRI[], subjectIri: IRI): Promise<void>;
  /**
   * Returns label for the given IRI, undefined if it has no label from labelPredicates parameter in loadData.
   * The label that is the most preferred by the user is picked.
   *
   * @param iri - IRI to get label of
   * @see loadData
   */
  getLabel(iri: IRI): Sourced<Quad_Object> | undefined;
  /**
   * Returns the objects of the quads with the given subject and predicate
   *
   * @param subjectIri - the subject IRI
   * @param predicateIri - the predicate IRI
   */
  getObjects(subjectIri: IRI, predicateIri: IRI): Sourced<Quad_Object>[];
  /**
   * Returns a list of predicates of the specified subject
   *
   * @param subjectIri - the subject IRI
   */
  getPredicates(subjectIri: IRI): IRI[];
  /**
   * Returns an instance of Fetcher
   * 
   * @see Fetcher
   */
  fetcher(): Fetcher;
  /**
   * Returns list of languages specified by user in UI sorted by priority
   */
  preferredLanguages(): Language[];
  /**
   * Notifies the users that something happened
   *
   * @param message - content of the notification
   * @param type - type of the notification
   */
  notify(message: string, type: NotificationType): void;

  notifyPromise<T>(
    promise: Promise<T>,
    messages: { pending: string; success: string; error: string },
  ): Promise<T>;
  /**
   * Mounts the given HTML element to the result element
   *
   * @param html - the HTML to show to the user
   */
  mount(html: HTMLElement): void;
}

/**
 * Implementation of the RenderingContext interface
 * @see RenderingContext
 */
class RenderingContextImpl implements RenderingContext {
  subjectIri: string;
  fetcherInstance: Fetcher;
  prefLangs: Language[];
  data: StructuredQuads = {};
  labels: StructuredQuads = {};
  resultElement: HTMLElement;

  constructor(
    subjectIri: IRI,
    fetcher: Fetcher,
    preferredLanguages: Language[],
    resultElement: HTMLElement,
  ) {
    this.subjectIri = subjectIri;
    this.fetcherInstance = fetcher;
    this.prefLangs = preferredLanguages;
    this.resultElement = resultElement;
  }

  async loadData(
    labelPredicates: IRI[] = [],
    subjectIri: IRI = this.subjectIri,
  ): Promise<void> {
    const query = this.fetcherInstance
      .builder()
      .subjects([subjectIri])
      .predicates()
      .objects()
      .langs(this.prefLangs)
      .build();

    const newData = await this.fetcherInstance.fetchStructuredQuads(query);
    const newLabels = await this.loadLabels(newData, labelPredicates);

    this.data = mergeStructuredQuads(this.data, newData);
    this.labels = mergeStructuredQuads(this.labels, newLabels);
  }
  async loadLabels(
    structuredQuads: StructuredQuads,
    labelPredicates: IRI[] = [],
  ): Promise<StructuredQuads> {
    const iris = this.collectIris(structuredQuads);
    const labelQuery = this.fetcherInstance
      .builder()
      .subjects(iris)
      .predicates(labelPredicates)
      .objects()
      .langs(this.prefLangs)
      .build();
    return this.fetcherInstance.fetchStructuredQuads(labelQuery);
  }
  getLabel(iri: IRI = this.subjectIri): Sourced<Quad_Object> | undefined {
    const labelPredicates = this.labels[iri];
    if (!labelPredicates) return undefined;
    for (const predicate in labelPredicates) {
      const labelObjects = Object.values(labelPredicates[predicate]);
      const literals = labelObjects.filter(
        (o) => o.value.termType === "Literal",
      );

      literals.sort((a, b) => {
        const langA = (a.value as Literal).language || "";
        const langB = (b.value as Literal).language || "";
        return this.getLangPriority(langA) - this.getLangPriority(langB);
      });

      if (literals.length > 0) return literals[0];
    }

    return undefined;
  }
  getObjects(
    predicateIri: IRI,
    subjectIri: IRI = this.subjectIri,
  ): Sourced<Quad_Object>[] {
    const predicateMap = this.data[subjectIri];
    if (predicateMap) {
      const objectsMap = predicateMap[predicateIri];
      if (objectsMap) return Object.values(objectsMap);
    }

    return [];
  }
  getPredicates(subjectIri: IRI = this.subjectIri): IRI[] {
    return Object.keys(this.data[subjectIri]);
  }
  fetcher(): Fetcher {
    return this.fetcherInstance;
  }
  preferredLanguages(): Language[] {
    return this.prefLangs;
  }
  notify(message: string, type: NotificationType): void {
    notifier.notify(message, type);
  }
  notifyPromise<T>(
    promise: Promise<T>,
    messages: { pending: string; success: string; error: string },
  ): Promise<T> {
    return notifier.notifyPromise(promise, messages);
  }
  mount(html: HTMLElement): void {
    this.resultElement.appendChild(html);
  }

  getLangPriority(language: Language) {
    const index = this.prefLangs.indexOf(language || "");
    return index === -1 ? this.prefLangs.length : index;
  }
  collectIris(structuredQuads: StructuredQuads) {
    const iris = [];
    for (const subjectIri in structuredQuads) {
      iris.push(subjectIri);
      const predicates = structuredQuads[subjectIri];
      for (const predicateIri in predicates) {
        iris.push(predicateIri);
        const objectKeys = predicates[predicateIri];
        for (const objectKey in objectKeys) {
          const object = objectKeys[objectKey].value;
          if (object.termType !== "Literal") {
            iris.push(object.value);
          }
        }
      }
    }
    return iris;
  }
}

/**
 * Creates an implementation of a RenderingContext
 * @param subjectIri
 * @param fetcher
 * @param preferredLanguages
 * @param resultElement
 * @returns
 * @see RenderingContext
 */
function renderingContext(
  subjectIri: IRI,
  fetcher: Fetcher,
  preferredLanguages: Language[],
  resultElement: HTMLElement,
) {
  return new RenderingContextImpl(
    subjectIri,
    fetcher,
    preferredLanguages,
    resultElement,
  );
}

export type {RenderingContext}
export {renderingContext}