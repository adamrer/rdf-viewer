import { expect, test } from "vitest";

import { queryBuilder } from "../src/query-builder";
import { Select } from "../src/query-interfaces";
import { NO_LANG_SPECIFIED } from "../src/query-interfaces";

test("creates basic SPOG query", () => {
  const builder = queryBuilder();
  const query = builder.graphs().subjects().predicates().objects().build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
GRAPH ?graph {
?subject ?predicate ?object .
}
}`);
});

test("creates basic SPO query", () => {
  const builder = queryBuilder();
  const query = builder.subjects().predicates().objects().build();
  expect((query as Select).variables.length).toBe(3);
  expect(query.toSparql()).toBe(`SELECT DISTINCT ?subject ?predicate ?object
WHERE {
?subject ?predicate ?object .
}`);
});

test("creates query with specified predicates", () => {
  const builder = queryBuilder();
  const predicates = [
    "http://purl.org/dc/terms/title",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
  ];
  const query = builder.subjects().predicates(predicates).objects().build();
  expect(query.toSparql()).toBe(`SELECT DISTINCT ?subject ?predicate ?object
WHERE {
VALUES ?predicate { <http://purl.org/dc/terms/title> <http://www.w3.org/2004/02/skos/core#prefLabel> }
?subject ?predicate ?object .
}`);
});

test("creates query with specified objects", () => {
  const builder = queryBuilder();
  const objects = [
    { value: "Adam" },
    "https://example.com/ns/#adam",
    {
      value: "1",
      languageOrDatatype: "http://www.w3.org/TR/xmlschema-2/#integer",
    },
    { value: "číslo", languageOrDatatype: "cs" },
  ];
  const query = builder.subjects().predicates().objects(objects).build();
  expect(query.toSparql()).toBe(`SELECT DISTINCT ?subject ?predicate ?object
WHERE {
VALUES ?object { "Adam" <https://example.com/ns/#adam> "1"^^<http://www.w3.org/TR/xmlschema-2/#integer> "číslo"@cs }
?subject ?predicate ?object .
}`);
});

test("creates query with specified subject", () => {
  const builder = queryBuilder();
  const subjectIri =
    "https://monitor.statnipokladna.gov.cz/api/opendata/monitor/Priloha-konsolidace/2019_12_Data_CSUIS_PRIL_KONS";
  const query = builder.subjects([subjectIri]).predicates().objects().build();
  expect((query as Select).variables.length).toBe(3);
  expect(query.toSparql()).toBe(`SELECT DISTINCT ?subject ?predicate ?object
WHERE {
VALUES ?subject { <${subjectIri}> }
?subject ?predicate ?object .
}`);
});

test("creates query with specified graph", () => {
  const builder = queryBuilder();
  const graphIri = "http://www.openlinksw.com/schemas/virtrdf#";
  const query = builder
    .graphs([graphIri])
    .subjects()
    .predicates()
    .objects()
    .build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
VALUES ?graph { <${graphIri}> }
GRAPH ?graph {
?subject ?predicate ?object .
}
}`);
});

test("creates query with specified graph, subject, predicate, object", () => {
  const builder = queryBuilder();
  const graph = ["http://www.openlinksw.com/schemas/virtrdf#"];
  const subject = [
    "https://monitor.statnipokladna.gov.cz/api/opendata/monitor/Priloha-konsolidace/2019_12_Data_CSUIS_PRIL_KONS",
  ];
  const predicates = [
    "http://purl.org/dc/terms/title",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
  ];
  const objects = [
    { value: "Adam" },
    "https://example.com/ns/#adam",
    {
      value: "1",
      languageOrDatatype: "http://www.w3.org/TR/xmlschema-2/#integer",
    },
    { value: "číslo", languageOrDatatype: "cs" },
  ];
  const query = builder
    .graphs(graph)
    .subjects(subject)
    .predicates(predicates)
    .objects(objects)
    .build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
VALUES ?graph { <${graph[0]}> }
GRAPH ?graph {
VALUES ?subject { <${subject[0]}> }
VALUES ?predicate { ${predicates.map((predicate) => `<${predicate}>`).join(" ")} }
VALUES ?object { "Adam" <https://example.com/ns/#adam> "1"^^<http://www.w3.org/TR/xmlschema-2/#integer> "číslo"@cs }
?subject ?predicate ?object .
}
}`);
});

test("creates query with limit and offset specified", () => {
  const builder = queryBuilder();
  const query = builder
    .graphs()
    .subjects()
    .predicates()
    .objects()
    .limit(10)
    .offset(9)
    .build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
GRAPH ?graph {
?subject ?predicate ?object .
}
}
LIMIT 10
OFFSET 9`);
});

test("creates query with language specified", () => {
  const builder = queryBuilder();
  const query = builder
    .graphs()
    .subjects()
    .predicates()
    .objects()
    .langs(["cs"])
    .build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object) || LANG(?object) = "cs")
?subject ?predicate ?object .
}
}`);
});

test("creates query with more languages specified", () => {
  const builder = queryBuilder();
  const query = builder
    .graphs()
    .subjects()
    .predicates()
    .objects()
    .langs(["cs", "en", NO_LANG_SPECIFIED])
    .build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object) || LANG(?object) = "cs" || LANG(?object) = "en" || LANG(?object) = "")
?subject ?predicate ?object .
}
}`);
});

test("creates query with everything specified", () => {
  const builder = queryBuilder();
  const graph = ["http://www.openlinksw.com/schemas/virtrdf#"];
  const subject = [
    "https://monitor.statnipokladna.gov.cz/api/opendata/monitor/Priloha-konsolidace/2019_12_Data_CSUIS_PRIL_KONS",
  ];
  const predicates = [
    "http://purl.org/dc/terms/title",
    "http://www.w3.org/2004/02/skos/core#prefLabel",
  ];
  const objects = [
    { value: "Adam" },
    "https://example.com/ns/#adam",
    {
      value: "1",
      languageOrDatatype: "http://www.w3.org/TR/xmlschema-2/#integer",
    },
    { value: "číslo", languageOrDatatype: "cs" },
  ];
  const query = builder
    .graphs(graph)
    .subjects(subject)
    .predicates(predicates)
    .objects(objects)
    .limit(10)
    .offset(9)
    .langs(["cs"])
    .build();
  expect((query as Select).variables.length).toBe(4);
  expect(query.toSparql())
    .toBe(`SELECT DISTINCT ?subject ?predicate ?object ?graph
WHERE {
VALUES ?graph { <${graph[0]}> }
GRAPH ?graph {
VALUES ?subject { <${subject[0]}> }
VALUES ?predicate { ${predicates.map((predicate) => `<${predicate}>`).join(" ")} }
VALUES ?object { "Adam" <https://example.com/ns/#adam> "1"^^<http://www.w3.org/TR/xmlschema-2/#integer> "číslo"@cs }
FILTER (isIRI(?object) || isBLANK(?object) || LANG(?object) = "cs")
?subject ?predicate ?object .
}
}
LIMIT 10
OFFSET 9`);
});
