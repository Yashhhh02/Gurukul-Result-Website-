'use client';

import { useTheme } from 'next-themes';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { useEffect, useState } from 'react';

export default function DashboardCharts({ 
  pieData, 
  barData 
}: { 
  pieData: any[], 
  barData: any[] 
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1']; // Emerald, Red, Amber, Indigo
  
  const isDark = mounted && resolvedTheme === 'dark';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0';
  const tooltipText = isDark ? '#ffffff' : '#0f172a';
  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  if (!mounted) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 min-h-[300px]"></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Pass/Fail Pie Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Pass vs Fail Ratio</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '8px' }}
                itemStyle={{ color: tooltipText }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: axisColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grades Distribution Bar Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Grade Distribution</h3>
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="grade" stroke={axisColor} tick={{ fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis stroke={axisColor} tick={{ fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '8px' }}
                itemStyle={{ color: tooltipText }}
              />
              <Bar dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
