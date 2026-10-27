import { describe, expect, it } from 'vitest';
import { BUS_V_MAX, CHARGE_CURRENT_LIMIT_A } from '../battery';
import { BUCK_HEADROOM_V, solveOperatingPoint } from '../powerSystem';
import { PRESETS } from '../presets';
import { buildSolarArray } from '../solarArray';
import type { OperatingPoint, ScenarioInputs } from '../types';

function run(inputs: ScenarioInputs): { op: OperatingPoint; array: ReturnType<typeof buildSolarArray> } {
  const array = buildSolarArray(inputs);
  return { op: solveOperatingPoint(array, inputs), array };
}

function preset(id: string): ScenarioInputs {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`missing preset ${id}`);
  return p.inputs;
}

/** Power into the bus must equal load plus battery charge (within rounding). */
function expectPowerBalance(op: OperatingPoint) {
  expect(op.busPowerW).toBeCloseTo(op.loadPowerW + op.batteryI * op.busV, 3);
  expect(op.converterLossW).toBeCloseTo(op.arrayP - op.busPowerW, 6);
  expect(op.arrayP).toBeCloseTo(op.arrayV * op.arrayI, 6);
}

describe('powerSystem regimes', () => {
  it('Hot sunlit BOL: at MPP, charging the battery at the CC limit or below', () => {
    const { op } = run(preset('hot-bol'));
    expect(op.regime).toBe('MPPT_POWER_LIMITED');
    expect(op.batteryMode).toBe('CHARGING');
    expect(op.arrayV).toBeCloseTo(op.mpp.v, 6);
    expect(op.batteryI).toBeGreaterThan(0);
    expect(op.batteryI).toBeLessThanOrEqual(CHARGE_CURRENT_LIMIT_A + 0.05);
    expectPowerBalance(op);
  });

  it('Cold exit from eclipse: at MPP, DET would deliver far less', () => {
    const { op } = run(preset('cold-exit'));
    expect(op.regime).toBe('MPPT_POWER_LIMITED');
    expect(op.arrayV).toBeCloseTo(op.mpp.v, 6);
    expect(op.mpp.v).toBeGreaterThan(55);
    expect(op.detPowerW).toBeLessThan(0.75 * op.busPowerW);
    expectPowerBalance(op);
  });

  it('Battery full, low load: throttled toward Voc, power given up, bus at Vmax', () => {
    const { op, array } = run(preset('full-low-load'));
    expect(op.regime).toBe('THROTTLED_BATTERY_LIMITED');
    expect(op.arrayV).toBeGreaterThan(op.mpp.v);
    expect(op.arrayV).toBeLessThan(array.voc);
    expect(op.powerGivenUpW).toBeGreaterThan(50);
    expect(op.busV).toBeCloseTo(BUS_V_MAX, 1);
    expect(op.batteryI).toBeCloseTo(op.batteryChargeAcceptanceA, 6);
    expectPowerBalance(op);
  });

  it('Eclipse: array dark, battery carries the load', () => {
    const { op } = run(preset('eclipse'));
    expect(op.regime).toBe('ECLIPSE');
    expect(op.batteryMode).toBe('DISCHARGING');
    expect(op.arrayP).toBe(0);
    expect(op.batteryI * op.busV).toBeCloseTo(-op.loadPowerW, 3);
  });

  it('Hot EOL short string: Vmp below bus, regulator pinned at minimum input voltage', () => {
    const { op } = run(preset('hot-eol-short'));
    expect(op.inputLimited).toBe(true);
    expect(op.mpp.v).toBeLessThan(op.minInputV);
    expect(op.arrayV).toBeCloseTo(op.busV + BUCK_HEADROOM_V, 3);
    expect(op.arrayP).toBeLessThan(op.mpp.p);
    expectPowerBalance(op);
  });

  it('Heavy load exceeding array power: at MPP with the battery discharging', () => {
    const { op } = run({ ...preset('hot-bol'), loadPowerW: 300 });
    expect(op.regime).toBe('MPPT_POWER_LIMITED');
    expect(op.batteryMode).toBe('DISCHARGING');
    expect(op.arrayV).toBeCloseTo(op.mpp.v, 6);
    expectPowerBalance(op);
  });

  it('is continuous across the MPPT / throttled boundary', () => {
    // Sweep load power and check array power never jumps.
    const base = preset('full-low-load');
    let prev: number | null = null;
    for (let load = 0; load <= 200; load += 2) {
      const { op } = run({ ...base, loadPowerW: load });
      if (prev !== null) expect(Math.abs(op.arrayP - prev)).toBeLessThan(5);
      prev = op.arrayP;
    }
  });
});
