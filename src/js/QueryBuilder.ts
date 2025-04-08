import { Query } from "./Query"

export interface QueryBuilder {
    subject(iri: string): QueryBuilder // sets the subject. subject can be only one
    predicate(iri: string): QueryBuilder // adds predicates to or
    
    lang(language: string): QueryBuilder // adds language tag to or
    withoutLangTag(): QueryBuilder // will fetch objects without language tags
    limit(number: number): QueryBuilder
    offset(number: number): QueryBuilder

    build(): Query
}


export class SparqlQueryBuilder implements QueryBuilder{
    private subject_: string|null = null
    private predicates_: string[] = []
    private langs_: string[] = []
    private limit_: number|null = null
    private offset_: number = 0
    private withoutLangTag_: boolean = false

    subject(iri: string): QueryBuilder{
        this.subject_ = iri
        return this
    }
    predicate(iri: string|string[]): QueryBuilder{
        if (typeof iri === "string"){
            this.predicates_.push(iri)
        }
        else{
            this.predicates_.push(...iri)
        }
        return this
    }
    lang(languageTag: string): QueryBuilder{
        this.langs_.push(languageTag)
        return this
    }
    withoutLangTag(): QueryBuilder{
        this.withoutLangTag_ = true
        return this
    }
    limit(number: number): QueryBuilder{
        this.limit_ = number
        return this
    }
    offset(number: number): QueryBuilder{
        this.offset_ = number
        return this
    }

    build(): Query {
        const s = this.subject_ === null ? "?subject" : `<${decodeURIComponent(this.subject_)}>`
        
        this.predicates_.map(pred => decodeURIComponent(pred))
        const p = this.predicates_.length === 0 ? "?predicate" : `<${this.predicates_.join('>|<')}>`

        let filterString = ""
        if (this.withoutLangTag_ || this.langs_.length !== 0){
            filterString = `FILTER ( ISIRI(?object) `
            if (this.withoutLangTag_){
                filterString += "|| (!(langMatches(lang(?object),\"*\")))"
            }
            if (this.langs_.length !== 0){
                this.langs_.forEach(languageTag => {
                    filterString += `|| (lang(?object) = \"${languageTag}\") `
                    
                });
            }
            filterString += ") ."
        }

        const limitString = this.limit_ === null ? "" : `LIMIT ${this.limit_}`
        const offsetString = this.offset_ === null ? "" : `OFFSET ${this.offset_}`

        const query: string = `SELECT * 
WHERE {
    ${s} ${p} ?object .
    ${filterString}
}
${offsetString}
${limitString}
`
        return {str(): string {return query} }
    }
}