export interface Query{
    str(): string
}

interface QueryBuilder{
    build(): Query
}

export interface SimpleQueryBuilder extends QueryBuilder {
    subject(iri: string): SimpleQueryBuilder // sets the subject. subject can be only one
    predicate(iri: string): SimpleQueryBuilder // adds predicates to or
    
    lang(language: string): SimpleQueryBuilder // adds language tag to or
    withoutLangTag(): SimpleQueryBuilder // will fetch objects without language tags
    limit(number: number): SimpleQueryBuilder
    offset(number: number): SimpleQueryBuilder

    build(): Query
}


export class SparqlQueryBuilder implements SimpleQueryBuilder {
    private subject_: string|null = null
    private predicates_: string[] = []
    private langs_: string[] = []
    private limit_: number|null = null
    private offset_: number = 0
    private withoutLangTag_: boolean = false

    subject(iri: string): SimpleQueryBuilder{
        this.subject_ = iri
        return this
    }
    predicate(iri: string|string[]): SimpleQueryBuilder{
        if (typeof iri === "string"){
            this.predicates_.push(iri)
        }
        else{
            this.predicates_.push(...iri)
        }
        return this
    }
    lang(languageTag: string): SimpleQueryBuilder{
        this.langs_.push(languageTag)
        return this
    }
    withoutLangTag(): SimpleQueryBuilder{
        this.withoutLangTag_ = true
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
        const offsetString = this.offset_ === 0 ? "" : `OFFSET ${this.offset_}`

        const query: string = `SELECT * 
WHERE {
    GRAPH ?graph { ${s} ${p} ?object . }
    ${filterString}
}
${offsetString}
${limitString}
`
        return {str(): string {return query} }
    }
}