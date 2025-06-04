import {expect, test} from 'vitest';
import { Bind, BuiltInCall, Expression, ExpressionList, Filter, Graph, Optional, Select, TriplePattern, Union, Where } from "../query";
import { DataFactory } from 'n3';


test('creates select with empty where', () => {
    const select: Select = new Select([DataFactory.variable("title"), DataFactory.variable("author")], true, new Where())
    expect(select.toSparql()).toBe(`SELECT DISTINCT ?title, ?author
WHERE {

}`)
})

test('creates select', () => {
    const bind: Bind = new Bind(new Expression('<', [DataFactory.variable('num'), 3]), DataFactory.variable('variable'))
    const filter: Filter = new Filter(new Expression('||', [new BuiltInCall('isIRI', DataFactory.variable('object')), new BuiltInCall('isBLANK', DataFactory.variable('object'))]))
        const graph: Graph = new Graph(DataFactory.variable('graph'), [
        new Filter(new Expression('||', [new BuiltInCall('isIRI', DataFactory.variable('object')), new BuiltInCall('isBLANK', DataFactory.variable('object'))])),
        new TriplePattern(DataFactory.blankNode('b1'), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))
    ])
    const where: Where = new Where([
        bind, 
        graph,
        filter,
        new TriplePattern(DataFactory.blankNode("b2"), DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), DataFactory.variable("label"))])

    const select: Select = new Select([DataFactory.variable("title")], true, where).setLimit(10).setOffset(10)
    const sparqlQuery: string = select.toSparql()

    expect(sparqlQuery).toBe(`SELECT DISTINCT ?title
WHERE {
BIND ( ?num < 3 AS ?variable )
GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object))
_:b1 <http://purl.org/dc/terms/title> ?title .
}
FILTER (isIRI(?object) || isBLANK(?object))
_:b2 <http://www.w3.org/2004/02/skos/core#prefLabel> ?label .
}
LIMIT 10
OFFSET 10`)
})



test('creates where', () => {
    const where: Where = new Where([new TriplePattern(DataFactory.blankNode("b1"), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))])
    expect(where.toSparql()).toBe(`WHERE {
_:b1 <http://purl.org/dc/terms/title> ?title .
}`)
})

test('creates bind', () => {
    const bind: Bind = new Bind(new Expression('<', [DataFactory.variable('num'), 3]), DataFactory.variable('variable'))
    expect(bind.toSparql()).toBe(`BIND ( ?num < 3 AS ?variable )`)
})

test('creates built-in call', () => {
    const builtInCall: BuiltInCall = new BuiltInCall('isBLANK', DataFactory.variable('variable'))
    expect(builtInCall.toSparql()).toBe(`isBLANK(?variable)`)
})

test('creates filter with IN', () => {
    const filter: Filter = new Filter(new Expression('IN', [DataFactory.variable('variable'), 
        new ExpressionList(['hola', 3, DataFactory.literal('Joe', 'en')])] ))
    expect(filter.toSparql()).toBe(`FILTER (?variable IN (hola, 3, "Joe"@en))`)
})

test('creates filter', () => {
    const filter: Filter = new Filter(new Expression('||', [new BuiltInCall('isIRI', DataFactory.variable('object')), new BuiltInCall('isBLANK', DataFactory.variable('object'))]))
    expect(filter.toSparql()).toBe(`FILTER (isIRI(?object) || isBLANK(?object))`)
})

test('creates union', () => {
    const union: Union = new Union(
        [new TriplePattern(DataFactory.blankNode('b1'), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))], 
        [new TriplePattern(DataFactory.blankNode('b2'), DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), DataFactory.variable("label"))])
    expect(union.toSparql()).toBe(`{
_:b1 <http://purl.org/dc/terms/title> ?title .
}
UNION
{
_:b2 <http://www.w3.org/2004/02/skos/core#prefLabel> ?label .
}`)
})

test('creates optional', () => {
    const optional: Optional = new Optional([new TriplePattern(DataFactory.blankNode('b1'), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))])
    expect(optional.toSparql()).toBe(`OPTIONAL {
_:b1 <http://purl.org/dc/terms/title> ?title .
}`)
})


test('creates graph block', () => {
    const graph: Graph = new Graph(DataFactory.variable('graph'), [
        new Filter(new Expression('||', [new BuiltInCall('isIRI', DataFactory.variable('object')), new BuiltInCall('isBLANK', DataFactory.variable('object'))])),
        new TriplePattern(DataFactory.blankNode('b1'), DataFactory.namedNode('http://purl.org/dc/terms/title'), DataFactory.variable("title"))
    ])
    expect(graph.toSparql()).toBe(`GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object))
_:b1 <http://purl.org/dc/terms/title> ?title .
}`)
})