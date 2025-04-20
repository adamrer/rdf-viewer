export interface Query{
    str(): string
}

export interface QueryBuilder{
    build(): Query
}

export interface SimpleQueryBuilder extends QueryBuilder {
    subject(iri: string): SimpleQueryBuilder // sets the subject. subject can be only one
    predicates(iris: string[]): SimpleQueryBuilder // adds predicates to or
    
    lang(languages: string[]): SimpleQueryBuilder // adds language tag to or
    quadsWithoutLang(): SimpleQueryBuilder // will fetch objects without language tags
    limit(number: number): SimpleQueryBuilder
    offset(number: number): SimpleQueryBuilder

    build(): Query
}


class SparqlQueryBuilder implements SimpleQueryBuilder {
    subject_: string|null = null
    predicates_: string[] = []
    langs_: string[] = []
    limit_: number|null = null
    offset_: number = 0
    withoutLang_: boolean = false

    subject(iri: string): SimpleQueryBuilder{
        this.subject_ = iri
        return this
    }
    predicates(iris: string[]): SimpleQueryBuilder{
        
        this.predicates_.push(...iris)
        
        return this
    }
    lang(languages: string[]): SimpleQueryBuilder{
        this.langs_.push(...languages)
        return this
    }
    quadsWithoutLang(): SimpleQueryBuilder{
        this.withoutLang_ = true
        return this
    }
    limit(number: number): SimpleQueryBuilder{
        this.limit_ = number
        return this
    }
    offset(number: number): SimpleQueryBuilder{
        this.offset_ = number
        return this
    }

    build(): Query {
        const subject = this.subject_ === null ? "?subject" : `<${decodeURIComponent(this.subject_)}>`
        
        const graphVar = "?graph"
        const subjectVar = "?subject"
        const predicateVar = "?predicate"
        const objectVar = "?object"

        this.predicates_.map(pred => decodeURIComponent(pred))

        let langFilter = ""
        if (this.withoutLang_ || this.langs_.length !== 0){
            langFilter = `FILTER ( ISIRI(?object) || ISBLANK(?object) `
            if (this.withoutLang_){
                langFilter += "|| (!(langMatches(lang(?object),\"*\")))"
            }
            if (this.langs_.length !== 0){
                this.langs_.forEach(languageTag => {
                    langFilter += ` || (lang(?object) = \"${languageTag}\") `
                    
                });
            }
            langFilter += ") ."
        }

        const predicateFilter = this.predicates_.length === 0 ? "" : `FILTER ( ${predicateVar} IN ( <${this.predicates_.join('>,<')}> ) ) .`

        const limitString = this.limit_ === null ? "" : `LIMIT ${this.limit_}`
        const offsetString = this.offset_ === 0 ? "" : `OFFSET ${this.offset_}`

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
        return {str(): string {return query} }
    }
}

export function simpleBuilder(): SimpleQueryBuilder{
    return new SparqlQueryBuilder()
}