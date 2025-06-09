import { BlankNode, DefaultGraph, Literal, NamedNode, Quad, Term, Variable } from "n3"
import toNT from '@rdfjs/to-ntriples'

// created with sparql grammar https://www.w3.org/TR/sparql11-query/#sparqlGrammar

type QueryType = 'select'|'construct'|'ask'|'describe'
type NodeType = 'select'|
    'triplePattern'|
    'operatorExpression'|
    'expressionList'|
    'values'|
    'bind'|
    'builtInCall'|
    'union'|
    'filter'|
    'expression'|
    GraphPatternClauseType
    
type GraphPatternClauseType = 'where'|
    'optional'|
    'graph' 

interface Query {
    type: QueryType
    toSparql(): string
}

interface Node {
    type: NodeType
    toSparql(): string
}


interface TriplePattern extends Node {
    type: 'triplePattern'
    subject: Term
    predicate: NamedNode | Variable
    object: Term
}

class TriplePatternImpl implements TriplePattern {
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

type GraphPattern = Graph | GraphPatternClause | TriplePattern | Select | Union | Filter | Bind | Optional | Values

interface GraphPatternClause extends Node {
    type: GraphPatternClauseType
    children: GraphPattern[]
    keyword: string
    
}

abstract class GraphPatternClauseImpl implements GraphPatternClause {
    type: GraphPatternClauseType
    children: GraphPattern[]
    keyword: string

    constructor(keyword: GraphPatternClauseType, children: GraphPattern[] = []){
        this.keyword = keyword.toLocaleUpperCase()
        this.type = keyword
        this.children = children
    }

