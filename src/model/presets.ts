import type { ScenarioInputs } from './types';

export const DEFAULT_INPUTS: ScenarioInputs = {
  sunAngleDeg: 0,
  cellTempC: 60,
  degradation: 0,
  loadPowerW: 100,
  batterySoc: 0.6,
  nSeries: 20,
  nParallel: 6,
  converterEff: 0.95,
};

export interface Preset {
  id: string;
  label: string;
  blurb: string;
  inputs: ScenarioInputs;
}

export const PRESETS: Preset[] = [
  {
    id: 'hot-bol',
    label: 'Hot sunlit, BOL',
    blurb: 'Mid-day, panel warmed to +70 C, fresh cells. Plenty of power; regulator sits at the MPP and charges the battery.',
    inputs: { ...DEFAULT_INPUTS, sunAngleDeg: 0, cellTempC: 70, degradation: 0, loadPowerW: 80, batterySoc: 0.6 },
  },
  {
    id: 'cold-exit',
    label: 'Cold exit from eclipse',
    blurb: 'Panel at -60 C right after eclipse. Voc and Vmp are far above the bus; MPPT shines here, DET would waste a lot.',
    inputs: { ...DEFAULT_INPUTS, sunAngleDeg: 0, cellTempC: -60, degradation: 0, loadPowerW: 120, batterySoc: 0.4 },
  },
  {
    id: 'full-low-load',
    label: 'Battery full, low load',
    blurb: 'Battery at 99 % and only 40 W of load. The regulator must back off the MPP toward Voc and give power away.',
    inputs: { ...DEFAULT_INPUTS, sunAngleDeg: 0, cellTempC: 50, degradation: 0, loadPowerW: 40, batterySoc: 0.99 },
  },
  {
    id: 'eclipse',
    label: 'Eclipse',
    blurb: 'No sun. The array is dark and the battery carries the whole load.',
    inputs: { ...DEFAULT_INPUTS, sunAngleDeg: 90, cellTempC: -40, degradation: 0, loadPowerW: 120, batterySoc: 0.7 },
  },
  {
    id: 'hot-eol-short',
    label: 'Hot EOL, short string',
    blurb: 'End of life, +90 C, 30 deg off-sun, and only 16 cells per string. Vmp has fallen below the bus so the buck regulator cannot reach the MPP.',
    inputs: { ...DEFAULT_INPUTS, sunAngleDeg: 30, cellTempC: 90, degradation: 0.25, loadPowerW: 120, batterySoc: 0.9, nSeries: 16 },
  },
];
