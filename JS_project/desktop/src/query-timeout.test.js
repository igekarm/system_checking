import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQueryTimeout } from "./query-timeout.js";

test("zero disables the query timeout",()=>assert.equal(normalizeQueryTimeout(0),0));
test("query timeout is bounded and invalid values use fallback",()=>{
  assert.equal(normalizeQueryTimeout(50_000),50_000);
  assert.equal(normalizeQueryTimeout(10),1_000);
  assert.equal(normalizeQueryTimeout(9_000_000),3_600_000);
  assert.equal(normalizeQueryTimeout("invalid"),15_000);
});
