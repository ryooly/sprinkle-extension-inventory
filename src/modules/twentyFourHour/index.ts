import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "./extension-automation";

// Re-export so other modules can import the class from the module barrel
// without triggering the cron bootstrap below.
export { TwentyFourHourAutomation };

// Load .env explicitly (Bun also auto-loads it; this keeps behaviour obvious
// and consistent with config.ts).
dotenv.config();

// Bootstrap the scheduler ONLY when this file is the process entry point
// (i.e. `bun run automation`). Importing this module elsewhere stays
// side-effect free.
if (import.meta.main) {
  const userId = process.env.AUTOMATION_USER_ID;

  if (!userId) {
    console.error("AUTOMATION_USER_ID environment variable is required");
    process.exit(1);
  }

  const automation = new TwentyFourHourAutomation(userId);
  automation.startCronJobs();

  console.log(
    `TwentyFourHour automation started for user ${userId} (hourly + daily cron)`,
  );

  // Graceful shutdown on termination signals.
  const shutdown = () => {
    console.log("\nShutting down automation...");
    automation.stopCronJobs();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
