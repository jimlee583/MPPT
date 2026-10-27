import { describe, expect, it } from 'vitest';
import { BLOCKING_DIODE_DROP_V, buildSolarArray, effectiveIrradiance } from '../solarArray';
import { CELL_DATASHEET, SOLAR_CONSTANT } from '../solarCell';

const d = CELL_DATASHEET;
const base = { nSeries: 20, nParallel: 6, sunAngleDeg: 0, cellTempC: d.t0, degradation: 0 };

describe('effectiveIrradiance', () => {
  it('follows the cosine law and degradation', () => {
    expect(effectiveIrradiance(0, 0)).toBeCloseTo(SOLAR_CONSTANT, 6);
    expect(effectiveIrradiance(60, 0)).toBeCloseTo(SOLAR_CONSTANT / 2, 6);
    expect(effectiveIrradiance(90, 0)).toBeCloseTo(0, 6);
    expect(effectiveIrradiance(0, 0.25)).toBeCloseTo(SOLAR_CONSTANT * 0.75, 6);
  });
});

describe('buildSolarArray', () => {
  it('scales the cell by Ns and Np and subtracts the blocking diode', () => {
    const a = buildSolarArray(base);
    expect(a.voc).toBeCloseTo(20 * d.voc - BLOCKING_DIODE_DROP_V, 2);
    expect(a.isc).toBeCloseTo(6 * d.isc, 2);
    expect(a.vmp).toBeCloseTo(20 * d.vmp - BLOCKING_DIODE_DROP_V, 0);
    expect(a.imp).toBeCloseTo(6 * d.imp, 1);
    expect(a.pmp).toBeGreaterThan(140);
    expect(a.pmp).toBeLessThan(150);
  });

  it('MPP is the maximum of the sampled curve', () => {
    const a = buildSolarArray(base, 2000);
    const best = a.curve.reduce((x, y) => (y.p > x.p ? y : x));
    expect(a.pmp).toBeGreaterThanOrEqual(best.p - 1e-6);
    expect(Math.abs(a.vmp - best.v)).toBeLessThan(0.1);
  });

  it('keeps Vmp well above a 33.6 V bus at hot end-of-life with 20 cells', () => {
    const a = buildSolarArray({ ...base, cellTempC: 80, degradation: 0.25 });
    expect(a.vmp).toBeGreaterThan(38);
  });

  it('loses the margin with a 16-cell string when hot and off-sun', () => {
    const a = buildSolarArray({ ...base, nSeries: 16, cellTempC: 90, degradation: 0.25, sunAngleDeg: 30 });
    expect(a.vmp).toBeLessThan(33.6);
  });

  it('returns an empty curve in the dark', () => {
    const a = buildSolarArray({ ...base, sunAngleDeg: 90 });
    expect(a.pmp).toBe(0);
    expect(a.isc).toBe(0);
    expect(a.powerAt(10)).toBe(0);
  });
});
