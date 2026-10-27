import { BUS_V_MAX, BUS_V_MIN, CHARGE_CURRENT_LIMIT_A } from '../model/battery';
import { BUCK_HEADROOM_V } from '../model/powerSystem';
import { CELL_DATASHEET, datasheetFit } from '../model/solarCell';
import { BLOCKING_DIODE_DROP_V } from '../model/solarArray';

export function Explainer() {
  const fit = datasheetFit();
  const d = CELL_DATASHEET;
  return (
    <section className="card explainer">
      <h2>How to read this</h2>

      <details open>
        <summary>What the I-V curve is</summary>
        <p>
          A solar cell is a current source (the photocurrent, proportional to sunlight) in parallel with a diode. At
          short circuit all the photocurrent flows out the terminals (Isc). As the terminal voltage rises the diode
          starts stealing current, gently at first, then exponentially, until at open circuit (Voc) it takes
          everything. Power is V times I, so it is zero at both ends and peaks at the knee: the <b>maximum power
          point</b> (MPP), at (Vmp, Imp).
        </p>
        <p>
          The curve here is a single-diode model fit to a representative triple-junction space cell (Azur 3G30 class,
          AM0 sun, 28 C): Voc {d.voc} V, Isc {d.isc} A, Vmp {d.vmp} V, Imp {d.imp} A. The fit gives an equivalent
          ideality factor n = {fit.n.toFixed(2)} (three junctions in series) and a series resistance of{' '}
          {(fit.rs * 1000).toFixed(0)} m&Omega;. The array is Ns cells in series per string, Np strings in parallel,
          minus a {BLOCKING_DIODE_DROP_V} V blocking diode.
        </p>
      </details>

      <details>
        <summary>Why temperature and sun angle move the curve so much</summary>
        <p>
          Sun angle scales the photocurrent: Isc goes as cos(angle) and Voc barely moves (logarithmically). The curve
          gets shorter but not narrower. Temperature does the opposite: each cell loses about{' '}
          {(Math.abs(d.dVocDt) * 1000).toFixed(1)} mV of Voc per degree C while Isc creeps up slightly. A LEO panel can
          leave eclipse near -80 C and reach +80 C or more under full sun, a 160 C swing, so the array&apos;s Vmp can
          move by 20 V or more every orbit. That is the central reason MPPT earns its place: a fixed-voltage bus can
          only ever be right at one temperature.
        </p>
      </details>

      <details>
        <summary>What a battery-dominated bus is</summary>
        <p>
          The battery sits directly on the bus, so the bus voltage <i>is</i> the battery voltage. With an 8S Li-ion
          pack that is {BUS_V_MIN.toFixed(1)} V empty to {BUS_V_MAX.toFixed(1)} V full, around 29-30 V in normal
          operation, which is why it is called a &quot;28 V&quot; bus. Loads are hung on the bus and the solar array
          regulator&apos;s only job is to put power into it. The battery absorbs any mismatch between array power and
          load power: it charges when there is surplus and discharges when there is a deficit or in eclipse.
        </p>
      </details>

      <details>
        <summary>How the MPPT regulator decides where to operate</summary>
        <p>
          The regulator is a buck (step-down) converter between the array and the bus. It controls the array voltage
          by adjusting how much current it draws. Its control loop has two priorities, in order:
        </p>
        <ol>
          <li>
            <b>Protect the battery.</b> The battery charge regulator caps charge current at {CHARGE_CURRENT_LIMIT_A} A
            (0.5 C) and never lets the bus exceed {BUS_V_MAX.toFixed(1)} V (4.2 V per cell). As the battery fills, the
            current it will accept tapers toward zero (constant-current then constant-voltage charging).
          </li>
          <li>
            <b>Otherwise take everything.</b> If the load plus the battery&apos;s acceptance exceeds what the array can
            make, the tracker runs the array at the MPP and the battery soaks up whatever is left (or covers whatever
            is short).
          </li>
        </ol>
        <p>
          When the bus wants <i>less</i> than the MPP (small load, nearly full battery), the regulator must throw power
          away. It does this by sliding the operating point up the Voc side of the curve until array power equals
          demand. The Voc side is chosen because it is stable and well behaved: the current drops steeply with small
          voltage changes, and the array dissipates the unused energy as heat harmlessly. In a real spacecraft this is
          often done with a separate shunt or by simply letting the tracker loop clamp on the battery voltage limit.
        </p>
      </details>

      <details>
        <summary>Why Vmp must stay above the bus voltage</summary>
        <p>
          A buck converter can only step voltage down, so the array voltage must stay at least ~{BUCK_HEADROOM_V} V
          above the bus. If the array is hot, degraded and off-sun enough that Vmp falls below the bus, the true MPP is
          unreachable: the regulator pins the array at its minimum input voltage, to the right of the MPP, and loses
          power. Sizing the string (cells in series) so that worst-case hot, end-of-life Vmp still clears the
          end-of-charge bus voltage ({BUS_V_MAX.toFixed(1)} V) with margin is one of the first decisions in a solar
          array design. Try the &quot;Hot EOL, short string&quot; scenario and then add cells.
        </p>
      </details>

      <details>
        <summary>MPPT versus direct energy transfer (DET)</summary>
        <p>
          The older, simpler architecture connects the array straight to the bus through the blocking diodes, so the
          array is forced to operate at the bus voltage (the purple point). A shunt regulator dumps any excess. DET
          has no converter loss and no tracking electronics, and it works well when the array can be designed so that
          Vmp sits just above the bus at the hot, end-of-life condition. The price is that whenever the array is cold
          or fresh, Vmp is far above the bus and the extra power is simply never collected.
        </p>
        <p>
          MPPT recovers that cold-array power (look at the &quot;Cold exit from eclipse&quot; scenario), lets a single
          array design serve different bus voltages, and tolerates large temperature swings. It costs a few percent in
          converter efficiency, which is why in the hot, Vmp-near-bus case DET can actually come out ahead. For LEO,
          with its 15 eclipses a day and big thermal cycling, MPPT usually wins overall.
        </p>
      </details>

      <details>
        <summary>Simplifications in this model</summary>
        <ul>
          <li>Shunt resistance ignored; one lumped diode for the three junctions; constant blocking-diode drop.</li>
          <li>Degradation applied as a uniform irradiance multiplier rather than separate Isc/Voc factors.</li>
          <li>Battery modelled as OCV(SOC) plus a fixed 100 m&Omega; effective pack-plus-harness resistance.</li>
          <li>Constant-power loads; constant converter efficiency; no tracking ripple or hunting around the MPP.</li>
          <li>Steady state only. SOC does not integrate over time (that is the next step: an orbit simulation).</li>
        </ul>
      </details>
    </section>
  );
}
