import { describe, it, expect } from 'vitest';
import { HEAT_ALGORITHMS } from './heatAlgorithms';
import type { Car, RaceSettings } from './storage';

const chaosAlgorithm = HEAT_ALGORITHMS['chaos'];

function makeCars(n: number): Car[] {
  const cars: Car[] = [];
  for (let i = 1; i <= n; i++) {
    cars.push({
      id: i,
      first_name: `First${i}`,
      last_name: `Last${i}`,
      car_name: `Car${i}`,
      is_beauty: false,
      win_preference: 'speed',
      photo_hash: '',
      division: 'Boys: Lion/Tiger',
      registration_status: 'REGISTERED',
      weight_oz: 5.0,
      is_wheels_roll: true,
      is_length_pass: true,
      is_width_pass: true,
      is_ground_clearance_pass: true,
      is_no_loose_parts: true,
      track_times: [],
      beauty_scores: [],
    });
  }
  return cars;
}

function makeSettings(n_tracks: number): RaceSettings {
  return {
    n_tracks,
    gate_up_val: 0,
    gate_down_val: 90,
    pi_url: '',
    divisions: ['Boys: Lion/Tiger', 'Boys: Older Scouts', 'Boys: Family'],
  };
}

function validateHeats(cars: Car[], settings: RaceSettings) {
  const heats = chaosAlgorithm(cars, settings);
  const n_tracks = settings.n_tracks;
  const car_ids = cars.map(c => c.id);

  // For each track, count appearances of each car
  for (let t = 0; t < n_tracks; t++) {
    const car_counts: Record<number, number> = {};
    
    for (const heat of heats) {
      const car_id = heat.lanes[t].car_id;
      if (car_id !== null) {
        car_counts[car_id] = (car_counts[car_id] || 0) + 1;
      }
    }

    // Each car should appear exactly once on this track
    for (const car_id of car_ids) {
      expect(car_counts[car_id], `Car ${car_id} on track ${t}`).toBe(1);
    }
  }

  // Verify heat count
  const expected_heats = Math.max(cars.length, n_tracks);
  expect(heats.length).toBe(expected_heats);
}

describe('chaosAlgorithm', () => {
  const N_TRACKS = 4;

  it('handles n_cars = 1', () => {
    validateHeats(makeCars(1), makeSettings(N_TRACKS));
  });

  it('handles n_cars = n_tracks - 1', () => {
    validateHeats(makeCars(N_TRACKS - 1), makeSettings(N_TRACKS));
  });

  it('handles n_cars = n_tracks', () => {
    validateHeats(makeCars(N_TRACKS), makeSettings(N_TRACKS));
  });

  it('handles n_cars = n_tracks + 1', () => {
    validateHeats(makeCars(N_TRACKS + 1), makeSettings(N_TRACKS));
  });

  it('handles n_cars = 50', () => {
    validateHeats(makeCars(50), makeSettings(N_TRACKS));
  });

  it('handles n_cars = 100', () => {
    validateHeats(makeCars(100), makeSettings(N_TRACKS));
  });
});
