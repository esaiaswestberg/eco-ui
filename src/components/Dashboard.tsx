import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3', '#19FF5A', '#1942FF'];

const formatCurrency = (value: number) => {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kr";
};

const Dashboard: React.FC = () => {
  const { state } = useStore();
  const [timeframe, setTimeframe] = useState<'month' | 'week'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const {
    groupedData,
    categoryData,
    totalIncome,
    totalCost,
    netBalance,
    availableMonths
  } = useMemo(() => {
    // Only processed, non-ignored transactions
    let validTxs = state.transactions.filter(t => !t.isIgnored && (t.categoryId || (t.splits && t.splits.length > 0)));
    
    // Extract unique months for the filter dropdown
    const monthSet = new Set<string>();
    validTxs.forEach(t => {
      try {
        const d = parseISO(t.date);
        monthSet.add(format(startOfMonth(d), 'yyyy-MM'));
      } catch {
        // ignore invalid dates
      }
    });
    const availableMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

    if (selectedMonth !== 'all') {
      validTxs = validTxs.filter(t => {
        try {
          const d = parseISO(t.date);
          return format(startOfMonth(d), 'yyyy-MM') === selectedMonth;
        } catch {
          return false;
        }
      });
    }

    let tIncome = 0;
    let tCost = 0;

    const groupMap: Record<string, { date: string; income: number; cost: number }> = {};
    const catMap: Record<string, number> = {};

    // If a specific month is selected, default to weekly breakdown for the bar chart
    const effectiveTimeframe = selectedMonth !== 'all' ? 'week' : timeframe;

    validTxs.forEach((tx) => {
      // Timeframe Grouping
      let dateKey = '';
      try {
        const d = parseISO(tx.date);
        if (effectiveTimeframe === 'month') {
          dateKey = format(startOfMonth(d), 'yyyy-MM');
        } else {
          dateKey = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        }
      } catch {
        dateKey = 'Unknown';
      }

      if (!groupMap[dateKey]) {
        groupMap[dateKey] = { date: dateKey, income: 0, cost: 0 };
      }

      if (tx.splits && tx.splits.length > 0) {
        tx.splits.forEach((split) => {
          const cat = state.categories.find(c => c.id === split.categoryId);
          if (!cat) return;

          // Splits only provide absolute amounts. 
          // We assume if a transaction is negative, the splits correspond to costs primarily.
          // However, the category type dictates where it goes.
          const isTxNegative = tx.amount < 0;
          const val = isTxNegative ? -split.amount : split.amount;

          if (cat.type === 'income') {
            tIncome += val;
            groupMap[dateKey].income += val;
          } else {
            tCost += Math.abs(val);
            groupMap[dateKey].cost += Math.abs(val);
            catMap[cat.name] = (catMap[cat.name] || 0) + Math.abs(val);
          }
        });
      } else {
        const cat = state.categories.find(c => c.id === tx.categoryId);
        if (!cat) return;

        if (cat.type === 'income') tIncome += tx.amount;
        if (cat.type === 'cost') tCost += Math.abs(tx.amount); // use absolute for charts

        const val = cat.type === 'cost' ? Math.abs(tx.amount) : tx.amount;
        
        // Category Breakdown
        if (cat.type === 'cost') {
          catMap[cat.name] = (catMap[cat.name] || 0) + val;
        }
        
        if (cat.type === 'income') {
          groupMap[dateKey].income += val;
        } else {
          groupMap[dateKey].cost += val;
        }
      }
    });

    const gData = Object.values(groupMap).sort((a, b) => a.date.localeCompare(b.date));
    const cData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return {
      groupedData: gData,
      categoryData: cData,
      totalIncome: tIncome,
      totalCost: tCost,
      netBalance: tIncome - tCost,
      availableMonths
    };
  }, [state.transactions, state.categories, timeframe, selectedMonth]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Time</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {selectedMonth === 'all' && (
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as 'month' | 'week')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="month">View by Month</option>
              <option value="week">View by Week</option>
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Costs</h3>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Net Balance</h3>
          <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Income vs Cost Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-700">
            Income vs Costs ({selectedMonth !== 'all' ? 'week' : timeframe})
          </h3>
          <div className="h-80">
            {groupedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#16a34a" />
                  <Bar dataKey="cost" name="Cost" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Cost Breakdown Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-700">Cost Breakdown</h3>
          <div className="h-80">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${percent !== undefined ? (percent * 100).toFixed(0) : '0'}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
