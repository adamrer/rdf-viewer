import { Quad, Term } from "n3";
import { Filter, Graph, Query, TriplePattern, Values, Node, Substitution, Select } from "./query";


type ConstraintFunction = (variablesSubstitution: {[key: string]: Term}) => boolean 


interface QuadsConstraints {
    valuesConstraints: ConstraintFunction[] 
    filtersConstraints: ConstraintFunction[]
    subjectVar: string
    predicateVar: string
    objectVar: string
    graphVar: string
}

interface QuadsConstraintsHelper {
    valuesConstraints: ConstraintFunction[]
    filtersConstraints: ConstraintFunction[]
    subjectVar?: string
    predicateVar?: string
    objectVar?: string
    graphVar?: string
}

interface QueryProcessor {
    filter(quads: Quad[], query: Query): Quad[]
}

class QueryProcessorImpl implements QueryProcessor {
    processQuery(query: Query): QuadsConstraints {
        const constraints:QuadsConstraintsHelper = {
            valuesConstraints: [],
            filtersConstraints: []
        }
        const stack:Node[] = [...query.where.children]
        while(stack.length !== 0){
            const node = stack.pop()
            switch (node?.type) {
                case 'triplePattern':
                    const triple = node as TriplePattern
                    constraints.subjectVar = triple.subject.value, 
                    constraints.predicateVar = triple.predicate.value, 
                    constraints.objectVar = triple.object.value 

                    break;
                case 'values':
                    const values = node as Values
                    constraints.valuesConstraints.push((variablesSubstitution: Substitution) => values.evaluate(variablesSubstitution[values.variable.value]))
                    break;
                case 'filter':
                    const filter = node as Filter
                    constraints.filtersConstraints.push((variablesSubstitution: Substitution) => filter.constraint.evaluate(variablesSubstitution))
                    break;
                case 'graph':
                    const graph = node as Graph
                    constraints.graphVar = graph.graph.value
                    stack.push(...graph.children)
                    break;
            
                default:
                    throw Error(`Node type ${node?.type} couldn't be processed`)
            }
        }
        return constraints as QuadsConstraints
    }
    predicateForQuads(constraints: QuadsConstraints): (quad: Quad) => boolean {
        return (quad: Quad): boolean => {
            const substitution = {
                [constraints.subjectVar]: quad.subject,
                [constraints.predicateVar]: quad.predicate,
                [constraints.objectVar]: quad.object,
                [constraints.graphVar]: quad.graph
            }

            return constraints.filtersConstraints.every(fn => fn(substitution)) && constraints.valuesConstraints.every(fn => fn(substitution))

        }
    }
    filter(quads: Quad[], query: Query): Quad[] {
        const constraints = this.processQuery(query)
        const quadMeetsQueryPredicate = this.predicateForQuads(constraints)
        const filteredQuads: Quad[] = quads.filter(quad => quadMeetsQueryPredicate(quad))
        if (query.type === 'select'){
            const select = query as Select
            const limit = select.limit ? select.offset ? select.offset + select.limit : select.limit : undefined
            return filteredQuads.slice(select.offset, limit)
        }

        return filteredQuads
    }
}


function queryProcessor() : QueryProcessor {
    return new QueryProcessorImpl()
}

export{
    queryProcessor
}
export type {
    QueryProcessor
}