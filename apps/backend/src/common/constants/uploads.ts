import { join } from "path";

// Assume que o processo roda com cwd = apps/backend (verdade para nest start, nest start
// --watch e node dist/main, os três via scripts do package.json) — evita depender de
// __dirname, que muda de profundidade entre execução em dev (src/) e build (dist/).
// Compartilhado entre app.module.ts (ServeStaticModule) e tenants.service.ts (upload).
export const UPLOADS_DIR = join(process.cwd(), "uploads");
export const UPLOADS_URL_PREFIX = "/uploads";
