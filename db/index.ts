import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1(): D1Database {
  if (!env.DB) {
    throw new Error("行情数据库暂时不可用");
  }

  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}
