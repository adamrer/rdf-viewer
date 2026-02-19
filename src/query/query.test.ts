import { expect, test } from "vitest";
import {
  BuiltInCall,
  Filter,
  Graph,
  Select,
  Where,
} from "./query-interfaces";
import QueryNodeFactory from "./query-node-factory"
import {
  or,
  isIri,
  isBlank,
  langEquality,
} from "./query-functions";
import { DataFactory } from "n3";
import { NO_LANG_SPECIFIED } from "./query-interfaces";

test("creates select with empty where", () => {
  const select: Select = QueryNodeFactory.select(
    [DataFactory.variable("title"), DataFactory.variable("author")],
    true,
    QueryNodeFactory.where(),
  );
  expect(select.toSparql()).toBe(`SELECT DISTINCT ?title ?author
WHERE {

}`);
});

test("creates select", () => {
  // const bind: Bind = QueryNodeFactory.bind(lt(DataFactory.variable('num'), 3), DataFactory.variable('variable'))
  const filter: Filter = QueryNodeFactory.filter(
    or(
      isIri(DataFactory.variable("object")),
      isBlank(DataFactory.variable("object")),
    ),
  );

  const graph: Graph = QueryNodeFactory.graph(DataFactory.variable("graph"), [
    QueryNodeFactory.filter(
      or(
        isIri(DataFactory.variable("object")),
        isBlank(DataFactory.variable("object")),
      ),
    ),
    QueryNodeFactory.triplePattern(
      DataFactory.blankNode("b1"),
      DataFactory.namedNode("http://purl.org/dc/terms/title"),
      DataFactory.variable("title"),
    ),
  ]);
  const where: Where = QueryNodeFactory.where([
    // bind,
    graph,
    filter,
    QueryNodeFactory.triplePattern(
      DataFactory.blankNode("b2"),
      DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
      DataFactory.variable("label"),
    ),
  ]);

  const select: Select = QueryNodeFactory.select(
    [DataFactory.variable("title")],
    true,
    where,
  )
    .setLimit(10)
    .setOffset(10);
  const sparqlQuery: string = select.toSparql();

  expect(sparqlQuery).toBe(`SELECT DISTINCT ?title
WHERE {
GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object))
_:b1 <http://purl.org/dc/terms/title> ?title .
}
FILTER (isIRI(?object) || isBLANK(?object))
_:b2 <http://www.w3.org/2004/02/skos/core#prefLabel> ?label .
}
LIMIT 10
OFFSET 10`);
});

test("creates where", () => {
  const where: Where = QueryNodeFactory.where([
    QueryNodeFactory.triplePattern(
      DataFactory.blankNode("b1"),
      DataFactory.namedNode("http://purl.org/dc/terms/title"),
      DataFactory.variable("title"),
    ),
  ]);
  expect(where.toSparql()).toBe(`WHERE {
_:b1 <http://purl.org/dc/terms/title> ?title .
}`);
});

/*
test('creates bind', () => {
    const bind: Bind = QueryNodeFactory.bind(lt(DataFactory.variable('num'), 3), DataFactory.variable('variable'))
    
    expect(bind.toSparql()).toBe(`BIND ( ?num < 3 AS ?variable )`)
})
*/

test("creates built-in call", () => {
  const builtInCall: BuiltInCall = isBlank(DataFactory.variable("variable"));
  expect(builtInCall.toSparql()).toBe(`isBLANK(?variable)`);
});

/*
test('creates filter with IN', () => {
    const filter: Filter = QueryNodeFactory.filter(inExpr(DataFactory.variable('variable'),QueryNodeFactory.expressionList(['hola', 3, DataFactory.literal('Joe', 'en')])))
    expect(filter.toSparql()).toBe(`FILTER (?variable IN (hola, 3, "Joe"@en))`)
})
*/

test("creates filter", () => {
  const filter: Filter = QueryNodeFactory.filter(
    or(
      isIri(DataFactory.variable("object")),
      isBlank(DataFactory.variable("object")),
    ),
  );
  expect(filter.toSparql()).toBe(`FILTER (isIRI(?object) || isBLANK(?object))`);
});

/*
test('creates union', () => {
    const union: Union = QueryNodeFactory.union(
        [QueryNodeFactory.triplePattern(DataFactory.blankNode('b1'), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))], 
        [QueryNodeFactory.triplePattern(DataFactory.blankNode('b2'), DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), DataFactory.variable("label"))])
    expect(union.toSparql()).toBe(`{
_:b1 <http://purl.org/dc/terms/title> ?title .
}
UNION
{
_:b2 <http://www.w3.org/2004/02/skos/core#prefLabel> ?label .
}`)
})

test('creates optional', () => {
    const optional: Optional = QueryNodeFactory.optional([QueryNodeFactory.triplePattern(DataFactory.blankNode('b1'), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))])
    expect(optional.toSparql()).toBe(`OPTIONAL {
_:b1 <http://purl.org/dc/terms/title> ?title .
}`)
})
*/

test("creates graph block", () => {
  const graph: Graph = QueryNodeFactory.graph(DataFactory.variable("graph"), [
    QueryNodeFactory.filter(
      or(
        isIri(DataFactory.variable("object")),
        isBlank(DataFactory.variable("object")),
      ),
    ),
    QueryNodeFactory.triplePattern(
      DataFactory.blankNode("b1"),
      DataFactory.namedNode("http://purl.org/dc/terms/title"),
      DataFactory.variable("title"),
    ),
  ]);
  expect(graph.toSparql()).toBe(`GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object))
_:b1 <http://purl.org/dc/terms/title> ?title .
}`);
});

