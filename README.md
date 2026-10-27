# MPPT LEO Explorer

An interactive learning app showing how a maximum-power-point-tracking (MPPT) solar array regulator
behaves on a low-earth-orbit satellite with a 28 V class, battery-dominated bus.

Move the sliders (sun angle, cell temperature, degradation, load, battery state of charge, array sizing)
and the app redraws the array's I-V and P-V curves, marks the maximum power point, marks where the
regulator actually operates, and explains in plain language why it is there.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # model-layer tests (vitest)
npm run build      # production bundle in dist/
```

## What is modelled

| Piece | Model |
| --- | --- |
| Solar cell | Single-diode model fit to a representative 3J GaAs space cell (Azur 3G30 class): Voc 2.70 V, Isc 0.520 A, Vmp 2.411 V, Imp 0.503 A at AM0, 28 C. dVoc/dT = -6.2 mV/C, dIsc/dT = +0.36 mA/C. |
| Array | Ns cells in series per string, Np strings in parallel, 0.7 V blocking diode. Default 20S x 6P (~145 W at 28 C). |
| Irradiance | 1367 W/m^2 x cos(sun angle) x (1 - degradation). |
| Battery | 8S Li-ion, 20 Ah. OCV(SOC) table, 100 mOhm effective resistance, CC/CV charging at 0.5 C and 4.2 V/cell (33.6 V bus max). Bus spans 24.0 V (empty) to 33.6 V (full). |
| Regulator | Buck converter with constant efficiency and a 1 V minimum input-to-output headroom. |

## The four regimes

The regulator's logic, in priority order, is: (1) never exceed what the battery will accept, (2) otherwise harvest as much as possible.

| Regime | When | Where on the curve |
| --- | --- | --- |
| **Power limited** | Load + battery acceptance exceeds array capability | At the MPP. Battery charges with the surplus, or discharges to cover the shortfall. |
| **Battery limited (throttled)** | Battery nearly full and load is small | Slid up the Voc side of the curve until array power equals demand. Shaded region = power deliberately not generated. |
| **Input voltage limited** | Array Vmp has fallen below bus voltage + headroom (hot, degraded, off-sun, short string) | Pinned at the regulator's minimum input voltage, to the right of the MPP. A design-margin problem. |
| **Eclipse** | No sun | No curve. Battery carries the load. |

The purple marker shows the direct-energy-transfer (DET) comparison: what a non-MPPT array clamped to
the bus voltage would deliver. MPPT wins by a wide margin when the array is cold (Vmp far above the bus)
and can lose slightly when the array is hot and Vmp already sits near the bus.

## Layout

```
src/
  model/            pure, framework-free physics (unit tested)
    solarCell.ts    single-diode cell, datasheet fit, G/T scaling
    solarArray.ts   Ns x Np scaling, blocking diode, MPP search
    battery.ts      8S OCV(SOC), R_int, CC/CV charge acceptance
    powerSystem.ts  chooses the operating point and regime
    presets.ts      named scenarios
  components/       React UI (controls, chart, power flow, banner, explainer)
```

The model layer is stateless, so an orbit-time simulation (sun/eclipse, temperature swing, SOC integration)
or an animated perturb-and-observe tracker can be layered on top without changing it.
