import { Query } from "./query"

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
        const subjectVar = "?subject"
        const subject = this.subjectIri === null ? subjectVar : `<${decodeURIComponent(this.subjectIri)}>`
        
        const graphVar = "?graph"
        const predicateVar = "?predicate"
        const objectVar = "?object"

        this.predicateIris.map(pred => decodeURIComponent(pred))

        let langFilter = ""
        if (this.withoutLang || this.langTags.length !== 0){
            langFilter = `FILTER ( isIRI(${objectVar}) || isBLANK(${objectVar}) `
            if (this.withoutLang){
                langFilter += `|| (!(langMatches(lang(${objectVar}),\"*\")))`
            }
            if (this.langTags.length !== 0){
                this.langTags.forEach(languageTag => {
                    langFilter += ` || (lang(${objectVar}) = \"${languageTag}\") `
                    
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




export type {
    QueryBuilder,
    SimpleQueryBuilder,
    Language,
    Query
}

export {
    NO_LANG_SPECIFIED,
    simpleBuilder
}