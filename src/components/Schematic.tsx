/**
 * Representative schematic of a synchronous-buck MPPT regulator on a battery-dominated bus,
 * drawn as plain SVG so it needs no extra dependencies.
 *
 * Coordinate conventions: top (positive) rail at y = 120, return rail at y = 260.
 * Signal lines that cross the return rail do so under a small "hop" in the rail.
 */

const PWR = '#111827'; // power path
const SENSE = '#0d9488'; // measurements
const CTRL = '#7c3aed'; // control signals
const GATE = '#dc2626'; // gate drive
const BOX = '#9ca3af';

const TOP = 120;
const RET = 260;

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} fill={PWR} />;
}

/** Horizontal resistor, 32 units long, starting at (x, y). */
function HResistor({ x, y }: { x: number; y: number }) {
  return <path d={`M ${x} ${y} l 4 0 l 3 -6 l 6 12 l 6 -12 l 6 12 l 3 -6 l 4 0`} fill="none" stroke={PWR} strokeWidth={2} />;
}

function Capacitor({ x }: { x: number }) {
  return (
    <g stroke={PWR} strokeWidth={2}>
      <line x1={x} y1={TOP} x2={x} y2={184} />
      <line x1={x - 10} y1={184} x2={x + 10} y2={184} />
      <line x1={x - 10} y1={196} x2={x + 10} y2={196} />
      <line x1={x} y1={196} x2={x} y2={RET} />
    </g>
  );
}

function Block({
  x,
  y,
  w,
  h,
  lines,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  color: string;
}) {
  const lh = 13;
  const y0 = y + h / 2 - ((lines.length - 1) * lh) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="white" stroke={color} strokeWidth={1.5} />
      {lines.map((t, k) => (
        <text key={k} x={x + w / 2} y={y0 + k * lh} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={PWR}>
          {t}
        </text>
      ))}
    </g>
  );
}

function Label({ x, y, children, anchor = 'middle', color = PWR, size = 11 }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end'; color?: string; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color}>
      {children}
    </text>
  );
}

