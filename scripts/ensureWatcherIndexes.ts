import dotenv from "dotenv";
dotenv.config();

import {
  closeDatabaseConnection,
  connectToDatabase,
} from "../src/config/database.js";
import {ensureWatcherIndexes} from "../src/services/watcherService.js";

async function main() {
  await connectToDatabase();
  await ensureWatcherIndexes();
  console.log("watcher_sessions indexes ensured: { code: 1, unique } and { expiresAt: 1, ttl }");
  await closeDatabaseConnection();
}

main().catch((err) => {
  console.error("Failed to ensure watcher indexes:", err);
  process.exit(1);
});
