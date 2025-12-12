
import React, { useState } from 'react';
import { LayoutDashboard, Layers, Trello, UserPlus, ChevronUp, User as UserIcon, X, Mail, FolderPlus, ChevronsUpDown, Bell, Key, ShieldAlert, Briefcase, UserCog, Users } from 'lucide-react';
import { ViewState, User, TestSuite } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (user: User) => void;
  onRegisterUser: (name: string, email: string, avatar: string, jobRole: string) => void;
  
  // New Props
  suites: TestSuite[];
  activeSuiteId: string | null;
  onSelectSuite: (id: string) => void;
  onCreateProject: () => void;
  isGlobalAdmin: boolean;
}

const AVATAR_OPTIONS = ['🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '👨‍💻', '👩‍💻', '👤', '🤖'];
const JOB_ROLES = [
  'QA Engineer', 
  'Software Engineer', 
  'Product Manager', 
  'Product Designer', 
  'DevOps Engineer', 
  'Data Scientist',
  'Other'
];

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onNavigate, 
  currentUser, 
  users, 
  onSwitchUser, 
  onRegisterUser,
  suites,
  activeSuiteId,
  onSelectSuite,
  onCreateProject,
  isGlobalAdmin
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  
  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('🐻');
  const [regRole, setRegRole] = useState('QA Engineer');
  const [regError, setRegError] = useState('');

  // Super Admin Login State
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

  const userItems = [
     { id: 'MY_PAGE' as ViewState, icon: UserCog, label: 'My Page' }
  ];

  const adminItems = isGlobalAdmin ? [
     { id: 'MANAGE_ACCOUNTS' as ViewState, icon: Users, label: 'Manage Accounts' }
  ] : [];

  const handleRegister = () => {
    setRegError('');
    if (!regName || !regEmail) {
      setRegError('Please fill in all fields');
      return;
    }

    // Duplicate Check
    if (users.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
       setRegError('This email is already registered.');
       return;
    }

    onRegisterUser(regName, regEmail, regAvatar, regRole);
    setShowRegisterModal(false);
    setRegName('');
    setRegEmail('');
    setRegAvatar('🐻');
    setRegRole('QA Engineer');
    setShowUserMenu(false);
  };

  const handleUserClick = (user: User) => {
    // Check if target user is Super Admin
    if (user.email === 'administrator@autotest.ai') {
      if (currentUser.id === user.id) {
         // Already logged in as super admin, just close menu
         setShowUserMenu(false);
         return;
      }
      setPendingUser(user);
      setLoginId('');
      setLoginPw('');
      setLoginError('');
      setShowLoginModal(true);
      setShowUserMenu(false);
    } else {
      onSwitchUser(user);
      setShowUserMenu(false);
    }
  };

  const handleAdminLogin = () => {
    if (loginId === 'super' && loginPw === 'super1') {
      if (pendingUser) {
        onSwitchUser(pendingUser);
      }
      setShowLoginModal(false);
      setPendingUser(null);
    } else {
      setLoginError('Invalid credentials');
    }
  };

  return (
    <div className="w-20 md:w-64 bg-[#5D4037] text-[#FFF8E1] flex flex-col h-screen transition-all duration-300 shadow-xl z-20 relative font-sans">
      
      {/* Teddy Bear Pattern Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Brand & Project Selector */}
      <div className="p-4 z-10 space-y-4">
        <div className="flex items-center gap-3 bg-[#4E342E]/40 p-2 rounded-2xl border border-[#795548]/30 backdrop-blur-sm">
          <div className="w-10 h-10 bg-[#FFCA28] rounded-xl flex items-center justify-center flex-shrink-0 text-2xl shadow-lg border-2 border-[#FFF8E1] transform hover:rotate-12 transition-transform cursor-default">
            🧸
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden md:block text-[#FFF8E1] drop-shadow-sm">AutoTest AI</h1>
        </div>

        {/* Project Dropdown - HIGH CONTRAST VERSION */}
        <div className="relative hidden md:block">
           <button 
             onClick={() => setShowProjectMenu(!showProjectMenu)}
             className="w-full bg-[#FFF8E1] hover:bg-white text-[#4E342E] p-2.5 rounded-2xl flex items-center justify-between transition-all border-4 border-[#FFCA28] shadow-[0_4px_0_0_rgba(0,0,0,0.2)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.2)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] group"
           >
             <div className="flex items-center gap-2 overflow-hidden">
               <span className="bg-[#5D4037] w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-[#FFECB3] shadow-sm">
                  {activeSuite ? activeSuite.name.charAt(0).toUpperCase() : '?'}
               </span>
               <div className="flex flex-col items-start overflow-hidden">
                 <span className="text-[10px] text-[#8D6E63] uppercase font-bold tracking-wider">Project</span>
                 <span className="text-sm font-bold truncate w-32 text-left text-[#3E2723]">
                   {activeSuite ? activeSuite.name : 'Select Project'}
                 </span>
               </div>
             </div>
             <ChevronsUpDown size={16} className="text-[#8D6E63] group-hover:text-[#5D4037]" />
           </button>

           {showProjectMenu && (
             <div className="absolute left-full top-0 ml-4 w-72 bg-white rounded-2xl shadow-2xl border-4 border-[#FFCA28] overflow-hidden z-50 animate-fade-in-up">
                <div className="max-h-80 overflow-y-auto custom-scrollbar bg-white">
                   {suites.length === 0 && (
                     <div className="p-3 text-xs text-[#8D6E63] text-center">No projects available</div>
                   )}
                   {suites.map(s => (
                     <button 
                       key={s.id}
                       onClick={() => {
                         onSelectSuite(s.id);
                         setShowProjectMenu(false);
                       }}
                       className={`w-full flex items-center gap-3 p-3 hover:bg-[#FFF3E0] transition-colors text-left border-b border-[#FFF3E0] last:border-0 ${s.id === activeSuiteId ? 'bg-[#FFECB3] text-[#3E2723] font-bold' : 'text-[#5D4037]'}`}
                     >
                       <span className="w-2.5 h-2.5 rounded-full bg-[#FFCA28] shadow-sm opacity-0 transition-opacity" style={{opacity: s.id === activeSuiteId ? 1 : 0}} />
                       <span className="text-sm truncate">{s.name}</span>
                     </button>
                   ))}
                </div>
                {isGlobalAdmin && (
                   <div className="p-2 border-t-2 border-[#FFECB3] bg-[#FFF8E1]">
                      <button 
                        onClick={() => {
                          setShowProjectMenu(false);
                          onCreateProject();
                        }}
                        className="w-full flex items-center gap-2 p-2 text-sm text-[#5D4037] hover:text-[#3E2723] hover:bg-[#FFE082] rounded-xl transition-colors font-bold"
                      >
                        <FolderPlus size={16} /> Create Project
                      </button>
                   </div>
                )}
             </div>
           )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <nav className="p-4 space-y-3 z-10">
          <p className="px-4 text-[10px] font-bold text-[#A1887F] uppercase tracking-wider mb-2 mt-2">Projects & Work</p>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                disabled={!activeSuiteId && item.id !== 'DASHBOARD' && item.id !== 'NOTIFICATIONS'} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#FFECB3] text-[#4E342E] shadow-lg transform scale-105 font-bold' 
                    : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                }`}
              >
                <item.icon size={22} className={isActive ? "text-[#5D4037]" : "text-[#D7CCC8] group-hover:text-[#FFECB3] transition-colors"} />
                <span className="hidden md:block">{item.label}</span>
                {isActive && <div className="ml-auto text-lg animate-bounce">🧸</div>}
              </button>
            );
          })}
          
          <div className="my-4 border-t border-[#8D6E63]/30"></div>
          
          <p className="px-4 text-[10px] font-bold text-[#A1887F] uppercase tracking-wider mb-2">Account</p>
          {userItems.map((item) => {
            const isActive = currentView === item.id;
             return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#FFECB3] text-[#4E342E] shadow-lg transform scale-105 font-bold' 
                    : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                }`}
              >
                <item.icon size={22} className={isActive ? "text-[#5D4037]" : "text-[#D7CCC8] group-hover:text-[#FFECB3] transition-colors"} />
                <span className="hidden md:block">{item.label}</span>
              </button>
            );
          })}
          
          {adminItems.length > 0 && (
             <>
               <p className="px-4 text-[10px] font-bold text-[#A1887F] uppercase tracking-wider mb-2 mt-4">Administration</p>
               {adminItems.map((item) => {
                const isActive = currentView === item.id;
                 return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-[#FFECB3] text-[#4E342E] shadow-lg transform scale-105 font-bold' 
                        : 'text-[#D7CCC8] hover:bg-[#8D6E63]/40 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                    }`}
                  >
                    <item.icon size={22} className={isActive ? "text-[#5D4037]" : "text-[#D7CCC8] group-hover:text-[#FFECB3] transition-colors"} />
                    <span className="hidden md:block">{item.label}</span>
                  </button>
                );
              })}
             </>
          )}

        </nav>
      </div>

      <div className="p-4 relative z-10">
        <button 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full bg-[#3E2723]/40 hover:bg-[#3E2723]/60 rounded-2xl p-3 transition-colors flex items-center gap-3 text-left border border-[#795548]/50 shadow-sm group"
        >
           <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl bg-[#FFF8E1] rounded-full border-2 border-[#8D6E63] shadow-md group-hover:scale-110 transition-transform">
             {currentUser.avatar}
           </div>
           <div className="hidden md:block flex-1 overflow-hidden">
             <p className="text-sm font-bold text-[#FFF8E1] truncate">{currentUser.name}</p>
             <p className="text-[10px] text-[#D7CCC8] truncate">{currentUser.email}</p>
             {currentUser.jobRole && (
               <p className="text-[10px] text-[#FFECB3] truncate mt-0.5 flex items-center gap-1 font-medium">
                 <Briefcase size={10} /> {currentUser.jobRole}
               </p>
             )}
           </div>
           <ChevronUp size={16} className={`text-[#D7CCC8] transition-transform hidden md:block ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* User Menu Popover */}
        {showUserMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#4E342E] rounded-2xl shadow-2xl border border-[#795548] overflow-hidden animate-fade-in-up z-50">
            <div className="p-2 border-b border-[#5D4037]">
              <p className="text-xs font-bold text-[#D7CCC8] px-2 py-1 uppercase tracking-wider">Switch Account</p>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className={`w-full flex items-center gap-3 p-2 hover:bg-[#5D4037] transition-colors ${user.id === currentUser.id ? 'bg-[#5D4037]/50' : ''}`}
                >
                  <span className="text-lg bg-[#FFF8E1] w-8 h-8 flex items-center justify-center rounded-full shadow-sm">{user.avatar}</span>
                  <div className="text-left overflow-hidden">
                     <span className={`text-sm block truncate ${user.id === currentUser.id ? 'font-bold text-[#FFECB3]' : 'text-[#D7CCC8]'}`}>
                       {user.name}
                     </span>
                     {user.jobRole && <span className="text-[10px] text-[#A1887F] block truncate">{user.jobRole}</span>}
                  </div>
                  {user.id === currentUser.id && <div className="ml-auto text-sm">🍯</div>}
                  {user.email === 'administrator@autotest.ai' && <ShieldAlert size={14} className="text-[#FFCA28] ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-[#5D4037]">
               <button 
                 onClick={() => {
                    setShowUserMenu(false);
                    setShowRegisterModal(true);
                 }}
                 className="w-full flex items-center gap-2 p-2 text-sm text-[#FFCA28] hover:text-[#FFE082] hover:bg-[#5D4037] rounded-xl transition-colors font-medium"
               >
                 <UserPlus size={16} /> Register Account
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden animate-fade-in-up border-4 border-[#5D4037]">
              <div className="bg-[#5D4037] p-6 text-white text-center relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
                 <div className="w-14 h-14 bg-[#4E342E] rounded-full flex items-center justify-center mx-auto mb-3 text-[#FFCA28] border-2 border-[#8D6E63] relative z-10 shadow-lg">
                    <ShieldAlert size={28} />
                 </div>
                 <h3 className="text-lg font-bold relative z-10 text-[#FFECB3]">Admin Access</h3>
                 <p className="text-[#D7CCC8] text-xs mt-1 relative z-10">Verify credentials to continue</p>
              </div>
              
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-[#5D4037] uppercase mb-1">Admin ID</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon size={16} className="text-[#8D6E63]"/>
                      </div>
                      <input 
                        autoFocus
                        type="text"
                        className="w-full border border-[#D7CCC8] rounded-xl pl-10 p-2 text-sm focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-[#4E342E]"
                        placeholder="Enter ID"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-[#5D4037] uppercase mb-1">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key size={16} className="text-[#8D6E63]"/>
                      </div>
                      <input 
                        type="password"
                        className="w-full border border-[#D7CCC8] rounded-xl pl-10 p-2 text-sm focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-[#4E342E]"
                        placeholder="Enter Password"
                        value={loginPw}
                        onChange={(e) => setLoginPw(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      />
                    </div>
                 </div>

                 {loginError && (
                   <p className="text-red-500 text-xs text-center bg-red-50 py-1.5 rounded-lg font-medium">{loginError}</p>
                 )}

                 <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => setShowLoginModal(false)}
                      className="flex-1 py-2 text-[#5D4037] hover:bg-[#EFEBE9] rounded-xl text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAdminLogin}
                      className="flex-1 py-2 bg-[#5D4037] text-[#FFECB3] hover:bg-[#4E342E] rounded-xl text-sm font-bold shadow-md"
                    >
                      Login
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up border-4 border-[#5D4037]">
            <div className="bg-[#5D4037] p-6 text-white flex justify-between items-start relative overflow-hidden">
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#FFF 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
              <div className="relative z-10">
                <h3 className="text-lg font-bold text-[#FFECB3]">Create Account</h3>
                <p className="text-[#D7CCC8] text-xs mt-1">Join the testing team!</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-[#D7CCC8] hover:text-white transition-colors relative z-10">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon size={16} className="text-[#8D6E63]"/>
                    </div>
                    <input 
                      autoFocus
                      className="w-full border border-[#D7CCC8] rounded-xl pl-10 p-2 text-sm focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-[#4E342E]"
                      placeholder="e.g. Alice Smith"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-[#8D6E63]"/>
                    </div>
                    <input 
                      type="email"
                      className="w-full border border-[#D7CCC8] rounded-xl pl-10 p-2 text-sm focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-[#4E342E]"
                      placeholder="alice@company.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-[#5D4037] uppercase mb-1">Job Role</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase size={16} className="text-[#8D6E63]"/>
                    </div>
                    <select
                      className="w-full border border-[#D7CCC8] rounded-xl pl-10 p-2 text-sm focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-[#4E342E] bg-white appearance-none"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                    >
                      {JOB_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                       <ChevronUp size={14} className="text-[#8D6E63] rotate-180"/>
                    </div>
                  </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-[#5D4037] uppercase mb-2">Select Avatar</label>
                 <div className="flex flex-wrap gap-2">
                   {AVATAR_OPTIONS.map(char => (
                     <button
                       key={char}
                       onClick={() => setRegAvatar(char)}
                       className={`w-9 h-9 flex items-center justify-center text-lg rounded-full transition-all border-2 ${regAvatar === char ? 'bg-[#FFECB3] border-[#FFCA28] scale-110 shadow-sm' : 'bg-slate-50 border-[#EFEBE9] hover:bg-[#EFEBE9]'}`}
                     >
                       {char}
                     </button>
                   ))}
                 </div>
               </div>

               {regError && (
                 <p className="text-red-500 text-xs text-center bg-red-50 py-1.5 rounded-lg font-medium">{regError}</p>
               )}

               <button 
                 onClick={handleRegister}
                 className="w-full py-3 bg-[#5D4037] text-[#FFECB3] hover:bg-[#4E342E] rounded-xl text-sm font-bold shadow-md mt-2 transition-transform active:scale-95"
               >
                 Create Profile
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
