
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ShieldAlert, Key, X, ArrowRight, UserPlus, Mail, Briefcase, Smile, Lock, Loader2, Check } from 'lucide-react';

interface AccountSelectorProps {
  users: User[];
  onSelect: (user: User) => void;
  onRegister: (name: string, email: string, avatar: string, jobRole: string) => void;
  darkMode: boolean;
}

const AVATAR_OPTIONS = ['🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '👨‍💻', '👩‍💻', '👤', '🤖'];
const JOB_ROLES = ['QA Engineer', 'Software Engineer', 'Product Manager', 'Product Designer', 'DevOps Engineer', 'Data Scientist', 'Other'];

const AccountSelector: React.FC<AccountSelectorProps> = ({ users, onSelect, onRegister, darkMode }) => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Admin Login State
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [pendingAdmin, setPendingAdmin] = useState<User | null>(null);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAvatar, setRegAvatar] = useState('🐻');
  const [regRole, setRegRole] = useState('QA Engineer');
  const [regError, setRegError] = useState('');

  const handleProfileClick = (user: User) => {
    if (user.email === 'administrator@autotest.ai') {
      setPendingAdmin(user);
      setShowAdminLogin(true);
      setAdminError('');
      setAuthSuccess(false);
    } else {
      onSelect(user);
    }
  };

  const handleAdminAuth = () => {
    setAdminError('');
    setIsAuthenticating(true);

    // Simulate a brief delay for realism and to ensure state updates smoothly
    setTimeout(() => {
      if (loginId === 'super' && loginPw === 'super1') {
        const adminUser = pendingAdmin || users.find(u => u.email === 'administrator@autotest.ai');
        if (adminUser) {
          setAuthSuccess(true);
          setIsAuthenticating(false);
          // Small delay to show the success checkmark before transitioning
          setTimeout(() => {
            onSelect(adminUser);
          }, 800);
        } else {
          setAdminError('관리자 계정을 찾을 수 없습니다.');
          setIsAuthenticating(false);
        }
      } else {
        setAdminError('ID 또는 비밀번호가 올바르지 않습니다.');
        setIsAuthenticating(false);
      }
    }, 600);
  };

  const handleRegisterSubmit = () => {
    if (!regName.trim() || !regEmail.trim()) {
      setRegError('모든 필드를 입력해 주세요.');
      return;
    }
    onRegister(regName.trim(), regEmail.trim(), regAvatar, regRole);
    setShowRegisterModal(false);
  };

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center transition-colors duration-500 font-sans ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="z-10 text-center mb-12 animate-fade-in">
        <div className="w-20 h-20 bg-[#FFCA28] rounded-2xl flex items-center justify-center text-4xl shadow-xl border-4 border-white dark:border-slate-800 mx-auto mb-6">🧸</div>
        <h1 className="text-4xl font-black tracking-tight mb-3">AutoTest AI</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Who's testing today?</p>
      </div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl px-6">
        {users.map((user, idx) => (
          <div 
            key={user.id} 
            onClick={() => handleProfileClick(user)}
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`group cursor-pointer flex flex-col items-center p-6 rounded-3xl transition-all duration-300 animate-fade-in-up border-2 ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:bg-slate-800' 
                : 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-xl'
            }`}
          >
            <div className={`w-24 h-24 mb-4 rounded-2xl flex items-center justify-center text-5xl shadow-inner transition-transform duration-300 group-hover:scale-110 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              {user.avatar}
            </div>
            <h3 className="text-xl font-bold mb-1 group-hover:text-blue-500 transition-colors">{user.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{user.jobRole || 'Member'}</p>
            {user.email === 'administrator@autotest.ai' && (
              <ShieldAlert size={14} className="mt-2 text-amber-500" />
            )}
          </div>
        ))}
      </div>

      <div className="z-10 mt-16 flex flex-col items-center gap-4">
        <p className="text-xs text-slate-400 font-mono uppercase tracking-[0.2em]">Select your profile to start automation</p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => setShowRegisterModal(true)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full border-2 text-sm font-bold transition-all ${
              darkMode 
                ? 'border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500 bg-slate-900/50' 
                : 'border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-500 bg-white'
            }`}
          >
            <UserPlus size={16} /> 새로운 계정 만들기 (Sign Up)
          </button>

          <button 
            onClick={() => {
              setPendingAdmin(users.find(u => u.email === 'administrator@autotest.ai') || null);
              setShowAdminLogin(true);
              setAdminError('');
              setAuthSuccess(false);
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full border-2 text-sm font-bold transition-all ${
              darkMode 
                ? 'border-slate-800 text-slate-400 hover:text-white hover:border-amber-500 bg-slate-900/50' 
                : 'border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-500 bg-white'
            }`}
          >
            <Lock size={16} /> 관리자 로그인 (Admin)
          </button>
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-fade-in-up ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Key className="text-blue-500" /> Admin Access
              </h3>
              <button 
                onClick={() => setShowAdminLogin(false)} 
                disabled={isAuthenticating || authSuccess}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-30"
              >
                <X size={20}/>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 mb-4">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 text-center uppercase">ID: super / PW: super1</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Super Admin ID</label>
                <input 
                  autoFocus
                  disabled={isAuthenticating || authSuccess}
                  className={`w-full p-3 rounded-xl border-2 transition-all outline-none text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-500'} disabled:opacity-50`}
                  placeholder="ID"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Access Key</label>
                <input 
                  type="password"
                  disabled={isAuthenticating || authSuccess}
                  className={`w-full p-3 rounded-xl border-2 transition-all outline-none text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-500'} disabled:opacity-50`}
                  placeholder="Password"
                  value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isAuthenticating && !authSuccess && handleAdminAuth()}
                />
              </div>
              {adminError && <p className="text-xs text-red-500 font-medium text-center">{adminError}</p>}
              
              <button 
                onClick={handleAdminAuth}
                disabled={isAuthenticating || authSuccess || !loginId || !loginPw}
                className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 mt-4 ${
                  authSuccess 
                    ? 'bg-green-600 text-white shadow-green-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95 disabled:opacity-50'
                }`}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Authenticating...
                  </>
                ) : authSuccess ? (
                  <>
                    <Check size={18} /> Success
                  </>
                ) : (
                  <>
                    Authenticate <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal remains the same */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up border-4 border-[#FFCA28] ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <div className="bg-[#5D4037] p-8 text-white flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-[#FFECB3]">회원가입</h3>
                <p className="text-sm text-[#D7CCC8] mt-1">새로운 테스터 프로필을 등록하세요.</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">성함</label>
                  <div className="relative">
                    <Smile size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      autoFocus
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all outline-none text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`}
                      placeholder="예: 홍길동"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">이메일 주소</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all outline-none text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`}
                      placeholder="tester@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">직무 역할</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <select 
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all outline-none text-sm appearance-none ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`}
                      value={regRole}
                      onChange={e => setRegRole(e.target.value)}
                    >
                      {JOB_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-wider">캐릭터 아바타 선택</label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_OPTIONS.map(avatar => (
                      <button 
                        key={avatar}
                        onClick={() => setRegAvatar(avatar)}
                        className={`w-full aspect-square flex items-center justify-center text-xl rounded-xl border-2 transition-all ${
                          regAvatar === avatar 
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 scale-105 shadow-md' 
                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {regError && <p className="text-xs text-red-500 font-medium text-center">{regError}</p>}
              
              <button 
                onClick={handleRegisterSubmit}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mt-4"
              >
                계정 생성 및 자동 로그인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSelector;
