# 05. How the Calculations and Data Flow Work (Easy English)

> **Hey team!** Use this guide whenever someone asks:  
> *"Where did you get your data?"* or *"What is calculated beforehand vs. live in the app?"*  
> Everything is explained in simple Grade 9 English with easy analogies.

---

## 🍳 1. The Big Picture: The "Kitchen" Analogy

Think of LunaMission like a smart kitchen cooking a fast, delicious meal:
- **Some ingredients are pre-chopped in the fridge (Pre-Calculated):** The heavy Moon mountain measurements from NASA satellites. Because mountains never walk away, we prepared them beforehand so the app opens instantly.
- **Some ingredients are cooked fresh on the stove (Live / Real-Time):** The positions of the Sun and Earth, which move through space depending on the exact date and launch delay you pick.

---

## 🌊 2. The Step-by-Step Data Flow

Here is how data travels from NASA satellites all the way to your laptop screen:

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        NASA Satellites (LOLA)        │     │       NASA JPL Horizons API          │
│   (Laser scans of lunar mountains)   │     │ (Where Sun & Earth are in space now) │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                            │
        [PRE-CALCULATED OFFLINE]                           [LIVE IN BACKEND]
                   │                                            │
                   ▼                                            ▼
          Mountain Skyline Data                      Live Sun & Earth Positions
       ("curated-horizons.json")                     (For your date & launch slip)
                   │                                            │
                   └─────────────────────┬──────────────────────┘
                                         ▼
                            [OUR LIVE VISIBILITY SOLVER]
                      "Is the Sun above or behind the mountain?"
                                         │
                                         ▼
                            [OPERATIONAL TIMELINE DATA]
                       - Yellow: Solar power (Full sunlight)
                       - Blue: Radio signal (Can see Earth)
                       - Black: Freezing shadow (Danger!)
                                         │
                                         ▼ (Clean JSON via REST API)
                            [REACT FRONTEND (:3000)]
                      (Draws the Sky-Ribbon, Timeline & 3D Rover)
```

---

## 🏔️ 3. What is PRE-CALCULATED? (Offline Stored Data)

### The Problem:
NASA's **LOLA satellite** (Lunar Orbiter Laser Altimeter) shot millions of laser beams at the Moon to map every crater and peak. The raw files are **huge gigabytes of data**. If our website tried to download and calculate gigabytes of raw laser data every time a user clicked a button, the browser would crash and freeze for 10 minutes!

### Our Solution:
1. **We did the heavy math beforehand** using Python scripts (`tooling/scripts/horizon_raymarch.py`).
2. For all 20 NASA landing sites, our computer looked outward in all 360 degrees around each site and calculated: *"How tall are the mountains on the horizon?"*
3. We saved this clean mountain skyline into a super-fast file: **`data/curated-horizons.json`**.
4. We also saved verified coordinates, crater names, and science notes in **`data/sites-registry.json`**.

👉 **In simple words:** Mountains on the Moon are fixed rock. They don't change if your flight is delayed. So we pre-calculate them once, and they load in 0.05 seconds!

---

## ⚡ 4. What is CALCULATED LIVE? (In Real Time)

When you click around the app, our backend microservice (`apps/api`) does 4 things **live in milliseconds**:

1. **Sun & Earth Sky Positions (NASA JPL Horizons):**  
   When you pick a landing date (e.g. November 1, 2026) or drag the **Launch Delay Slider** by +5 days, the backend queries NASA's orbital ephemeris database to ask: *"At this exact hour and minute, where are the Sun and Earth in the lunar sky?"*
2. **Mast Height Adjustment (1m, 2m, 5m, 10m):**  
   The backend calculates: *"If our solar panel is mounted on a 10-meter pole instead of 1 meter, does that lift it above the mountain's shadow?"*
3. **The Collision Test (The Visibility Solver):**  
   The backend compares the **live Sun position** against the **mountain skyline**:
   - Sun is higher than the mountain? ➔ **Sunlight! (Yellow bar)**
   - Sun is lower than the mountain? ➔ **Mountain Shadow! (Blackout)**
   - It calculates the exact second sunrise or sunset occurs using a mathematical root-finding method called **Brent's method**.
4. **The Compare Tournament (Three-Tier Funnel):**  
   On the Compare page, the backend tests all 7 sites against your vehicle rules in real time: it drops sites with too much dark, drops sites with steep slopes ($> 15^\circ$), and ranks the safest winner.

---

## 📊 5. Quick Comparison Table

| Feature | Pre-Calculated or Live? | Where does it come from? |
|---|---|---|
| **Moon Mountain Heights** | **Pre-Calculated** (Offline) | NASA LOLA satellite 20-meter laser scans (`curated-horizons.json`). |
| **Site Coordinates & Names** | **Pre-Calculated** (Offline) | Official NASA Artemis III & CLPS landing site registries. |
| **Sun & Earth Sky Positions** | **LIVE** (Real-Time) | NASA JPL Horizons orbital API (for your exact requested date). |
| **Rocket Delay (+X days)** | **LIVE** (Real-Time) | Recalculates Sun & Earth positions instantly when you drag the slider. |
| **Sunlight & Shadow Windows** | **LIVE** (Real-Time) | Our backend solver testing if the live Sun is above or below the mountains. |
| **Compare Tournament Ranking** | **LIVE** (Real-Time) | Our backend filtering out sites that fail sunlight or slope rules. |

---

## 🎙️ 6. How to Answer Judges if They Ask

### Judge: *"How does your backend calculate everything so fast without lagging?"*
> **Your Answer:**  
> *"We separated static terrain from dynamic orbits. We pre-calculated the 360-degree mountain skylines from NASA LOLA laser scans, so the mountains are already loaded. Then, our backend API dynamically fetches the Sun and Earth trajectories from NASA JPL Horizons and runs a high-speed visibility solver to calculate sunlight and radio windows in real time."*
