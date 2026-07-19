import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JsonStore } from "./json-store.js";
test("persists JSON atomically and serializes updates",async()=>{const directory=await mkdtemp(path.join(os.tmpdir(),"db-tools-store-"));const store=new JsonStore(directory,"items",[]);await Promise.all([store.update((items)=>[...items,{id:1}]),store.update((items)=>[...items,{id:2}])]);assert.deepEqual(await store.read(),[{id:1},{id:2}]);});
