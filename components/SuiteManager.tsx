
import React, { useState, useRef } from 'react';
import { TestSuite, TestCase, User, Role } from '../types';
import { Plus, Trash2, Wand2, ChevronRight, FileText, Play, ChevronDown, ChevronUp, FileSpreadsheet, Upload, Link as LinkIcon, Layers, Monitor, Globe, Mail, HardDrive, Settings, X, Bot, Hand, Users, Shield, Lock, Eye, FolderOpen, File as FileIcon, XCircle, Download, PlusCircle, MinusCircle, Save, Key, CalendarDays, History, AlertCircle } from 'lucide-react';
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
  const [importMode, setImportMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [newCasePriority, setNewCasePriority] = useState<'Low'|'Medium'|'High'>('Medium');
  const [newCaseSteps, setNewCaseSteps] = useState<{id: string, action: string, expectedResult: string}[]>([{ id: crypto.randomUUID(), action: '', expectedResult: '' }]);

  const canWrite = currentUser.email === 'administrator@autotest.ai' || activeSuite.permissions?.[currentUser.id] === 'ADMIN' || activeSuite.permissions?.[currentUser.id] === 'MEMBER';

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

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in text-slate-900 dark:text-slate-100">
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-4">
           <div>
              <h2 className="text-xl font-bold dark:text-white">{activeSuite.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeSuite.description}</p>
           </div>
           <div className="flex items-center gap-2">
              {canWrite && (
                <>
                  <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold shadow-sm"><Plus size={16}/> Case</button>
                  <button onClick={() => { setImportMode(false); setShowPromptModal(true); }} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium"><Wand2 size={16}/> AI Generate</button>
                </>
              )}
              <button onClick={() => onRunSuite(activeSuite)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium shadow-sm"><Play size={16}/> Run</button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="space-y-4">
            {activeSuite.cases.length === 0 ? (
              <div className="text-center py-20 text-slate-400"><FileText size={48} className="mx-auto mb-4 opacity-20" /><p>No test cases yet.</p></div>
            ) : (
              activeSuite.cases.map((c, i) => <TestCaseCard key={c.id} testCase={c} index={i} readOnly={!canWrite} onDelete={() => handleDeleteCase(c.id)} />)
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="text-xl font-bold dark:text-white">직접 테스트 케이스 생성</h3>
                 <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                       <label className="block text-xs font-bold text-slate-400 uppercase">Title</label>
                       <input className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm" placeholder="Title..." value={newCaseTitle} onChange={e => setNewCaseTitle(e.target.value)} />
                       <label className="block text-xs font-bold text-slate-400 uppercase">Description</label>
                       <textarea className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm min-h-[80px]" value={newCaseDesc} onChange={e => setNewCaseDesc(e.target.value)} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Priority</label>
                       {(['Low', 'Medium', 'High'] as const).map(p => (
                         <button key={p} onClick={() => setNewCasePriority(p)} className={`w-full text-left p-3 mb-2 rounded-xl border-2 transition-all ${newCasePriority === p ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800'}`}>{p}</button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-3">
                    <h4 className="text-sm font-bold flex justify-between">Steps <button onClick={addStep} className="text-blue-500">+ Add</button></h4>
                    {newCaseSteps.map((s, idx) => (
                      <div key={s.id} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-400 mt-2">{idx+1}</span>
                        <input className="flex-1 bg-transparent border-none text-sm focus:ring-0" placeholder="Action" value={s.action} onChange={e => updateStep(s.id, 'action', e.target.value)} />
                        <input className="flex-1 bg-transparent border-none text-sm focus:ring-0" placeholder="Expected" value={s.expectedResult} onChange={e => updateStep(s.id, 'expectedResult', e.target.value)} />
                        <button onClick={() => removeStep(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="p-6 border-t dark:border-slate-800 flex justify-end gap-3">
                 <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                 <button onClick={handleManualCreate} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Save Case</button>
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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      <div className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-slate-400">#{index+1}</span>
          <div>
             <h4 className="font-bold text-slate-800 dark:text-slate-200">{testCase.title}</h4>
             <p className="text-xs text-slate-500 line-clamp-1">{testCase.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${testCase.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{testCase.priority}</span>
           {!readOnly && <button onClick={e => {e.stopPropagation(); if(confirm('Delete?')) onDelete?.();}} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
           {expanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
        </div>
      </div>
      {expanded && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t dark:border-slate-800">
           <table className="w-full text-xs text-left">
              <thead><tr className="text-slate-400 uppercase font-bold border-b dark:border-slate-800"><th className="p-2 w-8">#</th><th className="p-2">Action</th><th className="p-2">Expected</th></tr></thead>
              <tbody>{testCase.steps.map((s, i) => <tr key={s.id} className="border-b last:border-0 dark:border-slate-800 hover:bg-white/5"><td className="p-2 font-bold text-slate-400">{i+1}</td><td className="p-2 dark:text-slate-300">{s.action}</td><td className="p-2 text-slate-500">{s.expectedResult}</td></tr>)}</tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default SuiteManager;
