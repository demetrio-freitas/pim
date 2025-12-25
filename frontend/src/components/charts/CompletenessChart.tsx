'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CompletenessDistribution {
  excellent: number;
  good: number;
  average: number;
  poor: number;
}

interface CompletenessChartProps {
  data: CompletenessDistribution;
}

const COLORS = {
  excellent: '#22c55e',
  good: '#3b82f6',
  average: '#f59e0b',
  poor: '#ef4444',
};

const LABELS = {
  excellent: 'Excelente (90%+)',
  good: 'Bom (70-89%)',
  average: 'Médio (50-69%)',
  poor: 'Baixo (<50%)',
};

export function CompletenessChart({ data }: CompletenessChartProps) {
  const chartData = [
    { name: LABELS.excellent, value: data.excellent, color: COLORS.excellent },
    { name: LABELS.good, value: data.good, color: COLORS.good },
    { name: LABELS.average, value: data.average, color: COLORS.average },
    { name: LABELS.poor, value: data.poor, color: COLORS.poor },
  ].filter(item => item.value > 0);

  const total = data.excellent + data.good + data.average + data.poor;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-500">
        Nenhum produto cadastrado
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value} produtos`, '']}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-sm text-dark-600 dark:text-dark-300">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
