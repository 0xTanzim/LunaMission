# 03. Screens and Buttons Cheat Sheet (Easy English)

> **Hey team!** Use this guide whenever you look at the app and wonder: *"What does this button or number actually mean?"* 
> 
> Everything here is explained in simple everyday English.

---

# Screen 1: The ANALYZE Page (`Alt + 2`)
**What is this page?** The weather & sun forecast for **ONE** landing spot.

---

### 1. The Top Settings Bar
* **`TARGET SITE: Connecting Ridge`**  
  👉 **What it is:** The place on the Moon you are testing. (Like picking "London" on a weather app).
* **`START EPOCH: 11/01/2026`**  
  👉 **What it is:** The landing date (November 1, 2026).
* **`7d | 14d | 21d | 28d`**  
  👉 **What it is:** **Mission Duration** (How many days the lander will stay on the Moon).  
  *Simple explanation:* A full lunar day is about 29 Earth days. "14d" means your mission lasts for 14 Earth days (two weeks).
* **`MAST: 1m | 2m | 5m | 10m`**  
  👉 **What it is:** **How tall the solar panel pole is!**  
  *Real-life analogy:* If you are short and stand behind a wall, you can't see the sun. But if you climb a **10-meter ladder**, you can see right over the wall!  
  A 10-meter tall mast can catch sunlight over short hills that would put a 1-meter robot in the dark.
* **`SLIP: +0.5d` (The Slider)**  
  👉 **What it is:** **The Rocket Delay Slider!**  
  *Real-life analogy:* What if bad weather in Florida delays the rocket by 12 hours (+0.5 days)? Drag this slider, and the app instantly tells you: *"Does the lander still get sunlight, or will it land in pitch-black night?"*

---

### 2. The 4 Big Metric Cards
* **`TOTAL SUNLIGHT: 336.0h (100%)`**  
  👉 Over the 14 days (336 total hours), the solar panels see the Sun for **336 hours (100% of the time)**. That means this spot has non-stop sunlight!
* **`MAX DARK BLACKOUT: 0.0h / ≤16h [PASS]`**  
  👉 What is the longest continuous time the lander is trapped in freezing darkness without power?  
  Here it is **0.0h**, which passes the test because the battery can only survive 16 hours of darkness.
* **`EARTH LOS ACCESS: 60.9h (18.1%)`**  
  👉 "LOS" means **Line-Of-Sight**. Can the lander physically see Earth to send radio messages?  
  For 60.9 hours, Earth is visible above the hills, so you can talk to mission control!
* **`TERRAIN PENALTY: 0.0h shadow`**  
  👉 Did a mountain block the sun when the sun was supposed to be in the sky?  
  **0.0h** means no mountains got in the way during this window.

---

### 3. The Big Sky Graphs at the Bottom
* **`360° Sky-Ribbon vs Circular Polar Radar`**  
  👉 This is just asking: *"How do you want to draw the sky?"*  
  - **360° Sky-Ribbon:** Draws the sky as a wide panoramic picture ($0^\circ$ to $360^\circ$).  
  - **Circular Radar:** Draws the sky as a round radar screen (like an airplane or ship radar).
* **`Panel 1: 360° Panorama`**  
  👉 **The Big Picture View:**  
  - The **grey/blue line at the bottom** is the actual mountain skyline around the lander.  
  - The **yellow dot (`SUN`)** is the Sun moving in the sky.  
  - The **blue dot (`EARTH`)** is Earth.  
  - If the yellow dot drops below that grey line, the lander is in the shadow!
* **`Panel 2: Grazing Corridor`**  
  👉 **The Microscope Zoom-In:**  
  At the Moon’s South Pole, the Sun is always hugging the ground (between $-5^\circ$ and $+10^\circ$). Panel 2 zooms in right at the ground level so you can see if the edge of the Sun disk is touching a mountain peak.

---

# Screen 2: The COMPARE Page (`Alt + 3`)
**What is this page?** The knockout tournament to pick the **winning** landing spot out of many!

---

### 1. `Three-Tier Funnel` vs `Side-by-Side Matrix`
* **`Three-Tier Funnel` (The Tournament):**  
  Imagine a 3-step filter:
  - **Step 1 (Survival):** Does the site have enough sunlight so the lander doesn't freeze? (Sites with too much dark are eliminated!)
  - **Step 2 (Safety):** Are the hills too steep? (If the slope is over $15^\circ$, the lander could tip over and crash. Eliminated!)
  - **Step 3 (Science & Comms):** Out of the survivors, who has the best radio connection to Earth and closest ice?
* **`Side-by-Side Matrix`:**  
  Just puts all candidate sites in a comparison table side-by-side (like comparing 3 laptops on a shopping site).

---

### 2. Vehicle Presets & Limits
* **`COHORT (7/20)`:**  
  👉 The group of candidate landing spots being tested (Connecting Ridge, Shackleton Rim, Malapert Mountain, etc.).
* **`VEHICLE PROFILE PRESETS`:**  
  👉 **What kind of spacecraft are you sending?**  
  - **CLPS Lander:** A small robot lander (like Intuitive Machines). It has small batteries, so it cannot survive long darkness.  
  - **Artemis HLS:** The huge human lander (NASA Starship). It carries astronauts and has a 10-meter tall power mast.  
  - **Polar Survey:** A rover driving around looking for water ice.
* **`Continuous Sunlight: ≥ 40 hours`**  
  👉 The rule you set: *"A site MUST give me at least 40 hours of sunlight in a row, or I will not land there."*
* **`Darkness Tolerance: ≤ 60 hours`**  
  👉 The rule you set: *"My battery will die if it is in the dark for more than 60 hours. If a site has more than 60 hours of dark, DISQUALIFY IT!"*
