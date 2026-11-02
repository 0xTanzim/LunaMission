/**
 * Dekker-Brent Numerical Root Finder
 * Milestone M4: Sub-second root refinement for celestial horizon event crossing.
 * Governed by AGENTS.md § 4.4 and docs/SCIENCE_FEASIBILITY.md § 4.4.
 */

export interface BrentSolverOptions {
  tolTau?: number;
  maxIter?: number;
}

/**
 * Finds root of func(tau) = 0 on bracket [a, b] using Dekker-Brent root-finding algorithm.
 * Refines the root until bracket width |b - a| <= tolTau or |f(b)| <= 1e-13.
 */
export function brentRoot(
  func: (tau: number) => number,
  a: number,
  b: number,
  tolTau = 1e-6,
  maxIter = 60,
): number {
  let fa = func(a);
  let fb = func(b);

  if (Math.abs(fa) < 1e-13) return a;
  if (Math.abs(fb) < 1e-13) return b;

  if (fa * fb > 0) {
    throw new Error(`Invalid bracket for Brent root-finding: f(${a})=${fa} and f(${b})=${fb} have same sign`);
  }

  if (Math.abs(fa) < Math.abs(fb)) {
    const tmpA = a;
    a = b;
    b = tmpA;
    const tmpFa = fa;
    fa = fb;
    fb = tmpFa;
  }

  let c = a;
  let fc = fa;
  let mflag = true;
  let d = 0.0;

  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.abs(fb) < 1e-13 || Math.abs(b - a) <= tolTau) {
      return b;
    }

    let s: number;
    if (Math.abs(fa - fc) > 1e-14 && Math.abs(fb - fc) > 1e-14) {
      // Inverse Quadratic Interpolation
      const term1 = (a * fb * fc) / ((fa - fb) * (fa - fc));
      const term2 = (b * fa * fc) / ((fb - fa) * (fb - fc));
      const term3 = (c * fa * fb) / ((fc - fa) * (fc - fb));
      s = term1 + term2 + term3;
    } else {
      // Secant Method
      s = b - fb * ((b - a) / (fb - fa));
    }

    const boundMin = Math.min((3.0 * a + b) / 4.0, b);
    const boundMax = Math.max((3.0 * a + b) / 4.0, b);

    const cond1 = s < boundMin || s > boundMax;
    const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2.0;
    const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2.0;
    const cond4 = mflag && Math.abs(b - c) < tolTau;
    const cond5 = !mflag && Math.abs(c - d) < tolTau;

    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = 0.5 * (a + b);
      mflag = true;
    } else {
      mflag = false;
    }

    const fs = func(s);
    d = c;
    c = b;
    fc = fb;

    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      const tmpA = a;
      a = b;
      b = tmpA;
      const tmpFa = fa;
      fa = fb;
      fb = tmpFa;
    }
  }

  return b;
}
