import { DataFactory, NamedNode, Quad, Term, Variable } from "n3"
import toNT from '@rdfjs/to-ntriples'

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

interface IUnion extends INode {
    type: 'union'
    left: IGraphPattern
    right: IGraphPattern
}

interface ISelect extends INode {
    type: 'select'
    where?: IWhere
    distinct: boolean
    variables: Variable[]
    limit?: number
    offset?: number

    setLimit(value: number): ISelect
    setOffset(value: number): ISelect
    setWhere(where: IWhere): ISelect
    
}

class Select implements ISelect {
    type = "select" as const
    variables: Variable[]
    distinct: boolean
    where?: IWhere
    limit?: number
    offset?: number

    constructor(variables: Variable[], distinct: boolean = false, where?: IWhere, limit?: number, offset?: number){
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
    setWhere(where: IWhere): Select {
        this.where = where
        return this
    }
    toSparql(): string {
        const header = `SELECT ${this.distinct ? 'DISTINCT ' : ''} ${this.variables.map(variable => variable.value).join(', ')}`
        
        const limit = this.limit ? `LIMIT ${this.limit}` : ''
        const offset = this.offset ? `OFFSET ${this.offset}` : ''
        const footer = [limit, offset]
        
        return [header, this.where?.toSparql(), footer].join('\n')
    }
    
}
interface IBind extends INode {
    type: 'bind'
    expression: IExpression
    variable: Variable
}

interface IOptional extends INode {
    type: 'optional'
    children: GroupGraphPattern[]
}

interface IFilter extends INode {
    type: 'filter'
    constraint: IExpression
}

interface IGraph extends INode {
    type: 'graph'
    graph: NamedNode | Variable
    children: GroupGraphPattern[]
}

type NumericOperator =  '+' | '-' | '*' | '/'
type ConditionalOperator = '&&' | '||' 
type RelationalOperator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN' | 'NOT IN'
type Operator = NumericOperator | ConditionalOperator | RelationalOperator
type ExpressionArg = IExpression | Term | number | string | IExpressionList | IBuiltInCall

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
            return `${this.operator}(${this.args[0]})`
        }
        if (this.args.length === 2){
            return `${this.args[0]} ${this.operator} ${this.args[1]}`
        }
        
        return ''
    }
}


type Func = 'STR' | 'LANG' | 'DATATYPE' | 'BOUND' | 'IRI' | 'URI'
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

interface IBuiltInCall extends INode{
    type: 'builtInCall'
    func: Func
    args: IExpression|Variable
}


interface IExpressionList extends INode {
    type: 'expressionList'
    expressions: IExpression[]
}

type GroupGraphPattern = IGraph | IGraphPattern | ITriplePattern | ISelect | IUnion | IFilter | IBind | IOptional

interface IWhere extends INode {
    type: 'where'
    children?: GroupGraphPattern[]

    add(patterns: GroupGraphPattern[]): IWhere
}

class Where implements IWhere {
    type = 'where' as const
    children?: GroupGraphPattern[]

    constructor(children?: GroupGraphPattern[]){
        this.children = children
    }

    add(patterns: GroupGraphPattern[]): Where {
        if (this.children){
            this.children.push(...patterns)
        }
        else{
            this.children = patterns
        }
        return this
    }

    toSparql(): string {
        const header = `WHERE {`
        const children = this.children?.map(pattern => pattern.toSparql()).join('\n')
        const footer = '}'

        return [header, children, footer].join('\n')
    }
}

interface IGraphPattern extends INode {
    type: 'graphPattern'
    children: GroupGraphPattern[]
    
}

const where: Where = new Where([new TriplePattern(DataFactory.blankNode("b1"), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))])
const select: Select = new Select([DataFactory.variable("title")], true).setWhere(where)
console.log(select.toSparql())


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
    Expression

}
