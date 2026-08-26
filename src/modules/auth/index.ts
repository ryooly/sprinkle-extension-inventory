import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../../../config";
import { userRoutes } from "@/modules/auth/routes/route";

export const authApp = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: config.jwtSecret,
    }),
  )
  .onError(({ error }) => {
    return {
      success: false,
      message: "message" in error ? String(error.message) : String(error),
    };
  })
  .use(userRoutes);

// Start standalone server when run directly (bun run dev)
if (import.meta.main) {
  authApp.listen(3001);
  console.log(
    `Auth server running on http://localhost:${authApp.server?.port}`,
  );
}
