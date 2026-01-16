import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const search_params = request.nextUrl.searchParams;
  const action = search_params.get('action');

  if (action === 'gate_test') {
    return NextResponse.json({ status: 'ok', gate: 'toggled' });
  }

  if (action === 'sensors') {
    // Stub sensor status for 4 tracks
    return NextResponse.json({
      sensors: [
        { id: 1, status: 'Open' },
        { id: 2, status: 'Open' },
        { id: 3, status: 'Broken' },
        { id: 4, status: 'Open' },
      ]
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.action === 'calibrate') {
    console.log('Calibrating with:', body.up, body.down);
    return NextResponse.json({ status: 'ok' });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
