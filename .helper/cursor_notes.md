# Cursor Notes (Memories)

These are the AI memories/notes that persist across all projects.

---

## This Project: Pinewood Derby Race Software

A complete race management system with:
- **Web UI** (`ui_web/`) - Next.js app for race management, registration, results
- **Track Controller** (`pi/`) - Raspberry Pi FastAPI server for gate + sensors
- **Mechanical** (`mechanical/`) - 3D printable parts for track hardware

The Pi connects to the web UI via REST + WebSocket. In dev mode, the Pi runs in mock hardware mode with simulated race times.

---

## Project Structure

**Docker Service Directory Layout**
For Docker services, organize directories with container meta files (Dockerfile, start.sh, scripts) at the service root (e.g., `./ui_web/`) and the actual application code in a `./code` subdirectory (e.g., `./ui_web/code/`). The Docker context should be the service root, not the code directory.

**Separate Script Files**
Create separate script files (e.g., `start.sh`) in the codebase instead of embedding code within Dockerfiles.

---

## Tech Stack Preferences

**Docker Compose Syntax**
Use `docker compose` (plugin syntax) instead of `docker-compose` (standalone). Colima provides the docker compose plugin.

**Web Framework**
Tornado is the preferred Python web framework.

---

## UI Components (Template Project)

**Use Radiant Tailwind Components**
When building UI in this project, prefer using the pre-built Radiant (Tailwind Plus) components from `ui_web/code/src/components/`. Available components include: Button (primary/secondary/outline), Heading, Subheading, Lead, Container, Navbar, Footer, BentoCard, Testimonials, LogoCloud, LogoCluster, LogoTimeline, AnimatedNumber, Gradient, Screenshot, Map, PlusGrid, LinkedAvatars, and Link. Also leverage @headlessui/react for modals/dropdowns/tabs, @heroicons/react for icons, and framer-motion for animations.

---

## Code Style

- Variables: `snake_case`
- Constants: `UPPER_CASE`
- Functions: `camelCase`
- Classes: `PascalCase`
- Factory methods: `MakeObjectFromParameters`
- Arrays: plural names
- Booleans: prefix with `is_`

