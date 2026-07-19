export const postgresqlProvider = Object.freeze({
  id: "postgresql",
  displayName: "PostgreSQL",
  protocolVersion: 1,
  capabilities: ["cancel", "metadata", "readOnly"],
  driver: Object.freeze({ packageName: "pg", source: "https://registry.npmjs.org", bundled: false })
});
