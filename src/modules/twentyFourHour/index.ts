import * as dotenv from "dotenv";
import {
  TwentyFourHourAutomation,
  FREE_USER_ID,
  isFreeUser,
  resolveUserId,
} from "./extension-automation";

export { TwentyFourHourAutomation, FREE_USER_ID, isFreeUser, resolveUserId };

dotenv.config();

if (import.meta.main) {
  const userId = resolveUserId(process.env.AUTOMATION_USER_ID);

  const automation = new TwentyFourHourAutomation(userId);
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
