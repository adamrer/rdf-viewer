import { Quad_Object } from "n3";
import { Sourced } from "../fetch/data-source";
import { IRI } from "../rdf-types";
import { StructuredQuads } from "../fetch/fetcher";
import { GraphNavigator, SubjectNavigator } from "./plugin-api-interfaces";




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
        const predicates = this.data[subject]
        if (predicates)
            return subjectNavigator(predicates)
        return subjectNavigator({})
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
        const objects = this.data[predicate]
        if (objects)
            return Object.values(this.data[predicate])
        return []
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