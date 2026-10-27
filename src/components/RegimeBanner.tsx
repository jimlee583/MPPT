import type { OperatingPoint, SolarArrayResult } from '../model/types';

function f(x: number, d = 1) {
  return x.toFixed(d);
}

interface Props {
  op: OperatingPoint;
  array: SolarArrayResult;
}

export function RegimeBanner({ op, array }: Props) {
  let tone = 'ok';
  let headline = '';
  let body: React.ReactNode = null;

  const busDelivered = op.busPowerW;
  // Compare what each architecture *could* deliver to the bus, independent of throttling.
  const mpptAvailable = op.converterEff * op.reachableMpp.p;
  const detVsMppt = op.detPowerW - mpptAvailable;

  switch (op.regime) {
    case 'ECLIPSE':
      tone = 'dark';
      headline = 'Eclipse: the array is dark, the battery is carrying the spacecraft.';
      body = (
        <>
          No photocurrent, so there is no I-V curve to track. The {f(op.loadPowerW, 0)} W load draws{' '}
          {f(-op.batteryI, 2)} A from the battery and the bus sags to {f(op.busV, 2)} V (open-circuit{' '}
          {f(op.batteryOcv, 2)} V minus the drop across internal resistance). The regulator simply waits for sunrise.
        </>
      );
      break;

    case 'MPPT_POWER_LIMITED':
      if (op.batteryMode === 'DISCHARGING') {
        tone = 'warn';
        headline = 'Power limited: regulator at the MPP, but the load exceeds array power, so the battery is discharging.';
        body = (
          <>
            The array can give at most {f(op.mpp.p, 1)} W, which becomes {f(busDelivered, 1)} W on the bus after{' '}
            {f(op.converterLossW, 1)} W of converter loss. The load wants {f(op.loadPowerW, 0)} W, so the battery
            supplies the remaining {f(-op.batteryPowerW, 1)} W ({f(-op.batteryI, 2)} A). The tracker is doing all it can;
            the shortfall is a sizing or operations problem, not a tracking problem.
          </>
        );
      } else {
        tone = 'ok';
        headline = 'Power limited: regulator at the MPP, all surplus flows into the battery.';
        body = (
          <>
            The battery would accept up to {f(op.batteryChargeAcceptanceA, 2)} A right now, which (plus the{' '}
            {f(op.loadPowerW, 0)} W load) is more than the array can deliver. So the regulator harvests the full{' '}
            {f(op.mpp.p, 1)} W at Vmp = {f(op.mpp.v, 1)} V, pushes {f(busDelivered, 1)} W onto the bus, and the battery
            charges at {f(op.batteryI, 2)} A. This is the regime MPPT is designed for.
          </>
        );
      }
      break;

    case 'THROTTLED_BATTERY_LIMITED':
      tone = 'info';
      headline =
        op.batteryChargeAcceptanceA < 0.05
          ? 'Battery limited: battery full, so the regulator backs off the MPP and feeds only the load.'
          : 'Battery limited: the regulator backs off the MPP so the battery is not over-charged.';
      body = (
        <>
          The array could make {f(op.mpp.p, 1)} W but the bus only needs {f(op.loadPowerW, 0)} W for loads plus{' '}
          {f(op.batteryChargeAcceptanceA * op.busV, 1)} W to charge at the battery&apos;s current acceptance of{' '}
          {f(op.batteryChargeAcceptanceA, 2)} A. The regulator deliberately slides the operating point up the Voc side
          of the curve to {f(op.arrayV, 1)} V, where the array only produces {f(op.arrayP, 1)} W. The{' '}
          <b>{f(op.powerGivenUpW, 1)} W</b> shaded on the chart is simply not generated; the cells sit a little hotter
          instead. Moving toward Voc rather than Isc is the stable choice: a small voltage change there gives a big
          current change, which is what the control loop wants.
        </>
      );
      break;

    case 'INPUT_VOLTAGE_LIMITED':
      tone = 'bad';
      headline = 'Design problem: array Vmp is below the bus, so the buck regulator cannot reach the MPP.';
      body = (
        <>
          A buck regulator needs its input (array) voltage above its output (bus) voltage, here at least{' '}
          {f(op.minInputV, 1)} V. The array&apos;s MPP is at only {f(op.mpp.v, 1)} V because it is hot, degraded and
          off-sun. The regulator is pinned at its minimum input voltage, harvesting {f(op.arrayP, 1)} W instead of the{' '}
          {f(op.mpp.p, 1)} W that is available. Add cells in series (or cool the array) to restore margin. Note that a
          simple DET array clamped to the bus would deliver {f(op.detPowerW, 1)} W here with no converter loss.
        </>
      );
      break;
  }

  return (
    <section className={`banner ${tone}`}>
      <h2>{headline}</h2>
      <p>{body}</p>
      {op.regime !== 'ECLIPSE' ? (
        <p className="banner-foot">
          MPPT vs no-MPPT: a direct-energy-transfer array clamped at the bus voltage could deliver{' '}
          <b>{f(op.detPowerW, 1)} W</b>; this MPPT regulator could deliver <b>{f(mpptAvailable, 1)} W</b> to the bus
          {op.regime === 'THROTTLED_BATTERY_LIMITED' ? <> (it is currently choosing to deliver only {f(busDelivered, 1)} W)</> : null}
          {detVsMppt > 0.5 ? (
            <>
              {' '}
              (DET wins by {f(detVsMppt, 1)} W here because the array is hot and Vmp already sits near the bus, so
              MPPT&apos;s converter loss outweighs its tracking gain)
            </>
          ) : detVsMppt < -0.5 ? (
            <>
              {' '}
              (MPPT wins by {f(-detVsMppt, 1)} W; Vmp = {f(array.vmp, 1)} V is {f(array.vmp - op.busV, 1)} V above the
              bus, energy a DET system could never collect)
            </>
          ) : (
            <> (about even)</>
          )}
          .
        </p>
      ) : null}
    </section>
  );
}
