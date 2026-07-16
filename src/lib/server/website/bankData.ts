import { MongoClientInstance } from '$lib/database/mongo';
import type { Db, Collection } from 'mongodb';

export const bankEligibility: Db = MongoClientInstance.db('bankEligibility');
export const allBanksData: Collection = bankEligibility.collection('banksData');
