import { Literal, NamedNode, Term, Variable } from "n3"


// inspired by sparql grammar https://www.w3.org/TR/sparql11-query/#sparqlGrammar


/**
 * Represents no language tag specified for a literal
 */
const NO_LANG_SPECIFIED = ""

const ANY_LANGUAGE = "*"

/**
 * Type representing a language tag of a literal
 */
type Language = typeof NO_LANG_SPECIFIED | string


type QueryType = 'select' // |'construct'|'ask'|'describe'
type NodeType = 'select'|
    'triplePattern'|
    'operatorExpression'|
    'values'|
    'builtInCall'|
    'filter'|
    'expressionList'|
    'bind'|
    'union'|
    GraphPatternClauseType
    
type GraphPatternClauseType = 'where'|
    'optional'|
    'graph' 

interface Query {
    type: QueryType
    where: Where
    toSparql(): string
}

interface Node {
    type: NodeType
    toSparql(): string
}

type ConditionalOperator = '||' 
type RelationalOperator = '=' | '!=' 
type Operator = ConditionalOperator | RelationalOperator
type Expression = OperatorExpression | Term | number | string | ExpressionList | BuiltInCall

interface OperatorExpression extends Node {
    type: 'operatorExpression'
    operator: Operator
    args: Expression[]
    variables: Set<Variable>
    evaluate(variablesSubstitution: Substitution): boolean
}


interface TriplePattern extends Node {
    type: 'triplePattern'
    subject: Term
    predicate: NamedNode | Variable
    object: Term
}
type GraphPattern = Graph | GraphPatternClause | TriplePattern | Select | Union | Filter | Bind | Optional | Values

interface GraphPatternClause extends Node {
    type: GraphPatternClauseType
    children: GraphPattern[]
    keyword: string
    
}
interface Union extends Node {
    type: 'union'
    leftChildren: GraphPattern[]
    rightChildren: GraphPattern[]
}

type AllSelector = '*'

type SelectVariables = Variable[]|AllSelector

interface Select extends Node, Query {
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
type DataBlockValue = NamedNode | Literal 
interface Values extends Node {
    type: 'values'
    values: DataBlockValue[]
    variable: Variable
    evaluate(value: Term): boolean
}

interface Bind extends Node {
    type: 'bind'
    expression: Expression
    variable: Variable
}
interface Optional extends GraphPatternClause {
    type: 'optional'
}
interface Filter extends Node {
    type: 'filter'
    constraint: BuiltInCall|OperatorExpression
}

interface Graph extends GraphPatternClause {
    type: 'graph'
    graph: NamedNode | Variable
    children: GraphPattern[]
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

interface BuiltInCall extends Node {
    type: 'builtInCall'
    func: Func
    variable: Variable

    evaluate(variablesSubstitution: Substitution): boolean
}


type Substitution = {[key: string]: Term}







interface ExpressionList extends Node {
    type: 'expressionList'
    expressions: Expression[]
}
interface Where extends GraphPatternClause {
    type: 'where'
}


export type {
    Language,
    Node,
    QueryType,
    Query,
    Substitution,
    SelectVariables,
    Expression,
    DataBlockValue,
    GraphPattern,
    GraphPatternClauseType,
    
    Select,
    Where,
    TriplePattern,
    OperatorExpression,
    ExpressionList,
    Values,
    Bind,
    BuiltInCall,
    Func,
    Operator,
    Union,
    Optional,
    Filter,
    Graph,
    GraphPatternClause,
}

export {
    NO_LANG_SPECIFIED,
    ANY_LANGUAGE
}

