import { cors } from "@elysiajs/cors";
import { config } from "config";

export function buildCorsPlugin() {
  return cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });
}
