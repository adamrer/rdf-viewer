import { BlankNode, DefaultGraph, Literal, NamedNode, Quad, Term, Variable } from "n3"
import toNT from '@rdfjs/to-ntriples'

// created with sparql grammar https://www.w3.org/TR/sparql11-query/#sparqlGrammar

type QueryType = 'select'|'construct'|'ask'|'describe'

interface Query {
    type: QueryType
    toSparql(): string
}

interface INode {
    type: string
    toSparql(): string
}


interface ITriplePattern extends INode {
    type: 'triplePattern'
    subject: Term
    predicate: NamedNode | Variable
    object: Term
}

class TriplePattern implements ITriplePattern {
    type = 'triplePattern' as const
    subject: Term
    predicate: NamedNode | Variable
    object: Term

    constructor(subject: Term, predicate: NamedNode | Variable, object: Term){
        this.subject = subject
        this.predicate = predicate
        this.object = object
    }

    toSparql(): string {
        const quad = new Quad(this.subject, this.predicate, this.object)
        return toNT(quad)
    }
}

type GraphPattern = IGraph | IGraphPattern | ITriplePattern | ISelect | IUnion | IFilter | IBind | IOptional

interface IGraphPattern extends INode {
    type: string
    children: GraphPattern[]
    keyword: string
    
}

abstract class GraphPatternClause implements IGraphPattern {
    type: string
    children: GraphPattern[]
    keyword: string

    constructor(keyword: string, children: GraphPattern[] = []){
        this.keyword = keyword.toLocaleUpperCase()
        this.type = keyword.toLocaleLowerCase()
        this.children = children
    }

    add(patterns: GraphPattern[]): GraphPatternClause {
        if (this.children){
            this.children.push(...patterns)
        }
        else{
            this.children = patterns
        }
        return this
    }

    toSparql(): string {
        const header = `${this.keyword} {`
        const children = this.children.map(pattern => pattern.toSparql()).join('\n')
        const footer = '}'

        return [header, children, footer].join('\n')
    }
}

interface IUnion extends INode {
    type: 'union'
    leftChildren: GraphPattern[]
    rightChildren: GraphPattern[]
}

class Union implements IUnion {
    type = 'union' as const
    leftChildren: GraphPattern[]
    rightChildren: GraphPattern[]
    constructor(leftChildren: GraphPattern[] = [], rightChildren: GraphPattern[] = []){
        this.leftChildren = leftChildren
        this.rightChildren = rightChildren
    }
    toSparql(): string {
        const left = `{
${this.leftChildren.map(pattern => pattern.toSparql()).join('\n')}
}`
        const right = `{
${this.rightChildren.map(pattern => pattern.toSparql()).join('\n')}
}`
        return [left, 'UNION', right].join('\n')
    }
}
type AllSelector = '*'

function isAllSelector(value:SelectVariables): boolean{
    return value === '*'
}

type SelectVariables = Variable[]|AllSelector

interface ISelect extends INode {
    type: 'select'
    where: Where
    distinct: boolean
    variables: SelectVariables
    limit?: number
    offset?: number

    setLimit(value: number): ISelect
    setOffset(value: number): ISelect
    setWhere(where: Where): ISelect
    
}

class Select implements ISelect, Query {
    type = "select" as const
    variables: SelectVariables
    distinct: boolean
    where: Where
    limit?: number
    offset?: number

    constructor(variables: SelectVariables, distinct: boolean = false, where?: Where, limit?: number, offset?: number){
        this.where = where ? where : new Where()
        this.distinct = distinct
        this.variables = variables
        this.limit = limit
        this.offset = offset
    }
    setLimit(value: number): Select {
        this.limit = value
        return this
    }
    setOffset(value: number): Select {
        this.offset = value
        return this
    }
    setWhere(where: Where): ISelect {
        this.where = where
        return this
    }
    toSparql(): string {
        const header = `SELECT ${this.distinct ? 'DISTINCT ' : ''}${isAllSelector(this.variables) ? this.variables : (this.variables as Variable[]).map(variable => toNT(variable)).join(', ')}`
        
        const limit = this.limit ? `LIMIT ${this.limit}` : ''
        const offset = this.offset ? `OFFSET ${this.offset}` : ''
        const footerArray: string[] | null = []
        this.limit ? footerArray.push(limit) : {}
        this.offset ? footerArray.push(offset) : {}
        const footerString = footerArray.length==0 ? null : footerArray.join('\n');
        
        const result = [header]
        this.where ? result.push(this.where.toSparql()) : {}
        footerString ? result.push(footerString) : {}

        return result.join('\n')
    }
    
}


