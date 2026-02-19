import { DataFactory, Quad } from "n3";
import { DataSource, DataSourceType, Sourced } from "../src/fetch/data-source";
import { createDataContext, createSetupContext } from "../src/display";
import { test, expect } from "vitest";
import { Query } from "../src/query/query";
import { queryProcessor } from "../src/query/query-processor";

const typePredicate = decodeURIComponent("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
const datasetType = "https://www.w3.org/ns/dcat#Dataset"
const classType = "http://www.w3.org/2000/01/rdf-schema#"

class MockDataSource implements DataSource {
    type = DataSourceType.Sparql
    identifier = "https://example.com/sparql"

    private dataset1Iri = "https://example.com/datasets/Dataset1"
    private quads: Quad[] = [
            DataFactory.quad(
                DataFactory.namedNode(this.dataset1Iri),
                DataFactory.namedNode(typePredicate),
                DataFactory.namedNode(datasetType)
            ),
            DataFactory.quad(
                DataFactory.namedNode(this.dataset1Iri),
                DataFactory.namedNode(typePredicate),
                DataFactory.namedNode(classType)
            ),
            DataFactory.quad(
                DataFactory.namedNode(this.dataset1Iri),
                DataFactory.namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
                DataFactory.literal("Dataset 1")
            )
        ]
    async fetchQuads(query: Query): Promise<Array<Sourced<Quad>>> {
        const processor = queryProcessor()
        const filteredQuads = processor.filter(this.quads, query)
        const sourced: Array<Sourced<Quad>> = filteredQuads.map(quad => {
            return {
                value: quad,
                sources: [this.identifier]
            }
        })
        return sourced
    }
}


const  dataSources: DataSource[] = [
    new MockDataSource()
]
const dataset1Iri = "https://example.com/datasets/Dataset1"


test("fetch types by specifying type predicate", async () => {
    const context = createDataContext(dataSources, createSetupContext().vocabulary.getReadableVocabulary())
    const types = await context.fetch.predicates(dataset1Iri)
    expect(types).not.toBe([])
    expect(types).toContain(typePredicate)
    const typeIris = context.fetched.subject(dataset1Iri).predicate(typePredicate).map(object => object.value.value)
    expect(typeIris).toContain(datasetType)
    expect(typeIris).toContain(classType)
});

test("fetch types by types function", async () => {
    const context = createDataContext(dataSources, createSetupContext().vocabulary.getReadableVocabulary())
    const types = await context.fetch.types(dataset1Iri)
    expect(types).not.toBe([])
    expect(types.map(object => object.value.value)).toContain(datasetType)
})

test("fetching by query", async () => {
    const context = createDataContext(dataSources, createSetupContext().vocabulary.getReadableVocabulary())
    const builder = context.query.builder()
    const query = builder.subjects([dataset1Iri]).predicates([typePredicate]).objects().build()
    await context.query.execute(query)
    const typeIris = context.fetched.subject(dataset1Iri).predicate(typePredicate).map(object => object.value.value)
    expect(typeIris).toContain(datasetType)
    expect(typeIris).toContain(classType)

})