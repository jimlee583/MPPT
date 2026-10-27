/**
 * Lumped single-diode model of a triple-junction (3J) GaInP/GaAs/Ge space solar cell.
 *
 *   I = Iph - I0 * ( exp( (V + I*Rs) / (n*Vt) ) - 1 )
 *
 * Shunt resistance is ignored (very high for good 3J cells), which keeps V(I)
 * explicit and I(V) a one-line Newton solve.
 *
 * The three junctions are treated as one equivalent diode with a large ideality
 * factor n (~3-4), which is fit at the datasheet condition so that the model's
 * curve passes through the datasheet Voc, Isc, and (Vmp, Imp) and has its
 * maximum power point at Vmp.
 */
import type { CurvePoint, DiodeParams } from './types';

const K_B = 1.380649e-23; // J/K
const Q_E = 1.602176634e-19; // C

/** Representative datasheet values: Azur Space 3G30C class cell, AM0 (1367 W/m^2), 28 C. */
export const CELL_DATASHEET = {
  g0: 1367, // W/m^2, AM0 solar constant
  t0: 28, // C
  voc: 2.7, // V
  isc: 0.52, // A
  vmp: 2.411, // V
  imp: 0.503, // A
  dVocDt: -6.2e-3, // V/K
  dIscDt: 0.36e-3, // A/K
  areaCm2: 30.18,
} as const;

export const SOLAR_CONSTANT = CELL_DATASHEET.g0;

/** Thermal voltage kT/q in volts for a temperature in Celsius. */
export function thermalVoltage(tempC: number): number {
  return (K_B * (tempC + 273.15)) / Q_E;
}

/**
 * Solve the diode equation for current at a given terminal voltage using Newton's method.
 * f(I) = Iph - I0*(exp((V + I Rs)/nVt) - 1) - I = 0, which is monotone decreasing in I.
 */
export function cellCurrentAt(v: number, p: DiodeParams): number {
  if (p.iph <= 0) return 0;
  let i = Math.min(p.iph, Math.max(0, p.iph * (1 - v / Math.max(1e-9, cellVoc(p)))));
  for (let k = 0; k < 40; k++) {
    const e = Math.exp((v + i * p.rs) / p.nVt);
    const f = p.iph - p.i0 * (e - 1) - i;
    const df = -(p.i0 * p.rs * e) / p.nVt - 1;
    const step = f / df;
    i -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return Math.max(0, i);
}

/** Open-circuit voltage implied by the diode parameters. */
export function cellVoc(p: DiodeParams): number {
  return p.nVt * Math.log(p.iph / p.i0 + 1);
}

/** dI/dV at a given point (analytic, from implicit differentiation). */
export function cellDiDv(v: number, i: number, p: DiodeParams): number {
  const e = Math.exp((v + i * p.rs) / p.nVt);
  const g = (p.i0 * e) / p.nVt;
  return -g / (1 + g * p.rs);
}

/** Given nVt, Rs, Isc and Voc, derive I0 and Iph. (Iph ~= Isc for small Rs.) */
function paramsFromVocIsc(voc: number, isc: number, nVt: number, rs: number): DiodeParams {
  // Iterate the small coupling between Iph and I0 through Rs.
  let iph = isc;
  let i0 = iph / (Math.exp(voc / nVt) - 1);
  for (let k = 0; k < 5; k++) {
    iph = isc + i0 * (Math.exp((isc * rs) / nVt) - 1);
    i0 = iph / (Math.exp(voc / nVt) - 1);
  }
  return { iph, i0, nVt, rs };
}

/** Terminal voltage at a given current (explicit form). */
function cellVoltageAt(i: number, p: DiodeParams): number {
  return p.nVt * Math.log((p.iph - i) / p.i0 + 1) - i * p.rs;
}

/**
 * Fit (nVt, Rs) at the datasheet condition so that:
 *  1. the curve passes through (Vmp, Imp), and
 *  2. dP/dV = 0 at Vmp, i.e. the model's MPP is the datasheet MPP.
 * Both are solved by nested bisection; they are monotone in the search ranges used.
 */
function fitDatasheet() {
  const d = CELL_DATASHEET;

  // Inner: for a given Rs, find nVt such that V(Imp) = Vmp.
  const nVtForRs = (rs: number): number => {
    let lo = 0.02;
    let hi = 0.4;
    for (let k = 0; k < 80; k++) {
      const mid = 0.5 * (lo + hi);
      const p = paramsFromVocIsc(d.voc, d.isc, mid, rs);
      const vAtImp = cellVoltageAt(d.imp, p);
      // Larger nVt -> softer knee -> lower V at Imp.
      if (vAtImp > d.vmp) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  };

  // Outer: find Rs such that dP/dV = 0 at (Vmp, Imp).
  const slopeResidual = (rs: number): number => {
    const p = paramsFromVocIsc(d.voc, d.isc, nVtForRs(rs), rs);
    return d.imp + d.vmp * cellDiDv(d.vmp, d.imp, p); // dP/dV = I + V dI/dV
  };

  let lo = 0;
  let hi = 0.5;
  if (slopeResidual(lo) <= 0) {
    // Rs = 0 already gives MPP at or left of Vmp; accept it.
    hi = 0;
  } else {
    for (let k = 0; k < 80; k++) {
      const mid = 0.5 * (lo + hi);
      if (slopeResidual(mid) > 0) lo = mid;
      else hi = mid;
    }
  }
  const rs = 0.5 * (lo + hi);
  const nVt = nVtForRs(rs);
  return { nVt, rs, n: nVt / thermalVoltage(d.t0) };
}

let fitCache: ReturnType<typeof fitDatasheet> | null = null;
export function datasheetFit() {
  if (!fitCache) fitCache = fitDatasheet();
  return fitCache;
}

/**
 * Diode parameters for one cell at irradiance G (W/m^2) and temperature T (C).
 *
 *  Isc(G,T) = Isc0 * (G/G0) * (1 + (dIsc/dT / Isc0) (T - T0))
 *  Voc(G,T) = Voc0 + dVoc/dT (T - T0) + nVt(T) ln(G/G0)
 *  I0 is then chosen so the diode equation reproduces that Voc.
 */
export function cellParams(irradiance: number, tempC: number): DiodeParams {
  const d = CELL_DATASHEET;
  const fit = datasheetFit();
  const g = Math.max(0, irradiance);
  if (g < 1e-3) {
    return { iph: 0, i0: 1e-20, nVt: fit.n * thermalVoltage(tempC), rs: fit.rs };
  }
  const gRatio = g / d.g0;
  const dT = tempC - d.t0;
  const nVt = fit.n * thermalVoltage(tempC);
  const isc = d.isc * gRatio * (1 + (d.dIscDt / d.isc) * dT);
  const voc = Math.max(0.05, d.voc + d.dVocDt * dT + nVt * Math.log(gRatio));
  return paramsFromVocIsc(voc, Math.max(1e-9, isc), nVt, fit.rs);
}

/** Sample a single cell's I-V curve at a given condition. */
export function cellCurve(irradiance: number, tempC: number, nPoints = 200): CurvePoint[] {
  const p = cellParams(irradiance, tempC);
  const voc = cellVoc(p);
  const pts: CurvePoint[] = [];
  for (let k = 0; k <= nPoints; k++) {
    const v = (voc * k) / nPoints;
    const i = cellCurrentAt(v, p);
    pts.push({ v, i, p: v * i });
  }
  return pts;
}
