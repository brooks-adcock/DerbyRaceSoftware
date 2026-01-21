# Pinewood Derby Web UI

Next.js web application for managing Pinewood Derby races. Built with Tailwind CSS and Radiant components.

## Development

### With Docker (Recommended)

From the project root:

```bash
./dev_start.sh      # Start services
./dev_tail.sh       # View logs
./dev_stop.sh       # Stop services
```

Access at http://localhost:3000

### Without Docker

```bash
cd ui_web/code
npm install
npm run dev
```

---

## Pages

| Route | Purpose | Access |
|-------|---------|--------|
| `/` | Dashboard / home | All |
| `/register` | Car registration form | Admin |
| `/heats` | Heat management, race control | Admin |
| `/results` | Results leaderboard | All |
| `/public` | Spectator display (TV/projector) | All |
| `/admin` | System settings | Admin |
| `/health` | Hardware connection status | Admin |
| `/judging` | Design judging interface | Judges |
| `/setup` | Initial system setup | Admin |

---

## API Routes

| Endpoint | Description |
|----------|-------------|
| `/api/cars` | CRUD for registered cars |
| `/api/race` | Race/heat management, proxies to Pi |
| `/api/hardware` | Hardware status from Pi |
| `/api/settings` | System configuration |

---

## Key Components

Located in `src/components/`:

| Component | Purpose |
|-----------|---------|
| `countdown-overlay.tsx` | Race start countdown |
| `setup-checklist.tsx` | Pre-race setup verification |
| `navigation-wrapper.tsx` | Responsive nav with drawer |
| `menu-drawer.tsx` | Mobile navigation |

### UI Library (Radiant)

Pre-built components from `src/components/`:
- `button.tsx` - Primary/secondary/outline buttons
- `text.tsx` - Heading, Subheading, Lead typography
- `container.tsx` - Max-width wrapper
- `navbar.tsx`, `footer.tsx` - Layout components

---

## Data Storage

Race data persists in `data/` directory:

| File | Contents |
|------|----------|
| `cars.json` | Registered cars |
| `settings.json` | System configuration |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_HOST_IP` | Pi's IP for API calls | `localhost` |
| `WATCHPACK_POLLING` | Enable hot-reload in Docker | `true` |

---

## Hardware Communication

The UI connects to the Raspberry Pi track controller:

```typescript
// src/lib/usePiWebSocket.ts
// WebSocket hook for real-time race results

// src/lib/storage.ts  
// Data persistence and Pi API proxy
```

When Pi is unavailable, the UI operates in standalone mode with manual time entry.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Components:** Headless UI, Heroicons
- **Animations:** Framer Motion
