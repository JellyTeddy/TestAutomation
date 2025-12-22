
import React, { useState } from 'react';
import { TestSuite, User, Sprint } from '../types';
import { FolderCog, Trash2, Edit, AlertTriangle, FolderPlus, Layers, FileText, CalendarDays, X, Plus, History, Clock, Repeat } from 'lucide-react';

interface ManageProjectsProps {
  suites: TestSuite[];
  onDeleteSuite: (suiteId: string) => void;
  onUpdateSuite: (suite: TestSuite) => void;
  onCreateProject: () => void;
  users: User[];
}

const ManageProjects: React.FC<ManageProjectsProps> = ({ suites, onDeleteSuite, onUpdateSuite, onCreateProject, users }) => {
  const [suiteToDelete, setSuiteToDelete] = useState<TestSuite | null>(null);
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  
  // Sprint Management State
  const [sprintTargetSuite, setSprintTargetSuite] = useState<TestSuite | null>(null);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [repeatCount, setRepeatCount] = useState(1);
  const [activeDurationPreset, setActiveDurationPreset] = useState<number | null>(2); // Default to 2 weeks

  // Local edit states for project info
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrefix, setEditPrefix] = useState('');

  const startEdit = (suite: TestSuite) => {
    setEditingSuiteId(suite.id);
    setEditName(suite.name);
    setEditDesc(suite.description);
    setEditPrefix(suite.issuePrefix || '');
  };

  const saveEdit = () => {
    if (!editingSuiteId) return;
    const original = suites.find(s => s.id === editingSuiteId);
    if (original) {
      const updated: TestSuite = {
        ...original,
        name: editName,
        description: editDesc,
        issuePrefix: editPrefix || original.issuePrefix
      };
      onUpdateSuite(updated);
    }
    setEditingSuiteId(null);
  };

  const cancelEdit = () => {
    setEditingSuiteId(null);
  };

  const confirmDelete = () => {
    if (suiteToDelete) {
      onDeleteSuite(suiteToDelete.id);
      setSuiteToDelete(null);
    }
  };

  // --- Sprint Logic for Admin ---
  const openSprintManager = (suite: TestSuite) => {
    setSprintTargetSuite(suite);
    const nextNum = (suite.sprints?.length || 0) + 1;
    setNewSprintName(`Sprint ${nextNum}`);
    
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);
    
    setNewSprintStart(today.toISOString().split('T')[0]);
    setNewSprintEnd(twoWeeks.toISOString().split('T')[0]);
    setRepeatCount(1);
    setActiveDurationPreset(2);
  };

  const setSprintPreset = (weeks: number) => {
    const start = new Date(newSprintStart || new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + (weeks * 7));
    setNewSprintEnd(end.toISOString().split('T')[0]);
    setActiveDurationPreset(weeks);
  };

  const handleAddSprint = () => {
    if (!sprintTargetSuite || !newSprintName.trim() || !newSprintStart || !newSprintEnd) return;
    
    const generatedSprints: Sprint[] = [];
    const startDateObj = new Date(newSprintStart);
    const endDateObj = new Date(newSprintEnd);
    const durationMs = endDateObj.getTime() - startDateObj.getTime();
    
    const baseNumMatch = newSprintName.match(/(\d+)$/);
    const baseName = baseNumMatch ? newSprintName.replace(/\d+$/, '').trim() : newSprintName;
    let startNum = baseNumMatch ? parseInt(baseNumMatch[1]) : (sprintTargetSuite.sprints?.length || 0) + 1;

    let currentStart = new Date(startDateObj);
    let currentEnd = new Date(endDateObj);

    for (let i = 0; i < repeatCount; i++) {
      generatedSprints.push({
        id: crypto.randomUUID(),
        name: `${baseName} ${startNum + i}`.trim(),
        startDate: currentStart.toISOString(),
        endDate: currentEnd.toISOString()
      });

      // Advance dates for next iteration (Start = End + 1 day)
      const nextStart = new Date(currentEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart.getTime() + durationMs);
      
      currentStart = nextStart;
      currentEnd = nextEnd;
    }
    
    const updatedSuite = {
      ...sprintTargetSuite,
      sprints: [...(sprintTargetSuite.sprints || []), ...generatedSprints]
    };
    
    onUpdateSuite(updatedSuite);
    setSprintTargetSuite(updatedSuite); 
    setNewSprintName(`${baseName} ${startNum + repeatCount}`);
    setRepeatCount(1);
  };

  const handleDeleteSprint = (sprintId: string) => {
    if (!sprintTargetSuite) return;
    const updatedSuite = {
      ...sprintTargetSuite,
      sprints: sprintTargetSuite.sprints?.filter(s => s.id !== sprintId)
    };
    onUpdateSuite(updatedSuite);
    setSprintTargetSuite(updatedSuite);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
             <FolderCog className="text-indigo-600" /> Manage Projects
           </h1>
           <p className="text-slate-500 mt-2">Create, edit, and delete projects across the platform.</p>
        </div>
        <button 
          onClick={onCreateProject}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <FolderPlus size={18} /> New Project
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-1/4">Project Name</th>
                <th className="p-4 w-1/4">Description</th>
                <th className="p-4">Prefix</th>
                <th className="p-4">Sprints</th>
                <th className="p-4">Stats</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suites.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-8 text-center text-slate-400">
                      No projects found. Create one to get started.
                   </td>
                </tr>
              ) : (
                suites.map(suite => {
                  const isEditing = editingSuiteId === suite.id;
                  const sprintCount = suite.sprints?.length || 0;

                  return (
                    <tr key={suite.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 align-top">
                        {isEditing ? (
                          <input 
                            className="w-full border border-slate-300 rounded p-1.5 text-sm mb-1"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Project Name"
                          />
                        ) : (
                          <p className="font-bold text-slate-800">{suite.name}</p>
                        )}
                        <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {suite.id.slice(0,6)}</p>
                      </td>
                      
                      <td className="p-4 align-top">
                        {isEditing ? (
                           <textarea 
                             className="w-full border border-slate-300 rounded p-1.5 text-sm resize-none"
                             rows={2}
                             value={editDesc}
                             onChange={(e) => setEditDesc(e.target.value)}
                             placeholder="Description"
                           />
                        ) : (
                           <p className="text-sm text-slate-600 line-clamp-2">{suite.description}</p>
                        )}
                      </td>

                      <td className="p-4 align-top">
                         {isEditing ? (
                           <input 
                             className="w-20 border border-slate-300 rounded p-1.5 text-sm uppercase"
                             value={editPrefix}
                             onChange={(e) => setEditPrefix(e.target.value)}
                             placeholder="PRE"
                             maxLength={6}
                           />
                         ) : (
                           <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-mono font-bold">
                             {suite.issuePrefix || 'N/A'}
                           </span>
                         )}
                      </td>

                      <td className="p-4 align-top">
                         <button 
                           onClick={() => openSprintManager(suite)}
                           className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                         >
                           <CalendarDays size={14} />
                           {sprintCount} Sprints
                         </button>
                      </td>

                      <td className="p-4 align-top">
                         <div className="flex flex-col gap-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Layers size={12}/> {suite.cases.length} Cases</span>
                            <span className="flex items-center gap-1"><FileText size={12}/> {suite.nextIssueNumber ? suite.nextIssueNumber - 1 : 0} Issues</span>
                         </div>
                      </td>

                      <td className="p-4 text-right align-top whitespace-nowrap">
                         {isEditing ? (
                            <div className="flex justify-end gap-2">
                               <button onClick={saveEdit} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-bold hover:bg-green-200">Save</button>
                               <button onClick={cancelEdit} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-bold hover:bg-slate-200">Cancel</button>
                            </div>
                         ) : (
                            <div className="flex justify-end gap-2">
                               <button 
                                 onClick={() => openSprintManager(suite)}
                                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                 title="Manage Sprints"
                               >
                                 <CalendarDays size={18} />
                               </button>
                               <button 
                                 onClick={() => startEdit(suite)}
                                 className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                 title="Edit Project"
                               >
                                 <Edit size={18} />
                               </button>
                               <button 
                                 onClick={() => setSuiteToDelete(suite)}
                                 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                 title="Delete Project"
                               >
                                 <Trash2 size={18} />
                               </button>
                            </div>
                         )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Sprint Management Modal */}
      {sprintTargetSuite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                       <CalendarDays className="text-blue-600" /> {sprintTargetSuite.name} - 스프린트 관리
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">프로젝트의 개발 및 테스트 주기(Sprint)를 설정합니다.</p>
                 </div>
                 <button onClick={() => setSprintTargetSuite(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
                    <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                 {/* Left: New Sprint Form */}
                 <div className="flex-1 space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                       <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Plus size={16} className="text-blue-600" /> 새 스프린트 등록
                       </h4>
                       <div className="space-y-4">
                          <div>
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">스프린트 명칭</label>
                             <input 
                                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newSprintName}
                                onChange={e => setNewSprintName(e.target.value)}
                                placeholder="예: Sprint 1, 1차 고도화 등"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">시작일</label>
                                <input 
                                   type="date"
                                   className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                   value={newSprintStart}
                                   onChange={e => setNewSprintStart(e.target.value)}
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">종료일</label>
                                <input 
                                   type="date"
                                   className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                   value={newSprintEnd}
                                   onChange={e => setNewSprintEnd(e.target.value)}
                                />
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4">
                             <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                   <Repeat size={10} /> 반복 횟수 (n회 등록)
                                </label>
                                <input 
                                   type="number"
                                   min="1"
                                   max="24"
                                   className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                   value={repeatCount}
                                   onChange={e => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                             </div>
                             <div className="flex-1 pt-4">
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-bold text-slate-400 mr-1">기간:</span>
                                   {[1, 2, 4].map(w => (
                                      <button 
                                         key={w}
                                         onClick={() => setSprintPreset(w)}
                                         className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors border ${activeDurationPreset === w ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
                                      >
                                         {w}주
                                      </button>
                                   ))}
                                </div>
                             </div>
                          </div>

                          <button 
                             onClick={handleAddSprint}
                             className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                          >
                             <Plus size={18} /> 
                             {repeatCount > 1 ? `스프린트 ${repeatCount}개 연속 추가` : '스프린트 추가'}
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* Right: Sprint List */}
                 <div className="flex-1 space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-1">
                       <History size={16} className="text-slate-400" /> 등록된 스프린트 목록 ({sprintTargetSuite.sprints?.length || 0})
                    </h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {(!sprintTargetSuite.sprints || sprintTargetSuite.sprints.length === 0) ? (
                          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <Clock size={32} className="mx-auto mb-2 text-slate-300 opacity-50" />
                             <p className="text-sm text-slate-400">등록된 스프린트가 없습니다.</p>
                          </div>
                       ) : (
                          [...sprintTargetSuite.sprints].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(s => (
                             <div key={s.id} className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                   <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                      <CalendarDays size={18} />
                                   </div>
                                   <div className="overflow-hidden">
                                      <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                                      <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap overflow-hidden">
                                         {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}
                                      </p>
                                   </div>
                                </div>
                                <button 
                                   onClick={() => handleDeleteSprint(s.id)}
                                   className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                >
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                 <button 
                   onClick={() => setSprintTargetSuite(null)}
                   className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 shadow-md"
                 >
                   닫기
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {suiteToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
             <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Project?</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Are you sure you want to delete <b>{suiteToDelete.name}</b>?<br/>
                  <span className="font-bold text-red-600">Warning:</span> All test cases, runs, and issues associated with this project will be permanently deleted.
                </p>
                
                <div className="flex gap-3">
                   <button 
                     onClick={() => setSuiteToDelete(null)}
                     className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={confirmDelete}
                     className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                   >
                     Delete Project
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProjects;
