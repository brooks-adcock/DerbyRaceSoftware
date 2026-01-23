import { NextRequest, NextResponse } from 'next/server';
import { Storage, Judge } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const judges = await Storage.getJudges();
  const judge = judges.find((j) => j.id === params.id);
  if (!judge) {
    return NextResponse.json({ error: 'Judge not found' }, { status: 404 });
  }
  return NextResponse.json(judge);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const judges = await Storage.getJudges();
    const judge_index = judges.findIndex((j) => j.id === params.id);

    if (judge_index === -1) {
      return NextResponse.json({ error: 'Judge not found' }, { status: 404 });
    }

    const updated_judge: Judge = { ...judges[judge_index], ...updates };
    judges[judge_index] = updated_judge;
    await Storage.saveJudges(judges);

    return NextResponse.json(updated_judge);
  } catch (error) {
    console.error('Error in PATCH /api/judges/[id]:', error);
    return NextResponse.json({ error: 'Failed to update judge' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const judges = await Storage.getJudges();
    const judge_index = judges.findIndex((j) => j.id === params.id);

    if (judge_index === -1) {
      return NextResponse.json({ error: 'Judge not found' }, { status: 404 });
    }

    judges.splice(judge_index, 1);
    await Storage.saveJudges(judges);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/judges/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete judge' }, { status: 500 });
  }
}
