# Tailwind Component Library Inventory

## Template: Radiant (Tailwind Plus)

A premium SaaS marketing site template from [Tailwind Plus](https://tailwindcss.com/plus).

---

## Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4.1.4 | Utility-first CSS framework |
| `@headlessui/react` | ^2.1.1 | Unstyled, accessible UI primitives |
| `@heroicons/react` | ^2.1.4 | Official Tailwind icon set |
| `framer-motion` | ^11.2.10 | Animation library |
| `clsx` | ^2.1.1 | Class name utility |
| `next` | 14.2.11 | React framework |

---

## Pre-Built Components

### Layout & Structure
| Component | File | Description |
|-----------|------|-------------|
| Container | `container.tsx` | Responsive max-width wrapper |
| Navbar | `navbar.tsx` | Site header with navigation |
| Footer | `footer.tsx` | Site footer with links |
| PlusGrid | `plus-grid.tsx` | Grid layout with decorative plus signs |

### Typography
| Component | File | Description |
|-----------|------|-------------|
| Heading | `text.tsx` | Large display headings (H1-H6) |
| Subheading | `text.tsx` | Mono-spaced uppercase labels |
| Lead | `text.tsx` | Large paragraph text |

### Interactive Elements
| Component | File | Variants |
|-----------|------|----------|
| Button | `button.tsx` | `primary`, `secondary`, `outline` |
| Link | `link.tsx` | Enhanced Next.js Link wrapper |

### Marketing & Display
| Component | File | Description |
|-----------|------|-------------|
| BentoCard | `bento-card.tsx` | Feature cards in bento grid layout |
| Screenshot | `screenshot.tsx` | App screenshot with frame |
| Testimonials | `testimonials.tsx` | Customer quote carousel/grid |
| Map | `map.tsx` | Decorative world map with markers |

### Logo & Branding
| Component | File | Description |
|-----------|------|-------------|
| Logo | `logo.tsx` | Site logo component |
| LogoCloud | `logo-cloud.tsx` | Row of partner/client logos |
| LogoCluster | `logo-cluster.tsx` | Grouped logos (e.g., integrations) |
| LogoTimeline | `logo-timeline.tsx` | Animated logo timeline |

### Animation & Effects
| Component | File | Description |
|-----------|------|-------------|
| AnimatedNumber | `animated-number.tsx` | Counting number animation |
| Gradient | `gradient.tsx` | Decorative gradient backgrounds |
| Keyboard | `keyboard.tsx` | 3D keyboard illustration |
| LinkedAvatars | `linked-avatars.tsx` | Connected avatar display |

---

## Pre-Built Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Marketing homepage |
| `/pricing` | `pricing/page.tsx` | Pricing tiers page |
| `/company` | `company/page.tsx` | About/Company page |
| `/login` | `login/page.tsx` | Login form page |
| `/blog` | `blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `blog/[slug]/page.tsx` | Individual blog post |
| `/studio` | `studio/[[...tool]]/page.tsx` | Sanity CMS admin |

---

## Static Assets

### Images (`/public/`)
- **Company photos**: 5 images
- **Team photos**: 9 team member headshots
- **Testimonial photos**: 6 customer photos
- **Screenshots**: 5 app screenshots
- **Map markers**: 5 location images

### Logos (`/public/`)
- **Logo cloud**: 5 partner logos (Laravel, SavvyCal, Statamic, Transistor, Tuple)
- **Logo cluster**: 6 job board logos
- **Logo timeline**: 12 integration logos (Slack, Zoom, Asana, etc.)
- **Investors**: 2 investor logos

---

## Headless UI Components Available

Via `@headlessui/react`, the following unstyled primitives are available:
- Dialog (Modal)
- Disclosure (Accordion)
- Listbox (Select)
- Menu (Dropdown)
- Popover
- RadioGroup
- Switch (Toggle)
- Tabs
- Transition

---

## Heroicons Available

Via `@heroicons/react`, 300+ icons in three styles:
- `@heroicons/react/24/outline` - 24px outlined
- `@heroicons/react/24/solid` - 24px filled
- `@heroicons/react/20/solid` - 20px filled (for smaller UI)
- `@heroicons/react/16/solid` - 16px filled (for inline)

Browse all icons: https://heroicons.com

---

## Notes

- Uses **Tailwind CSS v4** (new CSS-first config)
- Blog powered by **Sanity CMS**
- All components use `clsx` for conditional class merging
- Follows Headless UI data-attribute patterns (`data-hover`, `data-disabled`)

