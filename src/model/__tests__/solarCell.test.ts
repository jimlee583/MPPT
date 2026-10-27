import { describe, expect, it } from 'vitest';
import { CELL_DATASHEET, cellCurrentAt, cellCurve, cellParams, cellVoc, datasheetFit } from '../solarCell';

const d = CELL_DATASHEET;

describe('solarCell datasheet fit', () => {
  it('finds a physically plausible ideality factor and series resistance', () => {
    const fit = datasheetFit();
    expect(fit.n).toBeGreaterThan(2.5);
    expect(fit.n).toBeLessThan(6);
    expect(fit.rs).toBeGreaterThanOrEqual(0);
    expect(fit.rs).toBeLessThan(0.5);
  });

  it('reproduces Voc and Isc at the datasheet condition', () => {
    const p = cellParams(d.g0, d.t0);
    expect(cellVoc(p)).toBeCloseTo(d.voc, 3);
    expect(cellCurrentAt(0, p)).toBeCloseTo(d.isc, 3);
  });

  it('passes through the datasheet MPP and peaks there', () => {
    const p = cellParams(d.g0, d.t0);
    expect(cellCurrentAt(d.vmp, p)).toBeCloseTo(d.imp, 2);
    const curve = cellCurve(d.g0, d.t0, 2000);
    const best = curve.reduce((a, b) => (b.p > a.p ? b : a));
    expect(best.v).toBeCloseTo(d.vmp, 1);
    expect(best.p).toBeCloseTo(d.vmp * d.imp, 2);
  });
});

describe('solarCell environmental scaling', () => {
  it('Voc falls and Isc rises with temperature', () => {
    const cold = cellParams(d.g0, -60);
    const hot = cellParams(d.g0, 80);
    expect(cellVoc(cold)).toBeGreaterThan(cellVoc(hot));
    expect(cellCurrentAt(0, cold)).toBeLessThan(cellCurrentAt(0, hot));
    // Slope should match the datasheet coefficient.
    const dVoc = (cellVoc(hot) - cellVoc(cold)) / 140;
    expect(dVoc).toBeCloseTo(d.dVocDt, 3);
  });

  it('Isc scales linearly with irradiance while Voc only drops logarithmically', () => {
    const full = cellParams(d.g0, d.t0);
    const half = cellParams(d.g0 / 2, d.t0);
    expect(cellCurrentAt(0, half) / cellCurrentAt(0, full)).toBeCloseTo(0.5, 3);
    const vocDrop = cellVoc(full) - cellVoc(half);
    expect(vocDrop).toBeGreaterThan(0.03);
    expect(vocDrop).toBeLessThan(0.1);
  });

  it('produces no current in the dark', () => {
    const dark = cellParams(0, 20);
    expect(cellCurrentAt(0, dark)).toBe(0);
    expect(cellCurrentAt(1, dark)).toBe(0);
  });
});
