
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SuiteManager from './components/SuiteManager';
import TestRunner from './components/TestRunner';
import IssueBoard from './components/IssueBoard';
import MyPage from './components/MyPage';
import ManageAccounts from './components/ManageAccounts';
import ManageProjects from './components/ManageProjects';
import { ViewState, TestSuite, TestRun, Issue, Notification, User, Role } from './types';
import { Bell, X, Check, FolderPlus, Layers, Trash2, Settings, Clock, Hash } from 'lucide-react';

const MOCK_USERS: User[] = [
  { id: 'admin_1', name: 'Super Admin', email: 'administrator@autotest.ai', avatar: '🛡️', jobRole: 'System Administrator' },
  { id: 'u1', name: 'Tester Bear', email: 'bear@autotest.ai', avatar: '🐻', jobRole: 'QA Engineer' },
  { id: 'u2', name: 'Developer Dave', email: 'dave@dev.co', avatar: '👨‍💻', jobRole: 'Frontend Developer' }
];

const MOCK_SUITES: TestSuite[] = [
  {
    id: '1',
    name: 'Authentication Flow',
    description: 'Login, Registration, and Password Reset scenarios',
    createdAt: new Date().toISOString(),
    issuePrefix: 'ISS',
    nextIssueNumber: 3,
    permissions: {
      'u1': 'ADMIN',
      'u2': 'OBSERVER'
    },
    cases: [
      {
        id: 'c1',
        title: 'Valid Login',
        description: 'Verify user can login with valid credentials',
        priority: 'High',
        steps: [
          { id: 's1', action: 'Navigate to login page', expectedResult: 'Login form is visible' },
          { id: 's2', action: 'Enter valid username and password', expectedResult: 'Input fields accept data' },
          { id: 's3', action: 'Click Login button', expectedResult: 'Redirected to dashboard' }
        ]
      }
    ]
  }
];

