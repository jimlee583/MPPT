/**
 * Solar array = Ns identical cells in series per string, Np identical strings in parallel,
 * with one blocking diode per string (lumped as a constant drop on the array voltage).
 */
import { cellCurrentAt, cellParams, cellVoc, SOLAR_CONSTANT } from './solarCell';
import type { CurvePoint, SolarArrayResult } from './types';

export const BLOCKING_DIODE_DROP_V = 0.7;

export interface ArrayConfig {
  nSeries: number;
  nParallel: number;
  sunAngleDeg: number;
  cellTempC: number;
  degradation: number; // 0..1
}

/** Effective irradiance after cosine loss and lumped degradation. */
export function effectiveIrradiance(sunAngleDeg: number, degradation: number): number {
  const theta = (Math.min(90, Math.max(0, sunAngleDeg)) * Math.PI) / 180;
  const cosLoss = Math.max(0, Math.cos(theta));
  return SOLAR_CONSTANT * cosLoss * Math.max(0, 1 - degradation);
}

/** Golden-section search for the maximum of a unimodal function on [a, b]. */
function goldenMax(f: (x: number) => number, a: number, b: number, iters = 80): number {
  const phi = (Math.sqrt(5) - 1) / 2;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let k = 0; k < iters; k++) {
    if (fc < fd) {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      fd = f(d);
    } else {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      fc = f(c);
    }
  }
  return 0.5 * (a + b);
}

export function buildSolarArray(cfg: ArrayConfig, nPoints = 300): SolarArrayResult {
  const g = effectiveIrradiance(cfg.sunAngleDeg, cfg.degradation);
  const p = cellParams(g, cfg.cellTempC);
  const ns = Math.max(1, Math.round(cfg.nSeries));
  const np = Math.max(1, Math.round(cfg.nParallel));

  const cellVocV = p.iph > 0 ? cellVoc(p) : 0;
  const voc = Math.max(0, ns * cellVocV - BLOCKING_DIODE_DROP_V);

  const currentAt = (v: number): number => {
    if (p.iph <= 0 || v >= voc) return 0;
    const vCell = (Math.max(0, v) + BLOCKING_DIODE_DROP_V) / ns;
    return np * cellCurrentAt(vCell, p);
  };
  const powerAt = (v: number): number => (v <= 0 ? 0 : v * currentAt(v));

  const isc = currentAt(0);

  const curve: CurvePoint[] = [];
  for (let k = 0; k <= nPoints; k++) {
    const v = (voc * k) / nPoints;
    const i = currentAt(v);
    curve.push({ v, i, p: v * i });
  }

  let vmp = 0;
  let imp = 0;
  let pmp = 0;
  if (voc > 0 && isc > 0) {
    vmp = goldenMax(powerAt, 0, voc);
    imp = currentAt(vmp);
    pmp = vmp * imp;
  }

  return { curve, voc, isc, vmp, imp, pmp, currentAt, powerAt, irradiance: g, cellTempC: cfg.cellTempC };
}
