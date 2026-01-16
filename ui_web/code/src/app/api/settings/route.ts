import { NextRequest, NextResponse } from 'next/server';
import { Storage, RaceSettings } from '@/lib/storage';

export async function GET() {
  const settings = await Storage.getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    await Storage.saveSettings(settings);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
