import { error } from '@sveltejs/kit';
import { allBanksData } from '$lib/server/website/bankData';

export async function load({ params }) {
  const rawBankName = decodeURIComponent(params.bank).trim();

  const bank = await allBanksData.findOne({ BankName: rawBankName });

  if (!bank) {
    throw error(404, 'Bank not found');
  }

  // ✅ Fix serialization issue
  const serializableBank = {
    ...bank,
    _id: bank._id.toString()
  };
  return { bank: serializableBank };
}
