import test from "node:test";
import assert from "node:assert/strict";
import { publicIdFromUrl, resolvePublicId } from "./mediaId.js";

test("publicIdFromUrl keeps folders and drops the version segment", () => {
    const url = "https://res.cloudinary.com/demo/video/upload/v1710000000/folder/clip.mp4";
    assert.equal(publicIdFromUrl(url), "folder/clip");
});

test("resolvePublicId prefers the id saved at upload time", () => {
    assert.equal(resolvePublicId("stored-id", "https://res.cloudinary.com/demo/image/upload/v1/old.png"), "stored-id");
    assert.equal(publicIdFromUrl("https://example.com/file.mp4"), null);
});
