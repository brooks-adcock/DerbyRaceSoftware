import type { Car, Heat, Lane, RaceSettings } from './storage';

export type HeatAlgorithmKey = 'rotation' | 'chaos';
export type HeatAlgorithm = (cars: Car[], settings: RaceSettings) => Heat[];

export const ALGORITHM_DISPLAY_NAMES: Record<HeatAlgorithmKey, string> = {
  'rotation': 'Max Efficiency',
  'chaos': 'Max Randomness',
};

/**
 * Rotation algorithm: Each car races on each track exactly once.
 * Cars are shuffled randomly, then assigned to lanes using modular rotation.
 */
function rotationAlgorithm(cars: Car[], settings: RaceSettings): Heat[] {
  // Shuffle cars for randomness
  const shuffled_cars = [...cars].sort(() => Math.random() - 0.5);
  const n_cars = shuffled_cars.length;
  const n_tracks = settings.n_tracks;
  const n_heats = Math.max(n_cars, n_tracks);

  const heats: Heat[] = [];
  for (let h = 0; h < n_heats; h++) {
    const lanes: Lane[] = [];
    for (let t = 0; t < n_tracks; t++) {
      const car_idx = (h + t) % n_heats;
      lanes.push({
        car_id: car_idx < n_cars ? shuffled_cars[car_idx].id : null,
        time: null
      });
    }
    heats.push({
      id: h + 1,
      lanes
    });
  }

  return heats;
}

/**
 * Chaos algorithm: Each car races on each track exactly once,
 * but heat assignments are completely random.
 */
function chaosAlgorithm(cars: Car[], settings: RaceSettings): Heat[] {
  const n_cars = cars.length;
  const n_tracks = settings.n_tracks;
  const n_heats = Math.max(n_cars, n_tracks);

  // Initialize empty heats
  const heats: Heat[] = [];
  for (let h = 0; h < n_heats; h++) {
    const lanes: Lane[] = [];
    for (let t = 0; t < n_tracks; t++) {
      lanes.push({ car_id: null, time: null });
    }
    heats.push({ id: h + 1, lanes });
  }

  // For each car, assign to a random available slot on each track
  for (const car of cars) {
    // Build available heat indices for each track
    const available_by_track: number[][] = [];
    for (let t = 0; t < n_tracks; t++) {
      const available: number[] = [];
      for (let h = 0; h < n_heats; h++) {
        if (heats[h].lanes[t].car_id === null) {
          available.push(h);
        }
      }
      available_by_track.push(available);
    }

    // Assign car to a random available heat for each track
    for (let t = 0; t < n_tracks; t++) {
      const available = available_by_track[t];
      const random_idx = Math.floor(Math.random() * available.length);
      const heat_idx = available[random_idx];
      heats[heat_idx].lanes[t].car_id = car.id;
    }
  }

  return heats;
}

export const HEAT_ALGORITHMS: Record<string, HeatAlgorithm> = {
  'rotation': rotationAlgorithm,
  'chaos': chaosAlgorithm,
};

export const DEFAULT_ALGORITHM = 'rotation';