    add(patterns: GraphPattern[]): GraphPatternClauseImpl {
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

interface Union extends Node {
    type: 'union'
    leftChildren: GraphPattern[]
    rightChildren: GraphPattern[]
}

class UnionImpl implements Union {
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

interface Select extends Node {
    type: 'select'
    where: Where
    distinct: boolean
    variables: SelectVariables
    limit?: number
    offset?: number

    setLimit(value: number): Select
    setOffset(value: number): Select
    setWhere(where: Where): Select
    addVariables(variables: Variable[]): Select
    
}
class SelectImpl implements Select, Query {
    type = "select" as const
    variables: SelectVariables
    distinct: boolean
    where: Where
    limit?: number
    offset?: number

    constructor(variables: SelectVariables, distinct: boolean = true, where?: Where, limit?: number, offset?: number){
        this.where = where ? where : new WhereImpl()
        this.distinct = distinct
        this.variables = variables
        this.limit = limit
        this.offset = offset
    }
    setLimit(value: number): SelectImpl {
        this.limit = value
        return this
    }
    setOffset(value: number): SelectImpl {
        this.offset = value
        return this
    }
    setWhere(where: Where): SelectImpl {
        this.where = where
        return this
    }
    addVariables(variables: Variable[]) : SelectImpl {
        if (variables.length){ // it is not AllSelector, it is an array
            (this.variables as Variable[]).push(...variables)
        }
        else {
            this.variables = variables
        }
        return this
    }
    toSparql(): string {
        const header = `SELECT ${this.distinct ? 'DISTINCT ' : ''}${isAllSelector(this.variables) ? this.variables : (this.variables as Variable[]).map(variable => toNT(variable)).join(' ')}`
        
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

type DataBlockValue = NamedNode | Literal | number | 'true' | 'false'
interface Values extends Node {
    type: 'values'
    values: DataBlockValue[]
    variable: Variable
}

class ValuesImpl implements Values {
    type = 'values' as const
    values: DataBlockValue[]
    variable: Variable
    constructor(variable: Variable, values: DataBlockValue[]){
        this.values = values
        this.variable = variable
    }
    toSparql(): string {
        return `VALUES ${toNT(this.variable)} { ${this.values.map(value => expressionToString(value)).join(' ')} }`
    }
}

interface Bind extends Node {
    type: 'bind'
    expression: Expression
    variable: Variable
}

class BindImpl implements Bind {
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

interface Optional extends GraphPatternClause {
    type: 'optional'
}

class OptionalImpl extends GraphPatternClauseImpl implements Optional {
    type = 'optional' as const
    constructor(children: GraphPattern[] = []){
        super('optional', children)
    }
}

interface Filter extends Node {
    type: 'filter'
    constraint: Expression
}

class FilterImpl implements Filter {
    type = 'filter' as const
    constraint: Expression
    
    constructor(constraint: Expression){
        this.constraint = constraint
    }

    toSparql(): string {
        return `FILTER (${expressionToString(this.constraint)})`
    }

}


interface Graph extends GraphPatternClause {
    type: 'graph'
    graph: NamedNode | Variable
    children: GraphPattern[]
}

class GraphImpl extends GraphPatternClauseImpl implements Graph {
    type = 'graph' as const
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
type Expression = OperatorExpression | Term | number | string | ExpressionList | BuiltInCall

function expressionToString(arg: Expression): string{
    if (arg instanceof NamedNode || arg instanceof Variable || arg instanceof BlankNode || arg instanceof Literal || arg instanceof DefaultGraph){
        return toNT(arg)
    }
    const argType = typeof(arg)
    if (argType === 'string' || argType === 'number'){
        return arg.toString()
    }
    return (arg as OperatorExpression|ExpressionList|BuiltInCall).toSparql()
    
}

interface OperatorExpression extends Node {
    type: 'expression'
    operator: Operator
    args: Expression[]
}

class OperatorExpressionImpl implements OperatorExpression {
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
| '!'

type BinaryFunc = 'langMatches'

type Func = UnaryFunc | BinaryFunc

interface BuiltInCall extends Node{
    type: 'builtInCall'
    func: Func
    firstArg: Expression
    secondArg?: Expression
    thirdArg?: Expression
}

class BuiltInCallImpl implements BuiltInCall {
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



interface ExpressionList extends Node {
    type: 'expressionList'
    expressions: Expression[]
}

class ExpressionListImpl implements ExpressionList {
    type = 'expressionList' as const
    expressions: Expression[]

    constructor(expressions: Expression[]){
        this.expressions = expressions
    }

    toSparql(): string {
        return `(${this.expressions.map(expr => expressionToString(expr)).join(', ')})`
    }
}

interface Where extends GraphPatternClause {
    type: 'where'
}

class WhereImpl extends GraphPatternClauseImpl implements Where {
    type = 'where' as const
    constructor(children: GraphPattern[] = []){
        super('where', children)
    }
}

interface QueryNodeFactory {
    select(variables: SelectVariables, distinct?: boolean, where?: Where, limit?: number, offset?: number): Select
    where(children?: GraphPattern[]): Where 
    triplePattern(subject: Term, predicate: NamedNode | Variable, object: Term): TriplePattern
    expressionList(expressions: Expression[]): ExpressionList
    values(variable: Variable, values: DataBlockValue[]): Values
    bind(expression: Expression, variable: Variable): Bind 
    union(leftChildren: GraphPattern[], rightChildren: GraphPattern[]): Union 
    optional(children?: GraphPattern[]): Optional 
    filter(constraint: Expression): Filter 
    graph(graph: Variable | NamedNode, children?: GraphPattern[]): Graph 
}
class QueryNodeFactoryImpl implements QueryNodeFactory {
    select(variables: SelectVariables, distinct: boolean = true, where?: Where, limit?: number, offset?: number): Select {
        return new SelectImpl(variables, distinct, where, limit, offset)
    }
    where(children: GraphPattern[] = []): Where {
        return new WhereImpl(children)
    }
    triplePattern(subject: Term, predicate: NamedNode | Variable, object: Term): TriplePattern{
        return new TriplePatternImpl(subject, predicate, object)
    }
    expressionList(expressions: Expression[]): ExpressionList{
        return new ExpressionListImpl(expressions)
    }
    values(variable: Variable, values: DataBlockValue[]): Values{
        return new ValuesImpl(variable, values)
    }
    bind(expression: Expression, variable: Variable): Bind {
        return new BindImpl(expression, variable)
    }
    union(leftChildren: GraphPattern[] = [], rightChildren: GraphPattern[] = []): Union {
        return new UnionImpl(leftChildren, rightChildren)
    }
    optional(children: GraphPattern[] = []): Optional {
        return new OptionalImpl(children)
    }
    filter(constraint: Expression): Filter {
        return new FilterImpl(constraint)
    }
    graph(graph: Variable | NamedNode, children: GraphPattern[] = []): Graph {
        return new GraphImpl(graph, children)
    }
}


// Operator expressions
const lt = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('<', [firstArg, secondArg])
const le = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('<=', [firstArg, secondArg])
const gt = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('>', [firstArg, secondArg])
const ge = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('>=', [firstArg, secondArg])
const eq = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('=', [firstArg, secondArg])
const ne = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('!=', [firstArg, secondArg])

const and = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('&&', [firstArg, secondArg])
const or = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('||', [firstArg, secondArg])

const mul = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('*', [firstArg, secondArg])
const add = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('+', [firstArg, secondArg])
const sub = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('-', [firstArg, secondArg])
const div = (firstArg: Expression, secondArg: Expression) => new OperatorExpressionImpl('/', [firstArg, secondArg])

const inExpr = (firstArg: Expression, secondArg: ExpressionListImpl) => new OperatorExpressionImpl('IN', [firstArg, secondArg])
const notIn = (firstArg: Expression, secondArg: ExpressionListImpl) => new OperatorExpressionImpl('NOT IN', [firstArg, secondArg])

// Built-in calls
const isIri = (arg: Expression) => new BuiltInCallImpl('isIRI', arg)
const isUri = (arg: Expression) => new BuiltInCallImpl('isURI', arg)
const isBlank = (arg: Expression) => new BuiltInCallImpl('isBLANK', arg)
const isLiteral = (arg: Expression) => new BuiltInCallImpl('isLITERAL', arg)
const isNumeric = (arg: Expression) => new BuiltInCallImpl('isNUMERIC', arg)
const ceil = (arg: Expression) => new BuiltInCallImpl('CEIL', arg)
const abs = (arg: Expression) => new BuiltInCallImpl('ABS', arg)
const lang = (arg: Expression) => new BuiltInCallImpl('LANG', arg)
const datatype = (arg: Expression) => new BuiltInCallImpl('DATATYPE', arg)
const bound = (arg: Expression) => new BuiltInCallImpl('BOUND', arg)
const iri = (arg: Expression) => new BuiltInCallImpl('IRI', arg)
const uri = (arg: Expression) => new BuiltInCallImpl('URI', arg)
const not = (arg: Expression) => new BuiltInCallImpl('!', arg)
const langMatches = (firstArg: Expression, secondArg: Expression) => new BuiltInCallImpl('langMatches', firstArg, secondArg)


const QueryNodeFactory: QueryNodeFactory = new QueryNodeFactoryImpl()

export type {
    QueryType,
    Query,
    SelectVariables,
    Expression,
    DataBlockValue,
    GraphPattern,
    Select,
    Where,
    TriplePattern,
    OperatorExpression,
    ExpressionList,
    Values,
    Bind,
    BuiltInCall,
    Union,
    Optional,
    Filter,
    Graph,
    GraphPatternClause,

}
export {
    QueryNodeFactory,
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
    uri,
    not,
    langMatches
}
