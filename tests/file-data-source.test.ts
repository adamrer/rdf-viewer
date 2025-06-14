import { expect, test } from "vitest";
import { Fetcher, FileDataSource } from "../src/fetch-quads";
import { SimpleQueryStepBuilder, simpleQueryStepBuilder } from "../src/simple-query-step-builder";


test('fetch label for skos:prefLabel', async () => {
    const fds = new FileDataSource('https://www.w3.org/2009/08/skos-reference/skos.rdf')

    const builder = simpleQueryStepBuilder()
    const query = builder.subjects(['http://www.w3.org/2004/02/skos/core#prefLabel']).predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().build()
    const result = await fds.fetchQuads(query)
    expect(fds.quads?.length).toBeGreaterThan(0)
    expect(result.quads[0].object.value).toBe('preferred label')
})

test('fetch label for dcterms:publisher', async () => {
    const fds = new FileDataSource('https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl')

    const builder = simpleQueryStepBuilder()
    const query = builder
    .subjects(['http://purl.org/dc/terms/publisher'])
    .predicates(['http://www.w3.org/2000/01/rdf-schema#label', 'http://purl.org/dc/terms/title'])
    .objects()
    .langs(['en', ''])
    .build()
    const result = await fds.fetchQuads(query)
    expect(fds.quads?.length).toBeGreaterThan(0)
    expect(result.quads[0].object.value).toBe('Publisher')
})


test('fetch label for dcterms:title', async () => {

    const fds = new FileDataSource('https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl')
    const fetcher = new Fetcher([fds])
    const builder = fetcher.builder('step') as SimpleQueryStepBuilder
    const query = builder
    .subjects(['http://purl.org/dc/terms/title'])
    .predicates(['http://www.w3.org/2000/01/rdf-schema#label', 'http://purl.org/dc/terms/title'])
    .objects()
    .langs(['en'])
    .build()
    const result = await fetcher.fetchQuads(query)
    
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].quads.length).toBeGreaterThan(0)
    expect(result[0].quads[0].object.value).toBe('Title')
})
