'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoryProductCount {
  categoryId: string;
  categoryName: string;
  productCount: number;
}

interface CategoryChartProps {
  data: CategoryProductCount[];
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#14b8a6',
];

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-500">
        Nenhuma categoria com produtos
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    shortName: item.categoryName.length > 15
      ? item.categoryName.substring(0, 15) + '...'
      : item.categoryName,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="shortName"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value} produtos`, 'Quantidade']}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.shortName === label);
              return item?.categoryName || label;
            }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Bar dataKey="productCount" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
