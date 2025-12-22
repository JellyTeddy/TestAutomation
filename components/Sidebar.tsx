
import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Layers, Trello, UserPlus, ChevronUp, User as UserIcon, X, Mail, FolderPlus, ChevronsRight, Bell, Key, ShieldAlert, Briefcase, UserCog, Users, FolderCog, Sun, Moon, LogOut, Plus, Check, Search, Hash } from 'lucide-react';
import { ViewState, User, TestSuite } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
  onRegisterUser: (name: string, email: string, avatar: string, jobRole: string) => void;
  suites: TestSuite[];
  activeSuiteId: string | null;
  onSelectSuite: (id: string) => void;
  onCreateProject: () => void;
  isGlobalAdmin: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AVATAR_OPTIONS = ['🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '👨‍💻', '👩‍💻', '👤', '🤖'];
const JOB_ROLES = ['QA Engineer', 'Software Engineer', 'Product Manager', 'Product Designer', 'DevOps Engineer', 'Data Scientist', 'Other'];

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, onNavigate, currentUser, users, onSelectUser, onRegisterUser,
  suites, activeSuiteId, onSelectSuite, onCreateProject, isGlobalAdmin,
  darkMode, toggleDarkMode
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProjectFlyout, setShowProjectFlyout] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('🐻');
  const [regRole, setRegRole] = useState('QA Engineer');
  const [regError, setRegError] = useState('');

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
      if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node)) {
        setShowProjectFlyout(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSuite = suites.find(s => s.id === activeSuiteId);

  const navItems = [
    { id: 'DASHBOARD' as ViewState, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'SUITES' as ViewState, icon: Layers, label: 'Test Cases' },
    { id: 'ISSUES' as ViewState, icon: Trello, label: 'Issue Board' },
    { id: 'NOTIFICATIONS' as ViewState, icon: Bell, label: 'Notifications' },
  ];

  const userItems = [{ id: 'MY_PAGE' as ViewState, icon: UserCog, label: 'My Page' }];
  const adminItems = isGlobalAdmin ? [
     { id: 'MANAGE_ACCOUNTS' as ViewState, icon: Users, label: 'Manage Accounts' },
     { id: 'MANAGE_PROJECTS' as ViewState, icon: FolderCog, label: 'Manage Projects' }
  ] : [];

  const handleRegister = () => {
    if (!regName.trim() || !regEmail.trim()) { setRegError('모든 필드를 입력해주세요.'); return; }
    onRegisterUser(regName.trim(), regEmail.trim(), regAvatar, regRole);
    setShowRegisterModal(false);
    setRegName(''); setRegEmail(''); setShowAccountMenu(false);
  };

  const filteredSuites = suites.filter(s => 
    s.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen z-50 relative font-sans">
      {/* Main Sidebar Container */}
      <div className="w-20 md:w-64 bg-[#5D4037] text-[#FFF8E1] flex flex-col h-screen shadow-2xl relative transition-all duration-300">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="p-4 z-10 space-y-4">
          <div className="flex items-center gap-3 bg-[#4E342E]/40 p-2 rounded-2xl border border-[#795548]/30">
            <div className="w-10 h-10 bg-[#FFCA28] rounded-xl flex items-center justify-center text-2xl shadow-lg border-2 border-[#FFF8E1]">🧸</div>
            <h1 className="text-lg font-bold hidden md:block">AutoTest AI</h1>
          </div>

          {/* Project Switcher Button - Now Triggers Flyout */}
          <div className="hidden md:block">
             <button 
              onClick={() => setShowProjectFlyout(!showProjectFlyout)} 
              className={`w-full p-2.5 rounded-2xl flex items-center justify-between transition-all border-4 shadow-[0_4px_0_0_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 ${showProjectFlyout ? 'bg-[#FFD54F] border-[#FFCA28] text-[#4E342E]' : 'bg-[#FFF8E1] border-[#FFCA28] text-[#4E342E]'}`}
             >
               <div className="flex items-center gap-2 overflow-hidden text-left">
                 <span className="bg-[#5D4037] w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-[#FFECB3]">
                    {activeSuite ? activeSuite.name.charAt(0).toUpperCase() : '?'}
                 </span>
                 <span className="text-sm font-bold truncate w-32">{activeSuite?.name || 'Select Project'}</span>
               </div>
               <ChevronsRight size={16} className={`text-[#8D6E63] transition-transform duration-300 ${showProjectFlyout ? 'rotate-180' : ''}`} />
             </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto flex flex-col justify-between">
          <nav className="p-4 space-y-2 z-10">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => onNavigate(item.id)} disabled={!activeSuiteId && item.id !== 'DASHBOARD' && item.id !== 'NOTIFICATIONS'} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#FFECB3] text-[#4E342E] font-bold shadow-lg scale-[1.02]' : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40'}`}>
                <item.icon size={22} />
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
            <div className="my-4 border-t border-[#8D6E63]/30"></div>
            {userItems.map((item) => (
              <button key={item.id} onClick={() => onNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#FFECB3] text-[#4E342E] font-bold shadow-lg scale-[1.02]' : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40'}`}>
                <item.icon size={22} />
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
            {adminItems.map((item) => (
              <button key={item.id} onClick={() => onNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#FFECB3] text-[#4E342E] font-bold shadow-lg scale-[1.02]' : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40'}`}>
                <item.icon size={22} />
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 space-y-3 z-10 border-t border-[#8D6E63]/30" ref={accountMenuRef}>
          <button 
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[#D7CCC8] hover:bg-[#8D6E63]/40 hover:text-[#FFECB3]"
          >
            {darkMode ? <Sun size={22} /> : <Moon size={22} />}
            <span className="hidden md:block font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="w-full bg-[#3E2723]/60 p-3 rounded-2xl flex items-center gap-3 border border-[#795548]/50 shadow-inner group hover:bg-[#3E2723]/80 transition-all"
            >
               <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl bg-[#FFF8E1] rounded-full border-2 border-[#FFCA28] shadow-md group-hover:scale-110 transition-transform">{currentUser.avatar}</div>
               <div className="hidden md:block flex-1 overflow-hidden text-left">
                 <p className="text-sm font-bold truncate text-white">{currentUser.name}</p>
                 <p className="text-[10px] text-[#D7CCC8] truncate">{currentUser.jobRole || 'Tester'}</p>
               </div>
               <ChevronUp size={16} className={`text-[#D7CCC8] transition-transform duration-300 ${showAccountMenu ? 'rotate-180' : ''}`} />
            </button>

            {showAccountMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-full md:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#FFCA28] z-50 overflow-hidden text-slate-900 dark:text-slate-100 animate-fade-in-up origin-bottom">
                 <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Switch Account</h3>
                 </div>
                 <div className="max-h-64 overflow-y-auto">
                    {users.map(u => (
                      <button 
                        key={u.id} 
                        onClick={() => { onSelectUser(u); setShowAccountMenu(false); }}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${u.id === currentUser.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                         <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl border border-slate-200 dark:border-slate-600 shadow-sm">{u.avatar}</div>
                         <div className="flex-1 text-left">
                            <p className="text-sm font-bold dark:text-white flex items-center gap-2">
                              {u.name}
                              {u.id === currentUser.id && <Check size={14} className="text-blue-500" />}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.jobRole || 'Member'}</p>
                         </div>
                      </button>
                    ))}
                 </div>
                 <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex flex-col gap-1">
                    <button 
                      onClick={() => { setShowRegisterModal(true); setShowAccountMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors font-bold text-sm"
                    >
                      <UserPlus size={18} /> Add Account
                    </button>
                    <button 
                      onClick={() => { onSelectUser(null as any); setShowAccountMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors font-bold text-sm"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT FLYOUT PROJECT MENU */}
      {showProjectFlyout && (
        <div ref={flyoutRef} className="absolute left-[80px] md:left-[256px] top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 animate-slide-in-right border-r dark:border-slate-800 flex flex-col">
          <div className="p-6 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#5D4037] dark:text-[#FFECB3]">Projects</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select to switch context</p>
            </div>
            <button onClick={() => setShowProjectFlyout(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-300" size={16} />
              <input 
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FFCA28] transition-all" 
                placeholder="Find a project..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSuites.length === 0 ? (
              <div className="p-8 text-center text-slate-300">
                <FolderPlus size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold">No projects found</p>
              </div>
            ) : (
              filteredSuites.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => { onSelectSuite(s.id); setShowProjectFlyout(false); }}
                  className={`w-full group p-4 flex items-center gap-4 rounded-2xl transition-all ${s.id === activeSuiteId ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center text-xl font-black rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${s.id === activeSuiteId ? 'bg-indigo-600 text-white' : 'bg-[#FFF8E1] text-[#5D4037] border-2 border-[#FFCA28]'}`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className={`text-sm font-black truncate ${s.id === activeSuiteId ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{s.issuePrefix || 'ISS'}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-400">{s.cases.length} Cases</span>
                    </div>
                  </div>
                  {s.id === activeSuiteId && <Check size={18} className="text-indigo-600" />}
                </button>
              ))
            )}
          </div>

          {isGlobalAdmin && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
              <button 
                onClick={() => { setShowProjectFlyout(false); onCreateProject(); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#5D4037] text-[#FFECB3] rounded-xl font-black text-sm shadow-lg hover:bg-[#4E342E] active:scale-95 transition-all"
              >
                <Plus size={18} /> New Project
              </button>
            </div>
          )}
        </div>
      )}

      {/* Account Creation Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up border-4 border-[#FFCA28]">
            <div className="bg-[#5D4037] p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[#FFECB3]">계정 추가</h3>
                <p className="text-xs text-[#D7CCC8]">새로운 테스터 프로필을 생성합니다.</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">이름</label>
                  <input className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="성함 입력" value={regName} onChange={e => setRegName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">이메일</label>
                  <input className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" placeholder="email@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">역할</label>
                  <select className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white" value={regRole} onChange={e => setRegRole(e.target.value)}>
                    {JOB_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">아바타 선택</label>
                  <div className="flex flex-wrap gap-2.5">
                    {AVATAR_OPTIONS.slice(0, 10).map(avatar => (
                      <button 
                        key={avatar} 
                        onClick={() => setRegAvatar(avatar)}
                        className={`w-10 h-10 flex items-center justify-center text-xl rounded-full border-2 transition-all ${regAvatar === avatar ? 'border-blue-500 bg-blue-50 shadow-md scale-110' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {regError && <p className="text-xs text-red-500 font-medium text-center">{regError}</p>}
              <button 
                onClick={handleRegister} 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                계정 등록 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for the flyout animation */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
