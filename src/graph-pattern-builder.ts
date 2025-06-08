import { NamedNode, Term, Variable } from "n3"
import { Bind, DataBlockValue, Expression, Filter, Graph, GraphPattern, Optional, TriplePattern, Union, Values } from "./query"

interface GraphPatternBuilder {
    triple(subject: Term, predicate: NamedNode | Variable, object: Term): GraphPatternBuilder
    filter(constraint: Expression): GraphPatternBuilder
    bind(expression: Expression, variable: Variable): GraphPatternBuilder
    values(variable: Variable, values: DataBlockValue[]): GraphPatternBuilder
    optional(children: GraphPattern[]): GraphPatternBuilder
    union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilder
    graph(graph: Variable | NamedNode, children: GraphPattern[]): GraphPatternBuilder
    build(): GraphPattern[]
}

class GraphPatternBuilderImpl implements GraphPatternBuilder {
    patterns: GraphPattern[]
    constructor(patterns: GraphPattern[] = []){
        this.patterns = patterns
    }
    triple(subject: Term, predicate: NamedNode | Variable, object: Term): GraphPatternBuilderImpl {
        this.patterns.push(new TriplePattern(subject, predicate, object))
        return this
    }
    filter(constraint: Expression): GraphPatternBuilderImpl{
        this.patterns.push(new Filter(constraint))
        return this
    }
    bind(expression: Expression, variable: Variable): GraphPatternBuilderImpl {
        this.patterns.push(new Bind(expression, variable))
        return this
    }
    values(variable: Variable, values: DataBlockValue[]): GraphPatternBuilderImpl{
        this.patterns.push(new Values(variable, values))
        return this
    }
    optional(children: GraphPattern[] = []): GraphPatternBuilderImpl {
        this.patterns.push(new Optional(children))
        return this
    }
    union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilderImpl {
        this.patterns.push(new Union(left, right))
        return this
    }
    graph(graph: Variable | NamedNode, children: GraphPattern[] = []): GraphPatternBuilderImpl {
        this.patterns.push(new Graph(graph, children))
        return this
    }
    
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