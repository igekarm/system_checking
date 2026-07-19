import test from "node:test";
import assert from "node:assert/strict";
import { oracleConnectString } from "./oracle-provider.js";
test("Oracle connect string uses service name",()=>assert.equal(oracleConnectString({host:"db.example",port:1521,serviceName:"FREEPDB1"}),"db.example:1521/FREEPDB1"));
test("explicit Oracle connect string has priority",()=>assert.equal(oracleConnectString({connectString:" db.example/APP "}),"db.example/APP"));
