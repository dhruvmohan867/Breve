import test from "node:test";
import assert from "node:assert/strict";
import { escapeRegex, clampPage, clampLimit, allowedSortField, sortDirection, searchText, lengthBounds, matchedPhrase } from "./query.js";

test("escapeRegex treats search text as literal", () => {
    assert.equal(escapeRegex("c++ (draft)"), "c\\+\\+ \\(draft\\)");
});

test("clampPage and clampLimit stay inside bounds", () => {
    assert.equal(clampPage("0"), 1);
    assert.equal(clampPage("3"), 3);
    assert.equal(clampLimit("500"), 50);
    assert.equal(clampLimit("nope", 12), 12);
});

test("search text keeps words and drops punctuation", () => {
    assert.equal(searchText("  ocean, night! "), "ocean night");
});

test("length filter is an allowlist", () => {
    assert.deepEqual(lengthBounds("under15"), { $gte: 0, $lt: 15 });
    assert.equal(lengthBounds(""), null);
    assert.equal(lengthBounds("all"), false);
});

test("matched phrase is a window around the word", () => {
    const phrase = matchedPhrase({
        title: "From the far end of the harbor wall, rain starts over the boats",
        description: "",
        place: "",
        maker: ""
    }, "rain");
    assert.match(phrase, /rain/);
    assert.match(phrase, /^\.\.\./);
});

test("sort field is limited to known video fields", () => {
    assert.equal(allowedSortField("views"), "views");
    assert.equal(allowedSortField("$where"), "createdAt");
    assert.equal(sortDirection("asc"), 1);
    assert.equal(sortDirection("desc"), -1);
});
