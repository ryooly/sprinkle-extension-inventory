import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "./extension-automation";

export { TwentyFourHourAutomation };

dotenv.config();

if (import.meta.main) {
  const automation = new TwentyFourHourAutomation();
  automation.startCronJobs();

  console.log(
    "TwentyFourHour automation started (global generator: hourly basic+premium, daily export)",
  );

  const shutdown = () => {
    console.log("\nShutting down automation...");
    automation.stopCronJobs();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
