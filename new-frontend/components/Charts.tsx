'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const lineData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
];

const barData = [
  { name: 'Email', value: 2400 },
  { name: 'Social', value: 1398 },
  { name: 'Search', value: 9800 },
  { name: 'Display', value: 3908 },
  { name: 'Referral', value: 4800 },
];

const chartConfig = {
  grid: { stroke: 'rgba(255, 255, 255, 0.08)' },
  axis: { stroke: 'rgba(187, 187, 187, 0.3)', fontSize: 12 },
  tooltip: {
    contentStyle: {
      backgroundColor: '#1C1C1C',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      color: '#FAFAFA',
    },
  },
}

export function RevenueChart() {
  return (
    <div className="card col-span-2">
      <h4 className="font-sans font-600 text-foreground mb-6">Revenue Trend</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={lineData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid {...chartConfig.grid} />
          <XAxis {...chartConfig.axis} />
          <YAxis {...chartConfig.axis} />
          <Tooltip {...chartConfig.tooltip} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#FF4D00"
            strokeWidth={3}
            dot={{ fill: '#FF4D00', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChannelChart() {
  return (
    <div className="card">
      <h4 className="font-sans font-600 text-foreground mb-6">Traffic by Channel</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={barData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid {...chartConfig.grid} />
          <XAxis {...chartConfig.axis} />
          <YAxis {...chartConfig.axis} />
          <Tooltip {...chartConfig.tooltip} />
          <Bar dataKey="value" fill="#FF4D00" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
