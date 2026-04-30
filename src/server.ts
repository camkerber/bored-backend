import app from "./app.js";
import {
  closeDatabaseConnection,
  connectToDatabase,
} from "./config/database.js";

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`bored-backend listening on http://localhost:${PORT}`);
  });
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down...`);
  await closeDatabaseConnection();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
