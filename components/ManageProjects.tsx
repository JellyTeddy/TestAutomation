
import React, { useState } from 'react';
import { TestSuite, User } from '../types';
import { FolderCog, Trash2, Edit, AlertTriangle, FolderPlus, Layers, FileText } from 'lucide-react';

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
  
  // Local edit states
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
    
    // Find original to preserve other fields
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
                <th className="p-4">Stats</th>
                <th className="p-4">Admin(s)</th>
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
                  
                  // Identify project admins
                  const adminIds = Object.entries(suite.permissions || {})
                    .filter(([_, role]) => role === 'ADMIN')
                    .map(([uid]) => uid);
                  const adminNames = adminIds.map(id => users.find(u => u.id === id)?.name || 'Unknown').join(', ');

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
                         <div className="flex flex-col gap-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Layers size={12}/> {suite.cases.length} Cases</span>
                            <span className="flex items-center gap-1"><FileText size={12}/> {suite.nextIssueNumber ? suite.nextIssueNumber - 1 : 0} Issues</span>
                         </div>
                      </td>

                      <td className="p-4 align-top">
                         <p className="text-xs text-slate-600 max-w-[150px] truncate" title={adminNames || "None"}>
                            {adminNames || <span className="text-slate-400 italic">Global Admin Only</span>}
                         </p>
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
