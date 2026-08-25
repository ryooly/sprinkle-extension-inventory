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


/// ini adalh file yang gak diperlukan karan kita akan secara otomatis mengambil langsung variable 24H automation dan memanggilnya di file tersebut biar dia jalan otomatis gitu atau mungkin kita melapisinya lagi dengan variable sehingga tinggal panggil di server


/// update notes: ini adalah sebauh kerangka dimana nanti kita akan membuat hal yang sama sahaja akan lebih kompleks dimana nanti disana kita akan memanggil twentyHoursnya aja dan lainnya di proses oleh server itu sendiri yang perlu dipikrikan disini, seandainya ini bergerak bersama diaktifkannya server maka userId nya darimana gitu gw lagi binngung sejujurnya... Hal yang harus di pikirkanz???


/// gimana kalo kita taro logika jika cookie masih koosng maka akan lakukan ini gitu tiap pemanggilan akan dilakukan pengecekan namun jika cookie udah ada maka ambil dari cokkie gitu, cukup tambahkan aja nanti di pemanggilnya