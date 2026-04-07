import {
  Variable,
  Literal,
  DataFactory,
  Term,
  BlankNode,
  DefaultGraph,
  NamedNode,
} from "n3";
import { Node } from "./query";

import toNT from "@rdfjs/to-ntriples";
import { isLangMatches, lang } from "./query-functions-factories";

type UnaryFunc =
  | "STR"
  | "LANG"
  | "DATATYPE"
  | "BOUND"
  | "IRI"
  | "URI"
  | "BNODE"
  | "ABS"
  | "CEIL"
  | "FLOOR"
  | "ROUND"
  | "isIRI"
  | "isURI"
  | "isBLANK"
  | "isLITERAL"
  | "isNUMERIC"
  | "!";

type BinaryFunc = "langMatches";

type Func = UnaryFunc | BinaryFunc;

// BUILT-IN CALLS //

interface BuiltInCall extends Node {
  type: "builtInCall";
  func: Func;
  variable: Variable;

  evaluate(variablesSubstitution: Substitution): boolean;
}

/**
 * Variable substitution
 */
type Substitution = { [variableName: string]: Term };

// OPERATOR EXPRESSIONS //

interface ExpressionList extends Node {
  type: "expressionList";
  expressions: Expression[];
}

type ConditionalOperator = "||";
type RelationalOperator = "=" | "!=";
type Operator = ConditionalOperator | RelationalOperator;
type Expression =
  | OperatorExpression
  | Term
  | number
  | string
  | ExpressionList
  | BuiltInCall;

interface OperatorExpression extends Node {
  type: "operatorExpression";
  operator: Operator;
  args: Expression[];
  variables: Set<Variable>;
  evaluate(variablesSubstitution: Substitution): boolean;
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
    if (isLangMatches(this.func)) {
      const args = [expressionToString(lang(this.variable))];
      if (this.option) {
        args.push(expressionToString(DataFactory.literal(this.option)));
      }
      return `${this.func}(${args.join(", ")})`;
    }
    return `${this.func}(${expressionToString(this.variable)})`;
  }
}

function isOperatorExpression(object: any) {
  return object.type === "operatorExpression";
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

export {
  expressionToString,
  ExpressionListImpl,
  OperatorExpressionImpl,
  BuiltInCallImpl,
};
export type {
  Operator,
  Func,
  Substitution,
  Expression,
  ExpressionList,
  BinaryFunc,
  OperatorExpression,
  BuiltInCall,
};
