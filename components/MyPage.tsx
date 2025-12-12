
import React, { useState } from 'react';
import { User } from '../types';
import { Save, User as UserIcon, Briefcase, Mail } from 'lucide-react';

const AVATAR_OPTIONS = ['🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '👨‍💻', '👩‍💻', '👤', '🤖'];

interface MyPageProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
}

const MyPage: React.FC<MyPageProps> = ({ currentUser, onUpdateUser }) => {
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.jobRole || 'QA Engineer');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    const updatedUser = {
      ...currentUser,
      name,
      jobRole: role,
      avatar
    };
    onUpdateUser(updatedUser);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          My Page <span className="text-2xl">{avatar}</span>
        </h1>
        <p className="text-slate-500 mt-2">Manage your personal account settings and profile.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <UserIcon size={18} /> Profile Information
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
              <input 
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Job Role</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase size={16} className="text-slate-400" />
                </div>
                <input 
                  className="w-full border border-slate-300 rounded-lg pl-10 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-slate-400" />
                </div>
                <input 
                  className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg pl-10 p-3 text-sm cursor-not-allowed"
                  value={currentUser.email}
                  readOnly
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Choose Avatar</label>
            <div className="flex flex-wrap gap-3">
              {AVATAR_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAvatar(opt)}
                  className={`w-12 h-12 flex items-center justify-center text-2xl rounded-full transition-all ${
                    avatar === opt 
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-md scale-110' 
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {isSaved ? 'Saved!' : 'Save Changes'}
            {!isSaved && <Save size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
