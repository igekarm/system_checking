export const UPDATE_CHANNELS = Object.freeze(["stable", "beta"]);
export const UPDATE_STATES = Object.freeze({
  IDLE: "idle", CHECKING: "checking",
  CONFIG_REQUIRED: "config-required", UP_TO_DATE: "up-to-date",
  AVAILABLE: "available", DOWNLOADING: "downloading", READY: "ready", ERROR: "error"
});

export function assertUpdateManifest(value) {
  if (!value || typeof value !== "object") throw new TypeError("Update manifest is required");
  if (value.schemaVersion !== 1) throw new TypeError("Unsupported update manifest schema");
  for (const field of ["product", "channel", "version", "publishedAt", "releaseCommit", "signature"]) {
    if (typeof value[field] !== "string" || !value[field]) throw new TypeError(`Manifest field ${field} is required`);
  }
  if (!UPDATE_CHANNELS.includes(value.channel)) throw new TypeError("Unsupported update channel");
  if (!value.asset || typeof value.asset !== "object") throw new TypeError("Manifest asset is required");
  for (const field of ["name", "sha256"]) if (typeof value.asset[field] !== "string" || !value.asset[field]) throw new TypeError(`Asset field ${field} is required`);
  if (!Number.isSafeInteger(value.asset.size) || value.asset.size <= 0) throw new TypeError("Asset size must be a positive integer");
  return value;
}
