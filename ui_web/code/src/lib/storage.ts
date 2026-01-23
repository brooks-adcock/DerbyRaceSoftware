import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CARS_FILE = path.join(DATA_DIR, 'cars.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const RACE_FILE = path.join(DATA_DIR, 'race.json');
const JUDGES_FILE = path.join(DATA_DIR, 'judges.json');

export type RegistrationStatus = 'STARTED' | 'REVIEW' | 'REGISTERED' | 'DISQUALIFIED' | 'COURTESY';
export type RaceState = 'REGISTRATION' | 'RACING' | 'COMPLETE';

export interface Run {
  time: number;
  timestamp: string;
  is_included: boolean;
  lane: number;
}

export interface BeautyScore {
  score: number;
  judge_id: string;
  timestamp: string;
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
  division: string;
  registration_status: RegistrationStatus;
  weight_oz: number;
  is_wheels_roll: boolean;
  is_length_pass: boolean;
  is_width_pass: boolean;
  is_ground_clearance_pass: boolean;
  is_no_loose_parts: boolean;
  runs: Run[];
  average_time?: number;
  overall_place?: number;
  class_place?: number;
  beauty_scores: BeautyScore[];
  average_beauty_score?: number;
  beauty_place_overall?: number;
  beauty_place_class?: number;
}

export interface RaceSettings {
  n_tracks: number;
  gate_up_val: number;
  gate_down_val: number;
  pi_url: string;  // URL to Pi hardware controller (e.g., "192.168.1.100:8000")
  heat_algorithm?: 'rotation' | 'chaos';  // defaults to 'rotation'
  divisions: string[];
  presentation?: {
    prize_name: string;
    winner_car_id: number;
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

export interface Judge {
  id: string;
  name: string;
  allowed_divisions: string[];  // empty = all divisions
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
      divisions: [
        "Girls: Family",
        "Girls: Daisy",
        "Girls: Brownie",
        "Girls: Junior",
        "Girls: Cadette",
        "Boys: Family",
        "Boys: Lion/Tiger",
        "Boys: Older Scouts"
      ],
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

  async getJudges(): Promise<Judge[]> {
    return readJson<Judge[]>(JUDGES_FILE, []);
  },

  async saveJudges(judges: Judge[]): Promise<void> {
    await writeJson(JUDGES_FILE, judges);
  },
};
