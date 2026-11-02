/**
 * Cubic Hermite Spline Engine & Continuous Azimuth Unwrapping
 * Milestone M4: Exact C1 topocentric ephemeris interpolation and stationary root isolation.
 * Governed by AGENTS.md § 4.4 and docs/SCIENCE_FEASIBILITY.md § 4.4.
 */

export interface HermiteCoeffs {
  readonly c3: number;
  readonly c2: number;
  readonly c1: number;
  readonly c0: number;
}

/**
 * Continuously unwraps az1 relative to az0 across the 0° / 360° branch cut seam.
 * Returns unwrapped az1 such that |az1_unwrapped - az0| <= 180°.
 */
export function unwrapAzimuth(az0: number, az1: number): number {
  const dAzRaw = az1 - az0;
  const dAzUnwrapped = ((((dAzRaw + 180) % 360) + 360) % 360) - 180;
  return az0 + dAzUnwrapped;
}

/**
 * Computes Horner monomial coefficients c3*tau^3 + c2*tau^2 + c1*tau + c0 for tau in [0, 1].
 * Physical rates are in deg/h, dtHr is duration in hours.
 */
export function computeHermiteCoeffs(
  y0: number,
  y1: number,
  rate0DegHr: number,
  rate1DegHr: number,
  dtHr: number,
): HermiteCoeffs {
  const d0 = rate0DegHr * dtHr;
  const d1 = rate1DegHr * dtHr;
  const delta = y1 - y0;

  return {
    c3: 2 * (y0 - y1) + d0 + d1,
    c2: 3 * delta - 2 * d0 - d1,
    c1: d0,
    c0: y0,
  };
}

/**
 * Evaluates cubic polynomial in Horner form: ((c3*tau + c2)*tau + c1)*tau + c0
 */
export function evalHermite(c: HermiteCoeffs, tau: number): number {
  return ((c.c3 * tau + c.c2) * tau + c.c1) * tau + c.c0;
}

/**
 * Evaluates first derivative with respect to tau: 3*c3*tau^2 + 2*c2*tau + c1
 */
export function evalHermiteDeriv(c: HermiteCoeffs, tau: number): number {
  return (3 * c.c3 * tau + 2 * c.c2) * tau + c.c1;
}

/**
 * Evaluates second derivative with respect to tau: 6*c3*tau + 2*c2
 */
export function evalHermiteSecondDeriv(c: HermiteCoeffs, tau: number): number {
  return 6 * c.c3 * tau + 2 * c.c2;
}

/**
 * Solves 3*c3*tau^2 + 2*c2*tau + c1 = 0 on (tauStart, tauEnd) using Citardauq stable formula.
 * Identifies azimuth libration turnarounds and clearance extrema via Rolle's theorem.
 */
export function solveDerivativeRoots(
  c: HermiteCoeffs,
  tauStart = 0.0,
  tauEnd = 1.0,
  eps = 1e-9,
): number[] {
  const A = 3.0 * c.c3;
  const B = 2.0 * c.c2;
  const C = c.c1;
  const roots: number[] = [];

  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) >= 1e-12) {
      const tau = -C / B;
      if (tau > tauStart + eps && tau < tauEnd - eps) {
        roots.push(tau);
      }
    }
    return roots;
  }

  const disc = B * B - 4.0 * A * C;
  if (disc <= 0) {
    return roots;
  }

  const sgn = B >= 0 ? 1.0 : -1.0;
  const q = -0.5 * (B + sgn * Math.sqrt(disc));
  const r1 = q / A;
  const r2 = C / q;

  for (const r of [r1, r2]) {
    if (r > tauStart + eps && r < tauEnd - eps) {
      roots.push(r);
    }
  }

  roots.sort((a, b) => a - b);
  return roots.filter((val, idx, arr) => idx === 0 || Math.abs(val - arr[idx - 1]!) > 1e-10);
}

/**
 * Solves F(tau) = evalHermite(c, tau) - targetValue = 0 on monotonic bracket [tauLo, tauHi]
 * using safeguarded Newton-Raphson with bisection fallback.
 */
export function solveHermiteValueCrossing(
  c: HermiteCoeffs,
  targetValue: number,
  tauLo: number,
  tauHi: number,
  maxIter = 30,
): number {
  let lo = tauLo;
  let hi = tauHi;
  let fLo = evalHermite(c, lo) - targetValue;
  let fHi = evalHermite(c, hi) - targetValue;

  if (Math.abs(fLo) < 1e-12) return lo;
  if (Math.abs(fHi) < 1e-12) return hi;

  let tau = lo + ((targetValue - evalHermite(c, lo)) / (evalHermite(c, hi) - evalHermite(c, lo))) * (hi - lo);
  if (tau <= lo || tau >= hi) {
    tau = 0.5 * (lo + hi);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const f = evalHermite(c, tau) - targetValue;
    if (Math.abs(f) < 1e-11 || Math.abs(hi - lo) < 1e-12) {
      return tau;
    }

    if (f * fLo > 0) {
      lo = tau;
      fLo = f;
    } else {
      hi = tau;
      fHi = f;
    }

    const fp = evalHermiteDeriv(c, tau);
    let nextTau = Math.abs(fp) > 1e-14 ? tau - f / fp : 0.5 * (lo + hi);
    if (nextTau <= lo + 1e-12 || nextTau >= hi - 1e-12) {
      nextTau = 0.5 * (lo + hi);
    }
    tau = nextTau;
  }

  return tau;
}
