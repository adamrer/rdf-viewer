import { NamedNode, Term, Variable } from "n3"
import { DataBlockValue, Expression, GraphPattern, QueryNodeFactory } from "./query"

interface GraphPatternBuilder {
    triple(subject: Term, predicate: NamedNode | Variable, object: Term): GraphPatternBuilder
    filter(constraint: Expression): GraphPatternBuilder
    values(variable: Variable, values: DataBlockValue[]): GraphPatternBuilder
    graph(graph: Variable | NamedNode, children: GraphPattern[]): GraphPatternBuilder
    // optional(children: GraphPattern[]): GraphPatternBuilder
    // union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilder
    // bind(expression: Expression, variable: Variable): GraphPatternBuilder
    build(): GraphPattern[]
}

class GraphPatternBuilderImpl implements GraphPatternBuilder {
    patterns: GraphPattern[]
    constructor(patterns: GraphPattern[] = []){
        this.patterns = patterns
    }
    triple(subject: Term, predicate: NamedNode | Variable, object: Term): GraphPatternBuilderImpl {
        this.patterns.push(QueryNodeFactory.triplePattern(subject, predicate, object))
        return this
    }
    filter(constraint: Expression): GraphPatternBuilderImpl{
        this.patterns.push(QueryNodeFactory.filter(constraint))
        return this
    }
    values(variable: Variable, values: DataBlockValue[]): GraphPatternBuilderImpl{
        this.patterns.push(QueryNodeFactory.values(variable, values))
        return this
    }
    graph(graph: Variable | NamedNode, children: GraphPattern[] = []): GraphPatternBuilderImpl {
        this.patterns.push(QueryNodeFactory.graph(graph, children))
        return this
    }
    // bind(expression: Expression, variable: Variable): GraphPatternBuilderImpl {
    //     this.patterns.push(QueryNodeFactory.bind(expression, variable))
    //     return this
    // }
    // optional(children: GraphPattern[] = []): GraphPatternBuilderImpl {
    //     this.patterns.push(QueryNodeFactory.optional(children))
    //     return this
    // }
    // union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilderImpl {
    //     this.patterns.push(QueryNodeFactory.union(left, right))
    //     return this
    // }
    
    build(): GraphPattern[] {
        return this.patterns
    }
}

function graphPatternBuilder(patterns: GraphPattern[] = []): GraphPatternBuilderImpl{
    return new GraphPatternBuilderImpl(patterns)
}

export type {
    GraphPatternBuilder
}
export {
    graphPatternBuilder
}