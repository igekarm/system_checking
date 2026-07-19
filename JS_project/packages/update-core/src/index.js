import { createHash, createPublicKey, verify } from "node:crypto";
import { createReadStream } from "node:fs";
import { assertUpdateManifest } from "@db-tools/update-contracts";

export function compareVersions(left, right) {
  const parse = (value) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(value));
    if (!match) throw new TypeError(`Invalid semantic version: ${value}`);
    return { numbers: match.slice(1, 4).map(Number), prerelease: match[4] ?? null };
  };
  const a = parse(left); const b = parse(right);
  for (let index = 0; index < 3; index += 1) if (a.numbers[index] !== b.numbers[index]) return Math.sign(a.numbers[index] - b.numbers[index]);
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease.localeCompare(b.prerelease, "en", { numeric: true });
}

export function canonicalManifestPayload(manifest) {
  const { signature: _signature, ...payload } = assertUpdateManifest(manifest);
  const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
  return Buffer.from(JSON.stringify(stable(payload)), "utf8");
}

export function verifyManifestSignature(manifest, publicKeyPem) {
  if (!publicKeyPem) throw new Error("Update signing public key is not configured");
  const signature = Buffer.from(manifest.signature, "base64");
  return verify(null, canonicalManifestPayload(manifest), createPublicKey(publicKeyPem), signature);
}

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export function normalizeSha256(value) { return String(value).toLowerCase().replace(/^sha256:/, ""); }

export function decideUpdate({ currentVersion, manifest, channel = "stable" }) {
  assertUpdateManifest(manifest);
  if (manifest.product !== "db-tools") throw new Error("Manifest belongs to another product");
  if (manifest.channel !== channel) return { available: false, reason: "channel-mismatch" };
  const comparison = compareVersions(manifest.version, currentVersion);
  return { available: comparison > 0, reason: comparison > 0 ? "newer-version" : comparison === 0 ? "same-version" : "downgrade-blocked" };
}
