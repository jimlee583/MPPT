import { PRESETS } from '../model/presets';
import type { ScenarioInputs } from '../model/types';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
  hint?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, format, hint, onChange }: SliderProps) {
  const shown = format ? format(value) : value.toString();
  return (
    <label className="slider">
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        <span className="slider-value">
          {shown}
          {unit ? <span className="slider-unit"> {unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint ? <div className="slider-hint">{hint}</div> : null}
    </label>
  );
}

interface ControlsProps {
  inputs: ScenarioInputs;
  activePresetId: string | null;
  onChange: (next: ScenarioInputs) => void;
  onPreset: (id: string) => void;
}

export function Controls({ inputs, activePresetId, onChange, onPreset }: ControlsProps) {
  const set = <K extends keyof ScenarioInputs>(key: K) => (v: ScenarioInputs[K]) => onChange({ ...inputs, [key]: v });

  return (
    <aside className="controls">
      <section className="card">
        <h2>Scenarios</h2>
        <div className="preset-grid">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === activePresetId ? 'preset active' : 'preset'}
              onClick={() => onPreset(p.id)}
              title={p.blurb}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activePresetId ? (
          <p className="preset-blurb">{PRESETS.find((p) => p.id === activePresetId)?.blurb}</p>
        ) : (
          <p className="preset-blurb muted">Custom settings. Pick a scenario or move the sliders.</p>
        )}
      </section>

      <section className="card">
        <h2>Environment</h2>
        <Slider
          label="Sun incidence angle"
          value={inputs.sunAngleDeg}
          min={0}
          max={90}
          step={1}
          unit="deg"
          hint="0 = sun square to the panel. Irradiance falls as cos(angle); 90 = edge-on / eclipse."
          onChange={set('sunAngleDeg')}
        />
        <Slider
          label="Cell temperature"
          value={inputs.cellTempC}
          min={-80}
          max={100}
          step={1}
          unit="C"
          hint="LEO panels swing from roughly -80 C at eclipse exit to +80 C or more mid-sun. Voc drops about 6 mV/C per cell."
          onChange={set('cellTempC')}
        />
        <Slider
          label="Degradation"
          value={inputs.degradation}
          min={0}
          max={0.3}
          step={0.01}
          unit="%"
          format={(v) => (v * 100).toFixed(0)}
          hint="Lumped radiation / UV / contamination loss. 0 = beginning of life, 20-25 % is typical end of life."
          onChange={set('degradation')}
        />
      </section>

      <section className="card">
        <h2>Spacecraft</h2>
        <Slider
          label="Load power"
          value={inputs.loadPowerW}
          min={0}
          max={300}
          step={1}
          unit="W"
          hint="Everything downstream of the bus: avionics, payload, heaters, radios."
          onChange={set('loadPowerW')}
        />
        <Slider
          label="Battery state of charge"
          value={inputs.batterySoc}
          min={0}
          max={1}
          step={0.01}
          unit="%"
          format={(v) => (v * 100).toFixed(0)}
          hint="8S Li-ion, 20 Ah. Bus is 24.0 V empty, 33.6 V full. Charge acceptance tapers above ~90 %."
          onChange={set('batterySoc')}
        />
        <Slider
          label="Regulator efficiency"
          value={inputs.converterEff}
          min={0.85}
          max={1}
          step={0.005}
          unit="%"
          format={(v) => (v * 100).toFixed(1)}
          hint="Buck converter loss between array and bus. Set to 100 % to see the ideal case."
          onChange={set('converterEff')}
        />
      </section>

      <section className="card">
        <h2>Array sizing</h2>
        <Slider
          label="Cells in series (per string)"
          value={inputs.nSeries}
          min={10}
          max={28}
          step={1}
          hint="Sets array voltage. Must keep Vmp above the bus even when hot and degraded."
          onChange={set('nSeries')}
        />
        <Slider
          label="Strings in parallel"
          value={inputs.nParallel}
          min={1}
          max={12}
          step={1}
          hint="Sets array current and therefore total power."
          onChange={set('nParallel')}
        />
      </section>
    </aside>
  );
}
