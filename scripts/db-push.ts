import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./load-env";

loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL in .env.local");
    process.exit(1);
  }
  const schema = readFileSync(
    path.join(process.cwd(), "db", "schema.sql"),
    "utf8",
  );
  const sql = neon(url);
  await sql.query(schema);
  console.log("pushed db/schema.sql");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
