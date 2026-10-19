import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is missing from .env");
}

export const client = new MongoClient(url);
export const db = client.db();
