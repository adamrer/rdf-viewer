// inspired by sparql grammar https://www.w3.org/TR/sparql11-query/#sparqlGrammar

import toNT from "@rdfjs/to-ntriples";
import { Variable } from "n3";
import { GraphPatternClauseType, Where, WhereImpl } from "./graph-pattern";

/**
 * Interface inspired by SPARQL representing the query for querying quads on data sources
 */
interface Query extends Node {
  /**
   * Type of the query
   */
  type: QueryType;
  /**
   * Where clause
   */
  where: Where;
  /**
   * Serializes the query to SPARQL
   */
  toSparql(): string;
}

/**
 * Interface representing a node of a Query
 */
interface Node {
  /**
   * Type of the node
   */
  type: NodeType;
  /**
   * Serializes the node to SPARQL
   */
  toSparql(): string;
}

/**
 * Represents no language tag specified for a literal
 */
const NO_LANG_SPECIFIED = "";

const ANY_LANGUAGE = "*";

/**
 * Type representing a language tag of a literal
 */
type Language = typeof NO_LANG_SPECIFIED | string;

/**
 * Types of the Query
 */
type QueryType = "select"; // |'construct'|'ask'|'describe'
/**
 * Types of the Node
 */
type NodeType =
  | "select"
  | "triplePattern"
  | "operatorExpression"
  | "values"
  | "builtInCall"
  | "filter"
  | "expressionList"
  | "bind"
  | "union"
  | GraphPatternClauseType;

/**
 * Character for all selector in Query of a type Select
 */
type AllSelector = "*";

function isAllSelector(value: SelectVariables): boolean {
  return value === "*";
}

/**
 * Type for variables in Select
 */
type SelectVariables = Variable[] | AllSelector;
/**
 * Represents a Select Query
 */
interface Select extends Query {
  type: "select";
  where: Where;
  distinct: boolean;
  variables: SelectVariables;
  limit?: number;
  offset?: number;

  setLimit(value: number): Select;
  setOffset(value: number): Select;
  setWhere(where: Where): Select;
  addVariables(variables: Variable[]): Select;
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
  addVariables(variables: Variable[]): Select {
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

export type {
  Language,
  Node,
  QueryType,
  Query,
  Select,
  SelectVariables,
  AllSelector,
};

export { NO_LANG_SPECIFIED, ANY_LANGUAGE, SelectImpl, isAllSelector };
