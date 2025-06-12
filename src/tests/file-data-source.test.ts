import { expect, test } from "vitest";
import { FileDataSource } from "../fetch-quads";
import { simpleQueryStepBuilder } from "../simple-query-step-builder";

test('fetch label for skos:prefLabel', async () => {
    const fds = new FileDataSource('https://www.w3.org/2009/08/skos-reference/skos.rdf')

    const builder = simpleQueryStepBuilder()
    const query = builder.subjects(['http://www.w3.org/2004/02/skos/core#prefLabel']).predicates(['http://www.w3.org/2000/01/rdf-schema#label']).objects().build()
    const result = await fds.fetchQuads(query)
    expect(fds.quads?.length).toBeGreaterThan(0)
    expect(result.quads[0].object.value).toBe('preferred label')
})