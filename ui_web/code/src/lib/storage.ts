import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CARS_FILE = path.join(DATA_DIR, 'cars.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const RACE_FILE = path.join(DATA_DIR, 'race.json');

export type RegistrationStatus = 'STARTED' | 'REVIEW' | 'REGISTERED' | 'DISQUALIFIED' | 'COURTESY';
export type RaceState = 'REGISTRATION' | 'RACING' | 'COMPLETE';

export interface TrackTime {
  heat_id?: number;
  track_number?: number;
  time: number;
  is_included: boolean;
}

export interface Car {
  id: number; // car number
  first_name: string;
  last_name: string;
  car_name: string;
  is_beauty: boolean;
  win_preference: 'beauty' | 'speed';
  photo_hash: string;
  scout_level: string;
  registration_status: RegistrationStatus;
  weight_oz: number;
  is_wheels_roll: boolean;
  is_length_pass: boolean;
  is_width_pass: boolean;
  is_ground_clearance_pass: boolean;
  is_no_loose_parts: boolean;
  track_times: TrackTime[];
  average_time?: number;
  overall_place?: number;
  class_place?: number;
  beauty_scores: number[];
  beauty_place_overall?: number;
  beauty_place_class?: number;
}

export interface RaceSettings {
  n_tracks: number;
  gate_up_val: number;
  gate_down_val: number;
  pi_url: string;  // URL to Pi hardware controller (e.g., "192.168.1.100:8000")
  presentation?: {
    type: 'speed' | 'beauty';
    scout_level: string;
    is_visible: boolean;
  };
}

export interface Lane {
  car_id: number | null;
  time: number | null;
}

export interface Heat {
  id: number;
  lanes: Lane[];
}

export interface Race {
  state: RaceState;
  heats: Heat[];
  manual_runs: Heat[];
  countdown_end: number | null;
  current_heat_id: number | null;
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJson<T>(file_path: string, default_data: T): Promise<T> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(file_path, 'utf-8');
    return JSON.parse(data);
  } catch {
    return default_data;
  }
}

async function writeJson<T>(file_path: string, data: T): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(file_path, JSON.stringify(data, null, 2));
}

export const Storage = {
  async getCars(): Promise<Car[]> {
    return readJson<Car[]>(CARS_FILE, []);
  },

  async saveCars(cars: Car[]): Promise<void> {
    await writeJson(CARS_FILE, cars);
  },

  async getSettings(): Promise<RaceSettings> {
    return readJson<RaceSettings>(SETTINGS_FILE, {
      n_tracks: 4,
      gate_up_val: 0,
      gate_down_val: 1,
      pi_url: '',
    });
  },

  async saveSettings(settings: RaceSettings): Promise<void> {
    await writeJson(SETTINGS_FILE, settings);
  },

  async getRace(): Promise<Race> {
    return readJson<Race>(RACE_FILE, {
      state: 'REGISTRATION',
      heats: [],
      manual_runs: [],
      countdown_end: null,
      current_heat_id: null,
    });
  },

  async saveRace(race: Race): Promise<void> {
    await writeJson(RACE_FILE, race);
  },
};
