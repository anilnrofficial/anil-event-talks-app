# BQ Release Pulse 🚀

A modern, responsive, and glassmorphic web dashboard built to fetch, filter, and share Google BigQuery release notes. 

The application utilizes a **Python/Flask** backend to parse and cache the official Atom feed. On the frontend, vanilla **HTML, CSS, and JavaScript** create a premium dark-themed dashboard. Users can filter updates, search for keywords, and select specific release notes to customize and post them directly to **X (Twitter)** using built-in intent generators.

---

## ✨ Features

- 🔄 **Atom Feed Sync**: Automatically fetches updates from the official [BigQuery Release Notes Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml).
- ⚡ **Offline-First Caching**: Caches parsed results locally to `cache.json` for lightning-fast loads. The UI indicates whether you're viewing cached or live data.
- 🧩 **Multi-Update Splitting**: Splits daily entries containing multiple updates (e.g., a *Feature* and an *Issue* logged on the same day) into individual cards.
- 🔍 **Live Filtering & Sorting**: Filter notes instantly by type (e.g., *Feature*, *Issue*, *Deprecation*, *Announcement*) and search terms.
- 🐦 **Tweet Composer Drawer**: Selecting any update slides out a Twitter/X Post builder.
  - Generates automated optimal tweet drafts containing note summaries and source links.
  - Enforces character counts (visual warning above 250 characters, actions blocked above 280).
  - One-click copy to clipboard or direct posting using Twitter Web Intents.
- 🎨 **Premium Aesthetics**: Styled with a dark-slate theme, Outfit typography, custom SVG icons, glassmorphism backdrops, and interactive state transitions.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
- **Fonts & Icons**: Outfit (Google Fonts), Embedded SVGs

---

## 📂 Project Directory Structure

```text
bq-releases-notes/
├── app.py                 # Flask server & Atom XML parser logic
├── start.sh               # Shell bootloader (setup + execution script)
├── requirements.txt       # Python dependencies (Flask)
├── cache.json             # Cached release notes payload (local)
├── templates/
│   └── index.html         # Single-page dashboard interface HTML template
└── static/
    ├── css/
    │   └── style.css      # Visual style guidelines, badges, and responsive layers
    └── js/
        └── app.js         # Client-side state manager and X/Twitter handlers
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Python 3** installed on your system.

### Running the App

1. Clone or navigate to the repository directory:
   ```bash
   cd bq-releases-notes
   ```

2. Make the startup script executable (if not already):
   ```bash
   chmod +x start.sh
   ```

3. Run the startup script:
   ```bash
   ./start.sh
   ```
   *This script automatically creates a Python virtual environment (`.venv`), installs all dependencies, and boots the Flask web server.*

4. Open your browser and go to:
   **[http://localhost:5001](http://localhost:5001)**

---

## 📡 API Endpoints

- **`GET /`**: Renders the dashboard user interface.
- **`GET /api/updates`**: Returns a JSON object containing the parsed release notes list (uses the local cache file if available).
- **`POST /api/refresh`**: Commands the backend to perform a fresh fetch from the Google feed, updates `cache.json`, and returns the newest payload.
