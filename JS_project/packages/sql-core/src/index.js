export const DEFAULT_LIMITS = Object.freeze({ timeoutMs: 15000, rowLimit: 1000, maxSqlLength: 100000 });

export function validateSql(sql, limits = DEFAULT_LIMITS) {
  const normalized = String(sql ?? "").trim();
  if (!normalized) throw new Error("SQL не должен быть пустым");
  if (normalized.length > limits.maxSqlLength) throw new Error("SQL превышает допустимый размер");
  const withoutTrailing = normalized.replace(/;+\s*$/, "");
  if (withoutTrailing.includes(";")) throw new Error("В этом режиме разрешён один SQL statement");
  return normalized;
}

export function createRunLog(limit = 100) {
  const entries = [];
  return { add(entry) { entries.unshift(Object.freeze({ ...entry })); entries.length = Math.min(entries.length, limit); }, list() { return [...entries]; } };
}
