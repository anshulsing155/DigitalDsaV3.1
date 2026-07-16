import { MongoClientInstance } from '$lib/database/mongo';

export async function connectToDatabase() {
  return MongoClientInstance.db('quiz_platform');
}

export async function getQuestionsCollection() {
  const db = await connectToDatabase();
  return db.collection('questions');
}
