/* eslint-disable @typescript-eslint/no-explicit-any */
import N3, {
  BlankNode,
  DataFactory,
  DefaultGraph,
  Literal,
  NamedNode,
  Quad,
  Term,
  Variable,
} from "n3";
import {
  ANY_LANGUAGE,
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
  Language,
  NO_LANG_SPECIFIED,
  Operator,
  OperatorExpression,
  Optional,
  Select,
  SelectVariables,
  Substitution,
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

class SelectImpl implements Select {
  type = "select" as const;
  variables: SelectVariables;
  distinct: boolean;
  where: Where;
  limit?: number;
  offset?: number;

  constructor(
    variables: SelectVariables,
    distinct: boolean = true,
    where?: Where,
    limit?: number,
    offset?: number,
  ) {
    this.where = where ? where : new WhereImpl();
    this.distinct = distinct;
    this.variables = variables;
    this.limit = limit;
    this.offset = offset;
  }
  setLimit(value: number): SelectImpl {
    this.limit = value;
    return this;
  }
  setOffset(value: number): SelectImpl {
    this.offset = value;
    return this;
  }
  setWhere(where: Where): SelectImpl {
    this.where = where;
    return this;
  }
  addVariables(variables: Variable[]): SelectImpl {
    if (variables.length) {
      // it is not AllSelector, it is an array
      (this.variables as Variable[]).push(...variables);
    } else {
      this.variables = variables;
    }
    return this;
  }
  toSparql(): string {
    const header = `SELECT ${this.distinct ? "DISTINCT " : ""}${isAllSelector(this.variables) ? this.variables : (this.variables as Variable[]).map((variable) => toNT(variable)).join(" ")}`;

    const limit = this.limit ? `LIMIT ${this.limit}` : "";
    const offset = this.offset ? `OFFSET ${this.offset}` : "";
    const footerArray: string[] | null = [];
    if (this.limit) {
      footerArray.push(limit);
    }
    if (this.offset) {
      footerArray.push(offset);
    }
    const footerString =
      footerArray.length == 0 ? null : footerArray.join("\n");

    const result = [header];
    if (this.where) {
      result.push(this.where.toSparql());
    }
    if (footerString) {
      result.push(footerString);
    }

    return result.join("\n");
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

// Built-in calls

// return true if 'value' has a language tag
const lang = (variable: Variable) =>
  new BuiltInCallImpl(
    "LANG",
    (variablesSubstitution: Substitution) => {
      const value = variablesSubstitution[variable.value];
      return (
        N3.Util.isLiteral(value) &&
        (value as Literal).language !== NO_LANG_SPECIFIED
      );
    },
    variable,
  );
const isIri = (variable: Variable) =>
  new BuiltInCallImpl(
    "isIRI",
    (variablesSubstitution: Substitution) =>
      N3.Util.isNamedNode(variablesSubstitution[variable.value]),
    variable,
  );
const isUri = (variable: Variable) =>
  new BuiltInCallImpl(
    "isURI",
    (variablesSubstitution: Substitution) =>
      N3.Util.isNamedNode(variablesSubstitution[variable.value]),
    variable,
  );
const isBlank = (variable: Variable) =>
  new BuiltInCallImpl(
    "isBLANK",
    (variablesSubstitution: Substitution) =>
      N3.Util.isBlankNode(variablesSubstitution[variable.value]),
    variable,
  );
const isLiteral = (variable: Variable) =>
  new BuiltInCallImpl(
    "isLITERAL",
    (variablesSubstitution: Substitution) =>
      N3.Util.isLiteral(variablesSubstitution[variable.value]),
    variable,
  );
const isNumeric = (variable: Variable) =>
  new BuiltInCallImpl(
    "isNUMERIC",
    (variablesSubstitution: Substitution) => {
      if (typeof variablesSubstitution[variable.value] === "number")
        return true;
      return false;
    },
    variable,
  );
// TODO: langMatches to match all languages
const langMatches = (
  variable: Variable,
  language: Language | typeof ANY_LANGUAGE,
) =>
  new BuiltInCallImpl(
    "langMatches",
    (variablesSubstitution: Substitution) => {
      if (!N3.Util.isLiteral(variablesSubstitution[variable.value])) {
        return false;
      }
      if (language === ANY_LANGUAGE) {
        return true;
      }
      return (
        (
          variablesSubstitution[variable.value] as Literal
        ).language.toLocaleLowerCase() === language.toLocaleLowerCase()
      );
    },
    variable,
    language,
  );

// Operator expressions
const or = (
  firstArg: BuiltInCall | OperatorExpression,
  secondArg: BuiltInCall | OperatorExpression,
) =>
  new OperatorExpressionImpl(
    "||",
    [firstArg, secondArg],
    (variablesSubstitution: Substitution) => {
      const firstValue = firstArg.evaluate(variablesSubstitution);
      const secondValue = secondArg.evaluate(variablesSubstitution);
      return firstValue || secondValue;
    },
  );
const langEquality = (variable: Variable, language: Language) =>
  new OperatorExpressionImpl(
    "=",
    [lang(variable), DataFactory.literal(language)],
    (variablesSubstitution: Substitution) => {
      const value = variablesSubstitution[variable.value];
      if (!N3.Util.isLiteral(value) && language !== NO_LANG_SPECIFIED) {
        return false;
      }
      if (language === NO_LANG_SPECIFIED && !N3.Util.isLiteral(value)) {
        return true;
      }

      const literal = value as Literal;
      return literal.language.toLowerCase() === language.toLowerCase();
    },
  );

const QueryNodeFactory: QueryNodeFactory = new QueryNodeFactoryImpl();

export default QueryNodeFactory;
export {
  or,
  langEquality,
  isIri,
  isUri,
  isBlank,
  isLiteral,
  isNumeric,
  langMatches,
};
