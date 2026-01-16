import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CARS_FILE = path.join(DATA_DIR, 'cars.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const HEATS_FILE = path.join(DATA_DIR, 'heats.json');

export type RegistrationStatus = 'STARTED' | 'REVIEW' | 'REGISTERED';

export interface TrackTime {
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
  presentation?: {
    type: 'speed' | 'beauty';
    scout_level: string;
    is_visible: boolean;
  };
}

export interface Heat {
  id: number;
  lane_cars: (number | null)[]; // Car IDs
  lane_times: (number | null)[];
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
    });
  },

  async saveSettings(settings: RaceSettings): Promise<void> {
    await writeJson(SETTINGS_FILE, settings);
  },

  async getHeats(): Promise<Heat[]> {
    return readJson<Heat[]>(HEATS_FILE, []);
  },

  async saveHeats(heats: Heat[]): Promise<void> {
    await writeJson(HEATS_FILE, heats);
  },
};
