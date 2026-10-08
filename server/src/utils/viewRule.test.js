import test from "node:test"
import assert from "node:assert/strict"
import { viewThreshold } from "./viewRule.js"

test("a short film counts a view at a quarter of its length", () => {
    assert.equal(viewThreshold(8), 2)
})

test("a long film counts a view at 30 seconds", () => {
    assert.equal(viewThreshold(600), 30)
})

test("a missing duration waits 30 seconds", () => {
    assert.equal(viewThreshold(0), 30)
})
