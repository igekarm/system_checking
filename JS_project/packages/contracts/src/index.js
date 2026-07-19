export const providerCapabilities = Object.freeze({ cancel: "cancel", metadata: "metadata", readOnly: "readOnly" });

export function assertExecuteRequest(value) {
  if (!value || typeof value !== "object") throw new TypeError("Request is required");
  if (typeof value.requestId !== "string" || !value.requestId) throw new TypeError("requestId is required");
  if (typeof value.connectionId !== "string" || !value.connectionId) throw new TypeError("connectionId is required");
  if (typeof value.sql !== "string" || !value.sql.trim()) throw new TypeError("sql is required");
  return value;
}

export function assertPgToolsHost(host) {
  const methods = ["onConnectionChange", "executeSql", "cancelSql", "getMetadata", "notify", "onClose"];
  for (const name of methods) if (typeof host?.[name] !== "function") throw new TypeError(`Host method ${name} is required`);
  if (!Array.isArray(host.connections)) throw new TypeError("connections must be an array");
  return host;
}
