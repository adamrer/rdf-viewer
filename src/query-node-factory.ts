import { Term, NamedNode, Variable } from "n3";
import { SelectVariables, Where, Select, GraphPattern, TriplePattern, Expression, ExpressionList, DataBlockValue, Values, Filter, Graph, Bind, Union, Optional, BuiltInCall, OperatorExpression } from "./query-interfaces";
import { WhereImpl, TriplePatternImpl, ExpressionListImpl, ValuesImpl, BindImpl, UnionImpl, OptionalImpl, FilterImpl, GraphImpl } from "./query-node-implementations";
import { SelectImpl } from "./query";

/**
 * Factory for creating node of Query
 * @see Query
 */
interface QueryNodeFactory {
  /**
   * Returns Select clause
   *
   * @param variables - select variables
   * @param distinct - if the results should be distinct from each other
   * @param where - the where clause of the select clause
   * @param limit - limit the number of retrieved quads
   * @param offset - retrieve quads with offset from the beginning
   */
  select(
    variables: SelectVariables,
    distinct?: boolean,
    where?: Where,
    limit?: number,
    offset?: number,
  ): Select;
  /**
   * Returns Where clause
   *
   * @param children - child GraphPattern nodes
   * @see GraphPatternBuilder
   */
  where(children?: GraphPattern[]): Where;
  /**
   * Returns TriplePattern
   *
   * @param subject - subject term
   * @param predicate - predicate term
   * @param object - object term
   */
  triplePattern(
    subject: Term,
    predicate: NamedNode | Variable,
    object: Term,
  ): TriplePattern;
  /**
   * Returns an ExpressionList with given expressions
   *
   * @param expressions
   */
  expressionList(expressions: Expression[]): ExpressionList;
  /**
   * Returns a Values clause
   *
   * @param variable - variable that will be constraint by values that it can acquire
   * @param values - values that the variable can acquire
   */
  values(variable: Variable, values: DataBlockValue[]): Values;
  /**
   * Returns a Filter clause
   *
   * @param constraint - constraint that the filter will have
   */
  filter(constraint: Expression): Filter;
  /**
   * Returns a Graph clause
   *
   * @param graph - IRI or a variable of the graph
   * @param children - children GraphPattern nodes of the clause
   */
  graph(graph: Variable | NamedNode, children?: GraphPattern[]): Graph;
  // TODO: order by (https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#modOffset)
  // bind(expression: Expression, variable: Variable): Bind
  // union(leftChildren: GraphPattern[], rightChildren: GraphPattern[]): Union
  // optional(children?: GraphPattern[]): Optional
}

class QueryNodeFactoryImpl implements QueryNodeFactory {
  select(
    variables: SelectVariables,
    distinct: boolean = true,
    where?: Where,
    limit?: number,
    offset?: number,
  ): Select {
    return new SelectImpl(variables, distinct, where, limit, offset);
  }
  where(children: GraphPattern[] = []): Where {
    return new WhereImpl(children);
  }
  triplePattern(
    subject: Term,
    predicate: NamedNode | Variable,
    object: Term,
  ): TriplePattern {
    return new TriplePatternImpl(subject, predicate, object);
  }
  expressionList(expressions: Expression[]): ExpressionList {
    return new ExpressionListImpl(expressions);
  }
  values(variable: Variable, values: DataBlockValue[]): Values {
    return new ValuesImpl(variable, values);
  }
  bind(expression: Expression, variable: Variable): Bind {
    return new BindImpl(expression, variable);
  }
  union(
    leftChildren: GraphPattern[] = [],
    rightChildren: GraphPattern[] = [],
  ): Union {
    return new UnionImpl(leftChildren, rightChildren);
  }
  optional(children: GraphPattern[] = []): Optional {
    return new OptionalImpl(children);
  }
  filter(constraint: BuiltInCall | OperatorExpression): Filter {
    return new FilterImpl(constraint);
  }
  graph(graph: Variable | NamedNode, children: GraphPattern[] = []): Graph {
    return new GraphImpl(graph, children);
  }
}

const QueryNodeFactory: QueryNodeFactory = new QueryNodeFactoryImpl();

export default QueryNodeFactory;
