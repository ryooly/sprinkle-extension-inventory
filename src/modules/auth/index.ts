import { Elysia } from "elysia";
import { jwt } from "@elysia/jwt";
import { config } from "../../../config";
import { userRoutes } from "@/modules/auth/routes/route";

const app = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: config.jwtSecret,
    }),
  )
  .onError(({ error }) => {
    return {
      success: false,
      message: error.message,
    };
  })
  .use(userRoutes)
  .listen(3001);

console.log(`Server running on http://localhost:${app.server?.port}`);