interface IBind extends INode {
    type: 'bind'
    expression: Expression
    variable: Variable
}

class Bind implements IBind {
    type = "bind" as const
    expression: Expression
    variable: Variable

    constructor(expression: Expression, variable: Variable){
        this.expression = expression
        this.variable = variable
    }

    toSparql(): string {
        return `BIND ( ${expressionToString(this.expression)} AS ${toNT(this.variable)} )`
    }
}

interface IOptional extends INode {
    type: 'optional'
    children: GraphPattern[]
}

class Optional extends GraphPatternClause {
    
    constructor(children: GraphPattern[] = []){
        super('optional', children)
    }
}

interface IFilter extends INode {
    type: 'filter'
    constraint: Expression
}

class Filter implements IFilter {
    type = 'filter' as const
    constraint: Expression
    
    constructor(constraint: Expression){
        this.constraint = constraint
    }

    toSparql(): string {
        return `FILTER (${expressionToString(this.constraint)})`
    }

}


interface IGraph extends INode {
    type: 'graph'
    graph: NamedNode | Variable
    children: GraphPattern[]
}

class Graph extends GraphPatternClause {
    graph: Variable | NamedNode
    constructor(graph: Variable | NamedNode, children: GraphPattern[] = []){
        super('graph', children)
        this.graph = graph
    }
    override toSparql(): string {
        const header = `${this.keyword} ${toNT(this.graph)} {`
        const children = this.children.map(pattern => pattern.toSparql()).join('\n')
        const footer = '}'

        return [header, children, footer].join('\n')
    }
}

type NumericOperator =  '+' | '-' | '*' | '/'
type ConditionalOperator = '&&' | '||' 
type RelationalOperator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN' | 'NOT IN'
type Operator = NumericOperator | ConditionalOperator | RelationalOperator
type Expression = IOperatorExpression | Term | number | string | IExpressionList | IBuiltInCall

function expressionToString(arg: Expression): string{
    if (arg instanceof NamedNode || arg instanceof Variable || arg instanceof BlankNode || arg instanceof Literal || arg instanceof DefaultGraph){
        return toNT(arg)
    }
    const argType = typeof(arg)
    if (argType === 'string' || argType === 'number'){
        return arg.toString()
    }
    return (arg as IOperatorExpression|IExpressionList|IBuiltInCall).toSparql()
    
}

interface IOperatorExpression extends INode {
    type: 'expression'
    operator: Operator
    args: Expression[]
}

class OperatorExpression implements IOperatorExpression {
    type = 'expression' as const
    operator: Operator
    args: Expression[]

    constructor(operator: Operator, args: Expression[]){
        this.operator = operator
        this.args = args
    }

    toSparql(): string {
        if (this.args.length === 1){
            return `${this.operator}(${expressionToString(this.args[0])})`
        }
        if (this.args.length === 2){
            return `${expressionToString(this.args[0])} ${this.operator} ${expressionToString(this.args[1])}`
        }
        
        return ''
    }
}


type UnaryFunc = 'STR' | 'LANG' | 'DATATYPE' | 'BOUND' | 'IRI' | 'URI'
| 'BNODE'
| 'ABS'
| 'CEIL'
| 'FLOOR'
| 'ROUND'
| 'isIRI'
| 'isURI'
| 'isBLANK'
| 'isLITERAL'
| 'isNUMERIC'

type Func = UnaryFunc

