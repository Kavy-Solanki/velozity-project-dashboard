import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envTestPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.test");

if (!existsSync(envTestPath)) {
  throw new Error(
    `Missing ${envTestPath}. Copy apps/api/.env.test.example to apps/api/.env.test before running API tests.`,
  );
}

dotenv.config({ path: envTestPath, override: true });
