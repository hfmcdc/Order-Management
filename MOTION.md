# Motion system

Everything animated in the app comes from one of three places. Pick the lightest that works.

| Need | Tool | Where |
|---|---|---|
| Hover / press / focus / shimmer / pulse | **CSS** (zero JS) | `globals.css` — `.press`, `.lift`, `.skeleton`, `.sheen`, `.btn-shine`, `.badge-pop`, `.fab-glow` |
| Springs, gliding highlights, enter/exit, count-up | **framer-motion** | `src/components/motion/*` |
| Whole-page transitions | `src/app/template.tsx` | re-mounts on every navigation |

`MotionProvider` (in `layout.tsx`) sets `reducedMotion="user"`, so people with "Reduce motion" enabled get fades only — no extra work per component. A matching `prefers-reduced-motion` rule covers the CSS animations.

## Building blocks (`src/components/motion`)
- `Stagger` / `StaggerItem` — children rise in one after another. Mount `<Stagger>` *when data arrives* (`{data && <Stagger>…}`).
- `AnimatedNumber` — count-up/roll for ₹ and counts (`<AnimatedNumber value={n} prefix="₹" />`).
- `Modal` — spring bottom-sheet/dialog with animated exit, Esc + backdrop close, portal-rendered.
- `SegmentedPills` — one highlight glides between options (status / payment).
- `ConfettiBurst` — `burstKey` → change to any new non-zero number to fire.
- `AnimatedCheck` — circle pops, tick draws itself.

## Adding more from easyui.site
EasyUI is copy-paste (React + Tailwind + framer-motion). Everything above already uses the same stack, so any EasyUI component drops in. Best next candidates for this app:
- **Undo Toast / Velocity Toast** — "Order deleted · Undo"
- **Particle Delete** — dissolving effect for delete actions
- **Animated Tabs / Pill Navigation** — if you add tabs to Production
- **Payment Receipt Printer / Payment Status** — invoice or payment confirmation moment
- **Package Box** — Boxes page hero
- **Stat Card** (count-up + sparkline) — dashboard KPIs over time
- **Sheet** — replace "More" sheet or edit forms with a draggable drawer

Install one with the shadcn CLI command shown on its page, then restyle with the app tokens (`bg-ivory`, `text-maroon-800`, `bg-marigold-500`…) — EasyUI's defaults are monochrome.