interface IBuiltInCall extends INode{
    type: 'builtInCall'
    func: Func
    firstArg: Expression
    secondArg?: Expression
    thirdArg?: Expression
}

class BuiltInCall implements IBuiltInCall {
    type = 'builtInCall' as const
    func: Func
    firstArg: Expression
    secondArg?: Expression
    thirdArg?: Expression

    constructor(func: Func, firstArg: Expression, secondArg?: Expression, thirdArg?: Expression){
        this.func = func
        this.firstArg = firstArg
        this.secondArg = secondArg
        this.thirdArg = thirdArg
    }

    toSparql(): string {

        const args = [expressionToString(this.firstArg)]
        this.secondArg ? args.push(expressionToString(this.secondArg)) : {}
        this.thirdArg ? args.push(expressionToString(this.thirdArg)) : {}
        return `${this.func}(${args.join(', ')})`
    }
}



interface IExpressionList extends INode {
    type: 'expressionList'
    expressions: Expression[]
}

class ExpressionList implements IExpressionList {
    type = 'expressionList' as const
    expressions: Expression[]

    constructor(expressions: Expression[]){
        this.expressions = expressions
    }

    toSparql(): string {
        return `(${this.expressions.map(expr => expressionToString(expr)).join(', ')})`
    }
}


class Where extends GraphPatternClause {
    constructor(children: GraphPattern[] = []){
        super('where', children)
    }
}

// Operator expressions
const lt = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('<', [firstArg, secondArg])
const le = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('<=', [firstArg, secondArg])
const gt = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('>', [firstArg, secondArg])
const ge = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('>=', [firstArg, secondArg])
const eq = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('=', [firstArg, secondArg])
const ne = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('!=', [firstArg, secondArg])

const and = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('&&', [firstArg, secondArg])
const or = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('||', [firstArg, secondArg])

const mul = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('*', [firstArg, secondArg])
const add = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('+', [firstArg, secondArg])
const sub = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('-', [firstArg, secondArg])
const div = (firstArg: Expression, secondArg: Expression) => new OperatorExpression('/', [firstArg, secondArg])

const inExpr = (firstArg: Expression, secondArg: ExpressionList) => new OperatorExpression('IN', [firstArg, secondArg])
const notIn = (firstArg: Expression, secondArg: ExpressionList) => new OperatorExpression('NOT IN', [firstArg, secondArg])

// Built-in calls
const isIri = (arg: Expression) => new BuiltInCall('isIRI', arg)
const isUri = (arg: Expression) => new BuiltInCall('isURI', arg)
const isBlank = (arg: Expression) => new BuiltInCall('isBLANK', arg)
const isLiteral = (arg: Expression) => new BuiltInCall('isLITERAL', arg)
const isNumeric = (arg: Expression) => new BuiltInCall('isNUMERIC', arg)
const ceil = (arg: Expression) => new BuiltInCall('CEIL', arg)
const abs = (arg: Expression) => new BuiltInCall('ABS', arg)
const lang = (arg: Expression) => new BuiltInCall('LANG', arg)
const datatype = (arg: Expression) => new BuiltInCall('DATATYPE', arg)
const bound = (arg: Expression) => new BuiltInCall('BOUND', arg)
const iri = (arg: Expression) => new BuiltInCall('IRI', arg)
const uri = (arg: Expression) => new BuiltInCall('URI', arg)


export type {
    QueryType,
    Query,
    SelectVariables,
    GraphPattern,
    Expression
}

export {
    Select,
    Where,
    TriplePattern,
    OperatorExpression,
    ExpressionList,
    Bind,
    BuiltInCall,
    Union,
    Optional,
    Filter,
    Graph,
    GraphPatternClause,
    lt,
    le,
    gt,
    ge,
    eq,
    ne,
    and,
    or,
    mul,
    add,
    sub,
    div,
    inExpr as in,
    notIn,
    isIri,
    isUri,
    isBlank,
    isLiteral,
    isNumeric,
    ceil,
    abs,
    lang,
    datatype,
    bound,
    iri,
    uri

}
