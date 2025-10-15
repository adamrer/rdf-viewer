/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlankNode,
  DefaultGraph,
  Literal,
  NamedNode,
  Quad,
  Term,
  Variable,
} from "n3";
import {
  Bind,
  BuiltInCall,
  DataBlockValue,
  Expression,
  ExpressionList,
  Filter,
  Func,
  Graph,
  GraphPattern,
  GraphPatternClause,
  GraphPatternClauseType,
  Operator,
  OperatorExpression,
  Optional,
  SelectVariables,
  TriplePattern,
  Union,
  Values,
  Where,
} from "./query-interfaces";
import toNT from "@rdfjs/to-ntriples";

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

function isAllSelector(value: SelectVariables): boolean {
  return value === "*";
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

function expressionToString(arg: Expression): string {
  if (
    arg instanceof NamedNode ||
    arg instanceof Variable ||
    arg instanceof BlankNode ||
    arg instanceof Literal ||
    arg instanceof DefaultGraph
  ) {
    return toNT(arg);
  }
  const argType = typeof arg;
  if (argType === "string" || argType === "number") {
    return arg.toString();
  }
  return (arg as OperatorExpression | ExpressionList | BuiltInCall).toSparql();
}

function isOperatorExpression(object: any) {
  return object.type === "operatorExpression";
}

class OperatorExpressionImpl implements OperatorExpression {
  type = "operatorExpression" as const;
  operator: Operator;
  args: Expression[];
  variables: Set<Variable>;
  evaluation: (variablesSubstitution: { [key: string]: Term }) => boolean;

  constructor(
    operator: Operator,
    args: Expression[],
    evaluation: (variablesSubstitution: { [key: string]: Term }) => boolean,
  ) {
    this.operator = operator;
    this.args = args;
    this.evaluation = evaluation;
    this.variables = new Set();
    // get required variables
    args.forEach((expression) => {
      if (isBuiltInCall(expression)) {
        this.variables.add((expression as BuiltInCall).variable);
      } else if (isOperatorExpression(expression)) {
        (expression as OperatorExpression).variables.forEach((variable) => {
          this.variables.add(variable);
        });
      } else if (expression instanceof Variable) {
        this.variables.add(expression);
      }
    });
  }
  evaluate(variablesSubstitution: { [key: string]: Term }): boolean {
    this.variables.forEach((variable) => {
      if (!variablesSubstitution[variable.value]) {
        throw new Error(
          `Missing substitution for variable '${variable.value}'`,
        );
      }
    });

    return this.evaluation(variablesSubstitution);
  }
  toSparql(): string {
    if (this.args.length === 1) {
      return `${this.operator}(${expressionToString(this.args[0])})`;
    }
    if (this.args.length === 2) {
      return `${expressionToString(this.args[0])} ${this.operator} ${expressionToString(this.args[1])}`;
    }

    return "";
  }
}

function isBuiltInCall(object: any): boolean {
  return object.type === "builtInCall";
}

class BuiltInCallImpl implements BuiltInCall {
  type = "builtInCall" as const;
  func: Func;
  variable: Variable;
  option?: string;

  evaluation: (variablesSubstitution: { [key: string]: Term }) => boolean;

  constructor(
    func: Func,
    evaluation: (variablesSubstitution: { [key: string]: Term }) => boolean,
    variable: Variable,
    option?: string,
  ) {
    this.func = func;
    this.variable = variable;
    this.evaluation = evaluation;
    this.option = option;
  }
  evaluate(variablesSubstitution: { [key: string]: Term }): boolean {
    if (!variablesSubstitution[this.variable.value]) {
      throw new Error(
        `Missing substitution for variable '${this.variable.value}'`,
      );
    }

    return this.evaluation(variablesSubstitution);
  }
  toSparql(): string {
    const args = [expressionToString(this.variable)];
    if (this.option) {
      args.push(expressionToString(this.option));
    }
    return `${this.func}(${args.join(", ")})`;
  }
}

class WhereImpl extends GraphPatternClauseImpl implements Where {
  type = "where" as const;
  constructor(children: GraphPattern[] = []) {
    super("where", children);
  }
}

class ExpressionListImpl implements ExpressionList {
  type = "expressionList" as const;
  expressions: Expression[];

  constructor(expressions: Expression[]) {
    this.expressions = expressions;
  }

  toSparql(): string {
    return `(${this.expressions.map((expr) => expressionToString(expr)).join(", ")})`;
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
  OperatorExpressionImpl,
  BuiltInCallImpl,
  WhereImpl,
  ExpressionListImpl,
  isAllSelector
}