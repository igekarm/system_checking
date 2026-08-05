export const MAX_QUERY_TIMEOUT_MS=3_600_000;

export function normalizeQueryTimeout(value,fallback=15_000){
  const parsed=Number(value);
  if(!Number.isFinite(parsed))return fallback;
  if(parsed===0)return 0;
  return Math.max(1_000,Math.min(Math.trunc(parsed),MAX_QUERY_TIMEOUT_MS));
}
