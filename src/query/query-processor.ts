import { Quad } from "n3";
import {
  Filter,
  Graph,
  Query,
  TriplePattern,
  Values,
  Node,
  Substitution,
  Select,
} from "./query-interfaces";

/**
 * Type of a function that evaluates a constraint with given variable substitution
 */
type ConstraintFunction = (variablesSubstitution: Substitution) => boolean;

/**
 * Gathered constraints from query for a quad to satisfy
 */
interface QuadsConstraints {
  valuesConstraints: ConstraintFunction[];
  filtersConstraints: ConstraintFunction[];
  subjectVar: string;
  predicateVar: string;
  objectVar: string;
  graphVar: string;
}
/**
 * Helper interface for building the QuadsConstraints
 * @see QuadsConstraints
 */
interface QuadsConstraintsHelper {
  valuesConstraints: ConstraintFunction[];
  filtersConstraints: ConstraintFunction[];
  subjectVar?: string;
  predicateVar?: string;
  objectVar?: string;
  graphVar?: string;
}
/**
 * Processes a Query instance and filters given quads according to the Query
 */
interface QueryProcessor {
  /**
   * Filters given quads based on the given query
   *
   * @param quads - quads to query on
   * @param query - the query to filter the quads
   */
  filter(quads: Quad[], query: Query): Quad[];
}
/**
 * Implementation of the QueryProcessor interface
 * @see QueryProcessor
 */
class QueryProcessorImpl implements QueryProcessor {
  /**
   * Processes query to QuadsConstraints for a simpler evaluation
   *
   * @param query - the query to be processed
   * @returns QuadsConstraints based on the query
   */
  processQuery(query: Query): QuadsConstraints {
    const constraints: QuadsConstraintsHelper = {
      valuesConstraints: [],
      filtersConstraints: [],
    };
    const stack: Node[] = [...query.where.children];
    while (stack.length !== 0) {
      const node = stack.pop();
      switch (node?.type) {
        case "triplePattern": {
          const triple = node as TriplePattern;
          constraints.subjectVar = triple.subject.value;
          constraints.predicateVar = triple.predicate.value;
          constraints.objectVar = triple.object.value;

          break;
        }
        case "values": {
          const values = node as Values;
          constraints.valuesConstraints.push(
            (variablesSubstitution: Substitution) =>
              values.evaluate(variablesSubstitution[values.variable.value]),
          );
          break;
        }
        case "filter": {
          const filter = node as Filter;
          constraints.filtersConstraints.push(
            (variablesSubstitution: Substitution) =>
              filter.constraint.evaluate(variablesSubstitution),
          );
          break;
        }
        case "graph": {
          const graph = node as Graph;
          constraints.graphVar = graph.graph.value;
          stack.push(...graph.children);
          break;
        }

        default:
          throw Error(`Node type ${node?.type} couldn't be processed`);
      }
    }
    return constraints as QuadsConstraints;
  }
  /**
   * Creates a function that will filter a quad based on the constraints
   *
   * @param constraints - constraints that a quad has to satisfy
   * @returns a function that will return true if it satisfies the constraints
   */
  predicateForQuads(constraints: QuadsConstraints): (quad: Quad) => boolean {
    return (quad: Quad): boolean => {
      const substitution = {
        [constraints.subjectVar]: quad.subject,
        [constraints.predicateVar]: quad.predicate,
        [constraints.objectVar]: quad.object,
        [constraints.graphVar]: quad.graph,
      };

      return (
        constraints.filtersConstraints.every((fn) => fn(substitution)) &&
        constraints.valuesConstraints.every((fn) => fn(substitution))
      );
    };
  }

  filter(quads: Quad[], query: Query): Quad[] {
    const constraints = this.processQuery(query);
    const quadMeetsQueryConstraints = this.predicateForQuads(constraints);
    const filteredQuads: Quad[] = quads.filter((quad) =>
      quadMeetsQueryConstraints(quad),
    );
    if (query.type === "select") {
      const select = query as Select;
      const limit = select.limit
        ? select.offset
          ? select.offset + select.limit
          : select.limit
        : undefined;
      return filteredQuads.slice(select.offset, limit);
    }

    return filteredQuads;
  }
}

/**
 *
 * @returns an implementation of the QueryProcessor
 * @see QueryProcessor
 */
function queryProcessor(): QueryProcessor {
  return new QueryProcessorImpl();
}

export { queryProcessor };
export type { QueryProcessor };
