
import React, { useState, useMemo } from 'react';
import { TestRun, TestResult, TestSuite, User, Role, Issue, Sprint } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Activity, CheckCircle, XCircle, AlertCircle, Shield, Users, X, TrendingUp, Zap, Clock, ListFilter, AlertTriangle, Target, FileSpreadsheet, Download, Bug, ChevronDown, CalendarDays, UserCheck } from 'lucide-react';

interface DashboardProps {
  activeSuite: TestSuite;
  runs: TestRun[];
  suites: TestSuite[];
  setSuites: React.Dispatch<React.SetStateAction<TestSuite[]>>;
  users: User[];
  currentUser: User;
  issues: Issue[];
}

const COLORS = {
  PASSED: '#22c55e',
  FAILED: '#ef4444',
  SKIPPED: '#f59e0b',
  IDLE: '#94a3b8',
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6'
};

const CHART_BAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 shadow-lg rounded-lg text-xs">
        <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-slate-500 dark:text-slate-400 capitalize">{entry.name}:</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ activeSuite, runs, suites, setSuites, users, currentUser, issues }) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? '#1e293b' : '#f1f5f9';

  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const activeSprint = activeSuite.sprints?.find(s => s.id === selectedSprintId);

  const filteredRunsBySprint = useMemo(() => {
    if (selectedSprintId === 'all') return runs;
    if (!activeSprint) return runs;
    const start = new Date(activeSprint.startDate).getTime();
    const end = new Date(activeSprint.endDate).getTime();
    return runs.filter(run => {
      const runTime = new Date(run.startTime).getTime();
      return runTime >= start && runTime <= end;
    });
  }, [runs, selectedSprintId, activeSprint]);

  const filteredIssuesBySprint = useMemo(() => {
    if (selectedSprintId === 'all') return issues;
    if (!activeSprint) return issues;
    const start = new Date(activeSprint.startDate).getTime();
    const end = new Date(activeSprint.endDate).getTime();
    return issues.filter(issue => {
      const issueTime = new Date(issue.createdAt).getTime();
      return issueTime >= start && issueTime <= end;
    });
  }, [issues, selectedSprintId, activeSprint]);

  let totalTests = 0, totalPassed = 0, totalFailed = 0, totalSkipped = 0;
  const failuresByPriority = { High: 0, Medium: 0, Low: 0 };
  const casePriorityMap = new Map<string, string>();
  activeSuite.cases.forEach(c => casePriorityMap.set(c.id, c.priority));

  filteredRunsBySprint.forEach(run => {
    Object.values(run.results).forEach((result: TestResult) => {
      totalTests++;
      if (result.status === 'PASSED') totalPassed++;
      if (result.status === 'FAILED') {
        totalFailed++;
        const p = casePriorityMap.get(result.caseId);
        if (p === 'High') failuresByPriority.High++;
        else if (p === 'Medium') failuresByPriority.Medium++;
        else if (p === 'Low') failuresByPriority.Low++;
      }
      if (result.status === 'SKIPPED') totalSkipped++;
    });
  });

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const pieData = [{ name: 'Passed', value: totalPassed, color: COLORS.PASSED }, { name: 'Failed', value: totalFailed, color: COLORS.FAILED }, { name: 'Skipped', value: totalSkipped, color: COLORS.SKIPPED }].filter(d => d.value > 0);
  
  const trendData = useMemo(() => {
    const groupedMap = new Map<string, any>();
    filteredRunsBySprint.forEach(run => {
       const key = new Date(run.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
       if (!groupedMap.has(key)) groupedMap.set(key, { name: key, time: new Date(run.startTime).getTime(), Passed: 0, Failed: 0, Skipped: 0 });
       const entry = groupedMap.get(key)!;
       Object.values(run.results).forEach((r: TestResult) => { if (r.status === 'PASSED') entry.Passed++; else if (r.status === 'FAILED') entry.Failed++; else entry.Skipped++; });
    });
    return Array.from(groupedMap.values()).sort((a, b) => a.time - b.time);
  }, [filteredRunsBySprint]);

  const issueContributionData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredIssuesBySprint.forEach(i => { const name = i.assignee || 'Unassigned'; counts.set(name, (counts.get(name) || 0) + 1); });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filteredIssuesBySprint]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">{activeSuite.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{activeSuite.description}</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
          <CalendarDays size={16} className="text-blue-500" />
          <select className="bg-transparent border-none text-sm font-medium outline-none" value={selectedSprintId} onChange={(e) => setSelectedSprintId(e.target.value)}>
            <option value="all">전체 기간</option>
            {activeSuite.sprints?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Runs', val: filteredRunsBySprint.length, icon: Activity, color: 'blue' },
          { label: 'Pass Rate', val: `${passRate}%`, icon: CheckCircle, color: 'green' },
          { label: 'Failures', val: totalFailed, icon: XCircle, color: 'red' },
          { label: 'Test Efficiency', val: totalTests > 0 ? `${Math.round(((totalPassed+totalFailed)/totalTests)*100)}%` : '0%', icon: Zap, color: 'amber' }
        ].map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">{kpi.label}</p>
              <p className="text-3xl font-bold dark:text-white">{kpi.val}</p>
            </div>
            <div className={`w-12 h-12 bg-${kpi.color}-50 dark:bg-${kpi.color}-900/30 text-${kpi.color}-600 dark:text-${kpi.color}-400 rounded-xl flex items-center justify-center`}>
              <kpi.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-[350px]">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white"><TrendingUp size={20} className="text-blue-500" /> Execution Trends</h2>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" stroke={labelColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={labelColor} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Passed" stroke={COLORS.PASSED} fill={COLORS.PASSED} fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="Failed" stroke={COLORS.FAILED} fill={COLORS.FAILED} fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-[350px]">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2 dark:text-white"><Activity size={20} className="text-emerald-500" /> Status Distribution</h2>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-[320px]">
             <h2 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white"><UserCheck size={20} className="text-blue-600" /> Issue Contribution</h2>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={issueContributionData} layout="vertical" margin={{left: 20}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" stroke={labelColor} fontSize={11} width={80} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: gridColor}} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {issueContributionData.map((e, i) => <Cell key={i} fill={CHART_BAR_COLORS[i % 6]} />)}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
             <h2 className="font-bold text-lg mb-4 dark:text-white">Recent Run History</h2>
             <div className="divide-y divide-slate-50 dark:divide-slate-800">
               {filteredRunsBySprint.slice(-4).reverse().map(run => (
                 <div key={run.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${Object.values(run.results).every((r: any) => r.status !== 'FAILED') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {Object.values(run.results).every((r: any) => r.status !== 'FAILED') ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                       </div>
                       <p className="text-sm font-medium dark:text-slate-200">{new Date(run.startTime).toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{Object.keys(run.results).length} Cases</span>
                 </div>
               ))}
             </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
