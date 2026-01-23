import { NextRequest, NextResponse } from 'next/server';
import { Storage, Car, RegistrationStatus } from '@/lib/storage';
import { processAndSavePhoto } from '@/lib/images';

export async function GET() {
  const cars = await Storage.getCars();
  return NextResponse.json(cars);
}

export async function POST(request: NextRequest) {
  try {
    const form_data = await request.formData();
    const first_name = form_data.get('first_name') as string;
    const last_name = form_data.get('last_name') as string;
    const car_name = form_data.get('car_name') as string;
    const is_beauty = form_data.get('is_beauty') === 'true';
    const win_preference = form_data.get('win_preference') as 'beauty' | 'speed';
    const division = form_data.get('division') as string;
    const photo_file = form_data.get('photo') as File | null;

    let photo_hash = '';
    if (photo_file) {
      const buffer = Buffer.from(await photo_file.arrayBuffer());
      photo_hash = await processAndSavePhoto(buffer);
    }

    const cars = await Storage.getCars();
    const next_id = cars.length > 0 ? Math.max(...cars.map((c) => c.id)) + 1 : 1;

    const new_car: Car = {
      id: next_id,
      first_name,
      last_name,
      car_name,
      is_beauty,
      win_preference,
      photo_hash,
      division,
      registration_status: 'STARTED',
      weight_oz: 0,
      is_wheels_roll: false,
      is_length_pass: false,
      track_times: [],
      beauty_scores: [],
    };

    cars.push(new_car);
    await Storage.saveCars(cars);

    return NextResponse.json(new_car);
  } catch (error) {
    console.error('Error in POST /api/cars:', error);
    return NextResponse.json({ error: 'Failed to register car' }, { status: 500 });
  }
}
