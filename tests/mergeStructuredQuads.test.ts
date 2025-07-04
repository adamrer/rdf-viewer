import {
  Fetcher,
  mergeStructuredQuads,
  SparqlDataSource,
} from "../src/fetch-quads";
import { test, expect } from "vitest";
const dcterms = "http://purl.org/dc/terms/";
const dcat = "http://www.w3.org/ns/dcat#";
const foaf = "http://xmlns.com/foaf/0.1/";

test("merge structured quads", async () => {
  const fetcher: Fetcher = new Fetcher([
    new SparqlDataSource("https://data.gov.cz/sparql"),
  ]);
  const datasetIri =
    "https://data.gov.cz/zdroj/datové-sady/00064459/c34f5a6baaa387d2e10695fb46e4bb48";
  const datasetQuery = fetcher
    .builder()
    .subjects([datasetIri])
    .predicates([
      foaf + "page",
      dcat + "theme",
      dcat + "keyword",
      dcterms + "publisher",
      dcat + "distribution",
    ])
    .objects()
    .build();
  const datasetQuads = await fetcher.fetchStructuredQuads(datasetQuery);
  const distributionIri = Object.values(
    datasetQuads[datasetIri][dcat + "distribution"],
  )[0].term.value;
  const distributionQuery = fetcher
    .builder()
    .subjects([distributionIri])
    .predicates([dcat + "downloadURL", dcterms + "format"])
    .objects()
    .build();
  const distributionQuads =
    await fetcher.fetchStructuredQuads(distributionQuery);
  const result = mergeStructuredQuads(datasetQuads, distributionQuads);
  expect(Object.values(result).length).toBe(2);
});
