import { expect, test } from "vitest";
import { FetcherImpl } from "../src/fetcher";
import { FileDataSource } from "../src/data-source-implementations";
import {
  QueryBuilder,
  queryBuilder,
} from "../src/query-builder";

test("fetch label for skos:prefLabel", async () => {
  const fds = new FileDataSource(
    "https://www.w3.org/2009/08/skos-reference/skos.rdf",
  );

  const builder = queryBuilder();
  const query = builder
    .subjects(["http://www.w3.org/2004/02/skos/core#prefLabel"])
    .predicates(["http://www.w3.org/2000/01/rdf-schema#label"])
    .objects()
    .build();
  const result = await fds.fetchQuads(query);
  expect(fds.quads?.length).toBeGreaterThan(0);
  expect(result[0].value.object.value).toBe("preferred label");
});

test("fetch label for dcterms:publisher", async () => {
  const fds = new FileDataSource(
    "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl",
  );

  const builder = queryBuilder();
  const query = builder
    .subjects(["http://purl.org/dc/terms/publisher"])
    .predicates([
      "http://www.w3.org/2000/01/rdf-schema#label",
      "http://purl.org/dc/terms/title",
    ])
    .objects()
    .langs(["en", ""])
    .build();
  const result = await fds.fetchQuads(query);
  expect(fds.quads?.length).toBeGreaterThan(0);
  expect(result[0].value.object.value).toBe("Publisher");
});

test("fetch label for dcterms:title", async () => {
  const fds = new FileDataSource(
    "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl",
  );
  const fetcher = new FetcherImpl([fds]);
  const builder = fetcher.builder() as QueryBuilder;
  const query = builder
    .subjects(["http://purl.org/dc/terms/title"])
    .predicates([
      "http://www.w3.org/2000/01/rdf-schema#label",
      "http://purl.org/dc/terms/title",
    ])
    .objects()
    .langs(["en"])
    .build();
  const result = await fetcher.fetchQuads(query);

  expect(result.length).toBeGreaterThan(0);
  expect(result[0].value.object.value).toBe("Title");
});

test("fetch label for dcat:theme", async () => {
  const fds = new FileDataSource("https://www.w3.org/ns/dcat3.ttl");
  const fetcher = new FetcherImpl([fds]);
  const builder = fetcher.builder() as QueryBuilder;
  const query = builder
    .subjects(["http://www.w3.org/ns/dcat#theme"])
    .predicates([
      "http://www.w3.org/2000/01/rdf-schema#label",
      "http://purl.org/dc/terms/title",
    ])
    .objects()
    .langs(["en"])
    .build();
  const result = await fetcher.fetchQuads(query);

  expect(result.length).toBeGreaterThan(0);
  expect(result[0].value.object.value).toBe("theme");
});
