import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalManifestPayload } from "@db-tools/update-core";
import { UpdateCoordinator } from "./update-coordinator.js";

test("checks, downloads and verifies a signed update",async()=>{
  const installer=Buffer.from("verified installer fixture"); const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const manifest={schemaVersion:1,product:"db-tools",channel:"stable",version:"1.1.0",minimumSupportedVersion:"1.0.0",publishedAt:"2026-07-18T12:00:00Z",releaseCommit:"abc123",mandatory:false,asset:{name:"DB-Tools.exe",size:installer.length,sha256:createHash("sha256").update(installer).digest("hex")},signature:"placeholder"};
  manifest.signature=sign(null,canonicalManifestPayload(manifest),privateKey).toString("base64");
  let downloadedUrl; const client={latestRelease:async()=>({manifest,assetUrl:"public-installer",releaseNotes:"notes"}),downloadAsset:async(url)=>{downloadedUrl=url;return new Response(installer)}};
  const downloadDirectory=await mkdtemp(path.join(os.tmpdir(),"db-tools-update-test-")); const coordinator=new UpdateCoordinator({client,currentVersion:"1.0.0",publicKeyPem:publicKey.export({type:"spki",format:"pem"}),downloadDirectory});
  assert.equal((await coordinator.check()).state,"available"); const ready=await coordinator.download(); assert.equal(downloadedUrl,"public-installer"); assert.equal(ready.state,"ready"); assert.deepEqual(await readFile(ready.installerPath),installer);
});
