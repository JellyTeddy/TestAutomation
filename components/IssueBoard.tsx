
import React, { useState, useRef, useEffect } from 'react';
import { Issue, IssueStatus, IssuePriority, User, TestSuite, Comment, Attachment } from '../types';
import { Plus, Trash2, X, AlertTriangle, ChevronDown, Clock, CheckCircle2, Circle, Archive, ArchiveRestore, Send, Search, CalendarDays } from 'lucide-react';

interface IssueBoardProps {
  activeSuite: TestSuite;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  onNotify?: (message: string, recipientId: string) => void;
  onUpdateSuite: (suite: TestSuite) => void;
  users: User[];
  currentUser: User;
}

const COLUMNS: { id: IssueStatus; title: string; color: string, darkColor: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-slate-100', darkColor: 'dark:bg-slate-900/50' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50', darkColor: 'dark:bg-blue-900/20' },
  { id: 'DONE', title: 'Done', color: 'bg-green-50', darkColor: 'dark:bg-green-900/20' },
];

const IssueBoard: React.FC<IssueBoardProps> = ({ activeSuite, issues, setIssues, onNotify, onUpdateSuite, users, currentUser }) => {
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
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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

  const updateIssue = (updated: Issue) => setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
  const resetForm = () => { setNewTitle(''); setNewDesc(''); setNewPriority('Medium'); };

  return (
    <div className="h-full flex flex-col animate-fade-in text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">{showArchived ? 'Archived Issues' : 'Issue Board'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Project: <b>{activeSuite.name}</b></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
             <input className="pl-9 pr-4 py-2 border dark:border-slate-800 dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48 transition-all" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
          </div>
          <button onClick={() => setShowArchived(!showArchived)} className="p-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
             {showArchived ? <ArchiveRestore size={20}/> : <Archive size={20}/>}
          </button>
          {!showArchived && <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm"><Plus size={18}/> New</button>}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map(col => {
          const colIssues = visibleIssues.filter(i => i.status === col.id);
          return (
            <div key={col.id} className={`flex-1 min-w-[300px] rounded-xl flex flex-col ${col.color} ${col.darkColor} border dark:border-slate-800/50`}>
              <h3 className="p-4 font-bold dark:text-slate-300 flex justify-between">{col.title} <span className="opacity-50">{colIssues.length}</span></h3>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {colIssues.map(issue => (
                  <div key={issue.id} onClick={() => setSelectedIssue(issue)} className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border dark:border-slate-800 hover:shadow-md cursor-pointer group">
                    <span className="text-[10px] font-mono text-slate-400">{issue.key}</span>
                    <h4 className="font-medium text-sm mt-1 line-clamp-2 dark:text-slate-200">{issue.title}</h4>
                    <div className="mt-3 flex justify-between items-center">
                       <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${issue.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600'}`}>{issue.priority}</span>
                       <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">{users.find(u => u.name === issue.assignee)?.avatar || '👤'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold dark:text-white">Create Issue</h3><button onClick={() => setShowCreateModal(false)}><X size={20}/></button></div>
              <div className="space-y-4">
                 <input className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm dark:text-white" placeholder="Summary" value={newTitle} onChange={e => setNewTitle(e.target.value)}/>
                 <textarea className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm dark:text-white h-24" placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)}/>
                 <div className="grid grid-cols-2 gap-4">
                    <select className="border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm dark:text-white" value={newPriority} onChange={e => setNewPriority(e.target.value as IssuePriority)}>
                       {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select className="border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 text-sm dark:text-white" value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                       {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                 <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                 <button onClick={createIssue} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Create</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default IssueBoard;
