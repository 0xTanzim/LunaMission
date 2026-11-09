# LunaMission: Easy Team Guide (Grade 9–10 Plain English)

> **Hey team!** Read this if you want to understand what our app actually does in 3 minutes without any scary math words.

---

## 🌟 The Big Picture
NASA wants to land astronauts and robots at the **Moon’s South Pole** because there is **frozen water ice** inside craters. Water can be turned into drinking water and rocket fuel!

**The problem?**
1. The Sun never rises high in the sky. It skims the ground like an endless sunset.
2. A mountain 50 km away can cast a giant shadow that plunges your lander into **$-200^\circ\text{C}$ pitch blackness**, killing its solar panels and batteries.
3. Earth wobbles near the horizon. If a crater wall gets in the way, you lose your radio Wi-Fi to Earth.
4. If bad weather delays the rocket launch by 4 days, the Moon rotates and all the shadows move!

**What did WE build? (LunaMission)**  
A smart web app that acts like **"Google Maps + Live Mountain Shadow Forecast"** for lunar landers.

---

## 🖥️ Screen 1: Site Map (`Alt+1`)
- **What it does:** You see the South Pole of the Moon.
- **What you show:** 20 real landing spots NASA is considering. You click on a spot (like *Connecting Ridge*), and it shows you how high the ground is and how steep the hills are.

---

## 🔬 Screen 2: Analyze (`Alt+2`) — The Star Feature!
**What it does:** Shows the solar power and radio forecast for **ONE** landing spot.

### The Controls at the Top:
- **Target Site:** Which spot on the Moon we are checking.
- **Start Epoch:** The date the lander touches down (e.g. Nov 1, 2026).
- **Duration (7d, 14d, 21d, 28d):** How many days the mission lasts. 14d = 14 Earth days (two weeks).
- **Mast Height (1m, 2m, 5m, 10m):** How tall the solar panel pole is. If you climb a 10-meter ladder, you can catch sunlight over hills that would put a 1-meter robot in the dark!
- **Launch Slip Slider (+0.5d, +2d):** What if the rocket is delayed by 12 hours or 3 days? Drag this slider, and the whole graph updates in 1 second.

### The 4 Number Cards:
1. **Total Sunlight:** Total hours the solar panels see the Sun (e.g. 336 hours = 100% full sun!).
2. **Max Dark Blackout:** The longest time the lander is stuck in freezing darkness without power. (Must be less than battery limit, e.g., $\le 16\text{h}$).
3. **Earth LOS Access:** Hours the lander can see Earth to talk on the radio (LOS = Line of Sight).
4. **Terrain Penalty:** Hours of sunlight stolen by a mountain blocking the way.

### The Two Graphs at the Bottom:
- **Panel 1 (360° Panorama):** The big picture view. The grey/blue line is the real mountain skyline around the lander. The yellow dot is the Sun. The blue dot is Earth. If the Sun drops below the mountain line, you are in the shadow!
- **Panel 2 (Grazing Corridor):** A microscope zoom-in near the ground ($-5^\circ$ to $+10^\circ$) to see if the Sun is skimming the edge of a mountain peak.

---

## ⚖️ Screen 3: Compare (`Alt+3`) — The Tournament!
**What it does:** NASA has 7 candidate landing spots, but only one rocket. Which site wins?

### The Controls:
- **Three-Tier Funnel:** A 3-step knockout tournament!
  - *Tier 1 (Survival):* Disqualifies any site that doesn't have enough sunlight or freezes the batteries.
  - *Tier 2 (Safety):* Disqualifies any site with steep slopes ($> 15^\circ$) where the lander could tip over and crash.
  - *Tier 3 (Winner):* Ranks the survivors by best radio signal to Earth and closest ice.
- **Side-by-Side Matrix:** Puts all sites in a table side-by-side like comparing phone specs.
- **Vehicle Presets:**
  - *CLPS Lander:* Small robot lander with small battery.
  - *Artemis HLS:* Giant human lander with tall 10-meter solar mast.
  - *Polar Survey:* A rover exploring craters.
- **Continuous Sunlight Limit ($\ge 40\text{h}$):** Rule: *"The site must give at least 40 hours of sunlight in a row."*
- **Darkness Tolerance ($\le 60\text{h}$):** Rule: *"If a site has more than 60 hours of continuous dark, eliminate it! The battery will freeze."*

---

## 🎮 Screen 4: 3D Lab (`Alt+4`)
- **What it does:** A 3D game-like lunar surface.
- **What to do:** Drive the rover around with `W, A, S, D` keys!
- **Press `H` key:** Opens the astronaut helmet visor HUD with a digital compass and pitch/roll level.
