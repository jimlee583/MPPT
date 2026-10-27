import { useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { Explainer } from './components/Explainer';
import { IVChart } from './components/IVChart';
import { PowerFlow } from './components/PowerFlow';
import { RegimeBanner } from './components/RegimeBanner';
import { solveOperatingPoint } from './model/powerSystem';
import { PRESETS } from './model/presets';
import { buildSolarArray } from './model/solarArray';
import { CELL_DATASHEET } from './model/solarCell';
import type { ScenarioInputs } from './model/types';

export default function App() {
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id);
  const [inputs, setInputs] = useState<ScenarioInputs>(PRESETS[0].inputs);
  const [showReference, setShowReference] = useState(true);

  const array = useMemo(() => buildSolarArray(inputs), [inputs]);
  const op = useMemo(() => solveOperatingPoint(array, inputs), [array, inputs]);

  // Fixed axis extents for the current array sizing: coldest/brightest case sets V and P,
  // hottest case sets I. Only changes when Ns/Np change, so the curve visibly moves.
  const axes = useMemo(() => {
    const cold = buildSolarArray({ ...inputs, sunAngleDeg: 0, cellTempC: -80, degradation: 0 }, 50);
    const hot = buildSolarArray({ ...inputs, sunAngleDeg: 0, cellTempC: 100, degradation: 0 }, 50);
    return {
      vMax: Math.ceil((cold.voc * 1.05) / 5) * 5,
      iMax: Math.ceil(hot.isc * 1.15 * 2) / 2,
      pMax: Math.ceil((cold.pmp * 1.1) / 10) * 10,
    };
  }, [inputs.nSeries, inputs.nParallel]); // eslint-disable-line react-hooks/exhaustive-deps

  const reference = useMemo(
    () =>
      showReference
        ? buildSolarArray({ ...inputs, sunAngleDeg: 0, cellTempC: CELL_DATASHEET.t0, degradation: 0 }, 150).curve
        : null,
    [showReference, inputs.nSeries, inputs.nParallel], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onChange = (next: ScenarioInputs) => {
    setInputs(next);
    setPresetId(null);
  };
  const onPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setInputs(p.inputs);
    setPresetId(id);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>MPPT on a LEO satellite</h1>
          <p>
            Where a maximum-power-point tracker operates a solar array on a 28 V battery-dominated bus, and why it
            moves off the peak.
          </p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showReference} onChange={(e) => setShowReference(e.target.checked)} />
          Show 28 C reference curve
        </label>
      </header>

      <div className="layout">
        <Controls inputs={inputs} activePresetId={presetId} onChange={onChange} onPreset={onPreset} />

        <main className="main">
          <RegimeBanner op={op} array={array} />

          <section className="card">
            <div className="chart-head">
              <h2>Array I-V and P-V curves</h2>
              <div className="stats">
                <span>
                  Irradiance <b>{array.irradiance.toFixed(0)} W/m²</b>
                </span>
                <span>
                  Voc <b>{array.voc.toFixed(1)} V</b>
                </span>
                <span>
                  Isc <b>{array.isc.toFixed(2)} A</b>
                </span>
                <span>
                  Vmp <b>{array.vmp.toFixed(1)} V</b>
                </span>
                <span>
                  Imp <b>{array.imp.toFixed(2)} A</b>
                </span>
                <span>
                  Pmp <b>{array.pmp.toFixed(1)} W</b>
                </span>
              </div>
            </div>
            <IVChart array={array} op={op} axes={axes} reference={reference} />
          </section>

          <PowerFlow op={op} />
        </main>
      </div>

      <Explainer />
    </div>
  );
}
