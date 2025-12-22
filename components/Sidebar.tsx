
import React, { useState } from 'react';
import { LayoutDashboard, Layers, Trello, UserPlus, ChevronUp, User as UserIcon, X, Mail, FolderPlus, ChevronsUpDown, Bell, Key, ShieldAlert, Briefcase, UserCog, Users, FolderCog, Sun, Moon } from 'lucide-react';
import { ViewState, User, TestSuite } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (user: User) => void;
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
  currentView, onNavigate, currentUser, users, onSwitchUser, onRegisterUser,
  suites, activeSuiteId, onSelectSuite, onCreateProject, isGlobalAdmin,
  darkMode, toggleDarkMode
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('🐻');
  const [regRole, setRegRole] = useState('QA Engineer');
  const [regError, setRegError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

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
    if (!regName.trim() || !regEmail.trim()) { setRegError('Fields required'); return; }
    onRegisterUser(regName.trim(), regEmail.trim(), regAvatar, regRole);
    setShowRegisterModal(false);
    setRegName(''); setRegEmail(''); setShowUserMenu(false);
  };

  const handleUserClick = (user: User) => {
    if (user.email === 'administrator@autotest.ai' && currentUser.id !== user.id) {
      setPendingUser(user); setShowLoginModal(true); setShowUserMenu(false);
    } else {
      onSwitchUser(user); setShowUserMenu(false);
    }
  };

  const handleAdminLogin = () => {
    if (loginId === 'super' && loginPw === 'super1') {
      if (pendingUser) onSwitchUser(pendingUser);
      setShowLoginModal(false);
    } else { setLoginError('Invalid credentials'); }
  };

  return (
    <div className="w-20 md:w-64 bg-[#5D4037] text-[#FFF8E1] flex flex-col h-screen shadow-xl z-20 relative font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
      
      <div className="p-4 z-10 space-y-4">
        <div className="flex items-center gap-3 bg-[#4E342E]/40 p-2 rounded-2xl border border-[#795548]/30">
          <div className="w-10 h-10 bg-[#FFCA28] rounded-xl flex items-center justify-center text-2xl shadow-lg border-2 border-[#FFF8E1]">🧸</div>
          <h1 className="text-lg font-bold hidden md:block">AutoTest AI</h1>
        </div>

        <div className="relative hidden md:block">
           <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="w-full bg-[#FFF8E1] text-[#4E342E] p-2.5 rounded-2xl flex items-center justify-between border-4 border-[#FFCA28] shadow-[0_4px_0_0_rgba(0,0,0,0.2)]">
             <div className="flex items-center gap-2 overflow-hidden text-left">
               <span className="bg-[#5D4037] w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-[#FFECB3]">
                  {activeSuite ? activeSuite.name.charAt(0).toUpperCase() : '?'}
               </span>
               <span className="text-sm font-bold truncate w-32">{activeSuite?.name || 'Select Project'}</span>
             </div>
             <ChevronsUpDown size={16} className="text-[#8D6E63]" />
           </button>
           {showProjectMenu && (
             <div className="absolute left-full top-0 ml-4 w-72 bg-white rounded-2xl shadow-2xl border-4 border-[#FFCA28] z-50 overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                   {suites.map(s => (
                     <button key={s.id} onClick={() => { onSelectSuite(s.id); setShowProjectMenu(false); }} className={`w-full p-3 hover:bg-[#FFF3E0] text-left border-b border-[#FFF3E0] ${s.id === activeSuiteId ? 'bg-[#FFECB3] font-bold' : ''}`}>
                       <span className="text-sm">{s.name}</span>
                     </button>
                   ))}
                </div>
                {isGlobalAdmin && (
                   <button onClick={() => { setShowProjectMenu(false); onCreateProject(); }} className="w-full p-3 bg-[#FFF8E1] text-[#5D4037] font-bold text-sm flex items-center gap-2"><FolderPlus size={16}/> Create Project</button>
                )}
             </div>
           )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto flex flex-col justify-between">
        <nav className="p-4 space-y-2 z-10">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.id)} disabled={!activeSuiteId && item.id !== 'DASHBOARD' && item.id !== 'NOTIFICATIONS'} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#FFECB3] text-[#4E342E] font-bold' : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40'}`}>
              <item.icon size={22} />
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}
          <div className="my-4 border-t border-[#8D6E63]/30"></div>
          {userItems.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#FFECB3] text-[#4E342E] font-bold' : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40'}`}>
              <item.icon size={22} />
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}
          {adminItems.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === item.id ? 'bg-[#FFECB3] text-[#4E342E] font-bold' : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40'}`}>
              <item.icon size={22} />
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 space-y-3 z-10">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-[#D7CCC8] hover:bg-[#8D6E63]/40 hover:text-[#FFECB3]"
        >
          {darkMode ? <Sun size={22} /> : <Moon size={22} />}
          <span className="hidden md:block font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-full bg-[#3E2723]/40 p-3 rounded-2xl flex items-center gap-3 border border-[#795548]/50 shadow-sm relative">
           <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl bg-[#FFF8E1] rounded-full border-2 border-[#8D6E63]">{currentUser.avatar}</div>
           <div className="hidden md:block flex-1 overflow-hidden text-left">
             <p className="text-sm font-bold truncate">{currentUser.name}</p>
             <p className="text-[10px] text-[#D7CCC8] truncate">{currentUser.email}</p>
           </div>
           <ChevronUp size={16} className={`transition-transform hidden md:block ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#4E342E] rounded-2xl shadow-2xl border border-[#795548] z-50 overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {users.map(user => (
                <button key={user.id} onClick={() => handleUserClick(user)} className="w-full flex items-center gap-3 p-3 hover:bg-[#5D4037] border-b border-[#5D4037] last:border-0">
                  <span className="text-lg bg-[#FFF8E1] w-8 h-8 flex items-center justify-center rounded-full">{user.avatar}</span>
                  <div className="text-left overflow-hidden">
                     <p className="text-sm text-[#D7CCC8] truncate">{user.name}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => { setShowUserMenu(false); setShowRegisterModal(true); }} className="w-full p-3 text-sm text-[#FFCA28] font-bold flex items-center gap-2 hover:bg-[#5D4037]"><UserPlus size={16}/> Register Profile</button>
          </div>
        )}
      </div>

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border-4 border-[#5D4037]">
            <div className="bg-[#5D4037] p-6 text-white flex justify-between">
              <h3 className="text-lg font-bold text-[#FFECB3]">Create Account</h3>
              <button onClick={() => setShowRegisterModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <input className="w-full border rounded-xl p-2.5 text-sm text-[#4E342E]" placeholder="Name" value={regName} onChange={e => setRegName(e.target.value)} />
              <input className="w-full border rounded-xl p-2.5 text-sm text-[#4E342E]" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              <button onClick={handleRegister} className="w-full py-3 bg-[#5D4037] text-[#FFECB3] rounded-xl font-bold">Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