const MOCK_ISSUES: Issue[] = [
  {
    id: 'i1',
    suiteId: '1',
    key: 'ISS-0001',
    title: 'Login button misalignment on IE11',
    description: 'The login button is shifted 10px to the left.',
    status: 'TODO',
    priority: 'Low',
    assignee: 'Tester Bear',
    createdAt: new Date().toISOString(),
    comments: []
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [suites, setSuites] = useState<TestSuite[]>(MOCK_SUITES);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectPrefix, setNewProjectPrefix] = useState('');

  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[1]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const savedSuites = localStorage.getItem('autotest_suites');
    const savedRuns = localStorage.getItem('autotest_runs');
    const savedIssues = localStorage.getItem('autotest_issues');
    const savedUsers = localStorage.getItem('autotest_users');
    const savedNotifs = localStorage.getItem('autotest_notifs');
    
    if (savedSuites) {
      const parsedSuites = JSON.parse(savedSuites);
      setSuites(parsedSuites);
      if (parsedSuites.length > 0 && !activeSuiteId) {
        setActiveSuiteId(parsedSuites[0].id);
      }
    } else {
      if (MOCK_SUITES.length > 0) setActiveSuiteId(MOCK_SUITES[0].id);
    }

    if (savedRuns) setRuns(JSON.parse(savedRuns));
    if (savedIssues) setIssues(JSON.parse(savedIssues));
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      setUsers(parsedUsers);
      if (!parsedUsers.find((u: User) => u.email === 'administrator@autotest.ai')) {
        setUsers([MOCK_USERS[0], ...parsedUsers]);
      } else {
        const found = parsedUsers.find((u: User) => u.id === currentUser.id);
        if (found) setCurrentUser(found);
      }
    }
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
  }, []);

  useEffect(() => {
    localStorage.setItem('autotest_suites', JSON.stringify(suites));
  }, [suites]);

  useEffect(() => {
    localStorage.setItem('autotest_runs', JSON.stringify(runs));
  }, [runs]);

  useEffect(() => {
    localStorage.setItem('autotest_issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem('autotest_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('autotest_notifs', JSON.stringify(notifications));
  }, [notifications]);

  const isGlobalAdmin = currentUser.email === 'administrator@autotest.ai';
  const visibleSuites = suites.filter(s => {
    if (isGlobalAdmin) return true;
    return s.permissions && s.permissions[currentUser.id];
  });
  const activeSuite = visibleSuites.find(s => s.id === activeSuiteId) || visibleSuites[0] || null;
  const filteredRuns = runs.filter(r => r.suiteId === activeSuite?.id);
  const filteredIssues = issues.filter(i => i.suiteId === activeSuite?.id);
  const myNotifications = notifications.filter(n => n.recipientId === currentUser.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleRunSuite = (suite: TestSuite) => {
    setActiveSuiteId(suite.id);
    setView('RUNNER');
  };

  const handleRunComplete = (run: TestRun) => {
    setRuns([run, ...runs]);
    setView('DASHBOARD');
    
    const total = Object.keys(run.results).length;
    const passed = Object.values(run.results).filter(r => r.status === 'PASSED').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const isSuccess = passRate >= 90;
    const failCount = Object.values(run.results).filter(r => r.status === 'FAILED').length;
    
    const suite = suites.find(s => s.id === run.suiteId);
    if (suite && suite.permissions) {
      Object.keys(suite.permissions).forEach(userId => {
        handleAddNotification(
          `Test Run "${run.suiteName}" ${isSuccess ? 'PASSED' : 'FAILED'}. ${failCount} failures recorded.`,
          userId
        );
      });
    }
  };

  const handleRunCancel = () => {
    setView('SUITES');
  };

  const handleAddNotification = (message: string, recipientId: string) => {
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      recipientId: recipientId,
      message,
      type: 'ASSIGNMENT',
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications(notifications.filter(n => n.recipientId !== currentUser.id));
  };
  
  const handleRegisterUser = (name: string, email: string, avatar: string, jobRole: string) => {
    const newUser: User = { id: crypto.randomUUID(), name, email, avatar, jobRole };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    handleAddNotification(`Welcome ${name}! Account created.`, newUser.id);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const prefix = newProjectPrefix.trim() || newProjectName.slice(0, 3).toUpperCase();
    const newSuite: TestSuite = {
      id: crypto.randomUUID(),
      name: newProjectName,
      description: newProjectDesc || 'No description provided.',
      createdAt: new Date().toISOString(),
      issuePrefix: prefix,
      nextIssueNumber: 1,
      cases: [],
      permissions: { [currentUser.id]: 'ADMIN' }
    };
    setSuites([...suites, newSuite]);
    setActiveSuiteId(newSuite.id);
    setShowCreateProjectModal(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectPrefix('');
  };

  const handleUpdateSuite = (updatedSuite: TestSuite) => {
    setSuites(prev => prev.map(s => s.id === updatedSuite.id ? updatedSuite : s));
  };

  const handleDeleteSuite = (suiteId: string) => {
    setIssues(prev => prev.filter(i => i.suiteId !== suiteId));
    setRuns(prev => prev.filter(r => r.suiteId !== suiteId));
    setSuites(prev => prev.filter(s => s.id !== suiteId));
    if (activeSuiteId === suiteId) setActiveSuiteId(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      {view !== 'RUNNER' && (
        <Sidebar 
          currentView={view} 
          onNavigate={setView} 
          currentUser={currentUser}
          users={users}
          onSwitchUser={setCurrentUser}
          onRegisterUser={handleRegisterUser}
          suites={visibleSuites}
          activeSuiteId={activeSuiteId}
          onSelectSuite={setActiveSuiteId}
          onCreateProject={() => setShowCreateProjectModal(true)}
          isGlobalAdmin={isGlobalAdmin}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {view !== 'RUNNER' && view !== 'NOTIFICATIONS' && (
          <div className="absolute top-6 right-8 z-30">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 animate-fade-in-up origin-top-right overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notifications</h3>
                  {myNotifications.length > 0 && (
                     <button onClick={clearAll} className="text-xs text-slate-400">Clear all</button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {myNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No new notifications.</div>
                  ) : (
                    myNotifications.map(notif => (
                      <div key={notif.id} className={`p-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex gap-3 ${notif.read ? 'opacity-60' : ''}`}>
                         <div className="flex-1">
                           <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{notif.message}</p>
                           <p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                         </div>
                         {!notif.read && (
                           <button onClick={() => markRead(notif.id)} className="text-blue-500 self-center"><Check size={14} /></button>
                         )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeSuite || ['NOTIFICATIONS', 'MY_PAGE', 'MANAGE_ACCOUNTS', 'MANAGE_PROJECTS'].includes(view) ? (
              <>
                {view === 'DASHBOARD' && activeSuite && (
                  <Dashboard activeSuite={activeSuite} runs={filteredRuns} suites={suites} setSuites={setSuites} users={users} currentUser={currentUser} issues={filteredIssues} />
                )}
                {view === 'SUITES' && activeSuite && (
                  <SuiteManager activeSuite={activeSuite} suites={suites} setSuites={setSuites} onRunSuite={handleRunSuite} currentUser={currentUser} allUsers={users} />
                )}
                {view === 'ISSUES' && activeSuite && (
                  <IssueBoard activeSuite={activeSuite} issues={filteredIssues} setIssues={setIssues} onNotify={handleAddNotification} onUpdateSuite={handleUpdateSuite} users={users} currentUser={currentUser} />
                )}
                {view === 'NOTIFICATIONS' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 h-full overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                       <h1 className="text-2xl font-bold dark:text-white">Notifications</h1>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {myNotifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">All caught up!</div>
                      ) : (
                        myNotifications.map(notif => (
                          <div key={notif.id} className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-start gap-4">
                             <div className="flex-1">
                                <p className="text-slate-800 dark:text-slate-200 font-medium">{notif.message}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
                             </div>
                             {!notif.read && <button onClick={() => markRead(notif.id)} className="text-blue-600"><Check size={20}/></button>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {view === 'MY_PAGE' && <MyPage currentUser={currentUser} onUpdateUser={handleUpdateUser} />}
                {view === 'MANAGE_ACCOUNTS' && isGlobalAdmin && <ManageAccounts users={users} onDeleteUser={handleDeleteUser} currentUser={currentUser} />}
                {view === 'MANAGE_PROJECTS' && isGlobalAdmin && <ManageProjects suites={suites} onDeleteSuite={handleDeleteSuite} onUpdateSuite={handleUpdateSuite} onCreateProject={() => setShowCreateProjectModal(true)} users={users} />}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Layers size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-bold">No Projects Available</h2>
              </div>
            )}

            {view === 'RUNNER' && activeSuite && (
              <TestRunner suite={activeSuite} onComplete={handleRunComplete} onCancel={handleRunCancel} />
            )}
          </div>
        </div>
      </main>

      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create New Project</h3>
                <button onClick={() => setShowCreateProjectModal(false)} className="text-slate-400"><X size={20} /></button>
             </div>
             <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Project Name</label>
                  <input className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm dark:text-white" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} autoFocus />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                  <textarea className="w-full border dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm dark:text-white min-h-[100px]" value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} />
               </div>
             </div>
             <div className="mt-6 flex justify-end gap-3">
               <button onClick={() => setShowCreateProjectModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm">Cancel</button>
               <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50">Create Project</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
