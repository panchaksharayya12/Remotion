import React, { useState } from 'react';
import { BarChart3, TrendingUp, Target, Award, Info, ChevronRight } from 'lucide-react';

const DEFAULT_SESSIONS = [
  { id: 's1', label: 'Baseline', rom: 42, accuracy: 64, reps: 10, date: 'Oct 12' },
  { id: 's2', label: 'Session 2', rom: 51, accuracy: 72, reps: 12, date: 'Oct 17' },
  { id: 's3', label: 'Session 3', rom: 60, accuracy: 81, reps: 14, date: 'Oct 22' },
  { id: 's4', label: 'Session 4', rom: 69, accuracy: 86, reps: 15, date: 'Oct 27' },
  { id: 's5', label: 'Session 5', rom: 76, accuracy: 90, reps: 15, date: 'Nov 01' },
  { id: 's6', label: 'Latest (S6)', rom: 82, accuracy: 94, reps: 16, date: 'Nov 04' }
];

export default function ClinicalRecoveryBarChart({
  data = DEFAULT_SESSIONS,
  patientName = 'Asha Sharma',
  targetRom = 85,
  baselineRom = 42
}) {
  const [metricFilter, setMetricFilter] = useState('all'); // 'all', 'rom', 'accuracy'
  const [hoveredSession, setHoveredSession] = useState(null);

  const chartHeight = 220;
  const chartWidth = 620;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const yTicks = [0, 20, 40, 60, 80, 100];

  const getY = (val) => {
    const clamped = Math.max(0, Math.min(100, val));
    return paddingTop + innerHeight - (clamped / 100) * innerHeight;
  };

  const groupWidth = innerWidth / data.length;
  const barWidth = 18;
  const barGap = 4;

  const baselineY = getY(baselineRom);
  const targetY = getY(targetRom);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Longitudinal Kinematics & Motor Recovery Curves</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Photorealistic clinical bar telemetry: Active ROM (degrees) & Session Accuracy (%) for {patientName}.
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetricFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              metricFilter === 'all'
                ? 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Combined Telemetry
          </button>
          <button
            type="button"
            onClick={() => setMetricFilter('rom')}
            className={`px-3 py-1 rounded-lg transition-all ${
              metricFilter === 'rom'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ROM (deg)
          </button>
          <button
            type="button"
            onClick={() => setMetricFilter('accuracy')}
            className={`px-3 py-1 rounded-lg transition-all ${
              metricFilter === 'accuracy'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Accuracy (%)
          </button>
        </div>
      </div>

      {/* SVG 3D Clinical Bar Graph */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[550px] h-60 overflow-visible font-sans select-none"
        >
          <defs>
            {/* 3D Blue Cylindrical Gradient for Active ROM */}
            <linearGradient id="romBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="35%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* 3D Emerald Cylindrical Gradient for Kinematic Accuracy */}
            <linearGradient id="accBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="35%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Shadow Filter */}
            <filter id="barShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Grid lines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? 'none' : '4 3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-600 font-bold"
                >
                  {tick}{metricFilter === 'accuracy' ? '%' : '°'}
                </text>
              </g>
            );
          })}

          {/* Target Discharge Reference Line (85° / %) */}
          <line
            x1={paddingLeft}
            y1={targetY}
            x2={chartWidth - paddingRight}
            y2={targetY}
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="6 3"
          />
          <g transform={`translate(${chartWidth - paddingRight - 120}, ${targetY - 8})`}>
            <rect width="115" height="16" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
            <text x="6" y="11" className="text-[9px] font-mono font-bold fill-emerald-800">
              Discharge Target: {targetRom}°
            </text>
          </g>

          {/* Baseline Reference Line (42° / %) */}
          <line
            x1={paddingLeft}
            y1={baselineY}
            x2={chartWidth - paddingRight}
            y2={baselineY}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <g transform={`translate(${paddingLeft + 10}, ${baselineY + 4})`}>
            <rect width="90" height="15" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <text x="6" y="11" className="text-[9px] font-mono font-bold fill-slate-700">
              Baseline: {baselineRom}° ROM
            </text>
          </g>

          {/* Grouped 3D Bars for Each Session */}
          {data.map((item, index) => {
            const groupX = paddingLeft + index * groupWidth + (groupWidth - (metricFilter === 'all' ? barWidth * 2 + barGap : barWidth)) / 2;
            const romY = getY(item.rom);
            const romHeight = paddingTop + innerHeight - romY;

            const accY = getY(item.accuracy);
            const accHeight = paddingTop + innerHeight - accY;

            const showRom = metricFilter === 'all' || metricFilter === 'rom';
            const showAcc = metricFilter === 'all' || metricFilter === 'accuracy';

            const romBarX = groupX;
            const accBarX = metricFilter === 'all' ? groupX + barWidth + barGap : groupX;

            const isHovered = hoveredSession?.id === item.id;

            return (
              <g
                key={item.id}
                onMouseEnter={() => setHoveredSession(item)}
                onMouseLeave={() => setHoveredSession(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredSession && !isHovered ? 0.6 : 1}
              >
                {/* ROM 3D Bar */}
                {showRom && (
                  <g filter="url(#barShadow)">
                    {/* Bar Body */}
                    <rect
                      x={romBarX}
                      y={romY}
                      width={barWidth}
                      height={romHeight}
                      rx="3"
                      fill="url(#romBarGrad)"
                    />
                    {/* 3D Top Cap Highlight */}
                    <ellipse
                      cx={romBarX + barWidth / 2}
                      cy={romY}
                      rx={barWidth / 2}
                      ry="3"
                      fill="#93c5fd"
                    />
                    {/* Value on Top */}
                    <text
                      x={romBarX + barWidth / 2}
                      y={romY - 6}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-blue-700"
                    >
                      {item.rom}°
                    </text>
                  </g>
                )}

                {/* Accuracy 3D Bar */}
                {showAcc && (
                  <g filter="url(#barShadow)">
                    {/* Bar Body */}
                    <rect
                      x={accBarX}
                      y={accY}
                      width={barWidth}
                      height={accHeight}
                      rx="3"
                      fill="url(#accBarGrad)"
                    />
                    {/* 3D Top Cap Highlight */}
                    <ellipse
                      cx={accBarX + barWidth / 2}
                      cy={accY}
                      rx={barWidth / 2}
                      ry="3"
                      fill="#6ee7b7"
                    />
                    {/* Value on Top */}
                    <text
                      x={accBarX + barWidth / 2}
                      y={accY - 6}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-emerald-700"
                    >
                      {item.accuracy}%
                    </text>
                  </g>
                )}

                {/* X-Axis Session Label & Date */}
                <text
                  x={groupX + (metricFilter === 'all' ? barWidth + barGap / 2 : barWidth / 2)}
                  y={paddingTop + innerHeight + 16}
                  textAnchor="middle"
                  className={`text-[11px] font-mono font-bold ${
                    isHovered ? 'fill-blue-700' : 'fill-slate-700'
                  }`}
                >
                  {item.label}
                </text>
                <text
                  x={groupX + (metricFilter === 'all' ? barWidth + barGap / 2 : barWidth / 2)}
                  y={paddingTop + innerHeight + 28}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-600"
                >
                  {item.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Real-World EMR Clinical Summary Metrics & Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Color Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono font-bold">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-r from-blue-700 to-blue-400 inline-block shadow-sm"></span>
            <span className="text-slate-700">Active ROM (Degrees)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-r from-emerald-700 to-emerald-400 inline-block shadow-sm"></span>
            <span className="text-slate-700">Kinematic Accuracy (%)</span>
          </div>
        </div>

        {/* Clinical Outcome Indicators */}
        <div className="flex items-center space-x-3 text-xs font-sans">
          <div className="px-3 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-mono font-bold">
            ROM Gain: <span className="text-blue-700">+{data[data.length - 1].rom - baselineRom}° (+{Math.round(((data[data.length - 1].rom - baselineRom) / baselineRom) * 100)}%)</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-mono font-bold">
            Precision: <span className="text-emerald-700">{data[data.length - 1].accuracy}%</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 font-mono font-bold hidden lg:block">
            Target Adherence: <span className="text-purple-700">96.4%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
