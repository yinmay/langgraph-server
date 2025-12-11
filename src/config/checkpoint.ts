import dotenv from "dotenv";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// Load environment variables
dotenv.config();

/**
 * Create and initialize PostgreSQL checkpointer
 * This will store all conversation state and history in PostgreSQL
 *
 * Uses PostgresSaver.fromConnString() which creates and manages the connection pool internally
 */
export async function createCheckpointer() {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    throw new Error(
      "DB_URL environment variable is required for PostgreSQL checkpoint storage"
    );
  }

  // Create PostgreSQL checkpointer from connection string
  // This method creates the connection pool internally
  const checkpointer = PostgresSaver.fromConnString(dbUrl);

  // Setup the database tables (creates tables if they don't exist)
  // Must be called the first time you use the checkpointer
  await checkpointer.setup();

  console.log("✅ PostgreSQL checkpointer initialized successfully");

  return checkpointer;
}
