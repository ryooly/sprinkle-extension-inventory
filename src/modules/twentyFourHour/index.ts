import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "./extension-automation";

dotenv.config();

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

// Graceful shutdown on termination signals
const shutdown = () => {
  console.log("\nShutting down automation...");
  automation.stopCronJobs();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);


/// ini adalh file yang gak diperlukan karan kita akan secara otomatis mengambil langsung variable 24H automation dan memanggilnya di file tersebut biar dia jalan otomatis gitu tanpa perlu kita 
