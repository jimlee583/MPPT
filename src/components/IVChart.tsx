import {
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CurvePoint, OperatingPoint, SolarArrayResult } from '../model/types';

export const COLORS = {
  current: '#2563eb',
  power: '#d97706',
  reference: '#9ca3af',
  mpp: '#16a34a',
  operating: '#dc2626',
  det: '#7c3aed',
  bus: '#0f172a',
  givenUp: '#fbbf24',
};

interface IVChartProps {
  array: SolarArrayResult;
  op: OperatingPoint;
  /** Fixed axis extents so the curve visibly grows/shrinks with conditions. */
  axes: { vMax: number; iMax: number; pMax: number };
  reference?: CurvePoint[] | null;
}

function fmt(x: number, d = 1) {
  return Number.isFinite(x) ? x.toFixed(d) : '-';
}

function CurveTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CurvePoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div className="tooltip">
      <div>
        <b>{fmt(pt.v, 2)} V</b>
      </div>
      <div style={{ color: COLORS.current }}>{fmt(pt.i, 3)} A</div>
      <div style={{ color: COLORS.power }}>{fmt(pt.p, 1)} W</div>
    </div>
  );
}

export function IVChart({ array, op, axes, reference }: IVChartProps) {
  const sunlit = array.pmp > 1e-3;
  const throttled = op.regime === 'THROTTLED_BATTERY_LIMITED';
  const atMpp = Math.abs(op.arrayV - op.mpp.v) < 0.05;

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={array.curve} margin={{ top: 20, right: 60, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="v"
            domain={[0, axes.vMax]}
            allowDataOverflow
            tickCount={9}
            tickFormatter={(v: number) => v.toFixed(0)}
          >
            <Label value="Array voltage (V)" position="bottom" offset={10} />
          </XAxis>
          <YAxis
            yAxisId="i"
            type="number"
            domain={[0, axes.iMax]}
            allowDataOverflow
            tickFormatter={(v: number) => v.toFixed(1)}
            stroke={COLORS.current}
          >
            <Label value="Array current (A)" angle={-90} position="insideLeft" style={{ fill: COLORS.current }} />
          </YAxis>
          <YAxis
            yAxisId="p"
            orientation="right"
            type="number"
            domain={[0, axes.pMax]}
            allowDataOverflow
            tickFormatter={(v: number) => v.toFixed(0)}
            stroke={COLORS.power}
          >
            <Label value="Array power (W)" angle={90} position="insideRight" style={{ fill: COLORS.power }} />
          </YAxis>
          <Tooltip content={<CurveTooltip />} />

          {reference && reference.length > 0 ? (
            <Line
              yAxisId="i"
              data={reference}
              type="monotone"
              dataKey="i"
              stroke={COLORS.reference}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              name="I-V at 28 C, full sun, BOL"
            />
          ) : null}
          {reference && reference.length > 0 ? (
            <Line
              yAxisId="p"
              data={reference}
              type="monotone"
              dataKey="p"
              stroke={COLORS.reference}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
              name="P-V at 28 C, full sun, BOL"
            />
          ) : null}

          {/* Shaded "power given up" region between the operating point and the MPP */}
          {sunlit && throttled ? (
            <ReferenceArea
              yAxisId="p"
              x1={op.mpp.v}
              x2={op.arrayV}
              y1={0}
              y2={op.mpp.p}
              fill={COLORS.givenUp}
              fillOpacity={0.15}
              stroke="none"
            />
          ) : null}

          <Line yAxisId="i" type="monotone" dataKey="i" stroke={COLORS.current} strokeWidth={2.5} dot={false} isAnimationActive={false} name="I-V" />
          <Line yAxisId="p" type="monotone" dataKey="p" stroke={COLORS.power} strokeWidth={2.5} dot={false} isAnimationActive={false} name="P-V" />

          {/* Bus voltage and regulator minimum input voltage */}
          <ReferenceLine yAxisId="i" x={op.busV} stroke={COLORS.bus} strokeWidth={1.5}>
            <Label value={`Bus ${fmt(op.busV)} V`} position="insideTopLeft" fill={COLORS.bus} fontSize={12} />
          </ReferenceLine>
          {sunlit ? (
            <ReferenceLine yAxisId="i" x={op.minInputV} stroke={COLORS.bus} strokeDasharray="3 3" strokeWidth={1}>
              <Label value="min input" position="insideBottomLeft" fill={COLORS.bus} fontSize={11} />
            </ReferenceLine>
          ) : null}

          {sunlit ? (
            <>
              {/* MPP markers */}
              <ReferenceDot yAxisId="p" x={op.mpp.v} y={op.mpp.p} r={6} fill="white" stroke={COLORS.mpp} strokeWidth={2.5} />
              <ReferenceDot yAxisId="i" x={op.mpp.v} y={op.mpp.i} r={5} fill="white" stroke={COLORS.mpp} strokeWidth={2}>
                {atMpp ? null : (
                  <Label value={`MPP ${fmt(op.mpp.p, 0)} W`} position="top" fill={COLORS.mpp} fontSize={12} offset={10} />
                )}
              </ReferenceDot>

              {/* DET comparison */}
              <ReferenceDot yAxisId="p" x={op.busV} y={op.detPowerW} r={5} fill={COLORS.det} stroke="white" strokeWidth={1.5}>
                <Label value={`DET ${fmt(op.detPowerW, 0)} W`} position="right" fill={COLORS.det} fontSize={11} offset={8} />
              </ReferenceDot>

              {/* Actual operating point */}
              <ReferenceDot
                yAxisId="p"
                x={op.arrayV}
                y={op.arrayP}
                r={atMpp ? 9 : 8}
                fill={COLORS.operating}
                stroke={atMpp ? COLORS.mpp : 'white'}
                strokeWidth={atMpp ? 3 : 2}
              >
                <Label
                  value={atMpp ? `Operating at MPP, ${fmt(op.arrayP, 0)} W` : `Operating ${fmt(op.arrayP, 0)} W`}
                  position={atMpp ? 'top' : 'insideBottomRight'}
                  fill={COLORS.operating}
                  fontSize={12}
                  offset={12}
                />
              </ReferenceDot>
              <ReferenceDot yAxisId="i" x={op.arrayV} y={op.arrayI} r={7} fill={COLORS.operating} stroke="white" strokeWidth={2} />
            </>
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="legend">
        <span>
          <i className="swatch line" style={{ background: COLORS.current }} /> I-V curve
        </span>
        <span>
          <i className="swatch line" style={{ background: COLORS.power }} /> P-V curve
        </span>
        <span>
          <i className="swatch dot hollow" style={{ borderColor: COLORS.mpp }} /> Maximum power point
        </span>
        <span>
          <i className="swatch dot" style={{ background: COLORS.operating }} /> Where the MPPT regulator actually operates
        </span>
        <span>
          <i className="swatch dot" style={{ background: COLORS.det }} /> Direct-energy-transfer point (array clamped to bus)
        </span>
        <span>
          <i className="swatch line" style={{ background: COLORS.bus }} /> Bus voltage / regulator minimum input
        </span>
        {reference ? (
          <span>
            <i className="swatch line dashed" style={{ background: COLORS.reference }} /> Reference: 28 C, full sun, BOL
          </span>
        ) : null}
      </div>
    </div>
  );
}
