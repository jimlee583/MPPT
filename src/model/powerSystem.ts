/**
 * Decides where on the array I-V curve an MPPT regulator operates, given the
 * load, the battery's state, and the regulator's own constraints.
 *
 * Topology assumed (battery-dominated bus):
 *
 *   array --> [ MPPT buck regulator ] --> bus (= battery terminals) --> loads
 *
 * The regulator has an outer control loop with priority:
 *   1. Never exceed what the battery will accept (CC/CV limits).
 *   2. Otherwise, harvest the maximum power available.
 *
 * It is a buck converter, so the array voltage must stay above the bus voltage
 * (plus a little headroom). If the array's Vmp is below that, the true MPP is
 * unreachable and the regulator runs at its minimum input voltage instead.
 */
import { busVoltage, chargeAcceptance, packOcv } from './battery';
import type { BatteryMode, OperatingPoint, Regime, ScenarioInputs, SolarArrayResult } from './types';

/** Minimum (array - bus) voltage the buck regulator needs to function. */
export const BUCK_HEADROOM_V = 1.0;

/** Battery current below this magnitude is reported as idle. */
const IDLE_CURRENT_A = 0.02;

function batteryMode(iBatt: number): BatteryMode {
  if (iBatt > IDLE_CURRENT_A) return 'CHARGING';
  if (iBatt < -IDLE_CURRENT_A) return 'DISCHARGING';
  return 'IDLE';
}

/**
 * Find V in [vLo, vHi] on the Voc side of the P-V curve where P(V) = target.
 * P is monotonically decreasing on this interval.
 */
function voltageForPowerOnVocSide(
  array: SolarArrayResult,
  target: number,
  vLo: number,
  vHi: number,
): number {
  let lo = vLo;
  let hi = vHi;
  for (let k = 0; k < 60; k++) {
    const mid = 0.5 * (lo + hi);
    if (array.powerAt(mid) > target) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

export function solveOperatingPoint(array: SolarArrayResult, inputs: ScenarioInputs): OperatingPoint {
  const eta = Math.min(1, Math.max(0.5, inputs.converterEff));
  const soc = Math.min(1, Math.max(0, inputs.batterySoc));
  const loadP = Math.max(0, inputs.loadPowerW);
  const ocv = packOcv(soc);
  const accept = chargeAcceptance(soc);
  const mpp = { v: array.vmp, i: array.imp, p: array.pmp };

  // ---------- Eclipse: no array power at all ----------
  if (array.pmp < 1e-3) {
    let vBus = ocv;
    let iBatt = 0;
    for (let k = 0; k < 12; k++) {
      iBatt = -loadP / vBus;
      vBus = busVoltage(soc, iBatt);
    }
    return {
      regime: 'ECLIPSE',
      batteryMode: batteryMode(iBatt),
      arrayV: 0,
      arrayI: 0,
      arrayP: 0,
      mpp,
      reachableMpp: mpp,
      converterEff: eta,
      converterLossW: 0,
      minInputV: vBus + BUCK_HEADROOM_V,
      inputLimited: false,
      busV: vBus,
      busPowerW: 0,
      loadPowerW: loadP,
      loadI: loadP / vBus,
      batteryI: iBatt,
      batteryPowerW: iBatt * vBus,
      batteryOcv: ocv,
      batteryChargeAcceptanceA: accept.iMax,
      batterySoc: soc,
      powerGivenUpW: 0,
      detPowerW: 0,
    };
  }

  // ---------- Sunlit: fixed-point iteration on bus voltage ----------
  let vBus = ocv;
  let iBatt = 0;
  let arrayV = array.vmp;
  let arrayP = array.pmp;
  let regime: Regime = 'MPPT_POWER_LIMITED';
  let reachable = mpp;
  let inputLimited = false;
  let minInputV = vBus + BUCK_HEADROOM_V;

  for (let k = 0; k < 20; k++) {
    minInputV = vBus + BUCK_HEADROOM_V;

    // 1. Where is the best point the buck regulator can actually reach?
    if (array.vmp >= minInputV) {
      reachable = mpp;
      inputLimited = false;
    } else if (minInputV < array.voc) {
      const i = array.currentAt(minInputV);
      reachable = { v: minInputV, i, p: minInputV * i };
      inputLimited = true;
    } else {
      reachable = { v: minInputV, i: 0, p: 0 };
      inputLimited = true;
    }

    // 2. How much array power does the bus want right now?
    const pDemandBus = loadP + accept.vBusAtMax * accept.iMax;
    const pDemandArray = pDemandBus / eta;

    if (pDemandArray >= reachable.p) {
      // Power limited: take everything the array can give at the reachable MPP.
      arrayV = reachable.v;
      arrayP = reachable.p;
      const busP = eta * arrayP;
      iBatt = (busP - loadP) / vBus;
      regime = inputLimited ? 'INPUT_VOLTAGE_LIMITED' : 'MPPT_POWER_LIMITED';
    } else {
      // Battery limited: back off toward Voc until array power matches demand.
      arrayV = voltageForPowerOnVocSide(array, pDemandArray, reachable.v, array.voc);
      arrayP = pDemandArray;
      iBatt = accept.iMax;
      regime = 'THROTTLED_BATTERY_LIMITED';
    }

    const vNext = busVoltage(soc, iBatt);
    if (Math.abs(vNext - vBus) < 1e-5) {
      vBus = vNext;
      break;
    }
    vBus = 0.5 * (vBus + vNext); // relaxed update for robustness
  }

  const arrayI = arrayV > 0 ? arrayP / arrayV : 0;
  const busP = eta * arrayP;

  return {
    regime,
    batteryMode: batteryMode(iBatt),
    arrayV,
    arrayI,
    arrayP,
    mpp,
    reachableMpp: reachable,
    converterEff: eta,
    converterLossW: arrayP - busP,
    minInputV,
    inputLimited,
    busV: vBus,
    busPowerW: busP,
    loadPowerW: loadP,
    loadI: loadP / vBus,
    batteryI: iBatt,
    batteryPowerW: iBatt * vBus,
    batteryOcv: ocv,
    batteryChargeAcceptanceA: accept.iMax,
    batterySoc: soc,
    powerGivenUpW: Math.max(0, array.pmp - arrayP),
    detPowerW: array.powerAt(vBus),
  };
}
