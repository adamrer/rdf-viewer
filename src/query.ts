import { BlankNode, DefaultGraph, Literal, NamedNode, Quad, Term, Variable } from "n3"
import toNT from '@rdfjs/to-ntriples'

// created by sparql grammar https://www.w3.org/TR/sparql11-query/#sparqlGrammar


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

type GroupGraphPattern = IGraph | IGraphPattern | ITriplePattern | ISelect | IUnion | IFilter | IBind | IOptional

interface IGraphPattern extends INode {
    type: string
    children: GroupGraphPattern[]
    keyword: string
    
}

abstract class GraphPattern implements IGraphPattern {
    type: string
    children: GroupGraphPattern[]
    keyword: string

    constructor(keyword: string, children: GroupGraphPattern[] = []){
        this.keyword = keyword.toLocaleUpperCase()
        this.type = keyword.toLocaleLowerCase()
        this.children = children
    }

    add(patterns: GroupGraphPattern[]): GraphPattern {
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
    leftChildren: GroupGraphPattern[]
    rightChildren: GroupGraphPattern[]
}

class Union implements IUnion {
    type = 'union' as const
    leftChildren: GroupGraphPattern[]
    rightChildren: GroupGraphPattern[]
    constructor(leftChildren: GroupGraphPattern[] = [], rightChildren: GroupGraphPattern[] = []){
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

interface ISelect extends INode {
    type: 'select'
    where: Where
    distinct: boolean
    variables: Variable[]
    limit?: number
    offset?: number

    setLimit(value: number): ISelect
    setOffset(value: number): ISelect
    
}

class Select implements ISelect {
    type = "select" as const
    variables: Variable[]
    distinct: boolean
    where: Where
    limit?: number
    offset?: number

    constructor(variables: Variable[], distinct: boolean = false, where: Where, limit?: number, offset?: number){
        this.where = where
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
    toSparql(): string {
        const header = `SELECT ${this.distinct ? 'DISTINCT' : ''} ${this.variables.map(variable => toNT(variable)).join(', ')}`
        
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

// type Expression = IExpression | string | number

interface IBind extends INode {
    type: 'bind'
    expression: IExpression
    variable: Variable
}

class Bind implements IBind {
    type = "bind" as const
    expression: IExpression
    variable: Variable

    constructor(expression: IExpression, variable: Variable){
        this.expression = expression
        this.variable = variable
    }

    toSparql(): string {
        return `BIND ( ${this.expression.toSparql()} AS ${toNT(this.variable)} )`
    }
}

interface IOptional extends INode {
    type: 'optional'
    children: GroupGraphPattern[]
}

class Optional extends GraphPattern {
    
    constructor(children: GroupGraphPattern[] = []){
        super('optional', children)
    }
}

interface IFilter extends INode {
    type: 'filter'
    constraint: IExpression
}

class Filter implements IFilter {
    type = 'filter' as const
    constraint: IExpression
    
    constructor(constraint: IExpression){
        this.constraint = constraint
    }

    toSparql(): string {
        return `FILTER (${this.constraint.toSparql()})`
    }

}


interface IGraph extends INode {
    type: 'graph'
    graph: NamedNode | Variable
    children: GroupGraphPattern[]
}

class Graph extends GraphPattern {
    graph: Variable | NamedNode
    constructor(graph: Variable | NamedNode, children: GroupGraphPattern[] = []){
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
type ExpressionArg = IExpression | Term | number | string | IExpressionList | IBuiltInCall

function expressionArgToString(arg: ExpressionArg): string{
    if (arg instanceof NamedNode || arg instanceof Variable || arg instanceof BlankNode || arg instanceof Literal || arg instanceof DefaultGraph){
        return toNT(arg)
    }
    const argType = typeof(arg)
    if (argType === 'string' || argType === 'number'){
        return arg.toString()
    }
    return (arg as IExpression|IExpressionList|IBuiltInCall).toSparql()
    
}

interface IExpression extends INode {
    type: 'expression'
    operator: Operator
    args: ExpressionArg[]
}

class Expression implements IExpression {
    type = 'expression' as const
    operator: Operator
    args: ExpressionArg[]

    constructor(operator: Operator, args: ExpressionArg[]){
        this.operator = operator
        this.args = args
    }

    toSparql(): string {
        if (this.args.length === 1){
            return `${this.operator}(${expressionArgToString(this.args[0])})`
        }
        if (this.args.length === 2){
            return `${expressionArgToString(this.args[0])} ${this.operator} ${expressionArgToString(this.args[1])}`
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
    firstArg: IExpression|Variable
    secondArg?: IExpression
    thirdArg?: IExpression
}

class BuiltInCall implements IBuiltInCall {
    type = 'builtInCall' as const
    func: Func
    firstArg: IExpression|Variable
    secondArg?: IExpression
    thirdArg?: IExpression

    constructor(func: Func, firstArg: IExpression|Variable, secondArg?: IExpression, thirdArg?: IExpression){
        this.func = func
        this.firstArg = firstArg
        this.secondArg = secondArg
        this.thirdArg = thirdArg
    }

    toSparql(): string {

        const args = [this.firstArg instanceof Variable ? toNT(this.firstArg) : this.firstArg.toSparql()]
        this.secondArg ? args.push(this.secondArg.toSparql()) : {}
        this.thirdArg ? args.push(this.thirdArg.toSparql()) : {}
        return `${this.func}(${args.join(', ')})`
    }
}



interface IExpressionList extends INode {
    type: 'expressionList'
    expressions: ExpressionArg[]
}

class ExpressionList implements IExpressionList {
    type = 'expressionList' as const
    expressions: ExpressionArg[]

    constructor(expressions: ExpressionArg[]){
        this.expressions = expressions
    }

    toSparql(): string {
        return `(${this.expressions.map(expr => expressionArgToString(expr)).join(', ')})`
    }
}

interface IWhere extends INode {
    type: 'where'
    children: GroupGraphPattern[]

    add(patterns: GroupGraphPattern[]): IWhere
}

class Where extends GraphPattern {
    constructor(children: GroupGraphPattern[] = []){
        super('where', children)
    }
}



export type {
    INode,
    ISelect,
    IWhere,
    ITriplePattern,
    IGraphPattern,
    IUnion,
    IFilter,
    IOptional,
    IBind,
    IBuiltInCall,
    IExpression,
    IExpressionList,
    IGraph,
}

export {
    Select,
    Where,
    TriplePattern,
    Expression,
    ExpressionList,
    Bind,
    BuiltInCall,
    Union,
    Optional,
    Filter,
    Graph

}
