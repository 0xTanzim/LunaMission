import * as THREE from 'three';

/**
 * Celestial background starfield: uniformly distributed points on a distant
 * shell with stellar color temperatures (O/B blue → M red). Extracted from
 * globeScene to keep the scene factory under its file-size cap.
 */
/**
 * Creates an authentic 3D celestial starfield sphere with stellar color temperatures and magnitudes.
 */
export function createCelestialStarfield(count = 2500, radius = 70): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = radius + (Math.random() - 0.5) * 6.0;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    // Stellar color temperatures (O/B blue, A/F white, G yellow, M red)
    const starType = Math.random();
    let cr = 1.0, cg = 1.0, cb = 1.0;
    if (starType < 0.15) {
      cr = 0.75; cg = 0.85; cb = 1.0;
    } else if (starType < 0.65) {
      cr = 0.95; cg = 0.95; cb = 1.0;
    } else if (starType < 0.88) {
      cr = 1.0; cg = 0.92; cb = 0.70;
    } else {
      cr = 1.0; cg = 0.65; cb = 0.50;
    }
    const brightness = 0.4 + Math.random() * 0.6;
    colors[i * 3] = cr * brightness;
    colors[i * 3 + 1] = cg * brightness;
    colors[i * 3 + 2] = cb * brightness;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const starfield = new THREE.Points(geometry, material);
  starfield.renderOrder = -100;
  return starfield;
}
