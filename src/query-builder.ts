import { NamedNode, Term, Variable } from "n3"
import { Query, Bind, Expression, Filter, Graph, GraphPattern, Select, SelectVariables, TriplePattern, Union, Where } from "./query"

/**
 * Represents no language tag specified for a literal
 */
const NO_LANG_SPECIFIED = ""

/**
 * Type representing a language tag of a literal
 */
type Language = typeof NO_LANG_SPECIFIED | string


/**
 * Interface for a class for creating a Query.
 * 
 * @see Query
 */
interface QueryBuilder{
    build(): Query
}

/**
 * Interface for simple query builder with limited functionality.
 * 
 * @see QueryBuilder
 */
interface SimpleQueryBuilder extends QueryBuilder {
    /**
     * Sets the subject of desired quads.
     * 
     * @param iri - IRI of an entity
     */
    subject(iri: string): SimpleQueryBuilder 
    
    /**
     * Specifies what predicates can appear in the result of the query.
     * 
     * @param iris - Array of predicate IRIs that can appear in the result.
     */
    predicates(iris: string[]): SimpleQueryBuilder
    
    /**
     * Specifies the languages the objects of the result quads can have.
     * 
     * @param languages - Array of language tags that the objects can have in the result of the query
     */
    lang(languages: Language[]): SimpleQueryBuilder 
    
    /**
     * Sets the maximum number of quads in the result of the query
     * 
     * @param number - The max number of quads in the result of the query
     */
    limit(number: number): SimpleQueryBuilder

    /**
     * Sets the offset of returned quads.
     * 
     * @param number - The offset of returned quads
     */
    offset(number: number): SimpleQueryBuilder


    /**
     * Builds the query
     * 
     * @returns a query implementing the Query interface
     * @see Query
     */
    build(): Query
}


class GraphPatternBuilder {
    patterns: GraphPattern[]
    constructor(patterns: GraphPattern[] = []){
        this.patterns = patterns
    }
    triple(subject: Term, predicate: NamedNode | Variable, object: Term): GraphPatternBuilder {
        this.patterns.push(new TriplePattern(subject, predicate, object))
        return this
    }
    filter(constraint: Expression): GraphPatternBuilder{
        this.patterns.push(new Filter(constraint))
        return this
    }
    bind(expression: Expression, variable: Variable): GraphPatternBuilder {
        this.patterns.push(new Bind(expression, variable))
        return this
    }
    union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilder {
        this.patterns.push(new Union(left, right))
        return this
    }
    graph(graph: Variable | NamedNode, children: GraphPattern[] = []): GraphPatternBuilder {
        this.patterns.push(new Graph(graph, children))
        return this
    }
    
    build(): GraphPattern[] {
        return this.patterns
    }
}

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
        return new GraphPatternBuilder(patterns)
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


/**
 * @see SimpleQueryBuilder
 */
class SparqlSimpleQueryBuilder implements SimpleQueryBuilder {
    subjectIri: string|null = null
    predicateIris: string[] = []
    langTags: string[] = []
    limitNum: number|null = null
    offsetNum: number = 0
    withoutLang: boolean = false

    subject(iri: string): SimpleQueryBuilder{
        this.subjectIri = iri
        return this
    }
    predicates(iris: string[]): SimpleQueryBuilder{
        
        this.predicateIris.push(...iris)
        
        return this
    }
    lang(languages: string[]): SimpleQueryBuilder{
        this.langTags.push(...languages)
        languages.includes(NO_LANG_SPECIFIED) ? this.withoutLang = true : this.withoutLang = false
        return this
    }
    limit(number: number): SimpleQueryBuilder{
        this.limitNum = number
        return this
    }
    offset(number: number): SimpleQueryBuilder{
        this.offsetNum = number
        return this
    }

    build(): Query {
        const subject = this.subjectIri === null ? "?subject" : `<${decodeURIComponent(this.subjectIri)}>`
        
        const graphVar = "?graph"
        const subjectVar = "?subject"
        const predicateVar = "?predicate"
        const objectVar = "?object"

        this.predicateIris.map(pred => decodeURIComponent(pred))

        let langFilter = ""
        if (this.withoutLang || this.langTags.length !== 0){
            langFilter = `FILTER ( isIRI(?object) || isBLANK(?object) `
            if (this.withoutLang){
                langFilter += "|| (!(langMatches(lang(?object),\"*\")))"
            }
            if (this.langTags.length !== 0){
                this.langTags.forEach(languageTag => {
                    langFilter += ` || (lang(?object) = \"${languageTag}\") `
                    
                });
            }
            langFilter += ") ."
        }

        const predicateFilter = this.predicateIris.length === 0 ? "" : `FILTER ( ${predicateVar} IN ( <${this.predicateIris.join('>,<')}> ) ) .`

        const limitString = this.limitNum === null ? "" : `LIMIT ${this.limitNum}`
        const offsetString = this.offsetNum === 0 ? "" : `OFFSET ${this.offsetNum}`

        const query: string = `SELECT DISTINCT ${graphVar} ${subjectVar} ${predicateVar} ${objectVar}
        WHERE {
            BIND (${subject} AS ${subjectVar}) .
            {
                GRAPH ${graphVar} { 
                    ${subjectVar} ${predicateVar} ${objectVar} . 
                    ${langFilter}
                    ${predicateFilter}
                }
            }
            UNION
            {
                ${subjectVar} ${predicateVar} ${objectVar} . 
                ${langFilter}
                ${predicateFilter}
            }
        }
        ${offsetString}
        ${limitString}
        `
        return {type: 'select', toSparql(): string {return query} }
    }
}

function simpleBuilder(): SimpleQueryBuilder{
    return new SparqlSimpleQueryBuilder()
}

function sparqlStepBuilder(): SparqlQueryBuilder{
    return new SparqlQueryBuilder()
}

export type {
    QueryBuilder,
    QueryStepBuilder,
    SimpleQueryBuilder,
    Language,
    Query
}

export {
    NO_LANG_SPECIFIED,
    simpleBuilder,
    sparqlStepBuilder
}