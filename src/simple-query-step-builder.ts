import { DataFactory, Literal, NamedNode, Variable } from "n3";
import { Query } from "./query/query-interfaces";
import { Select, Language, NO_LANG_SPECIFIED } from "./query/query-interfaces";
import QueryNodeFactory, {
  isBlank,
  isIri,
  or,
  langEquality,
} from "./query/query-implementations";
import {
  GraphPatternBuilder,
  graphPatternBuilder,
} from "./graph-pattern-builder";

/**
 * Interface for simple query step builder where you can specify
 * a subject you want to get quads of, then predicates you are
 * interested in and objects that it should have. Defined predicates
 * and objects are connected in logical OR. You can also specify the
 * graph at the beginning
 * Also it's the first step of the builder.
 *
 * graphs -> subjects -> predicates -> objects -> build
 */
interface SimpleQueryStepBuilder extends SubjectStep, GraphStepProvider {}

/**
 * Provides the ability to specify the graph for SimpleStepQueryBuilder
 *
 * @see SimpleQueryStepBuilder
 */
interface GraphStepProvider {
  /**
   * Defines graphs that will be in the result of the query
   *
   * @param iris - IRIs of the graphs that you want to search.
   * If not specified, then all graphs will be searched
   * except the default graph.
   * The specified IRIs are connected as in logical OR
   *
   * @see GraphStepProvider
   */
  graphs(iris?: string[]): SubjectStep;
}

/**
 * Second build step of the SimpleStepQueryBuilder for setting the subject
 *
 * @see SimpleQueryStepBuilder
 */
interface SubjectStep {
  /**
   * Defines subjects that will be in the result of the query
   *
   * @param iris - IRIs of the subjects that the quads should have.
   * If not specified, then all subjects will be retrieved.
   */
  subjects(iris?: string[]): PredicateStep;
}

/**
 * Third build step of the SimpleStepQueryBuilder for setting the first predicate
 *
 * @see SimpleQueryStepBuilder
 */
interface PredicateStep {
  /**
   * Defines predicates that will be in the result of the query
   *
   * @param iris - IRIs of the predicates that the quads should contain.
   * If not specified, then all predicates will be retrieved.
   * The specified IRIs are connected as in logical OR.
   */
  predicates(iris?: string[]): ObjectStep;
}
/**
 * Interface for caring information to create a literal
 */
interface LiteralCreationHelper {
  value: string;
  languageOrDatatype?: string;
}
/**
 * Fourth build step of the SimpleStepQueryBuilder for setting the first object and
 * additional predicates
 *
 * @see SimpleQueryStepBuilder
 */
interface ObjectStep {
  /**
   * Defines objects that will be in the result of the query.
   *
   * @param iris - IRIs of the predicates that the quads should contain.
   * If not specified, then all predicates will be retrieved.
   * The specified IRIs are connected as in logical OR.
   */
  objects(irisOrLiterals?: (string | LiteralCreationHelper)[]): FinalStep;
}

/**
 * Fifth and final build step of the SimpleStepQueryBuilder for setting solution for
 * the query like limit and offset. Also for building the query.
 *
 * @see SimpleQueryStepBuilder
 */
interface FinalStep {
  /**
   * Specifies the language tag that the object literals should have
   *
   * @param language - language tag that object literals should have
   */
  langs(languages: Language[]): FinalStep;

  /**
   * Sets the limit of returned quads
   *
   * @param value - the value for the limit
   */
  limit(value: number): FinalStep;
  /**
   * Sets the offset of the returned quads
   *
   * @param value - the value for the offset
   */
  offset(value: number): FinalStep;

  /**
   * Returns the Query object
   *
   * @see Query
   */
  build(): Query;
}

const NO_GRAPH = undefined;
const ALL_GRAPHS: readonly string[] = Object.freeze([]);
const ALL_SUBJECTS: readonly string[] = Object.freeze([]);
const ALL_PREDICATES: readonly string[] = Object.freeze([]);
const ALL_OBJECTS: readonly (string | LiteralCreationHelper)[] = Object.freeze(
  [],
);

/**
 * Interface for passing data from SubjectStep to PredicateStep
 */
interface SubjectBuildingHelper {
  graphPatternBuilder: GraphPatternBuilder;
  graphValues?: NamedNode[]; // undefined -> no graph clause, empty list -> all graphs, non-empty list -> only specified graphs
  subjectValues: NamedNode[];
  readonly graphVar: Variable;
  readonly subjectVar: Variable;
  readonly predicateVar: Variable;
  readonly objectVar: Variable;
}
/**
 * Interface for passing data from PredicateStep to ObjectStep
 */
interface PredicateBuildingHelper extends SubjectBuildingHelper {
  predicateValues: NamedNode[];
}
/**
 * Interface for passing data from ObjectStep to FinalStep
 */
interface ObjectBuildingHelper extends PredicateBuildingHelper {
  objectValues: (NamedNode | Literal)[];
}

/**
 * Implementation of the SubjectStep
 * @see SubjectStep
 */
class SubjectStepImpl implements SubjectStep {
  graphPatternBuilder: GraphPatternBuilder;
  graphValues?: NamedNode[];
  readonly graphVar: Variable = DataFactory.variable("graph");
  readonly subjectVar: Variable = DataFactory.variable("subject");
  readonly predicateVar: Variable = DataFactory.variable("predicate");
  readonly objectVar: Variable = DataFactory.variable("object");

