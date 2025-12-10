import React from 'react';
import { TestRun, TestResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DashboardProps {
  runs: TestRun[];
}

const COLORS = {
  PASSED: '#22c55e', // green-500
  FAILED: '#ef4444', // red-500
  SKIPPED: '#f59e0b', // amber-500
  IDLE: '#94a3b8',   // slate-400
};

const Dashboard: React.FC<DashboardProps> = ({ runs }) => {
  // Aggregate stats
  const totalRuns = runs.length;
  const completedRuns = runs.filter(r => r.status === 'COMPLETED').length;
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  runs.forEach(run => {
    Object.values(run.results).forEach((result: TestResult) => {
      totalTests++;
      if (result.status === 'PASSED') totalPassed++;
      if (result.status === 'FAILED') totalFailed++;
      if (result.status === 'SKIPPED') totalSkipped++;
    });
  });

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const pieData = [
    { name: 'Passed', value: totalPassed },
    { name: 'Failed', value: totalFailed },
    { name: 'Skipped', value: totalSkipped },
  ].filter(d => d.value > 0);

  // Recent runs data for bar chart
  const recentRunsData = runs.slice(-5).map(run => {
    let passed = 0;
    let failed = 0;
    Object.values(run.results).forEach((r: TestResult) => {
      if (r.status === 'PASSED') passed++;
      if (r.status === 'FAILED') failed++;
    });
    return {
      name: new Date(run.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
      Passed: passed,
      Failed: failed,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Runs</p>
            <p className="text-2xl font-bold text-slate-800">{totalRuns}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pass Rate</p>
            <p className="text-2xl font-bold text-slate-800">{passRate}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Failed Tests</p>
            <p className="text-2xl font-bold text-slate-800">{totalFailed}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tests Skipped</p>
            <p className="text-2xl font-bold text-slate-800">{totalSkipped}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Overall Status Distribution</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name.toUpperCase() as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-96">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Recent Run Performance</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={recentRunsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
              <YAxis stroke="#94a3b8" />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Legend />
              <Bar dataKey="Passed" stackId="a" fill={COLORS.PASSED} barSize={30} radius={[0, 0, 4, 4]} />
              <Bar dataKey="Failed" stackId="a" fill={COLORS.FAILED} barSize={30} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;