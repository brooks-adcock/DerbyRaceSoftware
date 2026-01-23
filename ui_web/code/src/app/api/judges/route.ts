import { NextRequest, NextResponse } from 'next/server';
import { Storage, Judge } from '@/lib/storage';

export async function GET() {
  const judges = await Storage.getJudges();
  return NextResponse.json(judges);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, allowed_divisions = [] } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const judges = await Storage.getJudges();
    const new_judge: Judge = {
      id: crypto.randomUUID(),
      name: name.trim(),
      allowed_divisions,
    };

    judges.push(new_judge);
    await Storage.saveJudges(judges);

    return NextResponse.json(new_judge);
  } catch (error) {
    console.error('Error in POST /api/judges:', error);
    return NextResponse.json({ error: 'Failed to create judge' }, { status: 500 });
  }
}
