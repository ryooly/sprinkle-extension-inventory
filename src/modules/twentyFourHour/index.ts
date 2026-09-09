import * as dotenv from "dotenv";
import {
  TwentyFourHourAutomation,
  FREE_USER_ID,
  resolveUserKey,
} from "./extension-automation";
import { engineKeys as key } from "./automation.depends";

export { TwentyFourHourAutomation, FREE_USER_ID, isFreeUser, resolveUserId };

dotenv.config();

if (import.meta.main) {
  const userId = resolveUserKey(key); // ganti menjadi userId melalui database

  const automation = new TwentyFourHourAutomation();
  automation.startCronJobs();

  console.log(
    isFreeUser(userId)
      ? `TwentyFourHour automation started on the free tier as ${userId} (AUTOMATION_USER_ID not set)`
      : `TwentyFourHour automation started for user ${userId} (hourly + daily cron)`,
  );

  const shutdown = () => {
    console.log("\nShutting down automation...");
    automation.stopCronJobs();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
