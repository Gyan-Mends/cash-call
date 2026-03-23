import mongoose from "mongoose";
import { config } from "~/server/config";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  await mongoose.connect(config.databaseUrl, {
    serverSelectionTimeoutMS: 5000,
  });

  isConnected = true;

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error:", err);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected");
    isConnected = false;
  });
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

export function getConnectionStatus(): boolean {
  return isConnected;
}
