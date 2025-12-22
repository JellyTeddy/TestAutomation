
import React, { useState, useEffect, useRef } from 'react';
import { TestSuite, TestRun, TestResult, TestStatus, TestCase } from '../types';
import { CheckCircle, XCircle, SkipForward, ArrowRight, ArrowLeft, Save, AlertOctagon, Monitor, Globe, Mail, Bot, Loader2, PlayCircle, PauseCircle, FileSpreadsheet, FolderOpen, Zap, FileBox } from 'lucide-react';
import { simulateTestExecution } from '../services/geminiService';

interface TestRunnerProps {
  suite: TestSuite;
  onComplete: (run: TestRun) => void;
  onCancel: () => void;
}

const TestRunner: React.FC<TestRunnerProps> = ({ suite, onComplete, onCancel }) => {
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [startTime] = useState(new Date().toISOString());
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState<Record<string, string>>({});
  
  const currentCase = suite.cases[currentCaseIndex];
  const isLastCase = currentCaseIndex === suite.cases.length - 1;
  const isAutomatedMode = suite.targetConfig?.executionMode === 'AUTOMATED';
  const autoRunRef = useRef(false);

  useEffect(() => {
    const initialResults: Record<string, TestResult> = {};
    suite.cases.forEach(c => {
      initialResults[c.id] = {
        caseId: c.id,
        status: 'IDLE',
        timestamp: new Date().toISOString()
      };
    });
    setResults(initialResults);
    
    if (isAutomatedMode && suite.cases.length > 0) {
      setIsAutoRunning(true);
      autoRunRef.current = true;
    }
  }, [suite, isAutomatedMode]);

  useEffect(() => {
    if (!isAutomatedMode || !isAutoRunning || !currentCase) return;
    
    if (results[currentCase.id]?.status !== 'IDLE') {
       if (!isLastCase) {
          const timer = setTimeout(() => {
             setCurrentCaseIndex(prev => prev + 1);
          }, 1500);
          return () => clearTimeout(timer);
       } else {
         setIsAutoRunning(false);
       }
       return;
    }

    const runSimulation = async () => {
      try {
        let contextInfo = `${suite.targetConfig?.appType || 'App'} at ${suite.targetConfig?.appAddress || suite.targetConfig?.fileName || 'Unknown Address'}`;
        
        if (suite.targetConfig?.validId) contextInfo += `\n[Credentials] Valid ID: ${suite.targetConfig.validId}`;
        else contextInfo += `\n[Credentials] Valid ID: (Not Provided)`;

        if (suite.targetConfig?.validPassword) contextInfo += `\n[Credentials] Valid Password: ${suite.targetConfig.validPassword}`;
        else contextInfo += `\n[Credentials] Valid Password: (Not Provided)`;

        if (suite.targetConfig?.fileName) contextInfo += `\n[File] Testing Target File: ${suite.targetConfig.fileName}`;
        
        const result = await simulateTestExecution(currentCase, contextInfo);
        
        setSimulatedLogs(prev => ({ ...prev, [currentCase.id]: result.notes }));
        handleStatus(result.status, result.notes);
      } catch (error) {
        handleStatus('SKIPPED', 'Automation execution failed.');
      }
    };

    runSimulation();
  }, [currentCaseIndex, isAutoRunning, isAutomatedMode, results, currentCase, isLastCase, suite]);

  const handleStatus = (status: TestStatus, notes?: string) => {
    const updatedResults = {
      ...results,
      [currentCase.id]: {
        ...results[currentCase.id],
        status,
        notes: notes || results[currentCase.id].notes,
        timestamp: new Date().toISOString()
      }
    };
    setResults(updatedResults);
    
    if (!isAutomatedMode && status !== 'IDLE' && !isLastCase) {
      setTimeout(() => setCurrentCaseIndex(prev => prev + 1), 200);
    }
  };

  const handleFinish = () => {
    const run: TestRun = {
      id: crypto.randomUUID(),
      suiteId: suite.id,
      suiteName: suite.name,
      startTime,
      endTime: new Date().toISOString(),
      status: 'COMPLETED',
      results
    };
    onComplete(run);
  };

  const exportResults = () => {
    const headers = ['Test Case ID', 'Title', 'Priority', 'Status', 'Execution Notes/Logs'];
    const rows = suite.cases.map(c => {
      const result = results[c.id];
      const status = result?.status || 'SKIPPED';
      const notes = result?.notes ? result.notes.replace(/"/g, '""') : '';
      return [`"${c.id}"`, `"${c.title.replace(/"/g, '""')}"`, c.priority, status, `"${notes}"`].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${suite.name.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progress = ((currentCaseIndex + (results[currentCase?.id]?.status !== 'IDLE' ? 1 : 0)) / suite.cases.length) * 100;

  return (
    <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <div className="bg-slate-800 dark:bg-slate-950 text-white p-4 flex justify-between items-center border-b border-slate-700 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Running: {suite.name}
            {isAutomatedMode && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap size={10} /> AI AUTOMATION
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
             <span>Case {currentCaseIndex + 1} of {suite.cases.length}</span>
             {suite.targetConfig && (
               <>
                 <span className="w-1 h-1 bg-slate-500 rounded-full" />
                 <span className="flex items-center gap-1 text-slate-300">
                   {suite.targetConfig.appType === 'WEB' ? <Globe size={10} /> : suite.targetConfig.appType === 'FILE' ? <FileBox size={10} /> : <Monitor size={10} />}
                   {suite.targetConfig.appAddress || suite.targetConfig.fileName || 'Local Target'}
                 </span>
               </>
             )}
          </div>
        </div>
        <button onClick={onCancel} className="text-xs bg-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors font-bold">
          Exit Run
        </button>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
        <div className="bg-blue-600 h-1.5 transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Case List Sidebar */}
        <div className="w-full md:w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto hidden md:block">
          {suite.cases.map((c, idx) => {
            const status = results[c.id]?.status || 'IDLE';
            const isActive = currentCaseIndex === idx;
            const isRunning = isAutomatedMode && isActive && status === 'IDLE';
            
            return (
              <div key={c.id} onClick={() => !isAutomatedMode && setCurrentCaseIndex(idx)} className={`p-4 text-sm cursor-pointer border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all ${isActive ? 'bg-white dark:bg-slate-800 border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'} ${isAutomatedMode ? 'pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 truncate flex-1">
                  {isRunning ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : <span className="text-[10px] font-bold opacity-30">#{idx+1}</span>}
                  <span className={`truncate font-medium ${isRunning ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{c.title}</span>
                </div>
                {!isRunning && <StatusIcon status={status} size={14} />}
              </div>
            );
          })}
        </div>

        {/* Active Test Case Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white dark:bg-slate-950">
          {!currentCase ? (
            <div className="h-full flex items-center justify-center text-slate-400">No test cases to run.</div>
          ) : (
            <>
              <div className="mb-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                   <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase ${currentCase.priority === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>Priority: {currentCase.priority}</span>
                   <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase border ${results[currentCase.id]?.status === 'PASSED' ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20' : results[currentCase.id]?.status === 'FAILED' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20' : 'text-slate-400 border-slate-200 bg-slate-50 dark:bg-slate-800'}`}>
                     {results[currentCase.id]?.status || (isAutomatedMode ? 'AUTO-RUNNING...' : 'WAITING FOR INPUT')}
                   </span>
                </div>
                <h1 className="text-3xl font-bold dark:text-white">{currentCase.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{currentCase.description || 'No detailed description.'}</p>
              </div>

              <div className="space-y-6 flex-1">
                 <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">테스트 시나리오 단계</h3>
                   <div className="space-y-3">
                     {currentCase.steps.map((step, idx) => (
                       <div key={step.id} className="flex gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                         <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                           <div>
                             <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">액션</span>
                             <p className="text-sm font-medium dark:text-slate-200">{step.action}</p>
                           </div>
                           <div>
                             <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">예상 결과</span>
                             <p className="text-sm text-slate-500 dark:text-slate-400">{step.expectedResult}</p>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 {isAutomatedMode && simulatedLogs[currentCase.id] && (
                    <div className="bg-slate-900 dark:bg-black rounded-2xl border border-slate-800 p-5 font-mono text-xs text-slate-300 shadow-2xl animate-fade-in-up">
                      <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Bot size={14} /> AI AGENT EXECUTION CONSOLE
                      </h3>
                      <div className="whitespace-pre-wrap leading-relaxed opacity-90 custom-scrollbar max-h-60 overflow-y-auto">
                        {simulatedLogs[currentCase.id]}
                      </div>
                    </div>
                 )}
              </div>

              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button onClick={() => setCurrentCaseIndex(Math.max(0, currentCaseIndex - 1))} disabled={currentCaseIndex === 0 || isAutoRunning} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-20 transition-all"><ArrowLeft size={24} /></button>
                  <button onClick={() => setCurrentCaseIndex(Math.min(suite.cases.length - 1, currentCaseIndex + 1))} disabled={isLastCase || isAutoRunning} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-20 transition-all"><ArrowRight size={24} /></button>
                </div>

                {isAutomatedMode ? (
                  <div className="flex gap-3 ml-auto">
                     {isAutoRunning ? (
                       <div className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 animate-pulse">
                         <Loader2 size={18} className="animate-spin" />
                         <span className="font-bold text-sm">AI 자동 테스팅 진행 중...</span>
                       </div>
                     ) : isLastCase && (
                       <div className="flex gap-3">
                          <button onClick={exportResults} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><FileSpreadsheet size={18} className="text-green-600" /> 결과 내보내기</button>
                          <button onClick={handleFinish} className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"><Save size={18} /> 실행 종료</button>
                       </div>
                     )}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => handleStatus('PASSED')} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:scale-105 active:scale-95 transition-all"><CheckCircle size={18} /> Pass</button>
                    <button onClick={() => handleStatus('FAILED')} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all"><XCircle size={18} /> Fail</button>
                    <button onClick={() => handleStatus('SKIPPED')} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"><SkipForward size={18} /> Skip</button>
                    {isLastCase && (
                      <button onClick={handleFinish} className="flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold shadow-xl hover:scale-105 ml-4 transition-all"><Save size={18} /> 저장 후 종료</button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusIcon = ({ status, size }: { status: string, size: number }) => {
  switch(status) {
    case 'PASSED': return <CheckCircle size={size} className="text-green-500" />;
    case 'FAILED': return <XCircle size={size} className="text-red-500" />;
    case 'SKIPPED': return <AlertOctagon size={size} className="text-amber-500" />;
    default: return <div style={{width: size, height: size}} className="rounded-full border-2 border-slate-200 dark:border-slate-800" />;
  }
};

export default TestRunner;
