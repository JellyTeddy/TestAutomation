
import React, { useState } from 'react';
import { User } from '../types';
import { Trash2, ShieldAlert, Mail, Briefcase, User as UserIcon, AlertTriangle, X } from 'lucide-react';

interface ManageAccountsProps {
  users: User[];
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

const ManageAccounts: React.FC<ManageAccountsProps> = ({ users, onDeleteUser, currentUser }) => {
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <ShieldAlert className="text-red-600" /> Manage Accounts
        </h1>
        <p className="text-slate-500 mt-2">Administrative control panel for user accounts.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Email</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => {
                const isMe = user.id === currentUser.id;
                const isAdmin = user.email === 'administrator@autotest.ai';

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-sm">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-400">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                             <ShieldAlert size={12} /> Super Admin
                           </span>
                        ) : (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                             <Briefcase size={12} /> {user.jobRole || 'Member'}
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {!isMe && !isAdmin && (
                        <button 
                          onClick={() => setUserToDelete(user)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      {(isMe || isAdmin) && !isMe && (
                          <span className="text-xs text-slate-300 italic px-2">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
             <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Account?</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Are you sure you want to remove <b>{userToDelete.name}</b>?<br/>
                  This action cannot be undone and they will lose access immediately.
                </p>
                
                <div className="flex gap-3">
                   <button 
                     onClick={() => setUserToDelete(null)}
                     className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleDeleteConfirm}
                     className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
                   >
                     Delete
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAccounts;
