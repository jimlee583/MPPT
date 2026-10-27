/**
 * 8S Li-ion battery pack model (a "28 V class" bus: 24.0 V empty to 33.6 V full).
 *
 * Simple Thevenin model: V_bus = OCV(SOC) + I_batt * R_int, with a CC/CV charge
 * limit: the battery charge regulator caps charge current at I_LIMIT (CC phase)
 * and will not let the terminal voltage exceed V_MAX (CV phase). Charge acceptance
 * therefore tapers to zero as the battery fills.
 */

export const BATTERY = {
  cellsInSeries: 8,
  capacityAh: 20,
  cellVmax: 4.2,
  cellVmin: 3.0,
  /** Effective pack resistance incl. harness and charge regulator sense path, ohm. */
  rIntOhm: 0.1,
  /** Max charge rate, fraction of C. */
  chargeRateC: 0.5,
} as const;

export const BUS_V_MAX = BATTERY.cellsInSeries * BATTERY.cellVmax; // 33.6 V
export const BUS_V_MIN = BATTERY.cellsInSeries * BATTERY.cellVmin; // 24.0 V
export const CHARGE_CURRENT_LIMIT_A = BATTERY.capacityAh * BATTERY.chargeRateC; // 10 A

/** Typical NMC/NCA open-circuit voltage per cell vs state of charge. */
const OCV_TABLE: Array<[soc: number, v: number]> = [
  [0.0, 3.0],
  [0.05, 3.3],
  [0.1, 3.45],
  [0.2, 3.55],
  [0.3, 3.62],
  [0.4, 3.67],
  [0.5, 3.73],
  [0.6, 3.8],
  [0.7, 3.88],
  [0.8, 3.97],
  [0.9, 4.07],
  [0.95, 4.135],
  [1.0, 4.2],
];

/** Open-circuit voltage of one cell at a given SOC (0..1), linear interpolation. */
export function cellOcv(soc: number): number {
  const s = Math.min(1, Math.max(0, soc));
  for (let k = 1; k < OCV_TABLE.length; k++) {
    const [s0, v0] = OCV_TABLE[k - 1];
    const [s1, v1] = OCV_TABLE[k];
    if (s <= s1) return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0);
  }
  return OCV_TABLE[OCV_TABLE.length - 1][1];
}

/** Pack open-circuit voltage. */
export function packOcv(soc: number): number {
  return BATTERY.cellsInSeries * cellOcv(soc);
}

export interface ChargeAcceptance {
  /** Maximum charge current the battery/charger will accept right now, A. */
  iMax: number;
  /** Bus voltage while charging at iMax, V. */
  vBusAtMax: number;
  /** True if the CV limit (not the CC limit) is what is restricting current. */
  voltageLimited: boolean;
}

/**
 * CC/CV charge acceptance. In CC mode the charger supplies I_LIMIT. Once
 * OCV + I*R would exceed V_MAX, the charger backs off to hold V_MAX (CV mode).
 */
export function chargeAcceptance(soc: number): ChargeAcceptance {
  const ocv = packOcv(soc);
  const iCv = Math.max(0, (BUS_V_MAX - ocv) / BATTERY.rIntOhm);
  const voltageLimited = iCv < CHARGE_CURRENT_LIMIT_A;
  const iMax = voltageLimited ? iCv : CHARGE_CURRENT_LIMIT_A;
  return { iMax, vBusAtMax: Math.min(BUS_V_MAX, ocv + iMax * BATTERY.rIntOhm), voltageLimited };
}

/** Bus (terminal) voltage for a given SOC and battery current (+ charging). */
export function busVoltage(soc: number, iBatt: number): number {
  const v = packOcv(soc) + iBatt * BATTERY.rIntOhm;
  return Math.min(BUS_V_MAX, Math.max(BUS_V_MIN * 0.9, v));
}
