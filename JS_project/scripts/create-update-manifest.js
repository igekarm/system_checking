import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalManifestPayload } from "@db-tools/update-core";

const [installerPath,version,commit,channel="stable"] = process.argv.slice(2);
if(!installerPath||!version||!commit) throw new Error("Usage: node scripts/create-update-manifest.js <installer> <version> <commit> [channel]");
const encodedKey=process.env.UPDATE_SIGNING_PRIVATE_KEY_BASE64;
if(!encodedKey) throw new Error("UPDATE_SIGNING_PRIVATE_KEY_BASE64 is required");
const file=await readFile(installerPath); const info=await stat(installerPath);
const manifest={schemaVersion:1,product:"db-tools",channel,version,minimumSupportedVersion:"0.1.0",publishedAt:new Date().toISOString(),releaseCommit:commit,mandatory:false,asset:{name:path.basename(installerPath),size:info.size,sha256:createHash("sha256").update(file).digest("hex")},signature:"placeholder"};
manifest.signature=sign(null,canonicalManifestPayload(manifest),createPrivateKey(Buffer.from(encodedKey,"base64"))).toString("base64");
const output=path.join(path.dirname(installerPath),`latest-win-x64-${channel}.json`); await writeFile(output,JSON.stringify(manifest,null,2)+"\n"); console.log(output);
