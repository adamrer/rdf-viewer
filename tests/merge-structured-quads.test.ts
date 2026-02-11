import {
  mergeStructuredQuads,
  StructuredQuads,
} from "../src/fetcher";
import { test, expect } from "vitest";
import { DataFactory } from "n3";

const quads1: StructuredQuads = {
    "http://example.com/subject1": {
        "http://example.com/predicate1": { 
            "object1": {
                graphs: [],
                value: DataFactory.literal("object1"),
                sources: ["source1"],
            },
            "object2": {
                graphs: [],
                value: DataFactory.literal("object2"),
                sources: ["source2"],
            }
        },
        "http://example.com/predicate2": {
            "https://example.com/object3Iri": {
                graphs: [],
                value: DataFactory.namedNode("https://example.com/object3Iri"),
                sources: ["source1"],
            }
        },
    },
    "http://example.com/subject2": {
        "http://example.com/predicate2": {
            "object3": {
                graphs: [],
                value: DataFactory.literal("object3"),
                sources: ["source1"],
            }
        },
    }
};

const quads2: StructuredQuads = {
    "http://example.com/subject1": {
        "http://example.com/predicate1": { 
            "object1": { // different source
                graphs: [],
                value: DataFactory.literal("object1"),
                sources: ["source3"],
            },
            "object2": { // same as in quads1
                graphs: [],
                value: DataFactory.literal("object2"),
                sources: ["source2"],
            }
        },
        "http://example.com/predicate2": { // new graph
            "https://example.com/object3Iri": {
                graphs: ["https://example.com/graph1"],
                value: DataFactory.namedNode("https://example.com/object3Iri"),
                sources: ["source1"],
            }
        },
        "http://example.com/predicate3": { // new predicate
            "https://example.com/object3Iri": {
                graphs: [],
                value: DataFactory.namedNode("https://example.com/object3Iri"),
                sources: ["source3"],
            }
        },
    },
    "http://example.com/subject2": {
        "http://example.com/predicate2": {
            "https://example.com/object4Iri": { // new object
                graphs: ["https://example.com/graph1"], // graph
                value: DataFactory.namedNode("https://example.com/object4Iri"),
                sources: ["source3"],
            }
        },
    }
};


test("merge structured quads", async () => {
  const result = mergeStructuredQuads(quads1, quads2);
  expect(JSON.stringify(result)).toBe(JSON.stringify({
    "http://example.com/subject1": {
        "http://example.com/predicate1": { 
            "object1": {
                graphs: [],
                value: DataFactory.literal("object1"),
                sources: ["source1", "source3"],
            },
            "object2": {
                graphs: [],
                value: DataFactory.literal("object2"),
                sources: ["source2"],
            }
        },
        "http://example.com/predicate2": {
            "https://example.com/object3Iri": {
                graphs: ["https://example.com/graph1"],
                value: DataFactory.namedNode("https://example.com/object3Iri"),
                sources: ["source1"],
            }
        },
        "http://example.com/predicate3": { 
            "https://example.com/object3Iri": {
                graphs: [],
                value: DataFactory.namedNode("https://example.com/object3Iri"),
                sources: ["source3"],
            }
        },
    },
    "http://example.com/subject2": {
        "http://example.com/predicate2": {
            "object3": {
                graphs: [],
                value: DataFactory.literal("object3"),
                sources: ["source1"],
            },
            "https://example.com/object4Iri": {
                graphs: ["https://example.com/graph1"],
                value: DataFactory.namedNode("https://example.com/object4Iri"),
                sources: ["source3"],
            }
        },
    }
}));
});
