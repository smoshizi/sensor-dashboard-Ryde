import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from 'recharts';

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour12: false });
}

export default function SensorPlot({ title, data }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const WINDOW_MS = 20000;
  const minTime = now - WINDOW_MS;
  const chartData = (data || []).filter(d => d.time >= minTime && d.time <= now);

  // Always inject anchor points at the edges so the X-axis slides even with no data
  const displayData = [
    { time: minTime, value: null },
    ...chartData,
    { time: now, value: null },
  ];

  // y-range
  let minY = 0, maxY = 10;
  if (chartData.length) {
    minY = Math.floor(Math.min(...chartData.map(d => d.value)) * 2) / 2;
    maxY = Math.ceil(Math.max(...chartData.map(d => d.value)) * 2) / 2;
    if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
  }
  const ticks = [];
  for (let t = minY; t <= maxY + 1e-9; t += 0.5) ticks.push(Number(t.toFixed(2)));

  const CARD_PAD = 12;
  const LEFT_MARGIN = 16;
  const LABEL_BORDER_GAP = 8;

  return (
    <div style={{
      width: '100%',
      height: 'var(--card-h, 300px)',
      padding: CARD_PAD,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ margin: '0 0 6px 0', textAlign: 'center' }}>{title}</h3>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
            margin={{ top: 4, right: 8, left: LEFT_MARGIN, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="time"
              type="number"
              domain={[minTime, now]}
              tickFormatter={formatTime}
              interval="preserveStartEnd"
              tick={{ fontSize: 14 }}
              tickMargin={8}
            >
              <Label
                value="Time (hh:mm:ss)"
                position="insideBottom"
                offset={-16}
                style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
              />
            </XAxis>

            <YAxis
              domain={[minY, maxY]}
              ticks={ticks}
              tickFormatter={v => v.toFixed(2)}
              tick={{ fontSize: 14 }}
              tickMargin={10}
            >
              <Label
                value="Sensor output (mV)"
                angle={-90}
                position="insideLeft"
                offset={-(LEFT_MARGIN - LABEL_BORDER_GAP)}
                style={{ textAnchor: 'middle', fontSize: 16, fill: '#333', fontWeight: 'bold' }}
              />
            </YAxis>

            <Tooltip
              labelFormatter={formatTime}
              formatter={v => v === null ? '-' : Number(v).toFixed(2)}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0000ff"
              dot={false}
              isAnimationActive={false}
              strokeWidth={2.2}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
