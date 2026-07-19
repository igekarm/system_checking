import test from "node:test";
import assert from "node:assert/strict";
import { createRunLog, validateSql } from "./index.js";
test("validates one statement", () => { assert.equal(validateSql("select 1;"), "select 1;"); assert.throws(() => validateSql("select 1; select 2")); });
test("run log is bounded", () => { const log = createRunLog(1); log.add({ id: 1 }); log.add({ id: 2 }); assert.deepEqual(log.list(), [{ id: 2 }]); });
