import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, Db, Collection, Document } from "mongodb";

const DATABASE_NAME = "boring-db";

let client: MongoClient | undefined;
let database: Db | undefined;

async function _connectToDatabase(): Promise<Db> {
  const uri = process.env.BORED_MONGODB_URI;
  if (!uri) {
    throw new Error(
      "BORED_MONGODB_URI environment variable is not defined. Please check your .env file.",
    );
  }

  client = new MongoClient(uri, { appName: "bored-backend" });
  attachDatabasePool(client);
  await client.connect();
  database = client.db(DATABASE_NAME);
  return database;
}

let connect$: Promise<Db> | undefined;

export async function connectToDatabase(): Promise<Db> {
  connect$ ??= _connectToDatabase();
  return connect$;
}

export function getCollection<T extends Document>(
  collectionName: string,
): Collection<T> {
  if (!database) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return database.collection<T>(collectionName);
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
    connect$ = undefined;
  }
}
