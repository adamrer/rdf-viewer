import { Quad_Object } from "n3";
import { Sourced } from "./data-source";
import { IRI } from "./rdf-types";
import { StructuredQuads } from "./fetcher";

interface GraphNavigator {
    /**
     * @returns all available subjects
     */
    subjects: () => IRI[]

    /**
     * Retrieves the subject navigator for the given subject
     * 
     * @param subject - IRI of the subject
     * @returns subject navigator for the given subject
     */
    subject: (subject: IRI) => SubjectNavigator
}

interface SubjectNavigator {
    /**
     * @returns all predicates for the given subject
     */
    predicates: () => IRI[]

    /**
     * Retrieves all objects for the given predicate of the subject
     * 
     * @param predicate - IRI of the predicate to get objects for
     * @returns all objects for the given predicate
     */
    predicate: (predicate: IRI) => Sourced<Quad_Object>[]
}


class GraphNavigatorImpl implements GraphNavigator {
    
    data: StructuredQuads

    constructor(data?: StructuredQuads){
        if (data)
            this.data = data
        else
            this.data = {}
    }
    
    subjects(){
        return Object.keys(this.data)
    }
    subject(subject: IRI){
        return subjectNavigator(this.data[subject])
    }
}

interface StructuredPredicates {
    [predicateIri: IRI]: {
      [objectValue: IRI]: Sourced<Quad_Object>;
    };
}

class SubjectNavigatorImpl implements SubjectNavigator {
    
    data: StructuredPredicates
    constructor(data?: StructuredPredicates){
        if (data)
            this.data = data
        else
            this.data = {}
    }
    predicates(){
        return Object.keys(this.data)
    }
    predicate(predicate: IRI) {
        return Object.values(this.data[predicate])
    }
}

function subjectNavigator(data: StructuredPredicates): SubjectNavigator {
    return new SubjectNavigatorImpl(data)
}
function graphNavigator(data: StructuredQuads): GraphNavigator {
    return new GraphNavigatorImpl(data)
}

export type{
    GraphNavigator,
}
export {
    graphNavigator
}