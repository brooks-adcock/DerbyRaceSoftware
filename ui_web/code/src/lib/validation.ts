import type { Car, Run } from './storage';

export interface LaneIssue {
  type: 'missing' | 'duplicate';
  lane: number;
  count: number; // 0 for missing, >1 for duplicate
}

export interface CarValidation {
  is_valid: boolean;
  missing_lanes: number[];
  duplicate_lanes: number[]; // lanes with >1 valid run
  issues: LaneIssue[];
}

/**
 * Validates a car's runs for lane coverage issues.
 * Checks that each lane has exactly one valid (is_included) run.
 */
export function validateCarLanes(car: Car, n_tracks: number): CarValidation {
  const included_runs = car.runs.filter(r => r.is_included);
  
  // Count valid runs per lane
  const lane_counts: Record<number, number> = {};
  for (let lane = 1; lane <= n_tracks; lane++) {
    lane_counts[lane] = 0;
  }
  for (const run of included_runs) {
    if (run.lane >= 1 && run.lane <= n_tracks) {
      lane_counts[run.lane]++;
    }
  }
  
  const missing_lanes: number[] = [];
  const duplicate_lanes: number[] = [];
  const issues: LaneIssue[] = [];
  
  for (let lane = 1; lane <= n_tracks; lane++) {
    const count = lane_counts[lane];
    if (count === 0) {
      missing_lanes.push(lane);
      issues.push({ type: 'missing', lane, count: 0 });
    } else if (count > 1) {
      duplicate_lanes.push(lane);
      issues.push({ type: 'duplicate', lane, count });
    }
  }
  
  return {
    is_valid: missing_lanes.length === 0 && duplicate_lanes.length === 0,
    missing_lanes,
    duplicate_lanes,
    issues,
  };
}

/**
 * Formats lane issues into a human-readable string.
 */
export function formatLaneIssues(validation: CarValidation): string {
  const parts: string[] = [];
  
  if (validation.missing_lanes.length > 0) {
    parts.push(`Missing lane${validation.missing_lanes.length > 1 ? 's' : ''}: ${validation.missing_lanes.join(', ')}`);
  }
  
  if (validation.duplicate_lanes.length > 0) {
    const dupe_parts = validation.duplicate_lanes.map(lane => {
      const issue = validation.issues.find(i => i.lane === lane && i.type === 'duplicate');
      return `${lane} (${issue?.count}x)`;
    });
    parts.push(`Duplicate lane${validation.duplicate_lanes.length > 1 ? 's' : ''}: ${dupe_parts.join(', ')}`);
  }
  
  return parts.join(' · ');
}
