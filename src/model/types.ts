/** One sampled point on an I-V / P-V curve. */
export interface CurvePoint {
  v: number; // volts
  i: number; // amps
  p: number; // watts
}

/** Parameters of a lumped single-diode model for one cell at one (G, T) condition. */
export interface DiodeParams {
  iph: number; // photocurrent, A
  i0: number; // diode saturation current, A
  nVt: number; // ideality factor times thermal voltage, V
  rs: number; // series resistance, ohm
}

export interface SolarArrayResult {
  curve: CurvePoint[];
  voc: number;
  isc: number;
  vmp: number;
  imp: number;
  pmp: number;
  /** Current at a given array terminal voltage (0 for V >= Voc). */
  currentAt: (v: number) => number;
  /** Power at a given array terminal voltage. */
  powerAt: (v: number) => number;
  irradiance: number; // W/m^2 actually hitting the cells (after cos and degradation)
  cellTempC: number;
}

export type Regime =
  | 'ECLIPSE'
  | 'MPPT_POWER_LIMITED'
  | 'THROTTLED_BATTERY_LIMITED'
  | 'INPUT_VOLTAGE_LIMITED';

export type BatteryMode = 'CHARGING' | 'DISCHARGING' | 'IDLE';

export interface OperatingPoint {
  regime: Regime;
  batteryMode: BatteryMode;

  // Array side
  arrayV: number;
  arrayI: number;
  arrayP: number;

  // Reference points on the curve
  mpp: { v: number; i: number; p: number };
  /** Best point the regulator can actually reach given its minimum input voltage. */
  reachableMpp: { v: number; i: number; p: number };

  // Regulator
  converterEff: number;
  converterLossW: number;
  /** Minimum array voltage the buck regulator can operate from (bus + headroom). */
  minInputV: number;
  /** True when the array Vmp sits below minInputV, so the true MPP is unreachable. */
  inputLimited: boolean;

  // Bus
  busV: number;
  busPowerW: number; // power delivered into the bus by the regulator
  loadPowerW: number;
  loadI: number;

  // Battery
  batteryI: number; // + charging, - discharging
  batteryPowerW: number; // + into battery
  batteryOcv: number;
  batteryChargeAcceptanceA: number; // max charge current the battery will take right now
  batterySoc: number;

  // Teaching quantities
  powerGivenUpW: number; // Pmp - arrayP (how much the regulator left on the table on purpose or by constraint)
  detPowerW: number; // power a direct-energy-transfer (no MPPT) array clamped at bus voltage would deliver
}

export interface ScenarioInputs {
  sunAngleDeg: number; // 0 = sun normal to panel, 90 = edge on / eclipse
  cellTempC: number;
  degradation: number; // 0..1 fraction of lost irradiance-equivalent output
  loadPowerW: number;
  batterySoc: number; // 0..1
  nSeries: number;
  nParallel: number;
  converterEff: number; // 0..1
}
