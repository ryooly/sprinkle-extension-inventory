import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "./extension-automation";
import { logger } from "@/logger";

export { TwentyFourHourAutomation };

dotenv.config();

if (import.meta.main) {
  const automation = new TwentyFourHourAutomation();
  automation.startCronJobs();

  logger.info(
    "TwentyFourHour automation started (global generator: hourly basic+premium, daily export)",
  );

  const shutdown = () => {
    logger.info("\nShutting down automation...");
    automation.stopCronJobs();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
