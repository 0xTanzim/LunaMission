# 01. What LunaMission Actually Does (Easy English)

> **Goal of this document:** Explain our project so simply that any friend, family member, or hackathon judge can understand it in under 3 minutes.

---

## 1. The Big Goal: Why is NASA going to the Moon's South Pole?

NASA is planning to land humans and robots on the Moon again through the **Artemis** missions. 

They are **not** going to the flat equator where Apollo 11 landed. They are going to the **Moon’s South Pole**.

**Why?**
Because deep inside the dark craters at the South Pole, there is **frozen water ice**! 
- Astronauts can drink it.
- We can split water ($H_2O$) to get oxygen to breathe.
- We can make hydrogen for **rocket fuel** to travel to Mars!

---

## 2. The Big Problem: Why is landing there so dangerous?

Landing at the South Pole is super dangerous for 3 reasons:

### Danger 1: The Sun Skims the Ground (Freezing Shadows)
The Moon barely tilts (only 1.5 degrees). So at the South Pole, the Sun never goes high in the sky. It stays very low along the horizon, like an endless sunset.
- If a mountain 50 kilometers away stands in the way, it casts a **giant shadow**.
- If a lander enters this shadow, its solar panels make **zero electricity**.
- The temperature drops to **$-200^\circ\text{C}$**! The batteries freeze, and the robot dies.

### Danger 2: Earth Wobbles (Radio Signal Lost)
The Moon slowly wobbles back and forth as it orbits Earth (scientists call this *libration*). Because of this wobble, the Earth appears to dance up and down near the horizon.
- If a crater wall blocks your view of Earth, your radio signal is cut off.
- The lander cannot talk to mission control!

### Danger 3: Rocket Delays Change Everything
If bad weather in Florida delays the rocket launch by just 4 days, the Moon has rotated! 
- The shadows are now in completely different spots.
- A landing site that was sunny last week might now be in pitch-black darkness for two weeks.

---

## 3. What Was Missing Before LunaMission?

Before our tool:
- NASA had orbit math tools that calculate where the Sun and Earth are, **BUT** they assumed the Moon was a smooth ball with no mountains! They had no idea if a hill was blocking the sun.
- NASA had big satellite photo maps, but you couldn't drag a slider and ask: *"If we launch on Tuesday at 3 PM, will this crater rim have sunlight and radio signal?"*

---

## 4. What Did WE Build? (LunaMission)

**LunaMission is like "Google Maps + Live Mountain Shadow Forecast" for Moon Landers.**

Here is what happens when you use it:
1. You pick a landing spot on the Moon.
2. The computer loads **real laser satellite height scans from NASA** that measure every hill and crater on the Moon.
3. It draws a **360-degree mountain skyline** all around your lander.
4. Then it traces the Sun and Earth paths across the sky.
5. It gives you a clean, simple timeline:
   - **Green/Yellow:** You have Sun! Your solar panels are charging!
   - **Blue:** You can see Earth! Your radio works!
   - **Darkness:** A mountain is blocking the Sun. Danger!
6. If the rocket launch is delayed, you move the **Launch Delay Slider**, and the whole timeline recalculates in one second!

---

## 5. The 5 Screens in Our App (Quick Summary)

1. **Site Map (`Alt+1`):** Look at the South Pole, view 20 NASA landing spots, check hills and steep slopes.
2. **Analyze (`Alt+2`):** The star screen! Look at the 360° mountain skyline, see when mountains block the Sun or Earth, and test launch delays.
3. **Compare (`Alt+3`):** Put candidate landing spots into a tournament to pick the safest winner with the most sun and best radio signal.
4. **3D Lab (`Alt+4`):** A 3D game-like view where you can drive a lunar rover and look through an astronaut helmet visor HUD.
5. **Cesium 3D (`Alt+5`):** A whole-Moon 3D globe you can spin around in space.

---

## 6. The One-Sentence Summary to Remember:

> *"LunaMission helps NASA pick the safest spot to land on the Moon by showing exactly when local mountains will block solar power or cut off radio signal to Earth."*
