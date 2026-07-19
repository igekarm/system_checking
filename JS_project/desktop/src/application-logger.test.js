import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ApplicationLogger } from "./application-logger.js";

test("redacts database, SQL and credential fields",async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"db-tools-log-"));
  const logger=new ApplicationLogger(directory);
  await logger.info("test",{version:"1.0.0",sql:"select secret",password:"secret",host:"db.internal",token:"abc"});
  const content=await readFile(logger.filePath,"utf8");
  assert.match(content,/1\.0\.0/);
  for(const secret of ["select secret","secret","db.internal","abc"])assert.doesNotMatch(content,new RegExp(secret.replace(".","\\.")));
});