test("evaluates isIri on literal", () => {
  const result = isIri(DataFactory.variable("object")).evaluate({
    object: DataFactory.literal("literal"),
  });
  expect(result).toBe(false);
});

test("evaluates isIri on named node", () => {
  const result = isIri(DataFactory.variable("object")).evaluate({
    object: DataFactory.namedNode("http://example.org"),
  });
  expect(result).toBe(true);
});

test("evaluates truthful langEquality on literal", () => {
  const literal = DataFactory.literal("číslo", "cs");
  const result = langEquality(DataFactory.variable("object"), "cs").evaluate({
    object: literal,
  });
  expect(result).toBe(true);
});

test("evaluates false langEquality on literal", () => {
  const literal = DataFactory.literal("number", "en");
  const result = langEquality(DataFactory.variable("object"), "cs").evaluate({
    object: literal,
  });
  expect(result).toBe(false);
});

test("evaluates tree with ORs (should be true)", () => {
  const literal = DataFactory.literal("číslo", "cs");
  const variable = DataFactory.variable("object");
  const constraint = or(
    langEquality(variable, "cs"),
    or(
      or(langEquality(variable, "en"), langEquality(variable, "es")),
      langEquality(variable, NO_LANG_SPECIFIED),
    ),
  );
  expect(constraint.evaluate({ object: literal })).toBe(true);
});

test("evaluates tree with ORs (should be false)", () => {
  const literal = DataFactory.literal("nombre", "fr");
  const variable = DataFactory.variable("object");
  const constraint = or(
    langEquality(variable, "cs"),
    or(
      or(langEquality(variable, "en"), langEquality(variable, "es")),
      langEquality(variable, NO_LANG_SPECIFIED),
    ),
  );
  expect(constraint.evaluate({ object: literal })).toBe(false);
});

test("evaluates tree with ORs with more variables (should be true)", () => {
  const labelLiteral = DataFactory.literal("štítek", "cs");
  const titleLiteral = DataFactory.literal("titre", "fr");
  const labelVariable = DataFactory.variable("label");
  const titleVariable = DataFactory.variable("title");
  const constraint = or(
    langEquality(labelVariable, "cs"),
    or(
      or(langEquality(titleVariable, "en"), langEquality(labelVariable, "es")),
      langEquality(labelVariable, NO_LANG_SPECIFIED),
    ),
  );
  expect(
    constraint.evaluate({
      [labelVariable.value]: labelLiteral,
      [titleVariable.value]: titleLiteral,
    }),
  ).toBe(true);
});

test("evaluates tree with ORs with more variables (should be false)", () => {
  const labelLiteral = DataFactory.literal("étiquette", "fr");
  const titleLiteral = DataFactory.literal("titolo", "it");
  const labelVariable = DataFactory.variable("label");
  const titleVariable = DataFactory.variable("title");
  const constraint = or(
    langEquality(labelVariable, "cs"),
    or(
      or(langEquality(titleVariable, "en"), langEquality(labelVariable, "es")),
      langEquality(labelVariable, NO_LANG_SPECIFIED),
    ),
  );
  expect(
    constraint.evaluate({
      [labelVariable.value]: labelLiteral,
      [titleVariable.value]: titleLiteral,
    }),
  ).toBe(false);
});

test("tries to evaluate OR tree with missing variable substitution", () => {
  const labelLiteral = DataFactory.literal("étiquette", "fr");
  const labelVariable = DataFactory.variable("label");
  const titleVariable = DataFactory.variable("title");
  const constraint = or(
    langEquality(labelVariable, "cs"),
    or(
      or(langEquality(titleVariable, "en"), langEquality(labelVariable, "es")),
      langEquality(labelVariable, NO_LANG_SPECIFIED),
    ),
  );
  // expect(constraint.variables).toStrictEqual(new Set([labelVariable, titleVariable]))
  const result = () =>
    constraint.evaluate({ [labelVariable.value]: labelLiteral });
  expect(result).toThrow(Error);
});

test("evaluates the langEquality with NO_LANG_SPECIFIED", () => {
  const literal = DataFactory.literal("nombre", "fr");
  const variable = DataFactory.variable("object");
  const result = langEquality(variable, NO_LANG_SPECIFIED).evaluate({
    object: literal,
  });
  expect(result).toBe(false);
});

test("evaluates values for value that is part of the values", () => {
  const variable = DataFactory.variable("subject");
  const values = QueryNodeFactory.values(variable, [
    DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#example"),
    DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#hiddenLabel"),
    DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
  ]);

  const prefLabel = DataFactory.namedNode(
    "http://www.w3.org/2004/02/skos/core#prefLabel",
  );
  expect(values.evaluate(prefLabel)).toBe(true);
});

test("evaluates values for value that is NOT part of the values", () => {
  const variable = DataFactory.variable("subject");
  const values = QueryNodeFactory.values(variable, [
    DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#example"),
    DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#hiddenLabel"),
    DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
  ]);

  const prefLabel = DataFactory.namedNode(
    "http://www.w3.org/2004/02/skos/core#related",
  );
  expect(values.evaluate(prefLabel)).toBe(false);
});
