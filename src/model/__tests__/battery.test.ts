import { describe, expect, it } from 'vitest';
import { BUS_V_MAX, BUS_V_MIN, CHARGE_CURRENT_LIMIT_A, busVoltage, chargeAcceptance, packOcv } from '../battery';

describe('battery', () => {
  it('is an 8S pack spanning 24.0 to 33.6 V', () => {
    expect(BUS_V_MIN).toBeCloseTo(24.0, 6);
    expect(BUS_V_MAX).toBeCloseTo(33.6, 6);
    expect(packOcv(0)).toBeCloseTo(24.0, 6);
    expect(packOcv(1)).toBeCloseTo(33.6, 6);
    expect(packOcv(0.5)).toBeGreaterThan(29);
    expect(packOcv(0.5)).toBeLessThan(30.5);
  });

  it('OCV is monotonic in SOC', () => {
    let prev = packOcv(0);
    for (let s = 0.01; s <= 1; s += 0.01) {
      const v = packOcv(s);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('accepts the CC limit when partly discharged and tapers to zero when full', () => {
    const mid = chargeAcceptance(0.5);
    expect(mid.iMax).toBeCloseTo(CHARGE_CURRENT_LIMIT_A, 6);
    expect(mid.voltageLimited).toBe(false);

    const nearFull = chargeAcceptance(0.97);
    expect(nearFull.iMax).toBeGreaterThan(0);
    expect(nearFull.iMax).toBeLessThan(CHARGE_CURRENT_LIMIT_A);
    expect(nearFull.voltageLimited).toBe(true);
    expect(nearFull.vBusAtMax).toBeCloseTo(BUS_V_MAX, 6);

    const full = chargeAcceptance(1);
    expect(full.iMax).toBeCloseTo(0, 6);
  });

  it('bus voltage rises when charging and sags when discharging, clamped at Vmax', () => {
    expect(busVoltage(0.5, 5)).toBeGreaterThan(packOcv(0.5));
    expect(busVoltage(0.5, -5)).toBeLessThan(packOcv(0.5));
    expect(busVoltage(1, 10)).toBeCloseTo(BUS_V_MAX, 6);
  });
});
