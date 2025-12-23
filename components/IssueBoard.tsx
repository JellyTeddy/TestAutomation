
import React, { useState, useRef, useEffect } from 'react';
import { Issue, IssueStatus, IssuePriority, User, TestSuite, Comment, Attachment } from '../types';
import { Plus, Trash2, X, AlertTriangle, ChevronDown, Clock, CheckCircle2, Circle, Archive, ArchiveRestore, Send, Search, CalendarDays, LayoutGrid, List, User as UserIcon, MoreHorizontal } from 'lucide-react';

interface IssueBoardProps {
  activeSuite: TestSuite;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  onNotify?: (message: string, recipientId: string) => void;
  onUpdateSuite: (suite: TestSuite) => void;
  users: User[];
  currentUser: User;
}

const COLUMNS: { id: IssueStatus; title: string; color: string, darkColor: string, textColor: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-slate-100', darkColor: 'dark:bg-slate-900/50', textColor: 'text-slate-600' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50', darkColor: 'dark:bg-blue-900/20', textColor: 'text-blue-600' },
  { id: 'DONE', title: 'Done', color: 'bg-green-50', darkColor: 'dark:bg-green-900/20', textColor: 'text-green-600' },
];

const IssueBoard: React.FC<IssueBoardProps> = ({ activeSuite, issues, setIssues, onNotify, onUpdateSuite, users, currentUser }) => {
  const [viewMode, setViewMode] = useState<'BOARD' | 'LIST'>('BOARD');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<IssuePriority>('Medium');
  const [newAssignee, setNewAssignee] = useState<string>(currentUser.name);

  const visibleIssues = issues.filter(i => {
    const isArchived = i.status === 'ARCHIVED';
    if (showArchived !== isArchived) return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase()) && !i.key.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return i.suiteId === activeSuite.id;
  });

  const createIssue = () => {
    if (!newTitle.trim()) return;
    const prefix = activeSuite.issuePrefix || 'ISS';
    const nextNumber = activeSuite.nextIssueNumber || 1;
    const newIssue: Issue = {
      id: crypto.randomUUID(), suiteId: activeSuite.id, key: `${prefix}-${String(nextNumber).padStart(4, '0')}`,
      title: newTitle, description: newDesc, status: 'TODO', priority: newPriority, assignee: newAssignee,
      createdAt: new Date().toISOString(), comments: []
    };
    setIssues([...issues, newIssue]);
    onUpdateSuite({ ...activeSuite, nextIssueNumber: nextNumber + 1 });
    setShowCreateModal(false); resetForm();
  };

  const updateIssueStatus = (issueId: string, newStatus: IssueStatus) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
  };

  const resetForm = () => { setNewTitle(''); setNewDesc(''); setNewPriority('Medium'); };

  const getPriorityColor = (p: IssuePriority) => {
    switch(p) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
      default: return 'text-slate-500 bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status: IssueStatus) => {
    return COLUMNS.find(c => c.id === status)?.title || status;
  };

  return (
    <div className="h-full flex flex-col animate-fade-in text-slate-900 dark:text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight dark:text-white flex items-center gap-3">
            {showArchived ? 'Archived Issues' : 'Issue Tracker'}
            <span className="text-sm font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg">{visibleIssues.length}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-1">
            <CalendarDays size={14} /> Project: <b className="text-slate-700 dark:text-slate-200">{activeSuite.name}</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-none">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
             <input 
              className="w-full md:w-64 pl-9 pr-4 py-2.5 border dark:border-slate-800 dark:bg-slate-900 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              placeholder="Search by key or title..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
             />
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
            <button 
              onClick={() => setViewMode('BOARD')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'BOARD' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Board View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={() => setShowArchived(!showArchived)} 
            className={`p-2.5 border dark:border-slate-800 rounded-xl transition-all ${showArchived ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            title={showArchived ? "View Active Issues" : "View Archived"}
          >
             {showArchived ? <ArchiveRestore size={20}/> : <Archive size={20}/>}
          </button>

          {!showArchived && (
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Plus size={18}/> New Issue
            </button>
          )}
        </div>
      </div>

      {viewMode === 'BOARD' ? (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {COLUMNS.map(col => {
            const colIssues = visibleIssues.filter(i => i.status === col.id);
            return (
              <div key={col.id} className={`flex-1 min-w-[320px] rounded-2xl flex flex-col ${col.color} ${col.darkColor} border dark:border-slate-800/50 shadow-sm`}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.id === 'TODO' ? 'bg-slate-400' : col.id === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <h3 className={`font-black text-xs uppercase tracking-widest ${col.textColor}`}>{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-black bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full text-slate-500">{colIssues.length}</span>
                </div>
                
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colIssues.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs font-bold">
                      No issues here
                    </div>
                  ) : (
                    colIssues.map(issue => (
                      <div 
                        key={issue.id} 
                        onClick={() => setSelectedIssue(issue)} 
                        className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-transparent dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md cursor-pointer group transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-slate-400 font-mono">{issue.key}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-tighter ${getPriorityColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm leading-tight dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2">{issue.title}</h4>
                        <div className="mt-4 pt-3 border-t dark:border-slate-800 flex justify-between items-center">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] shadow-inner">
                                {users.find(u => u.name === issue.assignee)?.avatar || '👤'}
                             </div>
                             <span className="text-[10px] font-bold text-slate-500">{issue.assignee || 'Unassigned'}</span>
                           </div>
                           <div className="flex items-center gap-1 text-slate-300">
                             <Clock size={12} />
                             <span className="text-[9px] font-bold">{new Date(issue.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4 w-28">Issue Key</th>
                  <th className="p-4">Title</th>
                  <th className="p-4 w-32">Status</th>
                  <th className="p-4 w-28 text-center">Priority</th>
                  <th className="p-4 w-36">Assignee</th>
                  <th className="p-4 w-32 text-right">Created</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {visibleIssues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center text-slate-400 font-bold italic">
                      No issues found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  visibleIssues.map(issue => (
                    <tr 
                      key={issue.id} 
                      onClick={() => setSelectedIssue(issue)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 text-[11px] font-black text-slate-400 font-mono">{issue.key}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-1">{issue.title}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${issue.status === 'TODO' ? 'bg-slate-300' : issue.status === 'IN_PROGRESS' ? 'bg-blue-500' : issue.status === 'DONE' ? 'bg-green-500' : 'bg-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{getStatusLabel(issue.status)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase inline-block w-20 ${getPriorityColor(issue.priority)}`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] shadow-inner">
                            {users.find(u => u.name === issue.assignee)?.avatar || '👤'}
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{issue.assignee || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-[10px] font-bold text-slate-400">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <MoreHorizontal size={14} className="text-slate-300" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ISSUE DETAIL MODAL - SAME AS BEFORE BUT WITH STATUS DROPDOWN */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up border dark:border-slate-800">
              <div className="p-6 border-b dark:border-slate-800 flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-widest">{selectedIssue.key}</span>
                    <h3 className="text-xl font-black dark:text-white leading-tight">{selectedIssue.title}</h3>
                 </div>
                 <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24}/></button>
              </div>
              
              <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <section className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">상세 설명</label>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedIssue.description || '상세 설명이 등록되지 않았습니다.'}</p>
                       </section>

                       <section className="space-y-4 pt-4 border-t dark:border-slate-800">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">상태 변경 (Status Update)</label>
                          <div className="grid grid-cols-3 gap-2">
                            {COLUMNS.map(col => (
                              <button 
                                key={col.id}
                                onClick={() => updateIssueStatus(selectedIssue.id, col.id)}
                                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${selectedIssue.status === col.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}
                              >
                                {col.title}
                              </button>
                            ))}
                          </div>
                       </section>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border dark:border-slate-800 h-fit space-y-5">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Priority</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-black border uppercase ${getPriorityColor(selectedIssue.priority)}`}>{selectedIssue.priority}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Assignee</span>
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-[10px]">{users.find(u => u.name === selectedIssue.assignee)?.avatar || '👤'}</div>
                             <span className="text-xs font-bold dark:text-slate-200">{selectedIssue.assignee || 'Unassigned'}</span>
                          </div>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Created At</span>
                          <span className="text-xs font-bold dark:text-slate-400">{new Date(selectedIssue.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                 <button onClick={() => setSelectedIssue(null)} className="px-8 py-2.5 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all">Close Details</button>
              </div>
           </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border-4 border-[#FFCA28]">
              <div className="bg-[#5D4037] p-6 text-white flex justify-between items-center">
                 <div>
                   <h3 className="text-xl font-black text-[#FFECB3]">새 이슈 등록</h3>
                   <p className="text-xs text-[#D7CCC8]">테스트 중 발견된 결함이나 개선 사항을 기록하세요.</p>
                 </div>
                 <button onClick={() => setShowCreateModal(false)}><X size={24}/></button>
              </div>
              
              <div className="p-6 space-y-5">
                 <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">제목</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all dark:text-white" 
                        placeholder="이슈를 간단히 요약해주세요" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">상세 설명</label>
                      <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-3 text-sm h-24 focus:border-blue-500 outline-none transition-all dark:text-white resize-none" 
                        placeholder="재현 경로 및 예상되는 동작을 설명해주세요" 
                        value={newDesc} 
                        onChange={e => setNewDesc(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">우선순위</label>
                        <select className="w-full bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none dark:text-white appearance-none" value={newPriority} onChange={e => setNewPriority(e.target.value as IssuePriority)}>
                           {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">담당자</label>
                        <select className="w-full bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none dark:text-white appearance-none" value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                           {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>
                 </div>
                 
                 <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-xs tracking-widest">취소</button>
                    <button 
                      onClick={createIssue} 
                      disabled={!newTitle.trim()}
                      className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      이슈 생성
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default IssueBoard;
