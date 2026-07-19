import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOracleConnectString, oracleConnectString } from "./oracle-provider.js";
test("Oracle connect string uses service name",()=>assert.equal(oracleConnectString({host:"db.example",port:1521,serviceName:"FREEPDB1"}),"db.example:1521/FREEPDB1"));
test("explicit Oracle connect string has priority",()=>assert.equal(oracleConnectString({connectString:" db.example/APP "}),"db.example/APP"));
test("Oracle SID uses a connect descriptor",()=>assert.equal(oracleConnectString({oracleConnectionType:"sid",host:"db.example",port:1521,sid:"ORCL"}),"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=db.example)(PORT=1521))(CONNECT_DATA=(SID=ORCL)))"));
test("Oracle custom descriptor is preserved",()=>assert.equal(oracleConnectString({oracleConnectionType:"connectString",connectString:" (DESCRIPTION=(ADDRESS_LIST=...)) "}),"(DESCRIPTION=(ADDRESS_LIST=...))"));
test("DataGrip JDBC service URL is accepted",()=>assert.equal(normalizeOracleConnectString("jdbc:oracle:thin:@//db.example:1521/APP"),"db.example:1521/APP"));
test("legacy JDBC SID URL becomes a descriptor",()=>assert.equal(normalizeOracleConnectString("jdbc:oracle:thin:@db.example:1521:ORCL"),"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=db.example)(PORT=1521))(CONNECT_DATA=(SID=ORCL)))"));
