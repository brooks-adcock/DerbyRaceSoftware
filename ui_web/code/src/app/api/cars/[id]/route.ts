import { NextRequest, NextResponse } from 'next/server';
import { Storage, Car, RegistrationStatus } from '@/lib/storage';
import { processAndSavePhoto } from '@/lib/images';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cars = await Storage.getCars();
  const car = cars.find((c) => c.id === parseInt(params.id));
  if (!car) {
    return NextResponse.json({ error: 'Car not found' }, { status: 404 });
  }
  return NextResponse.json(car);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const content_type = request.headers.get('content-type') || '';
    let updates: Partial<Car> = {};

    if (content_type.includes('multipart/form-data')) {
      const form_data = await request.formData();
      const first_name = form_data.get('first_name') as string;
      const last_name = form_data.get('last_name') as string;
      const car_name = form_data.get('car_name') as string;
      const is_beauty = form_data.get('is_beauty') === 'true';
      const win_preference = form_data.get('win_preference') as 'beauty' | 'speed';
      const division = form_data.get('division') as string;
      const photo_file = form_data.get('photo') as File | null;

      updates = {
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        car_name: car_name || undefined,
        is_beauty: form_data.has('is_beauty') ? is_beauty : undefined,
        win_preference: (win_preference as any) || undefined,
        division: division || undefined,
      };

      if (photo_file && photo_file.size > 0) {
        const buffer = Buffer.from(await photo_file.arrayBuffer());
        updates.photo_hash = await processAndSavePhoto(buffer);
      }
    } else {
      updates = await request.json();
    }

    const cars = await Storage.getCars();
    const car_index = cars.findIndex((c) => c.id === parseInt(params.id));

    if (car_index === -1) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // Check if editability is allowed
    const race = await Storage.getRace();
    const car = cars[car_index];
    const finalized_statuses: RegistrationStatus[] = ['REGISTERED', 'DISQUALIFIED', 'COURTESY'];
    
    // Only enforce editability rules for public registration updates (FormData)
    if (content_type.includes('multipart/form-data')) {
      if (race.state !== 'REGISTRATION') {
        return NextResponse.json({ error: 'Registration is closed' }, { status: 403 });
      }
      if (finalized_statuses.includes(car.registration_status)) {
        return NextResponse.json({ error: 'Car registration is finalized' }, { status: 403 });
      }
    }

    const updated_car = { ...cars[car_index], ...updates };
    
    // Calculate average time if runs changed
    if (updates.runs) {
      const included_times = updated_car.runs
        .filter((t: any) => t.is_included)
        .map((t: any) => t.time);
      if (included_times.length > 0) {
        updated_car.average_time = included_times.reduce((a: number, b: number) => a + b, 0) / included_times.length;
      } else {
        updated_car.average_time = undefined;
      }
    }

    // Calculate average beauty score if beauty_scores changed
    if (updates.beauty_scores) {
      const included_scores = updated_car.beauty_scores
        .filter((s: any) => s.is_included)
        .map((s: any) => s.score);
      if (included_scores.length > 0) {
        updated_car.average_beauty_score = included_scores.reduce((a: number, b: number) => a + b, 0) / included_scores.length;
      } else {
        updated_car.average_beauty_score = undefined;
      }
    }

    cars[car_index] = updated_car;
    await Storage.saveCars(cars);

    return NextResponse.json(updated_car);
  } catch (error) {
    console.error('Error in PATCH /api/cars/[id]:', error);
    return NextResponse.json({ error: 'Failed to update car' }, { status: 500 });
  }
}