export function Schematic() {
  return (
    <div className="schematic">
      <svg viewBox="0 0 840 525" role="img" aria-label="Schematic of a synchronous buck MPPT regulator between a solar array and a 28 volt battery bus, with its control loop">
        <defs>
          {[
            ['sch-ar-sense', SENSE],
            ['sch-ar-ctrl', CTRL],
            ['sch-ar-gate', GATE],
          ].map(([id, c]) => (
            <marker key={id} id={id} markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L8,4 L0,8 z" fill={c} />
            </marker>
          ))}
        </defs>

        {/* ---------- Regulator enclosure ---------- */}
        <rect x={160} y={62} width={460} height={418} rx={6} fill="none" stroke={BOX} strokeDasharray="6 4" />
        <Label x={168} y={78} anchor="start" color="#6b7280">
          MPPT regulator (synchronous buck topology)
        </Label>
        <Label x={720} y={84} color="#6b7280">
          28 V battery-dominated bus
        </Label>

        {/* ---------- Solar array ---------- */}
        <rect x={40} y={150} width={60} height={80} rx={4} fill="#fff7ed" stroke={PWR} strokeWidth={1.5} />
        <g stroke="#d97706" strokeWidth={1.5} fill="none">
          <circle cx={70} cy={178} r={7} />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <line key={k} x1={70 + 10 * Math.cos(a)} y1={178 + 10 * Math.sin(a)} x2={70 + 14 * Math.cos(a)} y2={178 + 14 * Math.sin(a)} />;
          })}
        </g>
        <Label x={70} y={216}>
          PV array
        </Label>
        <Label x={70} y={104}>
          Solar array
        </Label>
        <line x1={70} y1={TOP} x2={70} y2={150} stroke={PWR} strokeWidth={2} />
        <line x1={70} y1={230} x2={70} y2={RET} stroke={PWR} strokeWidth={2} />
        <Label x={82} y={140} size={12}>
          +
        </Label>

        {/* ---------- Top rail with inline components ---------- */}
        <g stroke={PWR} strokeWidth={2} fill="none">
          <line x1={70} y1={TOP} x2={120} y2={TOP} />
          {/* Blocking diode */}
          <line x1={120} y1={TOP} x2={126} y2={TOP} />
          <polygon points="126,112 126,128 144,120" fill={PWR} />
          <line x1={144} y1={112} x2={144} y2={128} />
          <line x1={144} y1={TOP} x2={244} y2={TOP} />
          {/* I_array shunt 244-276 */}
          <line x1={276} y1={TOP} x2={300} y2={TOP} />
          {/* Q1 switch 300-340, blade opens downward so the gate drive can reach it from below */}
          <line x1={300} y1={TOP} x2={306} y2={TOP} />
          <line x1={306} y1={TOP} x2={332} y2={134} />
          <circle cx={306} cy={TOP} r={2} fill={PWR} />
          <circle cx={334} cy={TOP} r={2} fill={PWR} />
          <line x1={334} y1={TOP} x2={400} y2={TOP} />
          {/* Inductor 400-470 */}
          <path d="M 400 120 a 8.75 8.75 0 0 1 17.5 0 a 8.75 8.75 0 0 1 17.5 0 a 8.75 8.75 0 0 1 17.5 0 a 8.75 8.75 0 0 1 17.5 0" />
          <line x1={470} y1={TOP} x2={554} y2={TOP} />
          {/* I_batt shunt 554-586 */}
          <line x1={586} y1={TOP} x2={760} y2={TOP} />
        </g>
        <HResistor x={244} y={TOP} />
        <HResistor x={554} y={TOP} />

        <Label x={135} y={104}>
          D_blk
        </Label>
        <Label x={260} y={104}>
          R_sense
        </Label>
        <Label x={338} y={104}>
          Q1 (high side)
        </Label>
        <Label x={435} y={104}>
          L
        </Label>
        <Label x={570} y={104}>
          R_sense
        </Label>

        {/* ---------- Return rail with hops where signals cross ---------- */}
        <path
          d="M 70 260 H 222 a 8 8 0 0 1 16 0 H 252 a 8 8 0 0 1 16 0 H 342 a 8 8 0 0 1 16 0 H 522 a 8 8 0 0 1 16 0 H 562 a 8 8 0 0 1 16 0 H 760"
          fill="none"
          stroke={PWR}
          strokeWidth={2}
        />
        {/* ground symbol */}
        <g stroke={PWR} strokeWidth={2}>
          <line x1={760} y1={RET} x2={760} y2={272} />
          <line x1={748} y1={272} x2={772} y2={272} />
          <line x1={752} y1={277} x2={768} y2={277} />
          <line x1={756} y1={282} x2={764} y2={282} />
        </g>

        {/* ---------- Shunt elements ---------- */}
        <Capacitor x={210} />
        <Label x={222} y={236} anchor="start">
          C_in
        </Label>
        <Capacitor x={510} />
        <Label x={498} y={178} anchor="end">
          C_out
        </Label>

        {/* Q2 synchronous rectifier, vertical switch at x = 380 */}
        <g stroke={PWR} strokeWidth={2} fill="none">
          <line x1={380} y1={TOP} x2={380} y2={166} />
          <line x1={380} y1={166} x2={394} y2={192} />
          <circle cx={380} cy={166} r={2} fill={PWR} />
          <circle cx={380} cy={194} r={2} fill={PWR} />
          <line x1={380} y1={194} x2={380} y2={RET} />
        </g>
        <Label x={398} y={222} anchor="start">
          Q2 (sync.
        </Label>
        <Label x={398} y={235} anchor="start">
          rectifier or
        </Label>
        <Label x={398} y={248} anchor="start">
          freewheel diode)
        </Label>
        <Label x={372} y={146} anchor="end" color="#6b7280">
          SW
        </Label>

        {/* Battery */}
        <g stroke={PWR} strokeWidth={2}>
          <line x1={680} y1={TOP} x2={680} y2={170} />
          <line x1={666} y1={170} x2={694} y2={170} />
          <line x1={673} y1={178} x2={687} y2={178} />
          <line x1={666} y1={188} x2={694} y2={188} />
          <line x1={673} y1={196} x2={687} y2={196} />
          <line x1={680} y1={196} x2={680} y2={RET} />
        </g>
        <Label x={698} y={164} anchor="start" size={12}>
          +
        </Label>
        <Label x={680} y={222}>
          8S Li-ion
        </Label>
        <Label x={680} y={235} color="#6b7280">
          24.0 to 33.6 V
        </Label>

        {/* Load */}
        <line x1={760} y1={TOP} x2={760} y2={174} stroke={PWR} strokeWidth={2} />
        <g transform="translate(760 174) rotate(90)">
          <HResistor x={0} y={0} />
        </g>
        <line x1={760} y1={206} x2={760} y2={RET} stroke={PWR} strokeWidth={2} />
        <Label x={772} y={194} anchor="start">
          Loads
        </Label>

        {/* Junction dots */}
        <Dot x={210} y={TOP} />
        <Dot x={210} y={RET} />
        <Dot x={230} y={TOP} />
        <Dot x={380} y={TOP} />
        <Dot x={380} y={RET} />
        <Dot x={510} y={TOP} />
        <Dot x={510} y={RET} />
        <Dot x={530} y={TOP} />
        <Dot x={680} y={TOP} />
        <Dot x={680} y={RET} />

        {/* ---------- Control blocks ---------- */}
        <Block x={180} y={330} w={110} h={50} lines={['MPPT algorithm', 'P&O: P = V x I,', 'step V_ref']} color={CTRL} />
        <Block x={180} y={410} w={110} h={50} lines={['Error amplifier', 'V_ref vs V_array']} color={CTRL} />
        <Block x={430} y={330} w={110} h={50} lines={['Bus voltage limit', 'V_bus <= 33.6 V']} color={CTRL} />
        <Block x={430} y={410} w={110} h={50} lines={['Charge current limit', 'I_batt <= 10 A']} color={CTRL} />
        <Block x={310} y={340} w={80} h={110} lines={['Minimum', 'duty', 'selector', '(diode-OR)']} color={CTRL} />
        <Block x={310} y={290} w={80} h={40} lines={['PWM', 'modulator']} color={GATE} />

        {/* ---------- Sense lines (dashed) ---------- */}
        <g stroke={SENSE} strokeWidth={1.5} fill="none" strokeDasharray="4 3">
          <path d="M 230 120 V 330" markerEnd="url(#sch-ar-sense)" />
          <path d="M 230 300 H 168 V 435 H 178" markerEnd="url(#sch-ar-sense)" />
          <path d="M 260 128 V 330" markerEnd="url(#sch-ar-sense)" />
          <path d="M 530 120 V 300 H 485 V 330" markerEnd="url(#sch-ar-sense)" />
          <path d="M 570 128 V 290 H 612 V 435 H 542" markerEnd="url(#sch-ar-sense)" />
        </g>
        <circle cx={230} cy={300} r={2.5} fill={SENSE} />
        <Label x={226} y={322} anchor="end" color={SENSE}>
          V_array
        </Label>
        <Label x={264} y={322} anchor="start" color={SENSE}>
          I_array
        </Label>
        <Label x={536} y={200} anchor="start" color={SENSE}>
          V_bus
        </Label>
        <Label x={576} y={200} anchor="start" color={SENSE}>
          I_batt
        </Label>

        {/* ---------- Control lines ---------- */}
        <g stroke={CTRL} strokeWidth={1.5} fill="none">
          <path d="M 235 380 V 410" markerEnd="url(#sch-ar-ctrl)" />
          <path d="M 290 435 H 310" markerEnd="url(#sch-ar-ctrl)" />
          <path d="M 430 355 H 390" markerEnd="url(#sch-ar-ctrl)" />
          <path d="M 430 435 H 390" markerEnd="url(#sch-ar-ctrl)" />
          <path d="M 350 340 V 330" markerEnd="url(#sch-ar-ctrl)" />
        </g>
        <Label x={241} y={399} anchor="start" color={CTRL}>
          V_ref
        </Label>

        {/* ---------- Gate drive ---------- */}
        <g stroke={GATE} strokeWidth={1.5} fill="none">
          <path d="M 350 290 V 180" />
          <path d="M 350 180 H 376" markerEnd="url(#sch-ar-gate)" />
          <path d="M 350 180 H 319 V 137" markerEnd="url(#sch-ar-gate)" />
        </g>
        <circle cx={350} cy={180} r={2.5} fill={GATE} />
        <Label x={344} y={240} anchor="end" color={GATE}>
          gate drive,
        </Label>
        <Label x={344} y={253} anchor="end" color={GATE}>
          duty D
        </Label>

        {/* ---------- Legend ---------- */}
        <g fontSize={11} fill={PWR}>
          <line x1={170} y1={505} x2={196} y2={505} stroke={PWR} strokeWidth={2} />
          <text x={202} y={509}>
            power path
          </text>
          <line x1={290} y1={505} x2={316} y2={505} stroke={SENSE} strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={322} y={509}>
            measurement
          </text>
          <line x1={420} y1={505} x2={446} y2={505} stroke={CTRL} strokeWidth={1.5} />
          <text x={452} y={509}>
            control signal
          </text>
          <line x1={550} y1={505} x2={576} y2={505} stroke={GATE} strokeWidth={1.5} />
          <text x={582} y={509}>
            gate drive to switches
          </text>
        </g>
      </svg>

      <ol className="schematic-notes">
        <li>
          <b>Power path.</b> The array charges C_in. Q1 chops that voltage at a few hundred kHz; while Q1 is on, current
          ramps up through L into C_out and the battery; while Q1 is off, Q2 (or a diode) lets the inductor current
          keep flowing from the return rail. On a battery-dominated bus the output voltage is pinned by the battery, so
          the duty cycle D really controls how much current is pulled out of C_in, and therefore where V_array settles
          on the I-V curve. This converter regulates its <i>input</i> voltage, not its output.
        </li>
        <li>
          <b>Inner loop (fast).</b> The error amplifier compares V_array with V_ref and drives the PWM. More duty draws
          more current, C_in discharges, V_array falls toward Isc; less duty lets V_array rise toward Voc. This loop runs
          at kHz bandwidth and simply holds the array wherever it is told.
        </li>
        <li>
          <b>MPPT loop (slow, firmware).</b> Every 10 to 100 ms it reads V_array and I_array, computes power, and nudges
          V_ref a fraction of a volt in whichever direction increased power last time. If power rose, keep going; if it
          fell, reverse. The operating point dithers a few percent either side of the MPP (perturb and observe).
        </li>
        <li>
          <b>Battery limiters (override).</b> Two more amplifiers watch I_batt against the charge-current limit and V_bus
          against 33.6 V. All three demands feed a minimum selector: whichever asks for the <i>least</i> duty wins. As
          the battery fills, the voltage limiter takes over, duty falls, and V_array climbs up the Voc side of the curve.
          That is the throttled regime shown in the chart above.
        </li>
        <li>
          <b>Boost variant.</b> If the array is <i>below</i> the bus (typical for small satellites), the same control
          structure is used but L moves to the input side, the switch goes from the switch node to return, and Q2 moves
          to the output. Higher duty still pulls V_array down. At zero duty the array is connected to the battery through
          the output diode, so cold-array Voc must stay below the bus voltage or a series disconnect is needed.
        </li>
      </ol>
    </div>
  );
}
