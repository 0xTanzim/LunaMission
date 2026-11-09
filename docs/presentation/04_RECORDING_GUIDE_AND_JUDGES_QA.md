# 04. Video Recording Guide & Judges Q&A (Easy English)

> **Goal:** How to record a clean, glitch-free 4-minute video, and how to answer the toughest questions from judges without sweating.

---

## 🎥 1. How to Record the Screen (Step-by-Step)

### Step 1: Start the app
Open your terminal in the project folder and run:
```bash
bun run dev
```
Wait 3 seconds until you see:
- API running at `http://localhost:3001`
- Web app running at `http://localhost:3000`

### Step 2: Open in Chrome & Clean the Screen
1. Open Google Chrome and go to `http://localhost:3000`.
2. Press **`F11`** to enter **Full-Screen Mode** (this hides the URL bar, bookmark tabs, and computer clock, making it look 100% professional).
3. Close any extra tabs or notifications so nothing pops up during recording.

### Step 3: Practice the Keyboard Shortcuts (No Hunting with the Mouse!)
Before recording, practice pressing:
- **`Alt + 1`** ➔ Jumps to **Site Map**
- **`Alt + 2`** ➔ Jumps to **Analyze** (The skyline & delay slider)
- **`Alt + 3`** ➔ Jumps to **Compare** (The tournament filter)
- **`Alt + 4`** ➔ Jumps to **3D Lab**
- **`W / A / S / D`** ➔ Drives the rover in 3D Lab
- **`H` key** ➔ Toggles the astronaut helmet visor HUD

### Step 4: Recording Software
- You can use **OBS Studio**, **Loom**, or your computer's built-in screen recorder (Windows: `Win + Alt + R`, Mac: `Cmd + Shift + 5`).
- Record in **1080p** (1920x1080) at 30 or 60 FPS.
- Use a headset or quiet room so your voice is loud and clear.

---

## 🎙️ 2. Speech & Pacing Tips

1. **Speak Slower than Normal:** When people are nervous, they speak too fast. Consciously slow down and pronounce every word clearly.
2. **Move Your Mouse Slowly:** Move your mouse gently toward buttons. Don't shake or whip the mouse across the screen.
3. **Finish at 3:55:** Use a phone stopwatch while practicing. If you deliver the final *"Thank you"* at 3 minutes and 50–55 seconds, you are in the perfect sweet spot!

---

## 🏆 3. Top 5 Questions Judges Ask & How to Answer in 2 Sentences

Judges love asking technical questions to see if you actually know what is going on. Here are the top 5 questions and the exact simple answers to give:

---

### Q1: *"Where did you get your elevation data for the mountains?"*
> **Your Answer:**  
> *"We used real NASA LOLA (Lunar Orbiter Laser Altimeter) satellite data from the Planetary Data System at twenty-meter resolution. It measures the exact height of every mountain and crater relative to the Moon's spherical surface."*

---

### Q2: *"Why didn't you just use NASA's JPL Horizons tool directly?"*
> **Your Answer:**  
> *"JPL Horizons calculates the Sun and Earth's orbit, but it assumes the Moon is a completely smooth ball with no mountains. At the South Pole, mountains four kilometers high cast huge shadows that Horizons completely misses."*

---

### Q3: *"How does your app know when a mountain blocks the Sun?"*
> **Your Answer:**  
> *"We use topographic ray-marching with lunar curvature. For every direction around the lander, we calculate the angle of surrounding hills and compare that mountain skyline with the Sun's path in the sky."*

---

### Q4: *"Why do you show 'Sunlight Hours' instead of electrical watts?"*
> **Your Answer:**  
> *"That was an intentional choice for scientific honesty. Calculating electrical watts requires knowing the lander's solar panel tilt, dust degradation, and battery efficiency. By providing pure geometric line-of-sight, mission planners get clean, trusted ground truth."*

---

### Q5: *"How do you know your calculations are accurate?"*
> **Your Answer:**  
> *"We have over sixteen hundred automated tests passing with zero errors. We also validated our horizon math against published peer-reviewed lunar papers from NASA and planetary scientists."*
