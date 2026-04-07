import { Literal, NamedNode, Quad, Term, Variable } from "n3";
import { Node, Select } from "./query";
import {
  Expression,
  BuiltInCall,
  OperatorExpression,
  expressionToString,
} from "./query-functions";
import toNT from "@rdfjs/to-ntriples";

/**
 * Types of graph patterns
 */
type GraphPattern =
  | GraphPatternClause
  | Graph
  | TriplePattern
  | Select
  | Union
  | Filter
  | Bind
  | Optional
  | Values;

/**
 * Types of the graph patterns
 */
type GraphPatternClauseType = "where" | "optional" | "graph";

// INTERFACES //

/**
 * Represents a graph pattern clause in a query
 */
interface GraphPatternClause extends Node {
  type: GraphPatternClauseType;
  children: GraphPattern[];
  keyword: string;
}

/**
 * Represents Graph clause in query.
 * Constraints quads to be in a named graph
 */
interface Graph extends GraphPatternClause {
  type: "graph";
  graph: NamedNode | Variable;
  children: GraphPattern[];
}

/**
 * Represents a Where clause of a SPARQL query.
 * Holds all the constraints of the query.
 */
interface Where extends GraphPatternClause {
  type: "where";
}

/**
 * Represents a triple pattern constraint in query
 */
interface TriplePattern extends Node {
  type: "triplePattern";
  subject: Term;
  predicate: NamedNode | Variable;
  object: Term;
}
type DataBlockValue = NamedNode | Literal;
/**
 * Represents Values clause in query.
 * Constraints a variable to acquire one of the specified values.
 */
interface Values extends Node {
  type: "values";
  values: DataBlockValue[];
  variable: Variable;
  evaluate(value: Term): boolean;
}
/**
 * Represents Bind in query.
 * Assigns a variable to an expression
 */
interface Bind extends Node {
  type: "bind";
  expression: Expression;
  variable: Variable;
}

interface Union extends Node {
  type: "union";
  leftChildren: GraphPattern[];
  rightChildren: GraphPattern[];
}

interface Optional extends GraphPatternClause {
  type: "optional";
}
/**
 * Represents Filter in query.
 * Constraints quads by BuiltInCall or OperatorExpression
 */
interface Filter extends Node {
  type: "filter";
  constraint: BuiltInCall | OperatorExpression;
}

// IMPLEMENTATIONS //

class TriplePatternImpl implements TriplePattern {
  type = "triplePattern" as const;
  subject: Term;
  predicate: NamedNode | Variable;
  object: Term;

  constructor(subject: Term, predicate: NamedNode | Variable, object: Term) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
  }

  toSparql(): string {
    const quad = new Quad(this.subject, this.predicate, this.object);
    return toNT(quad);
  }
}

abstract class GraphPatternClauseImpl implements GraphPatternClause {
  type: GraphPatternClauseType;
  children: GraphPattern[];
  keyword: string;

  constructor(keyword: GraphPatternClauseType, children: GraphPattern[] = []) {
    this.keyword = keyword.toLocaleUpperCase();
    this.type = keyword;
    this.children = children;
  }

  add(patterns: GraphPattern[]): GraphPatternClauseImpl {
    if (this.children) {
      this.children.push(...patterns);
    } else {
      this.children = patterns;
    }
    return this;
  }

  toSparql(): string {
    const header = `${this.keyword} {`;
    const children = this.children
      .map((pattern) => pattern.toSparql())
      .join("\n");
    const footer = "}";

    return [header, children, footer].join("\n");
  }
}

class UnionImpl implements Union {
  type = "union" as const;
  leftChildren: GraphPattern[];
  rightChildren: GraphPattern[];
  constructor(
    leftChildren: GraphPattern[] = [],
    rightChildren: GraphPattern[] = [],
  ) {
    this.leftChildren = leftChildren;
    this.rightChildren = rightChildren;
  }
  toSparql(): string {
    const left = `{
${this.leftChildren.map((pattern) => pattern.toSparql()).join("\n")}
}`;
    const right = `{
${this.rightChildren.map((pattern) => pattern.toSparql()).join("\n")}
}`;
    return [left, "UNION", right].join("\n");
  }
}

class ValuesImpl implements Values {
  type = "values" as const;
  values: DataBlockValue[];
  variable: Variable;
  constructor(variable: Variable, values: DataBlockValue[]) {
    this.values = values;
    this.variable = variable;
  }
  evaluate(value: Term): boolean {
    if (value.termType !== "Literal" && value.termType !== "NamedNode")
      return false;
    return this.values.some((item) => item.value === value.value);
  }

  toSparql(): string {
    return `VALUES ${toNT(this.variable)} { ${this.values.map((value) => expressionToString(value)).join(" ")} }`;
  }
}

class BindImpl implements Bind {
  type = "bind" as const;
  expression: Expression;
  variable: Variable;

  constructor(expression: Expression, variable: Variable) {
    this.expression = expression;
    this.variable = variable;
  }

  toSparql(): string {
    return `BIND ( ${expressionToString(this.expression)} AS ${toNT(this.variable)} )`;
  }
}

class OptionalImpl extends GraphPatternClauseImpl implements Optional {
  type = "optional" as const;
  constructor(children: GraphPattern[] = []) {
    super("optional", children);
  }
}

class FilterImpl implements Filter {
  type = "filter" as const;
  constraint: BuiltInCall | OperatorExpression;

  constructor(constraint: BuiltInCall | OperatorExpression) {
    this.constraint = constraint;
  }

  toSparql(): string {
    return `FILTER (${expressionToString(this.constraint)})`;
  }
}

class GraphImpl extends GraphPatternClauseImpl implements Graph {
  type = "graph" as const;
  graph: Variable | NamedNode;
  constructor(graph: Variable | NamedNode, children: GraphPattern[] = []) {
    super("graph", children);
    this.graph = graph;
  }
  override toSparql(): string {
    const header = `${this.keyword} ${toNT(this.graph)} {`;
    const children = this.children
      .map((pattern) => pattern.toSparql())
      .join("\n");
    const footer = "}";

    return [header, children, footer].join("\n");
  }
}

class WhereImpl extends GraphPatternClauseImpl implements Where {
  type = "where" as const;
  constructor(children: GraphPattern[] = []) {
    super("where", children);
  }
}

export {
  TriplePatternImpl,
  UnionImpl,
  ValuesImpl,
  BindImpl,
  OptionalImpl,
  FilterImpl,
  GraphImpl,
  WhereImpl,
};
export type {
  GraphPattern,
  GraphPatternClause,
  GraphPatternClauseType,
  Graph,
  Where,
  TriplePattern,
  Values,
  Bind,
  Optional,
  Filter,
  Union,
  DataBlockValue,
};
