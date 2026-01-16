import { NextRequest, NextResponse } from 'next/server';
import { Storage, Heat } from '@/lib/storage';

export async function GET() {
  const heats = await Storage.getHeats();
  return NextResponse.json(heats);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'generate') {
      // Stub generation logic - for real we'd need a round-robin scheduler
      const cars = await Storage.getCars();
      const settings = await Storage.getSettings();
      const active_cars = cars.filter(c => c.registration_status === 'REGISTERED');
      
      const new_heats: Heat[] = [];
      // Very simple stub: just one car per track in order
      for (let i = 0; i < active_cars.length; i += settings.n_tracks) {
        const lane_cars = active_cars.slice(i, i + settings.n_tracks).map(c => c.id);
        while (lane_cars.length < settings.n_tracks) lane_cars.push(null);
        
        new_heats.push({
          id: Math.floor(i / settings.n_tracks) + 1,
          lane_cars,
          lane_times: new Array(settings.n_tracks).fill(null)
        });
      }
      
      await Storage.saveHeats(new_heats);
      return NextResponse.json(new_heats);
    }
    
    if (body.action === 'update_time') {
      const { heat_id, lane_index, time } = body;
      const heats = await Storage.getHeats();
      const heat = heats.find(h => h.id === heat_id);
      if (heat) {
        heat.lane_times[lane_index] = time;
        await Storage.saveHeats(heats);
        
        // Also update the car's record
        const car_id = heat.lane_cars[lane_index];
        if (car_id) {
          const cars = await Storage.getCars();
          const car = cars.find(c => c.id === car_id);
          if (car) {
            car.track_times.push({ time, is_included: true });
            const included_times = car.track_times.filter(t => t.is_included).map(t => t.time);
            car.average_time = included_times.reduce((a, b) => a + b, 0) / included_times.length;
            await Storage.saveCars(cars);
          }
        }
      }
      return NextResponse.json(heats);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to handle heat' }, { status: 500 });
  }
}
