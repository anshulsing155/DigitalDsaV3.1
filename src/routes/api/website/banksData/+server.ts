import { json } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { allBanksData } from '$lib/server/website/bankData';

export async function POST({ request }) {
  let update = await request.json();
  if (!update._id) {
    return json({ updated: false, error: 'Missing _id' }, { status: 400 });
  }

  const { _id, ...fieldsToUpdate } = update;

  const result = await allBanksData.updateOne(
    { _id: new ObjectId(_id as string) },
    { $set: fieldsToUpdate }
  );

  return json({ updated: result.modifiedCount > 0 });
}
