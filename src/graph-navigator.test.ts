import { graphNavigator } from "../src/graph-navigator";
import { StructuredQuads } from "../src/fetch/fetcher";
import { DataFactory } from "n3";
import { test, expect } from "vitest";


const quads: StructuredQuads = {
    "http://example.com/subject1": {
        "http://example.com/predicate1": { 
            "object1": {
                value: DataFactory.literal("object1"),
                sources: ["source1"],
            },
            "object2": {
                value: DataFactory.literal("object2"),
                sources: ["source2"],
            }
        },
        "http://example.com/predicate2": {
            "object3": {
                value: DataFactory.literal("object3"),
                sources: ["source1"],
            }
        },
    },
    "http://example.com/subject2": {
        "http://example.com/predicate2": {
            "object3": {
                value: DataFactory.literal("object3"),
                sources: ["source1"],
            }
        },
    }
};

const navigator = graphNavigator(quads);


test("get subjects", async () => {
    const result = navigator.subjects();
    expect(result).toEqual(["http://example.com/subject1", "http://example.com/subject2"]);
});


test("get predicates", () => {
    const result = navigator.subject("http://example.com/subject1").predicates();
    expect(result).toEqual(["http://example.com/predicate1", "http://example.com/predicate2"]);
});


test("get objects", () => {
    const result = navigator.subject("http://example.com/subject1").predicate("http://example.com/predicate1");
    expect(result).toEqual([
        {
            value: DataFactory.literal("object1"),
            sources: ["source1"],
        },
        {
            value: DataFactory.literal("object2"),
            sources: ["source2"],
        }
    ]);
});


test("get objects for non-existing predicate", () => {
    const result = navigator.subject("http://example.com/subject1").predicate("http://example.com/nonExistingPredicate");
    expect(result).toEqual([]);
});

test("get predicates for non-existing subject", () => {
    const result = navigator.subject("http://example.com/nonExistingSubject").predicates();
    expect(result).toEqual([]);
});