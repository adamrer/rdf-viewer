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

/**
 * Types of the Query
 */
type QueryType = 'select' // |'construct'|'ask'|'describe'
/**
 * Types of the Node
 */
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
    
/**
 * Types of the graph patterns
 */
type GraphPatternClauseType = 'where'|
    'optional'|
    'graph' 

/**
 * Interface representing the query for querying quads on data sources
 */
interface Query {
    /**
     * Type of the query
     */
    type: QueryType
    /**
     * Where clause
     */
    where: Where
    /**
     * Serializes the query to SPARQL
     */
    toSparql(): string
}

/**
 * Interface representing a node of a Query
 */
interface Node {
    /**
     * Type of the node
     */
    type: NodeType
    /**
     * Serializes the node to SPARQL
     */
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

/**
 * Represents a triple pattern constraint in query
 */
interface TriplePattern extends Node {
    type: 'triplePattern'
    subject: Term
    predicate: NamedNode | Variable
    object: Term
}
/**
 * Types of graph patterns
 */
type GraphPattern = Graph | GraphPatternClause | TriplePattern | Select | Union | Filter | Bind | Optional | Values

/**
 * Represents a graph pattern clause in a query
 */
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

/**
 * Character for all selector in Query of a type Select
 */
type AllSelector = '*'

/**
 * Type for variables in Select
 */
type SelectVariables = Variable[]|AllSelector
/**
 * Represents a Select Query
 */
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
/**
 * Represents Values clause in query.
 * Constraints a variable to acquire one of the specified values.
 */
interface Values extends Node {
    type: 'values'
    values: DataBlockValue[]
    variable: Variable
    evaluate(value: Term): boolean
}
/**
 * Represents Bind in query.
 * Assigns a variable to an expression
 */
interface Bind extends Node {
    type: 'bind'
    expression: Expression
    variable: Variable
}
interface Optional extends GraphPatternClause {
    type: 'optional'
}
/**
 * Represents Filter in query.
 * Constraints quads by BuiltInCall or OperatorExpression
 */
interface Filter extends Node {
    type: 'filter'
    constraint: BuiltInCall|OperatorExpression
}
/**
 * Represents Graph clause in query.
 * Constraints quads to be in a named graph
 */
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

/**
 * Variable substitution
 */
type Substitution = {[variableName: string]: Term}

interface ExpressionList extends Node {
    type: 'expressionList'
    expressions: Expression[]
}
/**
 * Represents a Where clause of a query.
 * Holds all the constraints of the query.
 */
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

