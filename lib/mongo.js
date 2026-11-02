import { MongoClient } from 'mongodb';

const g = globalThis;
export async function mongoDb() {
  if (!g._mongoClient) {
    g._mongoClient = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
  }
  const client = await g._mongoClient.connect();
  return client.db(process.env.MONGODB_DB);
}
