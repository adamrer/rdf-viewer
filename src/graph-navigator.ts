import { Quad_Object } from "n3";
import { Sourced } from "./data-source";
import { IRI } from "./rdf-types";
import { StructuredQuads } from "./fetcher";

interface GraphNavigator {
    subjects: () => IRI[]

    subject: (subject: IRI) => SubjectNavigator
}

interface SubjectNavigator {
    predicates: () => IRI[]

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