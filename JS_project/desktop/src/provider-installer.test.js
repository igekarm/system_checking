import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifyIntegrity } from "./provider-installer.js";

test("provider archive integrity must match pinned SHA-512",()=>{const archive=Buffer.from("official-provider-archive");const integrity=`sha512-${createHash("sha512").update(archive).digest("base64")}`;assert.equal(verifyIntegrity(archive,integrity),true);assert.throws(()=>verifyIntegrity(Buffer.from("modified"),integrity),/не совпадает/);});
