
import React, { useState, useMemo } from 'react';
import { TestRun, TestResult, TestSuite, User, Role, Issue } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Activity, CheckCircle, XCircle, AlertCircle, Shield, Users, X, TrendingUp, Zap, Clock, ListFilter, AlertTriangle, Target, FileSpreadsheet, Download, Bug, ChevronDown } from 'lucide-react';

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
  PASSED: '#22c55e', // green-500
  FAILED: '#ef4444', // red-500
  SKIPPED: '#f59e0b', // amber-500
  IDLE: '#94a3b8',   // slate-400
  HIGH: '#ef4444',   // Red
  MEDIUM: '#f59e0b', // Amber
  LOW: '#3b82f6'     // Blue
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 capitalize">{entry.name}:</span>
            <span className="font-mono font-medium text-slate-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ activeSuite, runs, suites, setSuites, users, currentUser, issues }) => {
  // Admin Logic
  const isGlobalAdmin = currentUser.email === 'administrator@autotest.ai';
  // Strict check: User must be explicit ADMIN in permissions, or Global Admin.
  const isProjectAdmin = isGlobalAdmin || activeSuite.permissions?.[currentUser.id] === 'ADMIN';
  
  const [showPermModal, setShowPermModal] = useState(false);
  const [permUserToAdd, setPermUserToAdd] = useState('');
  const [permRoleToAdd, setPermRoleToAdd] = useState<Role>('MEMBER');
  
  // Issue Detail View State
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Trend Chart Time Range State
  const [timeRange, setTimeRange] = useState<'1H' | '24H' | '7D'>('7D');
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  // --- KPI Calculation for Active Suite ---
  const totalRuns = runs.length;
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // Lookup map for case priority: CaseID -> Priority (Only for active suite)
  const casePriorityMap = new Map<string, string>();
  activeSuite.cases.forEach(c => casePriorityMap.set(c.id, c.priority));

  const failuresByPriority = { High: 0, Medium: 0, Low: 0 };

  runs.forEach(run => {
    Object.values(run.results).forEach((result: TestResult) => {
      totalTests++;
      if (result.status === 'PASSED') totalPassed++;
      if (result.status === 'FAILED') {
        totalFailed++;
        // Count failure priority
        const p = casePriorityMap.get(result.caseId);
        if (p === 'High') failuresByPriority.High++;
        else if (p === 'Medium') failuresByPriority.Medium++;
        else if (p === 'Low') failuresByPriority.Low++;
      }
      if (result.status === 'SKIPPED') totalSkipped++;
    });
  });

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  // --- Recent Issues Logic ---
  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // --- Chart Data Preparation ---

  // 1. Overall Status Pie Data
  const pieData = [
    { name: 'Passed', value: totalPassed, color: COLORS.PASSED },
    { name: 'Failed', value: totalFailed, color: COLORS.FAILED },
    { name: 'Skipped', value: totalSkipped, color: COLORS.SKIPPED },
  ].filter(d => d.value > 0);

  // 2. Execution Trend Data (Area Chart) with Time Range Aggregation
  const trendData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    
    // Set Cutoff Time
    if (timeRange === '1H') cutoff.setHours(now.getHours() - 1);
    else if (timeRange === '24H') cutoff.setHours(now.getHours() - 24);
    else cutoff.setDate(now.getDate() - 7); // 7D

    // Filter Runs
    const filteredRuns = runs.filter(r => new Date(r.startTime) >= cutoff);
    
    // Grouping Logic
    const groupedMap = new Map<string, { time: number, name: string, Passed: number, Failed: number, Skipped: number }>();

    filteredRuns.forEach(run => {
       const d = new Date(run.startTime);
       let key = '';
       let displayName = '';
       let sortTime = 0;

       if (timeRange === '1H') {
         // Group by minute or individual run if sparse
         key = d.toISOString(); // Use exact time for 1H to show granularity
         displayName = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
         sortTime = d.getTime();
       } else if (timeRange === '24H') {
         // Group by Hour
         d.setMinutes(0, 0, 0);
         key = d.toISOString();
         displayName = d.toLocaleTimeString([], { hour: 'numeric' }); // "1 PM"
         sortTime = d.getTime();
       } else {
         // Group by Day (7D)
         d.setHours(0, 0, 0, 0);
         key = d.toISOString();
         displayName = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); // "Oct 24"
         sortTime = d.getTime();
       }

       if (!groupedMap.has(key)) {
         groupedMap.set(key, { time: sortTime, name: displayName, Passed: 0, Failed: 0, Skipped: 0 });
       }

       const entry = groupedMap.get(key)!;
       Object.values(run.results).forEach((r: TestResult) => {
          if (r.status === 'PASSED') entry.Passed++;
          else if (r.status === 'FAILED') entry.Failed++;
          else entry.Skipped++;
       });
    });

    // Convert to Array and Sort
    return Array.from(groupedMap.values()).sort((a, b) => a.time - b.time);

  }, [runs, timeRange]);

  // 3. Priority Breakdown Data (Project Scope)
  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  activeSuite.cases.forEach(c => {
    if (c.priority && priorityCounts[c.priority] !== undefined) {
      priorityCounts[c.priority]++;
    }
  });
  
  const priorityData = [
    { name: 'High', value: priorityCounts.High, color: COLORS.HIGH },
    { name: 'Medium', value: priorityCounts.Medium, color: COLORS.MEDIUM },
    { name: 'Low', value: priorityCounts.Low, color: COLORS.LOW },
  ].filter(d => d.value > 0);

  // 4. Failures by Priority Data
  const failurePriorityData = [
    { name: 'High', value: failuresByPriority.High, color: COLORS.HIGH },
    { name: 'Medium', value: failuresByPriority.Medium, color: COLORS.MEDIUM },
    { name: 'Low', value: failuresByPriority.Low, color: COLORS.LOW },
  ];

  // --- Access Management Handlers ---
  const handleAddPermission = () => {
    if (!permUserToAdd) return;
    const updatedSuite = {
      ...activeSuite,
      permissions: {
        ...activeSuite.permissions,
        [permUserToAdd]: permRoleToAdd
      }
    };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
    setPermUserToAdd('');
  };

  const handleChangePermission = (userId: string, newRole: Role) => {
    const updatedSuite = {
      ...activeSuite,
      permissions: {
        ...activeSuite.permissions,
        [userId]: newRole
      }
    };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
  };

  const handleRemovePermission = (userId: string) => {
    const newPerms = { ...activeSuite.permissions };
    delete newPerms[userId];
    const updatedSuite = { ...activeSuite, permissions: newPerms };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
  };

  const handleExportHistory = () => {
    if (runs.length === 0) {
      alert("No run history to export.");
      return;
    }

    const headers = ['Run ID', 'Project Name', 'Start Time', 'End Time', 'Status', 'Total Tests', 'Passed', 'Failed', 'Skipped', 'Pass Rate (%)'];
    
    const rows = runs.map(run => {
      const total = Object.keys(run.results).length;
      const passed = Object.values(run.results).filter((r: TestResult) => r.status === 'PASSED').length;
      const failed = Object.values(run.results).filter((r: TestResult) => r.status === 'FAILED').length;
      const skipped = Object.values(run.results).filter((r: TestResult) => r.status === 'SKIPPED').length;
      const rate = total > 0 ? ((passed / total) * 100).toFixed(2) : '0';

      return [
        `"${run.id}"`,
        `"${run.suiteName.replace(/"/g, '""')}"`,
        `"${new Date(run.startTime).toLocaleString()}"`,
        `"${run.endTime ? new Date(run.endTime).toLocaleString() : '-'}"`,
        run.status,
        total,
        passed,
        failed,
        skipped,
        rate
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeSuite.name.replace(/\s+/g, '_')}_History_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRun = (run: TestRun) => {
    // Try to find the suite this run belongs to, default to activeSuite
    const relatedSuite = suites.find(s => s.id === run.suiteId) || activeSuite;
    const headers = ['Test Case ID', 'Title', 'Priority', 'Status', 'Notes', 'Timestamp'];
    
    const rows = Object.values(run.results).map(result => {
       const testCase = relatedSuite.cases.find(c => c.id === result.caseId);
       const title = testCase ? testCase.title : 'Unknown Case';
       const priority = testCase ? testCase.priority : '-';
       const notes = result.notes ? result.notes.replace(/"/g, '""') : '';
       
       return [
         `"${result.caseId}"`,
         `"${title.replace(/"/g, '""')}"`,
         priority,
         result.status,
         `"${notes}"`,
         `"${result.timestamp}"`
       ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date(run.startTime).toISOString().split('T')[0];
    link.setAttribute('download', `${run.suiteName.replace(/\s+/g, '_')}_Run_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h1 className="text-3xl font-bold text-slate-800">{activeSuite.name}</h1>
             <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">
               {activeSuite.cases.length} Cases
             </span>
          </div>
          <p className="text-slate-500 text-sm">{activeSuite.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Only Project Admins or Super Admins can see the Team Access button */}
          {isProjectAdmin && (
             <button 
               onClick={() => setShowPermModal(true)}
               className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-medium border border-indigo-100"
             >
               <Users size={14} /> Team Access
             </button>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
            <Clock size={14} /> Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Runs</p>
            <p className="text-3xl font-bold text-slate-800">{totalRuns}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pass Rate</p>
            <p className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
              {passRate}<span className="text-sm text-slate-400 font-normal">%</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Failures</p>
            <p className="text-3xl font-bold text-slate-800">{totalFailed}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <XCircle size={24} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Efficiency</p>
            <p className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
              {totalTests > 0 ? Math.round(((totalPassed + totalFailed) / totalTests) * 100) : 0}<span className="text-sm text-slate-400 font-normal">%</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>
        </div>
      </div>

      {/* Row 1: Trends & Overall Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" /> Execution Trends
            </h2>
            
            <div className="flex items-center gap-3">
               {/* Time Range Selector */}
               <div className="relative">
                 <button 
                   onClick={() => setShowTimeMenu(!showTimeMenu)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                 >
                    {timeRange === '1H' && 'Last 1 Hour'}
                    {timeRange === '24H' && 'Last 24 Hours'}
                    {timeRange === '7D' && 'Last 7 Days'}
                    <ChevronDown size={14} className="text-slate-400" />
                 </button>
                 {showTimeMenu && (
                   <>
                     <div className="fixed inset-0 z-10" onClick={() => setShowTimeMenu(false)}></div>
                     <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-100 z-20 overflow-hidden animate-fade-in-up">
                        <button 
                          onClick={() => { setTimeRange('1H'); setShowTimeMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 ${timeRange === '1H' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'}`}
                        >
                          Last 1 Hour
                        </button>
                        <button 
                          onClick={() => { setTimeRange('24H'); setShowTimeMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 ${timeRange === '24H' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'}`}
                        >
                          Last 24 Hours
                        </button>
                        <button 
                          onClick={() => { setTimeRange('7D'); setShowTimeMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 ${timeRange === '7D' ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-600'}`}
                        >
                          Last 7 Days
                        </button>
                     </div>
                   </>
                 )}
               </div>

               <div className="hidden sm:flex items-center gap-4 text-xs font-medium border-l border-slate-100 pl-4">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span>Passed</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>Failed</div>
               </div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.PASSED} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={COLORS.PASSED} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.FAILED} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={COLORS.FAILED} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={30} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Passed" stroke={COLORS.PASSED} fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2} />
              <Area type="monotone" dataKey="Failed" stroke={COLORS.FAILED} fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Overall Status Pie */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[320px] flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" /> Overall Status
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle"
                    formatter={(value, entry: any) => <span className="text-xs text-slate-500 ml-1">{value}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Row 2: Breakdowns (Failures & Scope) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Failure by Priority Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px]">
             <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <AlertTriangle size={20} className="text-amber-500" /> Failure Impact Analysis
             </h2>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={failurePriorityData} layout="vertical" margin={{top: 0, right: 30, left: 20, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} width={60} />
                  <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {failurePriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>

           {/* Priority Breakdown (Scope) */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px]">
             <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <Target size={20} className="text-indigo-500" /> Test Suite Priority Scope
             </h2>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={priorityData} layout="vertical" margin={{top: 0, right: 30, left: 20, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} width={60} />
                  <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
      </div>
      
      {/* Row 3: History & Recent Issues */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Runs List */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-full">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
             <h2 className="font-bold text-slate-800 text-lg">Recent Run History</h2>
             <button 
               onClick={handleExportHistory}
               className="flex items-center gap-1.5 text-xs text-green-600 font-medium hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-green-200"
             >
               <FileSpreadsheet size={16} /> Export All Runs (Summary)
             </button>
          </div>
          <div className="divide-y divide-slate-50">
             {runs.length === 0 ? (
               <p className="p-8 text-center text-slate-400 text-sm">No test runs executed yet.</p>
             ) : (
               runs.slice(-5).reverse().map(run => {
                 const totalCases = Object.keys(run.results).length;
                 const passed = Object.values(run.results).filter((r: TestResult) => r.status === 'PASSED').length;
                 const failed = Object.values(run.results).filter((r: TestResult) => r.status === 'FAILED').length;
                 
                 // Calculate bar width for visuals
                 const passPercent = totalCases > 0 ? (passed / totalCases) * 100 : 0;
                 const failPercent = totalCases > 0 ? (failed / totalCases) * 100 : 0;

                 return (
                   <div key={run.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${failed === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {failed === 0 ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                         </div>
                         <div>
                            <p className="font-medium text-slate-800 text-sm">{run.suiteName}</p>
                            <p className="text-xs text-slate-500">{new Date(run.startTime).toLocaleString()}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Passed</p>
                            <p className="text-sm font-mono text-green-600">{passed}</p>
                         </div>
                         <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Failed</p>
                            <p className="text-sm font-mono text-red-600">{failed}</p>
                         </div>
                         <div className="w-24 flex flex-col items-end">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                               <div className="bg-green-500 h-full" style={{width: `${passPercent}%`}}></div>
                               <div className="bg-red-500 h-full" style={{width: `${failPercent}%`}}></div>
                            </div>
                            <span className={`text-[10px] font-bold mt-1 ${failed === 0 ? 'text-green-600' : 'text-red-500'}`}>
                               {failed === 0 ? 'SUCCESS' : 'FAILURE'}
                            </span>
                         </div>
                         <button 
                           onClick={() => handleExportRun(run)}
                           className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                           title="Download Run Details"
                         >
                           <Download size={18} />
                         </button>
                      </div>
                   </div>
                 )
               })
             )}
          </div>
        </div>

        {/* Recent Issues List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-fit">
           <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Bug size={20} className="text-blue-500" /> Recent Issues
              </h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">{issues.length} Total</span>
           </div>
           <div className="divide-y divide-slate-50">
              {recentIssues.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                  <CheckCircle size={32} className="mb-2 opacity-20" />
                  No issues reported yet.
                </div>
              ) : (
                recentIssues.map(issue => (
                  <div 
                    key={issue.id} 
                    onClick={() => setSelectedIssue(issue)}
                    className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                     <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        issue.priority === 'Critical' ? 'bg-red-500' :
                        issue.priority === 'High' ? 'bg-orange-500' :
                        issue.priority === 'Medium' ? 'bg-blue-500' : 'bg-slate-400'
                     }`} title={`Priority: ${issue.priority}`} />
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                           <p className="text-sm font-medium text-slate-800 truncate pr-2">{issue.title}</p>
                           <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{issue.key}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              issue.status === 'DONE' ? 'bg-green-50 text-green-700 border border-green-100' :
                              issue.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                           }`}>
                              {issue.status.replace('_', ' ')}
                           </span>
                           {issue.assignee && (
                             <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={`Assigned to ${issue.assignee}`}>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                {issue.assignee}
                             </span>
                           )}
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* Access Management Modal (Project Level) - Protected visibility */}
      {showPermModal && isProjectAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="text-indigo-600" size={20} />
                      Project Team Access
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Manage users for: {activeSuite.name}</p>
                 </div>
                 <button onClick={() => setShowPermModal(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Add Member</label>
                    <div className="flex gap-2">
                       <select 
                         className="flex-1 border border-slate-300 rounded-lg p-2 text-sm outline-none"
                         value={permUserToAdd}
                         onChange={(e) => setPermUserToAdd(e.target.value)}
                       >
                         <option value="">Select User...</option>
                         {users
                           .filter(u => u.email !== 'administrator@autotest.ai' && !activeSuite.permissions?.[u.id])
                           .map(u => (
                             <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                           ))
                         }
                       </select>
                       <select
                         className="w-32 border border-slate-300 rounded-lg p-2 text-sm outline-none"
                         value={permRoleToAdd}
                         onChange={(e) => setPermRoleToAdd(e.target.value as Role)}
                       >
                         <option value="ADMIN">Admin</option>
                         <option value="MEMBER">Member</option>
                         <option value="OBSERVER">Observer</option>
                       </select>
                       <button 
                         onClick={handleAddPermission}
                         disabled={!permUserToAdd}
                         className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                       >
                         Add
                       </button>
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Active Members</label>
                    <div className="space-y-2">
                       {/* Super Admin Always Visible */}
                       <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-full text-lg">🛡️</div>
                             <div>
                               <p className="text-sm font-semibold text-slate-800">Super Admin</p>
                               <p className="text-xs text-slate-500">administrator@autotest.ai</p>
                             </div>
                          </div>
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">GLOBAL</span>
                       </div>

                       {Object.entries(activeSuite.permissions || {}).map(([userId, role]) => {
                         const user = users.find(u => u.id === userId);
                         if (!user) return null;
                         return (
                           <div key={userId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-lg">{user.avatar}</div>
                                 <div>
                                   <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                   <p className="text-xs text-slate-500">{user.email}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select 
                                   className="text-xs border border-slate-200 rounded p-1"
                                   value={role}
                                   onChange={(e) => handleChangePermission(userId, e.target.value as Role)}
                                >
                                   <option value="ADMIN">Admin</option>
                                   <option value="MEMBER">Member</option>
                                   <option value="OBSERVER">Observer</option>
                                </select>
                                <button 
                                  onClick={() => handleRemovePermission(userId)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                           </div>
                         );
                       })}
                       
                       {(!activeSuite.permissions || Object.keys(activeSuite.permissions).length === 0) && (
                         <p className="text-sm text-slate-400 italic text-center py-4">No explicit members added.</p>
                       )}
                    </div>
                 </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowPermModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
           </div>
        </div>
      )}

      {/* View Issue Details Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-up overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                     {selectedIssue.key}
                   </span>
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      selectedIssue.status === 'DONE' ? 'bg-green-100 text-green-700' :
                      selectedIssue.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                   }`}>
                      {selectedIssue.status.replace('_', ' ')}
                   </span>
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">{selectedIssue.title}</h3>
              </div>
              <button onClick={() => setSelectedIssue(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
               <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                 {selectedIssue.description || "No description provided."}
               </p>
               
               <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                     <span className="text-xs text-slate-400 font-semibold block mb-1">Priority</span>
                     <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${
                        selectedIssue.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                        selectedIssue.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        selectedIssue.priority === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-50 text-slate-600 border-slate-100'
                     }`}>
                       {selectedIssue.priority}
                     </span>
                  </div>
                  <div>
                     <span className="text-xs text-slate-400 font-semibold block mb-1">Assignee</span>
                     <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                          {users.find(u => u.name === selectedIssue.assignee)?.avatar || '👤'}
                       </div>
                       <span className="text-sm text-slate-700">{selectedIssue.assignee || 'Unassigned'}</span>
                     </div>
                  </div>
               </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
