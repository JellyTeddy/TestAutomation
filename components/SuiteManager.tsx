
import React, { useState, useRef } from 'react';
import { TestSuite, TestCase, User } from '../types';
import { Plus, Trash2, Wand2, ChevronRight, FileText, Play, ChevronDown, ChevronUp, FileSpreadsheet, Upload, Globe, Settings, X, Bot, PlusCircle, Loader2, ShieldCheck, Zap, Monitor, Laptop, FileBox } from 'lucide-react';
import { generateTestCases } from '../services/geminiService';

interface SuiteManagerProps {
  activeSuite: TestSuite;
  suites: TestSuite[];
  setSuites: React.Dispatch<React.SetStateAction<TestSuite[]>>;
  onRunSuite: (suite: TestSuite) => void;
  currentUser: User;
  allUsers: User[];
}

const SuiteManager: React.FC<SuiteManagerProps> = ({ activeSuite, suites, setSuites, onRunSuite, currentUser, allUsers }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  // Run Configuration State
  const [showRunConfigModal, setShowRunConfigModal] = useState(false);
  const [runExecMode, setRunExecMode] = useState<'MANUAL' | 'AUTOMATED'>(activeSuite.targetConfig?.executionMode || 'MANUAL');
  const [runAppType, setRunAppType] = useState<'WEB' | 'FILE' | 'DESKTOP'>(activeSuite.targetConfig?.appType || 'WEB');
  const [runAppAddress, setRunAppAddress] = useState(activeSuite.targetConfig?.appAddress || '');
  const [runFileName, setRunFileName] = useState(activeSuite.targetConfig?.fileName || '');
  const [runFileData, setRunFileData] = useState(activeSuite.targetConfig?.fileData || '');
  const [runTestId, setRunTestId] = useState(activeSuite.targetConfig?.validId || '');
  const [runTestPw, setRunTestPw] = useState(activeSuite.targetConfig?.validPassword || '');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [newCasePriority, setNewCasePriority] = useState<'Low'|'Medium'|'High'>('Medium');
  const [newCaseSteps, setNewCaseSteps] = useState<{id: string, action: string, expectedResult: string}[]>([{ id: crypto.randomUUID(), action: '', expectedResult: '' }]);

  const genOpRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canWrite = currentUser.email === 'administrator@autotest.ai' || activeSuite.permissions?.[currentUser.id] === 'ADMIN' || activeSuite.permissions?.[currentUser.id] === 'MEMBER';

  const handleStartRun = () => {
    // Update the suite's target config before running
    const updatedSuite: TestSuite = {
      ...activeSuite,
      targetConfig: {
        executionMode: runExecMode,
        appType: runAppType,
        appAddress: runAppAddress,
        fileName: runFileName,
        fileData: runFileData,
        validId: runTestId,
        validPassword: runTestPw
      }
    };
    
    // Save to global state so results can reference it
    setSuites(prev => prev.map(s => s.id === activeSuite.id ? updatedSuite : s));
    
    setShowRunConfigModal(false);
    onRunSuite(updatedSuite);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRunFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setRunFileData(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const addStep = () => setNewCaseSteps([...newCaseSteps, { id: crypto.randomUUID(), action: '', expectedResult: '' }]);
  const removeStep = (id: string) => { if (newCaseSteps.length > 1) setNewCaseSteps(newCaseSteps.filter(s => s.id !== id)); };
  const updateStep = (id: string, field: 'action' | 'expectedResult', value: string) => setNewCaseSteps(newCaseSteps.map(s => s.id === id ? { ...s, [field]: value } : s));

  const handleManualCreate = () => {
    if (!newCaseTitle.trim()) return;
    const newCase: TestCase = { id: crypto.randomUUID(), title: newCaseTitle, description: newCaseDesc, priority: newCasePriority, steps: newCaseSteps.filter(s => s.action.trim() !== '') };
    setSuites(prev => prev.map(s => s.id === activeSuite.id ? { ...s, cases: [...s.cases, newCase] } : s));
    setShowCreateModal(false); resetManualForm();
  };

  const resetManualForm = () => {
    setNewCaseTitle(''); setNewCaseDesc(''); setNewCasePriority('Medium');
    setNewCaseSteps([{ id: crypto.randomUUID(), action: '', expectedResult: '' }]);
  };

  const handleDeleteCase = (caseId: string) => {
    setSuites(prev => prev.map(s => s.id === activeSuite.id ? { ...s, cases: s.cases.filter(c => c.id !== caseId) } : s));
  };

  const handleGenerateCases = async () => {
    if (!canWrite) return;
    if (!prompt.trim() || !activeSuite.id) return;
    const opId = Date.now();
    genOpRef.current = opId;
    setIsGenerating(true);
    try {
      const contextInfo = `${runAppType} App at ${runAppAddress || runFileName || 'Unknown Address'}`;
      const newCases = await generateTestCases(prompt, contextInfo);
      if (genOpRef.current !== opId) return;
      if (newCases && newCases.length > 0) {
        setSuites(prevSuites => prevSuites.map(suite => {
          if (suite.id === activeSuite.id) return { ...suite, cases: [...suite.cases, ...newCases as TestCase[]] };
          return suite;
        }));
        setShowPromptModal(false);
        setPrompt('');
      }
    } catch (e) {
      console.error(e);
      alert('테스트 케이스 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in text-slate-900 dark:text-slate-100">
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-4">
           <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold dark:text-white">{activeSuite.name}</h2>
                {activeSuite.targetConfig?.executionMode === 'AUTOMATED' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Zap size={10} /> AUTO
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeSuite.description}</p>
           </div>
           <div className="flex items-center gap-2">
              <button onClick={() => setShowRunConfigModal(true)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Project Settings">
                <Settings size={20} />
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
              {canWrite && (
                <>
                  <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><Plus size={16}/> New Case</button>
                  <button onClick={() => { setShowPromptModal(true); }} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"><Wand2 size={16}/> AI Generate</button>
                </>
              )}
              <button onClick={() => setShowRunConfigModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-green-700 transition-all"><Play size={16}/> Run Suite</button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="space-y-4">
            {activeSuite.cases.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>No test cases yet.</p>
              </div>
            ) : (
              activeSuite.cases.map((c, i) => (
                <TestCaseCard key={c.id} testCase={c} index={i} readOnly={!canWrite} onDelete={() => handleDeleteCase(c.id)} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Run Configuration Modal */}
      {showRunConfigModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border-4 border-[#FFCA28]">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#5D4037] text-white">
               <div>
                 <h3 className="text-2xl font-black text-[#FFECB3] flex items-center gap-2"><Play className="fill-current" /> 실행 설정</h3>
                 <p className="text-xs text-[#D7CCC8]">테스트 실행 방식과 대상을 구성합니다.</p>
               </div>
               <button onClick={() => setShowRunConfigModal(false)} className="text-[#D7CCC8] hover:text-white p-2 transition-colors"><X size={28}/></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
               {/* Mode Selection */}
               <section className="space-y-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">실행 모드 (Execution Mode)</label>
                  <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={() => setRunExecMode('MANUAL')}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${runExecMode === 'MANUAL' ? 'bg-white dark:bg-slate-700 shadow-xl text-blue-600 dark:text-blue-400 scale-[1.02] border-b-4 border-blue-500' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                    >
                      <Laptop size={24} />
                      <span className="font-black text-sm uppercase">수동 테스트</span>
                    </button>
                    <button 
                      onClick={() => setRunExecMode('AUTOMATED')}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${runExecMode === 'AUTOMATED' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-indigo-400 scale-[1.02] border-b-4 border-indigo-500' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                    >
                      <Bot size={24} />
                      <span className="font-black text-sm uppercase">AI 자동화</span>
                    </button>
                  </div>
               </section>

               {/* Target Selection */}
               <section className="space-y-4">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">테스트 대상 (Target Type)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'WEB', label: 'Web URL', icon: Globe },
                      { id: 'FILE', label: 'Local File', icon: FileBox },
                      { id: 'DESKTOP', label: 'Native App', icon: Monitor }
                    ].map(target => (
                      <button 
                        key={target.id}
                        onClick={() => setRunAppType(target.id as any)}
                        className={`flex items-center gap-2 justify-center p-3 rounded-xl border-2 transition-all font-bold text-xs ${runAppType === target.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'}`}
                      >
                        <target.icon size={16} />
                        {target.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    {runAppType === 'WEB' ? (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">웹사이트 주소</label>
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all dark:text-white"
                            placeholder="https://example.com"
                            value={runAppAddress}
                            onChange={e => setRunAppAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : runAppType === 'FILE' ? (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">파일 선택</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all"
                        >
                          <Upload className="text-blue-500" />
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{runFileName || '파일을 드래그하거나 클릭하여 업로드'}</span>
                          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">앱 경로/환경 명칭</label>
                        <input 
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all dark:text-white"
                          placeholder="e.g. ERP System v1.2"
                          value={runAppAddress}
                          onChange={e => setRunAppAddress(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
               </section>

               {runExecMode === 'AUTOMATED' && (
                 <section className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 space-y-4 animate-fade-in">
                    <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2"><ShieldCheck size={16}/> 인증 정보 (Optional)</h4>
                    <div className="grid grid-cols-2 gap-3">
                       <input className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Test ID" value={runTestId} onChange={e => setRunTestId(e.target.value)} />
                       <input type="password" className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Password" value={runTestPw} onChange={e => setRunTestPw(e.target.value)} />
                    </div>
                 </section>
               )}
            </div>

            <div className="p-8 border-t dark:border-slate-800 flex justify-end gap-4 bg-slate-50 dark:bg-slate-800/30">
               <button onClick={() => setShowRunConfigModal(false)} className="px-8 py-3 text-slate-500 font-black uppercase text-xs tracking-widest">취소</button>
               <button 
                onClick={handleStartRun}
                disabled={runExecMode === 'AUTOMATED' && runAppType === 'WEB' && !runAppAddress}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
               >
                 <Play size={18} className="fill-current" /> 실행 시작
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><PlusCircle className="text-blue-600" /> 직접 테스트 케이스 생성</h3>
                 <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">테스트 케이스 명칭</label>
                          <input className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="예: 로그인 유효성 체크" value={newCaseTitle} onChange={e => setNewCaseTitle(e.target.value)} />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">설명</label>
                          <textarea className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none" value={newCaseDesc} onChange={e => setNewCaseDesc(e.target.value)} placeholder="테스트 목적이나 사전 조건을 입력하세요." />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">우선순위</label>
                       <div className="space-y-2">
                          {(['Low', 'Medium', 'High'] as const).map(p => (
                            <button key={p} onClick={() => setNewCasePriority(p)} className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between ${newCasePriority === p ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                              {p}
                              <div className={`w-2 h-2 rounded-full ${p === 'High' ? 'bg-red-500' : p === 'Medium' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="space-y-3 pt-4 border-t dark:border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="text-sm font-bold dark:text-slate-300">테스트 단계 (Steps)</h4>
                       <button onClick={addStep} className="text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded">+ 단계 추가</button>
                    </div>
                    {newCaseSteps.map((s, idx) => (
                      <div key={s.id} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-700 group">
                        <span className="text-xs font-bold text-slate-400 mt-2.5 w-4">{idx+1}</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                           <input className="bg-transparent border-none text-sm focus:ring-0 p-0 font-medium dark:text-slate-200" placeholder="사용자 액션" value={s.action} onChange={e => updateStep(s.id, 'action', e.target.value)} />
                           <input className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-500 dark:text-slate-400" placeholder="예상 결과" value={s.expectedResult} onChange={e => updateStep(s.id, 'expectedResult', e.target.value)} />
                        </div>
                        <button onClick={() => removeStep(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                 <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500 font-bold">취소</button>
                 <button onClick={handleManualCreate} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">저장</button>
              </div>
           </div>
        </div>
      )}

      {/* AI Generate Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Wand2 className="text-indigo-600" /> AI 기반 케이스 자동 생성</h3>
                <button onClick={() => setShowPromptModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">대상 기능 설명</label>
                   <textarea className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-4 text-sm h-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-slate-200" placeholder="예: 쇼핑몰 웹사이트에서 비회원이 장바구니에 상품을 담고, 로그인한 후 주문을 완료하는 전체 프로세스를 검증하고 싶어." value={prompt} onChange={e => setPrompt(e.target.value)} />
                 </div>
              </div>
              <div className="p-6 border-t dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <button onClick={() => setShowPromptModal(false)} className="px-6 py-2 text-slate-500 font-bold">취소</button>
                <button onClick={handleGenerateCases} disabled={isGenerating || !prompt.trim()} className="px-10 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2 hover:bg-indigo-700 transition-all">{isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}{isGenerating ? 'AI가 시나리오 분석 중...' : '생성 시작'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TestCaseCard: React.FC<{ testCase: TestCase; index: number; readOnly?: boolean; onDelete?: () => void }> = ({ testCase, index, readOnly, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all group hover:border-blue-300 dark:hover:border-blue-700">
      <div className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center w-8">
            <span className="text-[10px] font-bold text-slate-400">TC</span>
            <span className="text-lg font-bold text-slate-400">#{index+1}</span>
          </div>
          <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
          <div>
             <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{testCase.title}</h4>
             <p className="text-xs text-slate-500 line-clamp-1">{testCase.description || '상세 설명이 없습니다.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${testCase.priority === 'High' ? 'bg-red-100 text-red-600' : testCase.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{testCase.priority}</span>
           {!readOnly && <button onClick={e => {e.stopPropagation(); if(confirm('이 케이스를 삭제할까요?')) onDelete?.();}} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>}
           {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800 animate-fade-in">
           <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
             <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                   <tr><th className="p-3 w-10 text-center">#</th><th className="p-3">사용자 액션 (User Action)</th><th className="p-3">예상 결과 (Expected Result)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {testCase.steps.map((s, i) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-300">{i+1}</td>
                        <td className="p-3 dark:text-slate-200">{s.action}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{s.expectedResult}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default SuiteManager;
