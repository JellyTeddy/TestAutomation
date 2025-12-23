
import React, { useState, useRef } from 'react';
import { TestSuite, TestCase, User } from '../types';
import { Plus, Trash2, Wand2, ChevronRight, FileText, Play, ChevronDown, ChevronUp, FileSpreadsheet, Upload, Globe, Settings, X, Bot, PlusCircle, Loader2, ShieldCheck, Zap, Monitor, Laptop, FileBox, Image as ImageIcon, Sparkles, CheckCircle2, Layout, Database, Info, AlertTriangle } from 'lucide-react';
import { generateTestCases, GenerationOptions } from '../services/geminiService';

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
  const [genStatus, setGenStatus] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  // AI Generation Detailed Options
  const [genOptions, setGenOptions] = useState<GenerationOptions>({
    focusArea: 'HAPPY_PATH',
    complexity: 'DETAILED'
  });
  const [screenshot, setScreenshot] = useState<{mimeType: string, data: string} | null>(null);

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
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  
  const canWrite = currentUser.email === 'administrator@autotest.ai' || activeSuite.permissions?.[currentUser.id] === 'ADMIN' || activeSuite.permissions?.[currentUser.id] === 'MEMBER';

  const handleStartRun = () => {
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

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setScreenshot({ mimeType: file.type, data: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateCases = async () => {
    if (!canWrite) return;
    if (!prompt.trim() || !activeSuite.id) return;
    const opId = Date.now();
    genOpRef.current = opId;
    setIsGenerating(true);
    
    // Status animation simulation
    const statuses = ["사용자 요구사항 분석 중...", "스크린샷 UI 매핑 중...", "테스트 시나리오 설계 중...", "원자적 테스트 단계 도출 중...", "최종 검증 및 최적화 중..."];
    let statusIdx = 0;
    const statusInterval = setInterval(() => {
      if (statusIdx < statuses.length) {
        setGenStatus(statuses[statusIdx]);
        statusIdx++;
      }
    }, 1500);

    try {
      const contextInfo = `${runAppType} App at ${runAppAddress || runFileName || 'Unknown Address'}`;
      const newCases = await generateTestCases(prompt, contextInfo, genOptions, screenshot || undefined);
      
      if (genOpRef.current !== opId) return;
      if (newCases && newCases.length > 0) {
        setSuites(prevSuites => prevSuites.map(suite => {
          if (suite.id === activeSuite.id) return { ...suite, cases: [...suite.cases, ...newCases as TestCase[]] };
          return suite;
        }));
        setShowPromptModal(false);
        setPrompt('');
        setScreenshot(null);
      }
    } catch (e) {
      console.error(e);
      alert('테스트 케이스 생성 중 오류가 발생했습니다.');
    } finally {
      clearInterval(statusInterval);
      setIsGenerating(false);
      setGenStatus('');
    }
  };

  const resetManualForm = () => {
    setNewCaseTitle(''); setNewCaseDesc(''); setNewCasePriority('Medium');
    setNewCaseSteps([{ id: crypto.randomUUID(), action: '', expectedResult: '' }]);
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
                  <button onClick={() => setShowPromptModal(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm shadow-indigo-500/10"><Wand2 size={16}/> AI Generate</button>
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
                <TestCaseCard key={c.id} testCase={c} index={i} readOnly={!canWrite} onDelete={() => {}} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Generate Prompt Modal (Advanced) */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up border border-indigo-100 dark:border-indigo-900/30">
              <div className="p-8 border-b dark:border-slate-800 bg-indigo-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><Sparkles size={24} /></div>
                  <div>
                    <h3 className="text-2xl font-black">AI Intelligent Generator</h3>
                    <p className="text-xs text-indigo-100">요구사항분석부터 시나리오 설계까지 AI가 모든 단계를 수행합니다.</p>
                  </div>
                </div>
                {!isGenerating && <button onClick={() => setShowPromptModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28}/></button>}
              </div>

              <div className="flex flex-col md:flex-row max-h-[70vh] overflow-hidden">
                {/* Left Side: Options */}
                <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 p-6 border-r dark:border-slate-800 space-y-6 overflow-y-auto">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">테스트 집중 영역</label>
                      <div className="space-y-2">
                        {[
                          {id: 'HAPPY_PATH', label: '핵심 기능 (Happy Path)', icon: CheckCircle2},
                          {id: 'EDGE_CASES', label: '예외 상황 (Edge Case)', icon: AlertTriangle},
                          {id: 'SECURITY', label: '보안 검증 (Security)', icon: ShieldCheck},
                          {id: 'FULL_COVERAGE', label: '전체 커버리지', icon: Layout}
                        ].map(area => (
                          <button 
                            key={area.id}
                            onClick={() => setGenOptions({...genOptions, focusArea: area.id as any})}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${genOptions.focusArea === area.id ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-md' : 'border-transparent text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                          >
                            <area.icon size={18} />
                            <span className="text-xs">{area.label}</span>
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">작성 상세 수준</label>
                      <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => setGenOptions({...genOptions, complexity: 'SIMPLE'})}
                            className={`p-3 rounded-xl border-2 transition-all text-xs font-bold ${genOptions.complexity === 'SIMPLE' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600' : 'border-transparent text-slate-400'}`}
                         >간결하게</button>
                         <button 
                            onClick={() => setGenOptions({...genOptions, complexity: 'DETAILED'})}
                            className={`p-3 rounded-xl border-2 transition-all text-xs font-bold ${genOptions.complexity === 'DETAILED' ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-600' : 'border-transparent text-slate-400'}`}
                         >상세하게</button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UI 참조 (선택)</label>
                      <div 
                        onClick={() => screenshotInputRef.current?.click()}
                        className={`w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden relative group ${screenshot ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'}`}
                      >
                         {screenshot ? (
                            <>
                              <img src={`data:${screenshot.mimeType};base64,${screenshot.data}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon className="text-white" />
                              </div>
                            </>
                         ) : (
                            <>
                              <ImageIcon className="text-slate-300" />
                              <span className="text-[10px] font-bold text-slate-400">화면 캡쳐 업로드</span>
                            </>
                         )}
                         <input type="file" accept="image/*" className="hidden" ref={screenshotInputRef} onChange={handleScreenshotUpload} />
                      </div>
                      {screenshot && <button onClick={() => setScreenshot(null)} className="text-[10px] text-red-500 font-bold hover:underline">이미지 삭제</button>}
                   </div>
                </div>

                {/* Right Side: Prompt Input */}
                <div className="flex-1 p-8 bg-white dark:bg-slate-900 overflow-y-auto">
                   <div className="h-full flex flex-col">
                      <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">검증할 요구사항 또는 기능 설명</label>
                      <textarea 
                        className="flex-1 w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-slate-200 leading-relaxed min-h-[300px]" 
                        placeholder="예: 장바구니에 상품을 담고 결제 페이지로 이동하여 포인트 할인을 적용한 뒤, 최종 결제 버튼이 활성화되는지 확인하고 싶어." 
                        value={prompt} 
                        onChange={e => setPrompt(e.target.value)} 
                        disabled={isGenerating}
                      />
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Info size={14} />
                          <span className="text-[10px] font-medium">AI는 사전 조건과 테스트 데이터도 함께 생성합니다.</span>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => setShowPromptModal(false)} disabled={isGenerating} className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600">취소</button>
                           <button 
                             onClick={handleGenerateCases} 
                             disabled={isGenerating || !prompt.trim()} 
                             className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/30 disabled:opacity-50 flex items-center gap-3 transition-all active:scale-95"
                           >
                             {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                             {isGenerating ? 'AI 아키텍트가 분석 중...' : '생성 시작'}
                           </button>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              {/* Advanced Loading State Overlay */}
              {isGenerating && (
                <div className="absolute inset-0 z-10 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center p-8 text-center animate-fade-in">
                   <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl max-w-sm w-full border border-indigo-200">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center"><Bot className="text-indigo-600" /></div>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">시나리오 설계 중</h4>
                      <p className="text-sm text-indigo-600 font-bold mb-6 animate-pulse">{genStatus}</p>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full animate-progress-indeterminate"></div>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Manual Modals and configurations remain similar to before but with updated TestCaseCard */}
      {showRunConfigModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border-4 border-[#FFCA28]">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#5D4037] text-white">
               <div>
                 <h3 className="text-2xl font-black text-[#FFECB3] flex items-center gap-2"><Play className="fill-current" /> 실행 설정</h3>
               </div>
               <button onClick={() => setShowRunConfigModal(false)} className="text-[#D7CCC8] hover:text-white p-2 transition-colors"><X size={28}/></button>
            </div>
            {/* ... contents as before */}
            <div className="p-8 border-t dark:border-slate-800 flex justify-end gap-4 bg-slate-50 dark:bg-slate-800/30">
               <button onClick={() => setShowRunConfigModal(false)} className="px-8 py-3 text-slate-500 font-black uppercase text-xs tracking-widest">취소</button>
               <button onClick={handleStartRun} className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl transition-all">실행 시작</button>
            </div>
          </div>
        </div>
      )}
      
      {/* 스타일 추가 */}
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0.2); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s infinite linear;
          transform-origin: left;
        }
      `}</style>
    </div>
  );
};

const TestCaseCard: React.FC<{ testCase: TestCase; index: number; readOnly?: boolean; onDelete?: () => void }> = ({ testCase, index, readOnly, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'STEPS' | 'DETAILS'>('STEPS');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all group hover:border-indigo-300 dark:hover:border-indigo-700">
      <div className="p-5 cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center justify-center min-w-[40px]">
            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">TC</span>
            <span className="text-xl font-black text-slate-400">{(index+1).toString().padStart(2, '0')}</span>
          </div>
          <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
          <div>
             <div className="flex items-center gap-2 mb-1">
               <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">{testCase.category || 'Functional'}</span>
               <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{testCase.title}</h4>
             </div>
             <p className="text-xs text-slate-500 line-clamp-1">{testCase.description || '상세 설명이 없습니다.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${testCase.priority === 'High' ? 'bg-red-50 text-red-600' : testCase.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{testCase.priority}</span>
           {!readOnly && <button onClick={e => {e.stopPropagation(); if(confirm('삭제하시겠습니까?')) onDelete?.();}} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>}
           {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800 animate-fade-in flex flex-col">
           {/* Tab Menu */}
           <div className="flex px-5 pt-3 border-b dark:border-slate-800 gap-6">
              <button 
                onClick={() => setActiveTab('STEPS')}
                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'STEPS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >테스트 단계 ({testCase.steps.length})</button>
              <button 
                onClick={() => setActiveTab('DETAILS')}
                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'DETAILS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >추가 정보 (Context)</button>
           </div>

           <div className="p-5">
              {activeTab === 'STEPS' ? (
                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                  <table className="w-full text-xs text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="p-4 w-12 text-center">NO</th><th className="p-4">USER ACTION</th><th className="p-4">EXPECTED RESULT</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {testCase.steps.map((s, i) => (
                           <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                             <td className="p-4 text-center font-black text-slate-300">{(i+1).toString().padStart(2, '0')}</td>
                             <td className="p-4 font-medium dark:text-slate-200">{s.action}</td>
                             <td className="p-4 text-slate-500 dark:text-slate-400">{s.expectedResult}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                         <Info size={14} className="text-indigo-500" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">사전 조건 (Preconditions)</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{testCase.preconditions || '사전 조건이 없습니다.'}</p>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                         <Database size={14} className="text-emerald-500" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">테스트 데이터 (Test Data)</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-mono">{testCase.testData || '테스트 데이터 정보가 없습니다.'}</p>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default SuiteManager;
