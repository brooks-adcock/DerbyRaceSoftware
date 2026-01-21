import { NextRequest, NextResponse } from 'next/server';
import { Storage, Heat, Lane, Race, RaceState } from '@/lib/storage';
import os from 'os';

export async function GET() {
  const race = await Storage.getRace();
  
  // Get host IP from env or detect it
  let local_ip = process.env.NEXT_PUBLIC_HOST_IP;
  
  if (!local_ip) {
    const network_interfaces = os.networkInterfaces();
    local_ip = 'localhost';
    for (const interface_name in network_interfaces) {
      const interfaces = network_interfaces[interface_name];
      if (interfaces) {
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            local_ip = iface.address;
            break;
          }
        }
      }
      if (local_ip !== 'localhost') break;
    }
  }

  // Include port if not standard 80
  const port = process.env.PORT || '3000';
  const full_address = port === '80' ? local_ip : `${local_ip}:${port}`;

  return NextResponse.json({ ...race, local_ip: full_address });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const race = await Storage.getRace();

    if (body.action === 'update_state') {
      const new_state = body.state as RaceState;

      // Validate transition to RACING
      if (new_state === 'RACING') {
        const cars = await Storage.getCars();
        const invalid_cars = cars.filter(c => 
          c.registration_status !== 'REGISTERED' && 
          c.registration_status !== 'COURTESY' && 
          c.registration_status !== 'DISQUALIFIED'
        );

        if (invalid_cars.length > 0) {
          return NextResponse.json({ 
            error: `All cars must be checked-in. ${invalid_cars.length} cars are still in ${invalid_cars[0].registration_status} state.` 
          }, { status: 400 });
        }

        const active_cars = cars.filter(c => c.registration_status === 'REGISTERED' || c.registration_status === 'COURTESY');
        if (active_cars.length === 0) {
          return NextResponse.json({ 
            error: 'No cars ready to race. Please register at least one car.' 
          }, { status: 400 });
        }
      }

      race.state = new_state;
      await Storage.saveRace(race);

      // Reset presentation visibility when entering COMPLETE mode
      if (new_state === 'COMPLETE') {
        const settings = await Storage.getSettings();
        if (settings.presentation) {
          settings.presentation.is_visible = false;
          await Storage.saveSettings(settings);
        }
      }

      return NextResponse.json(race);
    }

    if (body.action === 'generate_heats') {
      const cars = await Storage.getCars();
      const settings = await Storage.getSettings();
      const active_cars = cars.filter(c => c.registration_status === 'REGISTERED' || c.registration_status === 'COURTESY');
      
      if (active_cars.length === 0) {
        return NextResponse.json({ error: 'No cars with "REGISTERED" or "COURTESY" status found. Please check-in cars first.' }, { status: 400 });
      }

      // Shuffle cars for randomness
      const shuffled_cars = [...active_cars].sort(() => Math.random() - 0.5);
      const n_cars = shuffled_cars.length;
      const n_tracks = settings.n_tracks;
      const n_heats = Math.max(n_cars, n_tracks);

      const new_heats: Heat[] = [];
      for (let h = 0; h < n_heats; h++) {
        const lanes: Lane[] = [];
        for (let t = 0; t < n_tracks; t++) {
          const car_idx = (h + t) % n_heats;
          lanes.push({
            car_id: car_idx < n_cars ? shuffled_cars[car_idx].id : null,
            time: null
          });
        }
        new_heats.push({
          id: h + 1,
          lanes
        });
      }
      
      race.heats = new_heats;
      race.current_heat_id = new_heats.length > 0 ? 1 : null;
      await Storage.saveRace(race);
      return NextResponse.json(race);
    }

    if (body.action === 'update_current_heat') {
      race.current_heat_id = body.heat_id;
      await Storage.saveRace(race);
      return NextResponse.json(race);
    }

    if (body.action === 'update_heat_time') {
      const { heat_id, lane_index, time } = body;
      const heat = race.heats.find(h => h.id === heat_id);
      if (heat && heat.lanes[lane_index]) {
        heat.lanes[lane_index].time = time;
        await Storage.saveRace(race);
        
        const car_id = heat.lanes[lane_index].car_id;
        if (car_id) {
          const cars = await Storage.getCars();
          const car = cars.find(c => c.id === car_id);
          if (car) {
            const is_included = car.registration_status !== 'COURTESY';
            // Remove existing time for this heat if any
            car.track_times = car.track_times.filter(t => t.heat_id !== heat_id);
            car.track_times.push({ heat_id, track_number: lane_index + 1, time, is_included });
            
            const included_times = car.track_times.filter(t => t.is_included).map(t => t.time);
            if (included_times.length > 0) {
              car.average_time = included_times.reduce((a, b) => a + b, 0) / included_times.length;
            } else {
              car.average_time = undefined;
            }
            await Storage.saveCars(cars);
          }
        }
      }
      return NextResponse.json(race);
    }

    if (body.action === 'clear_heat_times') {
      const { heat_id } = body;
      const heat = race.heats.find(h => h.id === heat_id);
      
      if (heat) {
        const cars = await Storage.getCars();
        
        for (const lane of heat.lanes) {
          lane.time = null;
          
          // Also remove from car's track_times
          if (lane.car_id) {
            const car = cars.find(c => c.id === lane.car_id);
            if (car) {
              car.track_times = car.track_times.filter(t => t.heat_id !== heat_id);
              const included_times = car.track_times.filter(t => t.is_included).map(t => t.time);
              car.average_time = included_times.length > 0 
                ? included_times.reduce((a, b) => a + b, 0) / included_times.length 
                : undefined;
            }
          }
        }
        
        await Storage.saveCars(cars);
        await Storage.saveRace(race);
      }
      return NextResponse.json(race);
    }

    if (body.action === 'raise_gate') {
      // Raise gate to ready position (hold cars)
      const settings = await Storage.getSettings();
      
      if (settings.pi_url) {
        try {
          await fetch(`http://${settings.pi_url}/gate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_down: false }),
          });
          console.log('Gate raised via Pi');
        } catch (error) {
          console.error('Failed to raise gate on Pi:', error);
        }
      }
      
      return NextResponse.json({ status: 'ok', gate: 'up' });
    }

    if (body.action === 'trigger_gate') {
      const { heat_id } = body;
      const heat = heat_id 
        ? race.heats.find(h => h.id === heat_id)
        : race.heats.find((h: Heat) => h.lanes.some(l => l.time === null && l.car_id !== null));

      if (heat) {
        race.countdown_end = null; // Clear countdown - UI handles timing
        
        const settings = await Storage.getSettings();
        const cars = await Storage.getCars();
        
        // Build occupied_lanes array (1-indexed lane numbers with cars)
        const occupied_lanes: number[] = [];
        for (let i = 0; i < heat.lanes.length; i++) {
          if (heat.lanes[i].car_id !== null) {
            occupied_lanes.push(i + 1); // Pi uses 1-indexed lanes
          }
        }
        
        // Try to run race on Pi hardware
        let pi_results: { lane_results: Array<{ lane_number: number; finish_time_ms: number | null; is_dnf: boolean }> } | null = null;
        
        if (settings.pi_url) {
          try {
            const pi_response = await fetch(`http://${settings.pi_url}/race/run`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                heat_id: `heat-${heat.id}`,
                occupied_lanes,
              }),
            });
            
            if (pi_response.ok) {
              pi_results = await pi_response.json();
              console.log('Pi race results:', pi_results);
            } else if (pi_response.status === 409) {
              // Heat was cancelled (false start) - this is expected, ignore
              console.log('Pi heat cancelled (false start), awaiting new heat results');
            } else {
              console.error('Pi race failed:', await pi_response.text());
            }
          } catch (error) {
            console.error('Failed to connect to Pi:', error);
          }
        }
        
        // Apply results - from Pi if available, otherwise leave null for manual entry
        for (let i = 0; i < heat.lanes.length; i++) {
          const lane = heat.lanes[i];
          if (lane.car_id) {
            let finish_time: number | null = null;
            
            if (pi_results) {
              // Find result for this lane (Pi uses 1-indexed)
              const lane_result = pi_results.lane_results.find(r => r.lane_number === i + 1);
              if (lane_result && lane_result.finish_time_ms !== null && !lane_result.is_dnf) {
                // Convert ms to seconds
                finish_time = Math.round(lane_result.finish_time_ms) / 1000;
              }
            }
            
            lane.time = finish_time;
            
            if (finish_time !== null) {
              const car = cars.find(c => c.id === lane.car_id);
              if (car) {
                const is_included = car.registration_status !== 'COURTESY';
                // Remove existing time for this heat if any
                car.track_times = car.track_times.filter(t => t.heat_id !== heat.id);
                car.track_times.push({ heat_id: heat.id, track_number: i + 1, time: finish_time, is_included });
                
                const included_times = car.track_times.filter(t => t.is_included).map(t => t.time);
                car.average_time = included_times.length > 0 
                  ? included_times.reduce((a, b) => a + b, 0) / included_times.length 
                  : undefined;
              }
            }
          }
        }
        
        await Storage.saveCars(cars);
        await Storage.saveRace(race);
      }
      return NextResponse.json(race);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/race:', error);
    return NextResponse.json({ error: 'Failed to handle race update' }, { status: 500 });
  }
}
