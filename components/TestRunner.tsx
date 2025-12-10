import React, { useState, useEffect, useRef } from 'react';
import { TestSuite, TestRun, TestResult, TestStatus, TestCase } from '../types';
import { CheckCircle, XCircle, SkipForward, ArrowRight, ArrowLeft, Save, AlertOctagon, Monitor, Globe, Mail, Bot, Loader2, PlayCircle, PauseCircle } from 'lucide-react';
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

  // Initialize results if empty
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
    
    // Start automation if mode is AUTOMATED
    if (isAutomatedMode) {
      setIsAutoRunning(true);
      autoRunRef.current = true;
    }
  }, [suite, isAutomatedMode]);

  // Automated Execution Logic
  useEffect(() => {
    if (!isAutomatedMode || !isAutoRunning) return;
    
    // Check if current case is already processed
    if (results[currentCase.id]?.status !== 'IDLE') {
       if (!isLastCase) {
          // Move to next case after short delay
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
        const contextInfo = `${suite.targetConfig?.appType || 'App'} at ${suite.targetConfig?.appAddress || 'Loc'} using ${suite.targetConfig?.testEmail || 'default user'}`;
        const result = await simulateTestExecution(currentCase, contextInfo);
        
        setSimulatedLogs(prev => ({
          ...prev,
          [currentCase.id]: result.notes
        }));

        handleStatus(result.status);
      } catch (error) {
        handleStatus('SKIPPED');
      }
    };

    runSimulation();

  }, [currentCaseIndex, isAutoRunning, isAutomatedMode, results, currentCase, isLastCase, suite]);

  const handleStatus = (status: TestStatus) => {
    const updatedResults = {
      ...results,
      [currentCase.id]: {
        ...results[currentCase.id],
        status,
        timestamp: new Date().toISOString()
      }
    };
    setResults(updatedResults);
    
    // Auto advance if passed or failed/skipped (Manual mode)
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

  const progress = ((currentCaseIndex) / suite.cases.length) * 100;

  return (
    <div className="h-full flex flex-col animate-fade-in bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Running: {suite.name}
            {isAutomatedMode && <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Bot size={12} /> Auto</span>}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
             <span>Case {currentCaseIndex + 1} of {suite.cases.length}</span>
             {suite.targetConfig && (
               <>
                 <span className="w-1 h-1 bg-slate-500 rounded-full" />
                 <span className="flex items-center gap-1 text-slate-300">
                   {suite.targetConfig.appType === 'WEB' ? <Globe size={10} /> : <Monitor size={10} />}
                   {suite.targetConfig.appAddress}
                 </span>
                 {suite.targetConfig.testEmail && (
                   <span className="hidden md:flex items-center gap-1">
                     (<Mail size={10} /> {suite.targetConfig.testEmail})
                   </span>
                 )}
               </>
             )}
          </div>
        </div>
        <button onClick={onCancel} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors">
          Exit Run
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5">
        <div 
          className="bg-blue-600 h-1.5 transition-all duration-300" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Case List Sidebar */}
        <div className="w-full md:w-64 border-r border-slate-100 bg-slate-50 overflow-y-auto hidden md:block">
          {suite.cases.map((c, idx) => {
            const status = results[c.id]?.status || 'IDLE';
            const isRunning = isAutomatedMode && currentCaseIndex === idx && status === 'IDLE';
            
            return (
              <div 
                key={c.id}
                onClick={() => !isAutomatedMode && setCurrentCaseIndex(idx)}
                className={`p-3 text-sm cursor-pointer border-b border-slate-100 flex items-center justify-between ${
                  currentCaseIndex === idx ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                } ${isAutomatedMode ? 'pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  {isRunning && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                  <span className={`truncate font-medium ${isRunning ? 'text-indigo-600' : ''}`}>{idx + 1}. {c.title}</span>
                </div>
                {!isRunning && <StatusIcon status={status} size={16} />}
              </div>
            );
          })}
        </div>

        {/* Active Test Case Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
               <span className="bg-slate-100 text-slate-500 font-mono text-xs px-2 py-1 rounded">
                 Priority: {currentCase.priority}
               </span>
               <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                  results[currentCase.id]?.status === 'PASSED' ? 'text-green-600 bg-green-50' :
                  results[currentCase.id]?.status === 'FAILED' ? 'text-red-600 bg-red-50' :
                  results[currentCase.id]?.status === 'SKIPPED' ? 'text-amber-600 bg-amber-50' :
                  'text-slate-400 bg-slate-50'
               }`}>
                 {results[currentCase.id]?.status || (isAutomatedMode ? 'RUNNING...' : 'PENDING')}
               </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{currentCase.title}</h1>
            <p className="text-slate-500 mt-2">{currentCase.description}</p>
          </div>

          <div className="space-y-6 flex-1">
             <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
               <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Steps to Execute</h3>
               <div className="space-y-4">
                 {currentCase.steps.map((step, idx) => (
                   <div key={step.id} className="flex gap-4 p-3 rounded-lg bg-white border border-slate-100 shadow-sm">
                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                       {idx + 1}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                       <div>
                         <span className="text-xs font-semibold text-slate-400 block mb-1">Action</span>
                         <p className="text-slate-800 text-sm">{step.action}</p>
                       </div>
                       <div>
                         <span className="text-xs font-semibold text-slate-400 block mb-1">Expected Result</span>
                         <p className="text-slate-800 text-sm">{step.expectedResult}</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>

             {/* Automated Run Simulation Logs */}
             {isAutomatedMode && simulatedLogs[currentCase.id] && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 font-mono text-sm text-slate-300">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Bot size={14} /> Automation Execution Log
                  </h3>
                  <div className="whitespace-pre-wrap leading-relaxed opacity-90">
                    {simulatedLogs[currentCase.id]}
                  </div>
                </div>
             )}
          </div>

          {/* Action Bar */}
          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-4">
            
            {/* Navigation (Only show in Manual or if Automation is paused/done) */}
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentCaseIndex(Math.max(0, currentCaseIndex - 1))}
                disabled={currentCaseIndex === 0 || isAutoRunning}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                <ArrowLeft size={20} />
              </button>
              <button 
                 onClick={() => setCurrentCaseIndex(Math.min(suite.cases.length - 1, currentCaseIndex + 1))}
                 disabled={isLastCase || isAutoRunning}
                 className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {isAutomatedMode ? (
              <div className="flex gap-3 ml-auto">
                 {isAutoRunning && (
                   <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg animate-pulse">
                     <Loader2 size={18} className="animate-spin" />
                     <span className="font-medium text-sm">AI Executing Test...</span>
                   </div>
                 )}
                 {isLastCase && !isAutoRunning && (
                    <button 
                      onClick={handleFinish}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
                    >
                      <Save size={18} /> Finish Run
                    </button>
                 )}
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => handleStatus('PASSED')}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  <CheckCircle size={18} /> Pass
                </button>
                <button 
                  onClick={() => handleStatus('FAILED')}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  <XCircle size={18} /> Fail
                </button>
                <button 
                  onClick={() => handleStatus('SKIPPED')}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium shadow-sm hover:shadow active:scale-95 transition-all"
                >
                  <SkipForward size={18} /> Skip
                </button>
                {isLastCase && (
                  <button 
                    onClick={handleFinish}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all ml-4"
                  >
                    <Save size={18} /> Finish Run
                  </button>
                )}
              </div>
            )}
          </div>
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
    default: return <div className={`w-[${size}px] h-[${size}px] rounded-full border-2 border-slate-200`} />;
  }
};

export default TestRunner;