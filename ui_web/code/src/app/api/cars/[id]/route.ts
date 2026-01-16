import { NextRequest, NextResponse } from 'next/server';
import { Storage, Car } from '@/lib/storage';

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
    const updates = await request.json();
    const cars = await Storage.getCars();
    const car_index = cars.findIndex((c) => c.id === parseInt(params.id));

    if (car_index === -1) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    const updated_car = { ...cars[car_index], ...updates };
    
    // Calculate average time if track times changed
    if (updates.track_times) {
      const included_times = updated_car.track_times
        .filter((t: any) => t.is_included)
        .map((t: any) => t.time);
      if (included_times.length > 0) {
        updated_car.average_time = included_times.reduce((a: number, b: number) => a + b, 0) / included_times.length;
      } else {
        updated_car.average_time = undefined;
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
