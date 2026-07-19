import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { canonicalManifestPayload, compareVersions, decideUpdate, verifyManifestSignature } from "./index.js";

function manifest(overrides = {}) { return { schemaVersion:1, product:"db-tools", channel:"stable", version:"1.2.0", minimumSupportedVersion:"1.0.0", publishedAt:"2026-07-18T12:00:00Z", releaseCommit:"abc123", mandatory:false, asset:{name:"DB-Tools.exe",size:12,sha256:"00".repeat(32)}, signature:"placeholder", ...overrides }; }
test("compares semantic versions and blocks downgrade", () => { assert.equal(compareVersions("1.2.0", "1.1.9"), 1); assert.equal(decideUpdate({currentVersion:"2.0.0",manifest:manifest()}).reason,"downgrade-blocked"); });
test("verifies signed canonical manifest", () => { const { privateKey, publicKey } = generateKeyPairSync("ed25519"); const value = manifest(); value.signature = sign(null, canonicalManifestPayload(value), privateKey).toString("base64"); assert.equal(verifyManifestSignature(value, publicKey.export({type:"spki",format:"pem"})), true); });
