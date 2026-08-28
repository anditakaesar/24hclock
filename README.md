# 24-Hour Analog Clock

A full-viewport analog clock rendered on a 24-hour dial with configurable, timezone-aware time-range highlighting. Built with vanilla HTML, CSS, and JavaScript — no dependencies, no build step.

## Features

- **24-hour dial** — 24 major hour ticks with 15-minute subticks, hour labels `0–23`, and a 5-minute minute track (`5–60`). The hour hand completes one revolution per day (15°/hour); the minute hand rotates once per hour. Hands sweep smoothly via `requestAnimationFrame`.
- **Chronograph-style subdial** — a 12-hour subdial on the right side of the face with hour, minute, and second hands for quick 12-hour reading.
- **Date window** — compact readout showing the local date (`yyyy-MM-dd`) and digital time (`HH:mm:ss`) for the active timezone.
- **Timezone selector** — switch the displayed timezone from the clock face. Defaults to the viewer's local timezone and persists the selection in `localStorage`.
- **Time-range highlighting** — one or more time ranges are drawn as translucent, color-coded wedges on the dial. Ranges are defined in a JSON config with optional per-range timezone, start/end time (`HH:mm`), label, and color.
- **Hover tooltip** — hovering a range wedge reveals its label in a tooltip bubble.
- **Config reload** — a reload button re-reads `config.json` and re-renders the range wedges without a page refresh.
- **Fully responsive** — scales to fill any viewport via `vmin`-based sizing; runs as a static page with no server required.

<img width="1259" height="1349" alt="image" src="https://github.com/user-attachments/assets/9d3e24cd-d317-43b5-a7e9-d5b27fcf5190" />

## Getting Started

Clone the directory and open `index.html` in any modern browser.

> **Note:** Browsers restrict `fetch()` on `file://` URLs. To have `config.json` edits picked up live (and to use the reload button), serve the directory over HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

If `config.json` cannot be fetched, the app falls back to an embedded copy of the config in `index.html`.

## Configuration

Ranges are defined in `config.json`:

```json
{
  "ranges": [
    {
      "start": "09:00",
      "end": "12:00",
      "label": "Peak Window 1",
      "timezone": "UTC+8",
      "color": "#ffb347"
    }
  ]
}
```

| Field      | Required | Description                                                                 |
| ---------- | -------- | --------------------------------------------------------------------------- |
| `start`    | Yes      | Range start time, `HH:mm` (24-hour format).                                 |
| `end`      | Yes      | Range end time, `HH:mm`. May wrap past midnight (e.g. `22:00` – `02:00`).   |
| `label`    | Yes      | Description shown in the hover tooltip.                                     |
| `timezone` | No       | Timezone the times are expressed in. Accepts fixed offsets (`UTC+8`, `GMT+8:30`, `+05:45`) or IANA names (`Asia/Singapore`, `Europe/Berlin`). DST-aware for IANA names. Omit or use `"local"` for the viewer's timezone. |
| `color`    | No       | Wedge color. Defaults to amber (`#ffb347`).                                 |

Ranges are converted to the clock's active timezone before rendering, so a `09:00–12:00` range defined on `UTC+8` appears at `08:00–11:00` on a UTC+7 display, and exactly at `09:00–12:00` when the display timezone is set to `UTC+8`.

## Project Structure

```
.
├── index.html   # Markup, embedded fallback config
├── style.css    # Theme and layout (dark neon, vmin-responsive)
├── script.js    # Dial rendering, time math, timezone handling, interactivity
└── config.json  # Time-range configuration
```

## Technical Notes

- Timezone conversion uses `Intl.DateTimeFormat` with offset caching (recomputed at most once per minute or on zone change) to avoid per-frame `Intl` work in the animation loop.
- Hour-hand angle: `(hour % 24) * 15° + minute * 0.25° + second / 240°`. Minute hand: `minute * 6° + second * 0.1°`.
- The animation loop pauses when the tab is hidden (`visibilitychange`) to conserve resources.
