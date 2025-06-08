import { graphPatternBuilder, GraphPatternBuilder } from "./graph-pattern-builder"
import { GraphPattern, Select, SelectVariables, Where } from "./query"
import { QueryBuilder } from "./query-builder"

// Can add interfaces for Ask, Describe and Construct
type QueryStepBuilder = SelectStepBuilder // |AskStepBuilder|DescribeStepBuilder|ConstructStepBuilder

interface SelectStepBuilder {
    select(variables: SelectVariables, distinct: boolean): QueryBuilder
}

// selectBuilder (variables, distinct) -> whereBuilder (adding patterns) -> solutionBuilder (limit, offset) -> build
class SparqlQueryBuilder {
    select(variables: SelectVariables, distinct: boolean = true): SelectStep {
        return new SelectStep(variables, distinct)
    }

    graphPatternBuilder(patterns: GraphPattern[] = []): GraphPatternBuilder {
        return graphPatternBuilder(patterns)
    }

}
interface ISelectStep extends QueryBuilder {
    where(children: GraphPattern[]): SelectStep
    limit(value: number): SelectStep
    offset(value: number): SelectStep

    build(): Select
}
class SelectStep implements ISelectStep {
    select: Select
    constructor(variables: SelectVariables, distinct: boolean = true){
        this.select = new Select(variables, distinct)
    }
    where(children: GraphPattern[]): SelectStep{
        this.select.setWhere(new Where(children))
        return this
    }
    limit(value: number): SelectStep{
        this.select.setLimit(value)
        return this
    }
    offset(value: number): SelectStep{
        this.select.setOffset(value)
        return this
    }

    build(): Select {
        return this.select
    }
}

function sparqlStepBuilder(): SparqlQueryBuilder{
    return new SparqlQueryBuilder()
}

export type {
    QueryStepBuilder
}

export {
    sparqlStepBuilder
}