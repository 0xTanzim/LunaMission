/**
 * Scientific Colormaps for Lunar Volatiles and Surface Temperatures
 *
 * Implements false-color spectral mappings for LRO LEND hydrogen wt%
 * and Diviner cryogenic surface temperature contours.
 */

export function getVolatilesRgb(hydrogenWeightPct: number): [number, number, number] {
  // Clamped in range [0.02, 0.50] wt%
  const t = Math.max(0, Math.min(1, (hydrogenWeightPct - 0.02) / (0.50 - 0.02)));

  if (t < 0.25) {
    // 0.00 - 0.25: Dark Slate [20, 30, 45] -> Dark Teal [13, 148, 136]
    const s = t / 0.25;
    return [
      Math.round(20 + (13 - 20) * s),
      Math.round(30 + (148 - 30) * s),
      Math.round(45 + (136 - 45) * s),
    ];
  } else if (t < 0.60) {
    // 0.25 - 0.60: Dark Teal [13, 148, 136] -> Vivid Cyan [6, 182, 212]
    const s = (t - 0.25) / 0.35;
    return [
      Math.round(13 + (6 - 13) * s),
      Math.round(148 + (182 - 148) * s),
      Math.round(136 + (212 - 136) * s),
    ];
  } else {
    // 0.60 - 1.00: Vivid Cyan [6, 182, 212] -> Brilliant Ice White-Blue [224, 242, 254]
    const s = (t - 0.60) / 0.40;
    return [
      Math.round(6 + (224 - 6) * s),
      Math.round(182 + (242 - 182) * s),
      Math.round(212 + (254 - 212) * s),
    ];
  }
}

export function getTemperatureRgb(kelvin: number): [number, number, number] {
  // Range: 40K (cryogenic purple) to 260K (hot red)
  const minK = 40;
  const maxK = 260;
  const t = Math.max(0, Math.min(1, (kelvin - minK) / (maxK - minK)));

  if (t < 0.25) {
    // 40K - 95K: Deep Indigo [49, 46, 129] -> Cobalt Blue [29, 78, 216]
    const s = t / 0.25;
    return [
      Math.round(49 + (29 - 49) * s),
      Math.round(46 + (78 - 46) * s),
      Math.round(129 + (216 - 129) * s),
    ];
  } else if (t < 0.50) {
    // 95K - 150K: Cobalt Blue [29, 78, 216] -> Forest/Emerald [16, 185, 129]
    const s = (t - 0.25) / 0.25;
    return [
      Math.round(29 + (16 - 29) * s),
      Math.round(78 + (185 - 78) * s),
      Math.round(216 + (129 - 216) * s),
    ];
  } else if (t < 0.75) {
    // 150K - 205K: Emerald [16, 185, 129] -> Amber [245, 158, 11]
    const s = (t - 0.50) / 0.25;
    return [
      Math.round(16 + (245 - 16) * s),
      Math.round(185 + (158 - 185) * s),
      Math.round(129 + (11 - 129) * s),
    ];
  } else {
    // 205K - 260K: Amber [245, 158, 11] -> Crimson [225, 29, 72]
    const s = (t - 0.75) / 0.25;
    return [
      Math.round(245 + (225 - 245) * s),
      Math.round(158 + (29 - 158) * s),
      Math.round(11 + (72 - 11) * s),
    ];
  }
}