  constructor(
    graphs?: NamedNode[],
    graphPatternBuilderArg?: GraphPatternBuilder,
  ) {
    this.graphPatternBuilder = graphPatternBuilderArg
      ? graphPatternBuilderArg
      : graphPatternBuilder();
    this.graphValues = graphs;
  }

  subjects(iris: readonly string[] = ALL_SUBJECTS): PredicateStep {
    const subjectValues = iris.map((iri) => DataFactory.namedNode(iri));
    if (iris !== ALL_SUBJECTS) {
      this.graphPatternBuilder.values(this.subjectVar, subjectValues);
    }
    return new PredicateStepImpl({
      subjectValues: subjectValues,
      graphPatternBuilder: this.graphPatternBuilder,
      graphValues: this.graphValues,
      graphVar: this.graphVar,
      subjectVar: this.subjectVar,
      predicateVar: this.predicateVar,
      objectVar: this.objectVar,
    });
  }
}
class SimpleStepQueryBuilderImpl
  extends SubjectStepImpl
  implements GraphStepProvider
{
  graphs(iris: readonly string[] = ALL_GRAPHS): SubjectStep {
    this.graphValues = iris.map((iri) => DataFactory.namedNode(iri));
    return new SubjectStepImpl(this.graphValues);
  }
}

class PredicateStepImpl implements PredicateStep {
  buildingHelper: SubjectBuildingHelper;

  constructor(buildingHelper: SubjectBuildingHelper) {
    this.buildingHelper = buildingHelper;
  }

  predicates(iris: readonly string[] = ALL_PREDICATES): ObjectStep {
    const predicateValues = iris.map((iri) => DataFactory.namedNode(iri));
    if (iris.length !== 0) {
      this.buildingHelper.graphPatternBuilder.values(
        this.buildingHelper.predicateVar,
        predicateValues,
      );
    }

    return new ObjectStepImpl({
      ...this.buildingHelper,
      predicateValues: predicateValues,
    });
  }
}

class ObjectStepImpl implements ObjectStep {
  buildingHelper: PredicateBuildingHelper;

  constructor(buildingHelper: PredicateBuildingHelper) {
    this.buildingHelper = buildingHelper;
  }
  objects(
    iris: readonly (string | LiteralCreationHelper)[] = ALL_OBJECTS,
  ): FinalStep {
    const objectValues = iris.map((item) =>
      typeof item === "string"
        ? DataFactory.namedNode(item)
        : DataFactory.literal(
            item.value,
            // if it includes ':' then it is not language and assume that it is a datatype
            item.languageOrDatatype?.includes(":")
              ? DataFactory.namedNode(item.languageOrDatatype)
              : item.languageOrDatatype,
          ),
    );
    if (iris.length !== 0) {
      this.buildingHelper.graphPatternBuilder.values(
        this.buildingHelper.objectVar,
        objectValues,
      );
    }

    return new FinalStepImpl({
      ...this.buildingHelper,
      objectValues: objectValues,
    });
  }
}

class FinalStepImpl implements FinalStep {
  buildingHelper: ObjectBuildingHelper;
  query: Select;

  constructor(buildingHelper: ObjectBuildingHelper) {
    this.buildingHelper = buildingHelper;
    this.query = QueryNodeFactory.select([
      this.buildingHelper.subjectVar,
      this.buildingHelper.predicateVar,
      this.buildingHelper.objectVar,
    ]);
  }
  langs(languages: Language[] = []): FinalStep {
    let languageConstraint =
      languages.length !== 0
        ? langEquality(this.buildingHelper.objectVar, languages[0])
        : langEquality(this.buildingHelper.objectVar, NO_LANG_SPECIFIED);
    if (languages.length > 1) {
      let i = 1;
      while (i < languages.length) {
        languageConstraint = or(
          languageConstraint,
          langEquality(this.buildingHelper.objectVar, languages[i]),
        );
        i++;
      }
    }
    this.buildingHelper.graphPatternBuilder.filter(
      or(
        isIri(this.buildingHelper.objectVar), // also show IRIs (they don't have language tags)
        or(
          isBlank(this.buildingHelper.objectVar), // same for blank nodes
          languageConstraint,
        ),
      ),
    );
    return this;
  }
  limit(value: number): FinalStep {
    this.query.setLimit(value);
    return this;
  }
  offset(value: number): FinalStep {
    this.query.setOffset(value);
    return this;
  }
  build(): Query {
    this.buildingHelper.graphPatternBuilder.triple(
      this.buildingHelper.subjectVar,
      this.buildingHelper.predicateVar,
      this.buildingHelper.objectVar,
    );
    // default graph
    if (this.buildingHelper.graphValues === NO_GRAPH) {
      this.query.setWhere(
        QueryNodeFactory.where(this.buildingHelper.graphPatternBuilder.build()),
      );
      return this.query;
    }
    const wherePatternBuilder = graphPatternBuilder();
    // specified graphs
    if (this.buildingHelper.graphValues.length !== 0) {
      wherePatternBuilder.values(
        this.buildingHelper.graphVar,
        this.buildingHelper.graphValues,
      );
    }
    this.query.addVariables([this.buildingHelper.graphVar]);
    wherePatternBuilder.graph(
      this.buildingHelper.graphVar,
      this.buildingHelper.graphPatternBuilder.build(),
    );
    this.query.setWhere(QueryNodeFactory.where(wherePatternBuilder.build()));
    return this.query;
  }
}

function simpleQueryStepBuilder(): SimpleQueryStepBuilder {
  return new SimpleStepQueryBuilderImpl();
}

export type { Query, Language, SimpleQueryStepBuilder };
export { NO_LANG_SPECIFIED, simpleQueryStepBuilder };
