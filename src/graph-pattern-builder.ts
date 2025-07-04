import { NamedNode, Term, Variable } from "n3";
import {
  DataBlockValue,
  Expression,
  GraphPattern,
} from "./query/query-interfaces";
import QueryNodeFactory from "./query/query-implementations";

/**
 * Builder for building graph patterns in Query
 * @see Query
 */
interface GraphPatternBuilder {
  /**
   * Adds a triple pattern
   *
   * @param subject - Subject of the triple
   * @param predicate - Predicate of the triple
   * @param object - Object of the triple
   */
  triple(
    subject: Term,
    predicate: NamedNode | Variable,
    object: Term,
  ): GraphPatternBuilder;
  /**
   * Adds a filter clause with given constraint
   *
   * @param constraint - The constraint that will be in the filter
   */
  filter(constraint: Expression): GraphPatternBuilder;
  /**
   * Adds values clause for a variable
   *
   * @param variable - The variable of the values clause
   * @param values - The values that the variable can acquire
   */
  values(variable: Variable, values: DataBlockValue[]): GraphPatternBuilder;
  /**
   * Adds graph clause
   *
   * @param graph - NamedNode or variable of the graph
   * @param children - child patterns of the graph clause
   */
  graph(
    graph: Variable | NamedNode,
    children: GraphPattern[],
  ): GraphPatternBuilder;
  // optional(children: GraphPattern[]): GraphPatternBuilder
  // union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilder
  // bind(expression: Expression, variable: Variable): GraphPatternBuilder
  /**
   * Builds the graph pattern.
   * Returns array of patterns
   */
  build(): GraphPattern[];
}

class GraphPatternBuilderImpl implements GraphPatternBuilder {
  patterns: GraphPattern[];
  constructor(patterns: GraphPattern[] = []) {
    this.patterns = patterns;
  }
  triple(
    subject: Term,
    predicate: NamedNode | Variable,
    object: Term,
  ): GraphPatternBuilderImpl {
    this.patterns.push(
      QueryNodeFactory.triplePattern(subject, predicate, object),
    );
    return this;
  }
  filter(constraint: Expression): GraphPatternBuilderImpl {
    this.patterns.push(QueryNodeFactory.filter(constraint));
    return this;
  }
  values(
    variable: Variable,
    values: DataBlockValue[],
  ): GraphPatternBuilderImpl {
    this.patterns.push(QueryNodeFactory.values(variable, values));
    return this;
  }
  graph(
    graph: Variable | NamedNode,
    children: GraphPattern[] = [],
  ): GraphPatternBuilderImpl {
    this.patterns.push(QueryNodeFactory.graph(graph, children));
    return this;
  }
  // bind(expression: Expression, variable: Variable): GraphPatternBuilderImpl {
  //     this.patterns.push(QueryNodeFactory.bind(expression, variable))
  //     return this
  // }
  // optional(children: GraphPattern[] = []): GraphPatternBuilderImpl {
  //     this.patterns.push(QueryNodeFactory.optional(children))
  //     return this
  // }
  // union(left: GraphPattern[], right: GraphPattern[]): GraphPatternBuilderImpl {
  //     this.patterns.push(QueryNodeFactory.union(left, right))
  //     return this
  // }

  build(): GraphPattern[] {
    return this.patterns;
  }
}

/**
 * Returns implementation of GraphPatternBuilder
 *
 * @param patterns - Initial patterns
 * @returns implementation of GraphPatternBuilder
 * @see graphPatternBuilder
 */
function graphPatternBuilder(
  patterns: GraphPattern[] = [],
): GraphPatternBuilderImpl {
  return new GraphPatternBuilderImpl(patterns);
}

export type { GraphPatternBuilder };
export { graphPatternBuilder };
