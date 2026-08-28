// gateway/index.ts
import { Elysia } from "elysia";

import { userRoutes } from "@/modules/auth";
import { extensionRoutes } from "@/modules/manual-ekstension";
import { paymentRoutes } from "@/modules/payment-gateway";

const app = new Elysia()
  .use(userRoutes)
  .use(extensionRoutes)
  .use(paymentRoutes)
  .listen(3000);

console.log("Gateway running at http://localhost:3000");