import type { OperatingPoint } from '../model/types';

function f(x: number, d = 1) {
  return x.toFixed(d);
}

interface BoxProps {
  title: string;
  tone?: string;
  rows: Array<[label: string, value: string]>;
  foot?: string;
}

function Box({ title, tone = '', rows, foot }: BoxProps) {
  return (
    <div className={`flow-box ${tone}`}>
      <div className="flow-title">{title}</div>
      {rows.map(([k, v]) => (
        <div className="flow-row" key={k}>
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
      {foot ? <div className="flow-foot">{foot}</div> : null}
    </div>
  );
}

function Arrow({ label, reverse = false, dim = false }: { label: string; reverse?: boolean; dim?: boolean }) {
  return (
    <div className={`flow-arrow ${dim ? 'dim' : ''}`}>
      <div className="flow-arrow-label">{label}</div>
      <div className="flow-arrow-glyph">{reverse ? '\u2190' : '\u2192'}</div>
    </div>
  );
}

export function PowerFlow({ op }: { op: OperatingPoint }) {
  const charging = op.batteryI > 0.02;
  const discharging = op.batteryI < -0.02;
  const battTitle = charging ? 'Battery (charging)' : discharging ? 'Battery (discharging)' : 'Battery (idle)';

  return (
    <section className="card">
      <h2>Power flow</h2>
      <div className="flow">
        <Box
          title="Solar array"
          tone={op.arrayP > 0 ? 'src' : 'off'}
          rows={[
            ['Voltage', `${f(op.arrayV)} V`],
            ['Current', `${f(op.arrayI, 2)} A`],
            ['Power', `${f(op.arrayP)} W`],
          ]}
          foot={op.arrayP > 0 ? `MPP available: ${f(op.mpp.p)} W` : 'dark'}
        />
        <Arrow label={`${f(op.arrayP)} W`} dim={op.arrayP <= 0} />
        <Box
          title="MPPT regulator"
          rows={[
            ['Efficiency', `${f(op.converterEff * 100)} %`],
            ['Loss', `${f(op.converterLossW)} W`],
            ['Min input', `${f(op.minInputV)} V`],
          ]}
          foot={op.regime.replace(/_/g, ' ').toLowerCase()}
        />
        <Arrow label={`${f(op.busPowerW)} W`} dim={op.busPowerW <= 0} />
        <Box
          title="28 V bus"
          tone="bus"
          rows={[
            ['Voltage', `${f(op.busV, 2)} V`],
            ['From regulator', `${f(op.busPowerW)} W`],
            ['Net to battery', `${f(op.batteryPowerW)} W`],
          ]}
        />
        <div className="flow-split">
          <div className="flow-branch">
            <Arrow label={`${f(op.loadPowerW)} W`} />
            <Box title="Loads" tone="load" rows={[['Power', `${f(op.loadPowerW, 0)} W`], ['Current', `${f(op.loadI, 2)} A`]]} />
          </div>
          <div className="flow-branch">
            <Arrow label={`${f(Math.abs(op.batteryPowerW))} W`} reverse={discharging} dim={!charging && !discharging} />
            <Box
              title={battTitle}
              tone={charging ? 'charge' : discharging ? 'discharge' : ''}
              rows={[
                ['Current', `${op.batteryI >= 0 ? '+' : ''}${f(op.batteryI, 2)} A`],
                ['SOC', `${f(op.batterySoc * 100, 0)} %`],
                ['OCV', `${f(op.batteryOcv, 2)} V`],
              ]}
              foot={`will accept up to ${f(op.batteryChargeAcceptanceA, 2)} A`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
