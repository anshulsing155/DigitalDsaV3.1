import { json } from '@sveltejs/kit';
import { allBanksData } from '$lib/server/website/bankData';

export async function GET() {
  try {
    const banks = await allBanksData.find({}, { projection: { BankName: 1, _id: 0 } }).toArray();
    return json(banks);
  } catch (error: any) {
    console.error('Error fetching bank list:', error);
    return json({ error: 'Failed to fetch bank list' }, { status: 500 });
  }
}
