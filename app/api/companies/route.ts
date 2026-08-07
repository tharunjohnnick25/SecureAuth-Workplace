import { NextResponse } from 'next/server';
import { REGISTERED_COMPANIES } from '@/lib/companies';

export async function GET() {
  return NextResponse.json({ success: true, data: REGISTERED_COMPANIES });
}
