import { error } from '@sveltejs/kit';

export async function GET() {
  throw error(404, 'Not Found');
}

export async function POST() {
  throw error(404, 'Not Found');
}
