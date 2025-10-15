import { Variable } from "n3";
import { QueryType, Where, Node } from "./query-interfaces";
import toNT from "@rdfjs/to-ntriples";
import { isAllSelector, WhereImpl } from "./query-node-implementations";

/**
 * Interface inspired by SPARQL representing the query for querying quads on data sources
 */
interface Query {
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
 * Character for all selector in Query of a type Select
 */
type AllSelector = "*";

/**
 * Type for variables in Select
 */
type SelectVariables = Variable[] | AllSelector;
/**
 * Represents a Select Query
 */
interface Select extends Node, Query {
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

export {
    SelectImpl
}
export type {
    Select,
    Query
}