import {
  fetcher,
  Fetcher,
  mergeStructuredQuads,
} from "../src/fetcher";
import { SparqlDataSource } from "../src/data-source-implementations";
import { test, expect } from "vitest";
const dcterms = "http://purl.org/dc/terms/";
const dcat = "http://www.w3.org/ns/dcat#";
const foaf = "http://xmlns.com/foaf/0.1/";

test("merge structured quads", async () => {
  const fetcherInstance: Fetcher = fetcher([
    new SparqlDataSource("https://data.gov.cz/sparql"),
  ]);
  const datasetIri =
    "https://data.gov.cz/zdroj/datové-sady/00064459/c34f5a6baaa387d2e10695fb46e4bb48";
  const datasetQuery = fetcherInstance
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
  const datasetQuads = await fetcherInstance.fetchStructuredQuads(datasetQuery);
  const distributionIri = Object.values(
    datasetQuads[datasetIri][dcat + "distribution"],
  )[0].value.value;
  const distributionQuery = fetcherInstance
    .builder()
    .subjects([distributionIri])
    .predicates([dcat + "downloadURL", dcterms + "format"])
    .objects()
    .build();
  const distributionQuads =
    await fetcherInstance.fetchStructuredQuads(distributionQuery);
  const result = mergeStructuredQuads(datasetQuads, distributionQuads);
  expect(Object.values(result).length).toBe(2);
});
