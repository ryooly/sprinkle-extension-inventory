import * as dotenv from "dotenv";
import { TwentyFourHourAutomation } from "./extension-automation";
import { logger } from "@/logger";

export { TwentyFourHourAutomation };

dotenv.config();

const USAGE = [
  "Usage: bun run automation [--hourly|--daily|--help]",
  "",
  "  (no flag)  start the 24/7 process: hourly ingest + cleanup, daily showcase export",
  "  --hourly   run one ingest + cleanup pass now and exit",
  "  --daily    rebuild today's showcase now and exit",
  "",
  "Environment overrides: AUTOMATION_PER_PAGE, AUTOMATION_MIN_STARS, HOURLY_CRON, DAILY_CRON",
].join("\n");

async function runOnce(flag: "--hourly" | "--daily") {
  const automation = new TwentyFourHourAutomation();
  const started = Date.now();

  logger.info(`[manual] ${flag} run started at ${new Date().toISOString()}`);

  let failed = false;

  if (flag === "--hourly") {
    const result = await automation.runHourlyJob();
    failed = result.errors.length > 0;
    logger.info(
      { duration: `${((Date.now() - started) / 1000).toFixed(1)}s`, result },
      "[manual] --hourly run finished",
    );
  } else {
    const result = await automation.runDailyJob();
    failed = !result.success;
    logger.info(
      { duration: `${((Date.now() - started) / 1000).toFixed(1)}s`, result },
      "[manual] --daily run finished",
    );
  }

  process.exit(failed ? 1 : 0);
}

if (import.meta.main) {
  const flag = process.argv[2];

  if (flag === "--help" || flag === "-h") {
    console.log(USAGE);
    process.exit(0);
  }

  if (flag === "--hourly" || flag === "--daily") {
    await runOnce(flag);
  } else {
    if (flag) {
      console.warn(`Unknown flag "${flag}".\n\n${USAGE}`);
      process.exit(1);
    }

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
}
