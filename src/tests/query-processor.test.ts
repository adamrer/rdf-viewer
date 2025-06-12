import { expect, test } from "vitest";
import { queryProcessor } from "../query-processor";
import { simpleQueryStepBuilder } from "../simple-query-step-builder";
import { DataFactory, Quad } from "n3";


const quads: Quad[] = [
    DataFactory.quad(
        DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), 
        DataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), 
        DataFactory.literal('preferred label', 'en')),
    DataFactory.quad(
        DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#hiddenLabel'), 
        DataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), 
        DataFactory.literal('hidden label', 'en')),
    DataFactory.quad(
        DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#hiddenLabel'), 
        DataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), 
        DataFactory.literal('schovaný štítek', 'cs'))]

test('processes query with values that has the value', () => {
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects(['http://www.w3.org/2004/02/skos/core#prefLabel']).predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects(['preferred label']).build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    expect(resultQuads.length === 1).toBe(true)
    expect(resultQuads[0].subject.value).toBe('http://www.w3.org/2004/02/skos/core#prefLabel')
})

test('processes query with values that does not have the value', () => {
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects().predicates(['http://www.w3.org/2004/02/skos/core#relatedMatch']).objects().build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    expect(resultQuads.length).toBe(0)
})


test('processes query with filter to get empty result', () => {
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects(['http://www.w3.org/2004/02/skos/core#prefLabel']).predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().langs(['cs']).build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    expect(resultQuads.length).toBe(0)
})

test('processes query with filter to get non-empty result', () => {
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects(['http://www.w3.org/2004/02/skos/core#prefLabel']).predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().langs(['en']).build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    const languageIsRight = resultQuads.every(quad => quad.object.termType === 'Literal' && quad.object.language === 'en')
    expect(resultQuads.length).toBeGreaterThan(0)
    expect(languageIsRight).toBe(true)
})


test('processes query with limit', () => {
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects().predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().limit(1).build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    expect(resultQuads.length).toBe(1)
})

test('processes query with offset', () => {
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects().predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().offset(1).build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    expect(resultQuads.length).toBe(2)
    expect(resultQuads[0].object.value).toBe('hidden label')
})

test('processes query with limit and offset', () => {
    
    const builder = simpleQueryStepBuilder()
    const query = builder.subjects().predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().limit(1).offset(1).build()
    const processor = queryProcessor()
    const resultQuads = processor.filter(quads, query)
    expect(resultQuads.length).toBe(1)
    expect(resultQuads[0].object.value).toBe('hidden label')
})