
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SuiteManager from './components/SuiteManager';
import TestRunner from './components/TestRunner';
import IssueBoard from './components/IssueBoard';
import MyPage from './components/MyPage';
import ManageAccounts from './components/ManageAccounts';
import { ViewState, TestSuite, TestRun, Issue, Notification, User, Role } from './types';
import { Bell, X, Check, FolderPlus, Layers, Trash2, Settings, Clock } from 'lucide-react';

// Mock Initial Data
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
    permissions: {
      'u1': 'ADMIN', // Tester Bear is Admin of this project
      'u2': 'OBSERVER' // Dave is Observer
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
      },
      {
        id: 'c2',
        title: 'Invalid Password',
        description: 'Verify error message on wrong password',
        priority: 'Medium',
        steps: [
          { id: 's1', action: 'Navigate to login page', expectedResult: 'Login form is visible' },
          { id: 's2', action: 'Enter valid username and invalid password', expectedResult: 'Input fields accept data' },
          { id: 's3', action: 'Click Login button', expectedResult: 'Error message "Invalid credentials" shown' }
        ]
      },
      {
        id: 'c3',
        title: 'Check Footer Links',
        description: 'Ensure privacy policy link works',
        priority: 'Low',
        steps: [
          { id: 's1', action: 'Scroll to footer', expectedResult: 'Footer visible' },
          { id: 's2', action: 'Click Privacy Policy', expectedResult: 'Privacy page opens' }
        ]
      }
    ]
  }
];

