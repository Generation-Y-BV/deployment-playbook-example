import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greet.js";

test("greet returns a greeting", () => {
  assert.equal(greet("Generation Y"), "Hello, Generation Y!");
});
