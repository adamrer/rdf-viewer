import {expect, test} from 'vitest';
import { sparqlStepBuilder } from '../query-builder';
import { DataFactory } from 'n3';
import * as sparql from '../query';

test('creates full select query', () => {
    const builder = sparqlStepBuilder()
    const patternBuilder = builder.graphPatternBuilder()
    const varObject = DataFactory.variable('object')
    const varLabel = DataFactory.variable('label')
    const varTitle = DataFactory.variable('title')

    const pattern = patternBuilder
        .bind(
            sparql.lt(DataFactory.variable('num'), 3),
            DataFactory.variable('variable')
        ).union(
            builder.graphPatternBuilder()
                .graph(
                    DataFactory.variable('graph'),
                    builder.graphPatternBuilder().filter(
                        sparql.or(sparql.isIri(varObject), sparql.isBlank(varObject))
                        ).triple(
                            DataFactory.blankNode('b1'),
                            DataFactory.namedNode('http://purl.org/dc/terms/title'),
                            varTitle
                        ).build()
            ).build(),
            builder.graphPatternBuilder()
                .filter(sparql.or(sparql.isIri(varObject), sparql.isBlank(varObject)))
                .triple(
                    DataFactory.blankNode('b2'), 
                    DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
                    varLabel
                ).build()
        ).build()


    const selectQuery = 
        builder
            .select([varTitle], true)
            .where(pattern)
            .limit(10)
            .offset(10)
            .build()
    
    expect(selectQuery.toSparql()).toBe(`SELECT DISTINCT ?title
WHERE {
BIND ( ?num < 3 AS ?variable )
{
GRAPH ?graph {
FILTER (isIRI(?object) || isBLANK(?object))
_:b1 <http://purl.org/dc/terms/title> ?title .
}
}
UNION
{
FILTER (isIRI(?object) || isBLANK(?object))
_:b2 <http://www.w3.org/2004/02/skos/core#prefLabel> ?label .
}
}
LIMIT 10
OFFSET 10`)
})


test('creates empty not distinct select query', () => {
    const builder = sparqlStepBuilder()
    const select = builder.select([DataFactory.variable('variable')], false).build()
    expect(select.toSparql()).toBe(`SELECT ?variable
WHERE {

}`)
})

test ('creates select query with * selector', () => {
    const builder = sparqlStepBuilder()
    const wherePattern = builder.graphPatternBuilder()
    .triple(
        DataFactory.variable('subject'),
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/ns/dcat#Dataset')
    ).build()
    const select = builder.select('*').where(wherePattern).build()
    expect(select.toSparql()).toBe(`SELECT DISTINCT *
WHERE {
?subject <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/dcat#Dataset> .
}`)
})