const MOCK_ISSUES: Issue[] = [
  {
    id: 'i1',
    suiteId: '1',
    key: 'ISS-1',
    title: 'Login button misalignment on IE11',
    description: 'The login button is shifted 10px to the left.',
    status: 'TODO',
    priority: 'Low',
    assignee: 'Tester Bear',
    createdAt: new Date().toISOString(),
    comments: []
  },
  {
    id: 'i2',
    suiteId: '1',
    key: 'ISS-2',
    title: 'Crash when uploading 50MB file',
    description: 'App crashes immediately.',
    status: 'IN_PROGRESS',
    priority: 'Critical',
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
  
  // Active Project State
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // User & Notification State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[1]); // Default to Bear
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const savedSuites = localStorage.getItem('autotest_suites');
    const savedRuns = localStorage.getItem('autotest_runs');
    const savedIssues = localStorage.getItem('autotest_issues');
    const savedUsers = localStorage.getItem('autotest_users');
    const savedNotifs = localStorage.getItem('autotest_notifs');
    
    if (savedSuites) {
      const parsedSuites = JSON.parse(savedSuites);
      setSuites(parsedSuites);
      // Auto-select first available suite
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

  // Save to local storage on change
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

  // Derived State
  const isGlobalAdmin = currentUser.email === 'administrator@autotest.ai';
  
  // Filter suites visible to current user
  const visibleSuites = suites.filter(s => {
    if (isGlobalAdmin) return true;
    return s.permissions && s.permissions[currentUser.id];
  });

  // Ensure active suite is valid and visible
  const activeSuite = visibleSuites.find(s => s.id === activeSuiteId) || visibleSuites[0] || null;
  
  // Filter data by active suite
  const filteredRuns = runs.filter(r => r.suiteId === activeSuite?.id);
  const filteredIssues = issues.filter(i => i.suiteId === activeSuite?.id);

  // Filter Notifications by Current User
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
    const formattedPassRate = passRate % 1 === 0 ? passRate.toFixed(0) : passRate.toFixed(1);
    const failCount = Object.values(run.results).filter(r => r.status === 'FAILED').length;
    
    // Notify all members of the suite about the run completion
    const suite = suites.find(s => s.id === run.suiteId);
    if (suite && suite.permissions) {
      Object.keys(suite.permissions).forEach(userId => {
        handleAddNotification(
          `Test Run "${run.suiteName}" ${isSuccess ? 'PASSED' : 'FAILED'} (${formattedPassRate}%). ${failCount} failures recorded.`,
          userId
        );
      });
      // Also notify admin
      const admin = users.find(u => u.email === 'administrator@autotest.ai');
      if (admin) {
        handleAddNotification(
           `[Admin Alert] Test Run "${run.suiteName}" ${isSuccess ? 'PASSED' : 'FAILED'} (${formattedPassRate}%).`,
           admin.id
        );
      }
    }
  };

  const handleRunCancel = () => {
    setView('SUITES'); // Go back to suite manager
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
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      avatar: avatar,
      jobRole
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setCurrentUser(newUser); // Auto switch to new user
    handleAddNotification(`Welcome ${name}! Your account has been created.`, newUser.id);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newSuite: TestSuite = {
      id: crypto.randomUUID(),
      name: newProjectName,
      description: newProjectDesc || 'No description provided.',
      createdAt: new Date().toISOString(),
      cases: [],
      permissions: {
        [currentUser.id]: 'ADMIN' // Creator gets Admin
      }
    };

    setSuites([...suites, newSuite]);
    setActiveSuiteId(newSuite.id);
    setShowCreateProjectModal(false);
    setNewProjectName('');
    setNewProjectDesc('');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    handleAddNotification("Profile details updated successfully.", updatedUser.id);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
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
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Right Notification Bell - Only Show if NOT on Notification View and NOT on Runner */}
        {view !== 'RUNNER' && view !== 'NOTIFICATIONS' && (
          <div className="absolute top-6 right-8 z-30">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-100 animate-fade-in-up origin-top-right overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    Notifications {currentUser.avatar}
                  </h3>
                  {myNotifications.length > 0 && (
                     <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-600">Clear all</button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {myNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      <div className="text-2xl mb-2 opacity-50">💤</div>
                      No new notifications for {currentUser.name}.
                    </div>
                  ) : (
                    myNotifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${notif.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                      >
                         <div className="mt-1 flex-shrink-0">
                           <div className="w-2 h-2 rounded-full bg-blue-500" style={{ opacity: notif.read ? 0 : 1 }} />
                         </div>
                         <div className="flex-1">
                           <p className="text-sm text-slate-700 leading-snug">{notif.message}</p>
                           <p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                         </div>
                         {!notif.read && (
                           <button onClick={() => markRead(notif.id)} className="text-slate-300 hover:text-blue-500 self-center">
                             <Check size={14} />
                           </button>
                         )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 text-center">
                    <button 
                      onClick={() => {
                        setShowNotifPanel(false);
                        setView('NOTIFICATIONS');
                      }} 
                      className="text-xs text-blue-600 font-medium hover:underline"
                    >
                      View All Notifications
                    </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {activeSuite || ['NOTIFICATIONS', 'MY_PAGE', 'MANAGE_ACCOUNTS'].includes(view) ? (
              <>
                {view === 'DASHBOARD' && activeSuite && (
                  <Dashboard 
                    activeSuite={activeSuite}
                    runs={filteredRuns} 
                    suites={suites}
                    setSuites={setSuites}
                    users={users}
                    currentUser={currentUser}
                    issues={filteredIssues}
                  />
                )}
                {view === 'SUITES' && activeSuite && (
                  <SuiteManager 
                    activeSuite={activeSuite}
                    suites={suites} 
                    setSuites={setSuites} 
                    onRunSuite={handleRunSuite} 
                    currentUser={currentUser}
                    allUsers={users}
                  />
                )}
                {view === 'ISSUES' && activeSuite && (
                  <IssueBoard 
                    activeSuite={activeSuite}
                    issues={filteredIssues} 
                    setIssues={setIssues} 
                    onNotify={handleAddNotification}
                    users={users}
                    currentUser={currentUser}
                  />
                )}
                
                {/* Notification Center View */}
                {view === 'NOTIFICATIONS' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full animate-fade-in">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                          <Bell className="text-blue-600" /> Notifications
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Updates and alerts for <b>{currentUser.name}</b></p>
                      </div>
                      {myNotifications.length > 0 && (
                        <button 
                          onClick={clearAll}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
                        >
                          <Trash2 size={16} /> Clear All
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      {myNotifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <Bell size={48} className="mb-4 opacity-20" />
                           <p className="text-lg font-medium text-slate-500">You're all caught up!</p>
                           <p className="text-sm">No new notifications to display.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {myNotifications.map(notif => (
                            <div key={notif.id} className={`p-6 hover:bg-slate-50 transition-colors flex items-start gap-4 ${notif.read ? 'opacity-75' : 'bg-blue-50/10'}`}>
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${notif.type === 'SYSTEM' ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                                 {notif.type === 'SYSTEM' ? <Settings size={20}/> : <Bell size={20}/>}
                               </div>
                               <div className="flex-1">
                                  <p className="text-slate-800 font-medium text-base">{notif.message}</p>
                                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(notif.timestamp).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}
                                  </p>
                               </div>
                               {!notif.read && (
                                 <button onClick={() => markRead(notif.id)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Mark as read">
                                   <Check size={20} />
                                 </button>
                               )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* My Page View */}
                {view === 'MY_PAGE' && (
                  <MyPage 
                    currentUser={currentUser} 
                    onUpdateUser={handleUpdateUser} 
                  />
                )}

                {/* Manage Accounts View (Admin Only) */}
                {view === 'MANAGE_ACCOUNTS' && isGlobalAdmin && (
                  <ManageAccounts 
                    users={users} 
                    onDeleteUser={handleDeleteUser} 
                    currentUser={currentUser}
                  />
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Layers size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-bold text-slate-600">No Projects Available</h2>
                <p className="text-sm mt-2 max-w-xs text-center">
                  {isGlobalAdmin 
                    ? "Create a new project from the sidebar to get started." 
                    : "You haven't been assigned to any projects yet. Contact an administrator."}
                </p>
                {isGlobalAdmin && (
                   <button 
                     onClick={() => setShowCreateProjectModal(true)}
                     className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                   >
                     Create First Project
                   </button>
                )}
              </div>
            )}

            {view === 'RUNNER' && activeSuite && (
              <TestRunner 
                suite={activeSuite} 
                onComplete={handleRunComplete}
                onCancel={handleRunCancel}
              />
            )}
          </div>
        </div>
      </main>

      {/* Create Project Modal (Global) */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 flex flex-col animate-fade-in-up">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <FolderPlus className="text-blue-600" size={20} />
                   Create New Project
                </h3>
                <button onClick={() => setShowCreateProjectModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             
             <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Project Name</label>
                  <input 
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Mobile App V2"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Description</label>
                  <textarea 
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    placeholder="Describe the scope of this test project..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                  />
               </div>
             </div>

             <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={() => setShowCreateProjectModal(false)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreateProject}
                 disabled={!newProjectName.trim()}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50"
               >
                 Create Project
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
