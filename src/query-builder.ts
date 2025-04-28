export const NO_LANG_SPECIFIED = ""
type lang = typeof NO_LANG_SPECIFIED | string


export interface Query{
    str(): string
}

export interface QueryBuilder{
    build(): Query
}

export interface SimpleQueryBuilder extends QueryBuilder {
    subject(iri: string): SimpleQueryBuilder // sets the subject. subject can be only one
    predicates(iris: string[]): SimpleQueryBuilder // adds predicates to or
    
    lang(languages: lang[]): SimpleQueryBuilder // adds language tag to or
    
    limit(number: number): SimpleQueryBuilder
    offset(number: number): SimpleQueryBuilder

    build(): Query
}


class SparqlQueryBuilder implements SimpleQueryBuilder {
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
            langFilter = `FILTER ( ISIRI(?object) || ISBLANK(?object) `
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
        return {str(): string {return query} }
    }
}

export function simpleBuilder(): SimpleQueryBuilder{
    return new SparqlQueryBuilder()
}