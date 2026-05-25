import { disconnectPrisma } from "../lib/prisma";
import { processJob24hReminders } from "../services/job24hReminder";

async function main() {
  const result = await processJob24hReminders();
  console.log("Job 24h reminder run:", result);
}

main()
  .catch((err) => {
    console.error("Job 24h reminder script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
