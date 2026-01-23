# Division Migration Plan

## Overview
Replace `scout_level` with `division` throughout the codebase and implement a flexible, configurable division system with improved prize workflows.

---

## 1. Rename `scout_level` → `division`

### Files to Update (~28 occurrences)

| File | Changes |
|------|---------|
| `storage.ts` | `Car.scout_level` → `Car.division`, `RaceSettings.presentation.scout_level` → remove |
| `cars.json` | Data migration |
| `settings.json` | Add `divisions[]`, remove `presentation.scout_level` |
| `register/page.tsx` | State variable, form field, constants |
| `results/page.tsx` | Complete rewrite (new prize flow) |
| `public/page.tsx` | Update filtering logic for new prize display |
| `registration/page.tsx` | Column name, sort key, add orphan filter |
| `cars/[id]/page.tsx` | Detail view label, edit dropdown |
| `page.tsx` (home) | Display label |
| `api/cars/route.ts` | Field name in create |
| `api/cars/[id]/route.ts` | Field name in update |
| `heatAlgorithms.test.ts` | Test data |

---

## 2. Configurable Divisions in Settings

### New `RaceSettings` Shape
```typescript
interface RaceSettings {
  n_tracks: number;
  gate_up_val: number;
  gate_down_val: number;
  pi_url: string;
  heat_algorithm?: 'rotation' | 'chaos';
  divisions: string[];  // NEW - configurable list
  presentation?: {
    prize_name: string;    // NEW - custom prize name
    winner_car_id: number; // NEW - selected winner
    is_visible: boolean;
  };
}
```

### Default Divisions
```json
[
  "Girls: Family",
  "Girls: Daisy",
  "Girls: Brownie",
  "Girls: Junior",
  "Girls: Cadette",
  "Boys: Family",
  "Boys: Lion/Tiger",
  "Boys: Older Scouts"
]
```

### Setup Page UI
- List of divisions with delete button (no inline edit)
- "Add Division" button at bottom opens text input
- **Delete behavior**: If cars exist in the division, show modal asking which division to reassign them to (dropdown of remaining divisions), then delete

---

## 3. Registration List - Orphan Filter

### `registration/page.tsx` Changes
- Add filter toggle: "Show Orphaned Divisions"
- When enabled, shows only cars whose `division` doesn't exist in `settings.divisions`
- Visual indicator (warning icon/color) on orphaned rows
- Clicking an orphaned car opens edit to fix their division

---

## 4. Heat Generation with Division Picker

### `heats/page.tsx` Changes
- "Generate Heats" button opens modal instead of direct API call
- Modal contains:
  - Checkboxes for each division from `settings.divisions`
  - "Select All" / "Deselect All" buttons
  - Car count preview per division (active cars only)
  - "Generate" button - **disabled until at least one division is checked**

### API Changes
- `generate_heats` action accepts optional `divisions: string[]` filter
- Filters `active_cars` to only those matching selected divisions

---

## 5. Prize System (New Flow)

### Remove
- `SCOUT_LEVELS` constant
- Per-category result grids
- Auto-computed standings display
- Current "Present" buttons

### Add - Results Page
- Single "Show Prize" button
- Full entrant list sorted by avg time (for reference)

### Prize Modal
1. **Prize Name** - text input, required (e.g., "1st Place - Older Scouts")
2. **Division Filter** - checkboxes to narrow the list
3. **Entrant List** - cars in selected divisions, sorted by avg time ascending. **Excludes DNF cars.**
4. **Winner Selection** - click to select one car
5. **"Show on Public"** button - displays prize (disabled until prize name entered and winner selected)

### Public Display Changes
- Shows: Prize Name + Winner (photo, car name, owner, time)
- "Stop Presenting" returns to current idle state (no changes to idle behavior)

---

## Implementation Order

1. **Data layer** - Update `storage.ts` types, add default divisions
2. **API** - Update car routes, add division filter to heat generation
3. **Setup page** - Division management UI
4. **Registration page** - Rename column, add orphan filter
5. **Register page** - Use dynamic divisions from settings
6. **Car detail page** - Update field name and dropdown
7. **Heat generation** - Add division picker modal
8. **Results + Public pages** - New prize flow and display (done together)

---

## Data Migration

Not required - no critical data exists. Fresh start with new schema.
