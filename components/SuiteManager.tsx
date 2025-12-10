import React, { useState, useRef } from 'react';
import { TestSuite, TestCase, User, Role } from '../types';
import { Plus, Trash2, Wand2, ChevronRight, FileText, Play, ChevronDown, ChevronUp, FileSpreadsheet, Upload, Link as LinkIcon, Layers, Monitor, Globe, Mail, HardDrive, Settings, X, Bot, Hand, Users, Shield, Lock, Eye, FolderOpen, File as FileIcon, XCircle } from 'lucide-react';
import { generateTestCases } from '../services/geminiService';
// @ts-ignore
import readXlsxFile from 'read-excel-file';

interface SuiteManagerProps {
  suites: TestSuite[];
  setSuites: React.Dispatch<React.SetStateAction<TestSuite[]>>;
  onRunSuite: (suite: TestSuite) => void;
  currentUser: User;
  allUsers: User[];
}

type AppContextType = 'WEB' | 'DESKTOP';
type ExecutionMode = 'MANUAL' | 'AUTOMATED';

const SuiteManager: React.FC<SuiteManagerProps> = ({ suites, setSuites, onRunSuite, currentUser, allUsers }) => {
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // Generation Inputs
  const [prompt, setPrompt] = useState('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [appType, setAppType] = useState<AppContextType>('WEB');
  const [appContextValue, setAppContextValue] = useState('');
  const [testEmail, setTestEmail] = useState('');
  
  // Run Configuration Inputs
  const [showRunModal, setShowRunModal] = useState(false);
  const [runAppType, setRunAppType] = useState<AppContextType>('WEB');
  const [runAddress, setRunAddress] = useState('');
  const [runEmail, setRunEmail] = useState('');
  const [runMode, setRunMode] = useState<ExecutionMode>('MANUAL');
  const [runAssets, setRunAssets] = useState<string[]>([]); // New: Virtual Assets

  // Permission Management Inputs
  const [showPermModal, setShowPermModal] = useState(false);
  const [permUserToAdd, setPermUserToAdd] = useState('');
  const [permRoleToAdd, setPermRoleToAdd] = useState<Role>('MEMBER');

  // Excel Sheet Management
  const [availableSheets, setAvailableSheets] = useState<{name: string}[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null); // New ref for asset upload
  const genOpRef = useRef(0);
  
  const activeSuite = suites.find(s => s.id === activeSuiteId);

  // --- PERMISSION LOGIC ---
  const isGlobalAdmin = currentUser.email === 'administrator@autotest.ai';

  const getUserRole = (suite: TestSuite): Role | 'NONE' => {
    if (isGlobalAdmin) return 'ADMIN';
    if (!suite.permissions) return 'NONE'; 
    return suite.permissions[currentUser.id] || 'NONE';
  };

  const activeRole = activeSuite ? getUserRole(activeSuite) : 'NONE';
  
  const canWrite = activeRole === 'ADMIN' || activeRole === 'MEMBER';
  const canRun = activeRole === 'ADMIN' || activeRole === 'MEMBER';
  const canDelete = activeRole === 'ADMIN';
  const canManageAccess = activeRole === 'ADMIN';

  // Filter visible suites in sidebar
  const visibleSuites = suites.filter(s => {
    const role = getUserRole(s);
    return role !== 'NONE';
  });

  const createSuite = () => {
    const newSuite: TestSuite = {
      id: crypto.randomUUID(),
      name: 'New Test Suite',
      description: 'Description of the test suite',
      createdAt: new Date().toISOString(),
      cases: [],
      permissions: {
        [currentUser.id]: 'ADMIN' // Creator gets Admin
      }
    };
    setSuites([...suites, newSuite]);
    setActiveSuiteId(newSuite.id);
  };

  const deleteSuite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this suite?')) {
      setSuites(suites.filter(s => s.id !== id));
      if (activeSuiteId === id) setActiveSuiteId(null);
    }
  };

  // --- ACCESS MANAGEMENT ---
  const handleAddPermission = () => {
    if (!activeSuite || !permUserToAdd) return;
    
    const updatedSuite = {
      ...activeSuite,
      permissions: {
        ...activeSuite.permissions,
        [permUserToAdd]: permRoleToAdd
      }
    };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
    setPermUserToAdd('');
  };

  const handleRemovePermission = (userId: string) => {
    if (!activeSuite) return;
    if (userId === currentUser.id && !isGlobalAdmin) {
       if(!confirm("You are about to remove your own access. Continue?")) return;
    }

    const newPerms = { ...activeSuite.permissions };
    delete newPerms[userId];
    
    const updatedSuite = {
      ...activeSuite,
      permissions: newPerms
    };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
    if (userId === currentUser.id && !isGlobalAdmin) setActiveSuiteId(null);
  };

  const handleChangePermission = (userId: string, newRole: Role) => {
    if (!activeSuite) return;
    const updatedSuite = {
      ...activeSuite,
      permissions: {
        ...activeSuite.permissions,
        [userId]: newRole
      }
    };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
  };

  // --- GENERATION & IMPORT LOGIC ---
  const handleGenerateCases = async () => {
    if (!canWrite) return;
    if (!prompt.trim() || !activeSuiteId) return;
    
    const opId = Date.now();
    genOpRef.current = opId;
    setIsGenerating(true);

    try {
      let finalPrompt = prompt;
      let contextInfo = "";

      if (importMode) {
        finalPrompt = `I have test suite data (from an Excel file or text) with the following content. Please parse this and convert it into structured test cases in KOREAN: \n\n${prompt}`;
        contextInfo = "Imported Data Conversion";
      } else {
        const locationLabel = appType === 'WEB' ? 'URL' : 'File Path/Address';
        contextInfo = `${appType === 'WEB' ? 'Web' : 'Desktop'} Application`;
        if (appContextValue) contextInfo += ` (${locationLabel}: ${appContextValue})`;
        if (testEmail) contextInfo += ` [Test Account: ${testEmail}]`;
      }

      const newCases = await generateTestCases(finalPrompt, contextInfo);
      
      if (genOpRef.current !== opId) return;
      
      setSuites(prevSuites => prevSuites.map(suite => {
        if (suite.id === activeSuiteId) {
          const updatedSuite = {
            ...suite,
            cases: [...suite.cases, ...newCases as TestCase[]]
          };
          if (!suite.targetConfig && !importMode) {
             updatedSuite.targetConfig = {
               appType,
               appAddress: appContextValue,
               testEmail
             };
          }
          return updatedSuite;
        }
        return suite;
      }));
      setShowPromptModal(false);
      resetModalState();
    } catch (e) {
      if (genOpRef.current === opId) {
        alert('Failed to generate cases. Please try again.');
      }
    } finally {
      if (genOpRef.current === opId) {
        setIsGenerating(false);
      }
    }
  };

  const handleCancelGeneration = () => {
    genOpRef.current = 0; 
    setIsGenerating(false);
    setShowPromptModal(false);
  };

  // --- RUN CONFIGURATION LOGIC ---
  const initiateRun = () => {
    if (!canRun || !activeSuite) return;
    const config = activeSuite.targetConfig;
    setRunAppType(config?.appType || 'WEB');
    setRunAddress(config?.appAddress || '');
    setRunEmail(config?.testEmail || '');
    setRunMode(config?.executionMode || 'MANUAL');
    setRunAssets(config?.mockAssets || []);
    setShowRunModal(true);
  };

  const handleAssetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map(f => f.name);
      // Avoid duplicates
      const uniqueNames = names.filter(n => !runAssets.includes(n));
      setRunAssets(prev => [...prev, ...uniqueNames]);
    }
  };

  const removeAsset = (name: string) => {
    setRunAssets(runAssets.filter(n => n !== name));
  };

  const confirmRun = () => {
    if (!activeSuite) return;
    const updatedSuite = {
      ...activeSuite,
      targetConfig: {
        appType: runAppType,
        appAddress: runAddress,
        testEmail: runEmail,
        executionMode: runMode,
        mockAssets: runAssets
      }
    };
    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
    onRunSuite(updatedSuite);
    setShowRunModal(false);
  };

  // --- HELPERS ---
  const resetModalState = () => {
    setPrompt('');
    setImportMode(false);
    setAvailableSheets([]);
    setCurrentFile(null);
    setAppContextValue('');
    setTestEmail('');
    setAppType('WEB');
  };

  const readExcelSheet = async (file: File, sheetName: string) => {
    setIsLoadingFile(true);
    try {
      // Fix: cast returned value to unknown then any[] to ensure map works
      const rows = (await readXlsxFile(file, { sheet: sheetName })) as unknown as any[];
      const content = rows.map((row: any[]) => 
        row.map(cell => cell === null ? '' : String(cell)).join('\t')
      ).join('\n');
      setPrompt(`[IMPORTED FILE: ${file.name} | SHEET: ${sheetName}]\n${content}`);
    } catch (error) {
      console.error("Error reading sheet:", error);
      alert(`Failed to read sheet "${sheetName}".`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setCurrentFile(file);
    setAvailableSheets([]);
    setPrompt('');

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Cast the result explicitly to any[] to avoid strict type checks and 'unknown' errors
        const result = (await readXlsxFile(file, { getSheets: true })) as unknown as any[];
        const sheets = result.map((sheet: any) => ({ name: sheet.name }));
        
        setAvailableSheets(sheets);
        if (sheets.length > 0) {
          await readExcelSheet(file, sheets[0].name);
        } else {
          // Fix: cast returned value to unknown then any[]
          const rows = (await readXlsxFile(file)) as unknown as any[];
          const content = rows.map((row: any[]) => 
            row.map(cell => cell === null ? '' : String(cell)).join('\t')
          ).join('\n');
          setPrompt(`[IMPORTED FILE: ${file.name}]\n${content}`);
        }
      } else {
        const content = await file.text();
        setPrompt(`[IMPORTED FILE CONTENT: ${file.name}]\n${content}`);
      }
    } catch (error) {
      console.error("File read error:", error);
      alert("Failed to read file. Please ensure it is a valid Excel or Text file.");
    } finally {
      setIsLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openGenerateModal = () => {
    resetModalState();
    setImportMode(false);
    setShowPromptModal(true);
  };

  const openImportModal = () => {
    resetModalState();
    setImportMode(true);
    setShowPromptModal(true);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in">
      {/* Sidebar List of Suites */}
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-700">Test Suites</h2>
          <button 
            onClick={createSuite}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            title="Create New Suite"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {visibleSuites.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm">
              No suites found for {currentUser.name}.<br/>Create one or ask an Admin for access.
            </div>
          )}
          {visibleSuites.map(suite => {
            const role = getUserRole(suite);
            return (
              <div 
                key={suite.id}
                onClick={() => setActiveSuiteId(suite.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all border ${activeSuiteId === suite.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                       <h3 className={`font-medium ${activeSuiteId === suite.id ? 'text-blue-700' : 'text-slate-700'}`}>
                        {suite.name}
                      </h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 
                        role === 'MEMBER' ? 'bg-blue-100 text-blue-700' : 
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {role === 'ADMIN' ? 'Admin' : role === 'MEMBER' ? 'Member' : 'Observer'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{suite.cases.length} Test Cases</p>
                  </div>
                  {getUserRole(suite) === 'ADMIN' && (
                    <button 
                      onClick={(e) => deleteSuite(suite.id, e)}
                      className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Suite"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        {activeSuite ? (
          <>
            <div className="p-6 border-b border-slate-100 bg-slate-50">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 mr-4">
                    <input 
                      className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full disabled:opacity-70 disabled:cursor-not-allowed"
                      value={activeSuite.name}
                      disabled={!canWrite}
                      onChange={(e) => {
                        setSuites(suites.map(s => s.id === activeSuite.id ? {...s, name: e.target.value} : s));
                      }}
                    />
                    <input 
                      className="text-sm text-slate-500 bg-transparent border-none focus:ring-0 p-0 w-full mt-1 disabled:opacity-70 disabled:cursor-not-allowed"
                      value={activeSuite.description}
                      disabled={!canWrite}
                      onChange={(e) => {
                        setSuites(suites.map(s => s.id === activeSuite.id ? {...s, description: e.target.value} : s));
                      }}
                    />
                  </div>
                  {canManageAccess && (
                    <button 
                      onClick={() => setShowPermModal(true)}
                      className="text-xs flex items-center gap-1 bg-white border border-slate-200 text-slate-600 px-2 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm"
                    >
                       <Users size={14} /> Manage Access
                    </button>
                  )}
               </div>
               
              <div className="flex items-center space-x-2">
                 {/* Observer Controls */}
                 {!canWrite && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                      <Eye size={14} />
                      Read-Only (Observer Mode)
                    </div>
                 )}

                 {/* Write Controls */}
                 {canWrite && (
                   <>
                     <button 
                      onClick={openImportModal}
                      className="flex items-center space-x-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                    >
                      <FileSpreadsheet size={16} />
                      <span className="hidden lg:inline">Import Data</span>
                    </button>
                    <button 
                      onClick={openGenerateModal}
                      className="flex items-center space-x-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                    >
                      <Wand2 size={16} />
                      <span className="hidden lg:inline">AI Generate</span>
                    </button>
                   </>
                 )}

                 {/* Run Controls */}
                 {canRun && (
                    <button 
                      onClick={initiateRun}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm ml-auto"
                    >
                      <Play size={16} />
                      <span>Run Suite</span>
                    </button>
                 )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="space-y-4">
                {activeSuite.cases.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No test cases yet.</p>
                    {canWrite && <p className="text-sm mt-2">Click "AI Generate" or "Import Data" to automagically create some.</p>}
                  </div>
                ) : (
                  activeSuite.cases.map((testCase, index) => (
                    <TestCaseCard key={testCase.id} testCase={testCase} index={index} readOnly={!canWrite} />
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ChevronRight size={48} className="opacity-20 mb-4" />
            <p>Select a suite to view details</p>
          </div>
        )}
      </div>

      {/* Access Management Modal */}
      {showPermModal && activeSuite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <Shield className="text-indigo-600" size={20} />
                   Project Access Control
                 </h3>
                 <button onClick={() => setShowPermModal(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                 </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Add User</label>
                    <div className="flex gap-2">
                       <select 
                         className="flex-1 border border-slate-300 rounded-lg p-2 text-sm outline-none"
                         value={permUserToAdd}
                         onChange={(e) => setPermUserToAdd(e.target.value)}
                       >
                         <option value="">Select User...</option>
                         {allUsers
                           .filter(u => u.email !== 'administrator@autotest.ai' && !activeSuite.permissions?.[u.id])
                           .map(u => (
                             <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                           ))
                         }
                       </select>
                       <select
                         className="w-32 border border-slate-300 rounded-lg p-2 text-sm outline-none"
                         value={permRoleToAdd}
                         onChange={(e) => setPermRoleToAdd(e.target.value as Role)}
                       >
                         <option value="ADMIN">Admin</option>
                         <option value="MEMBER">Member</option>
                         <option value="OBSERVER">Observer</option>
                       </select>
                       <button 
                         onClick={handleAddPermission}
                         disabled={!permUserToAdd}
                         className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                       >
                         Add
                       </button>
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Current Permissions</label>
                    <div className="space-y-2">
                       {/* Super Admin Always Visible */}
                       <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-full text-lg">🛡️</div>
                             <div>
                               <p className="text-sm font-semibold text-slate-800">Super Admin</p>
                               <p className="text-xs text-slate-500">administrator@autotest.ai</p>
                             </div>
                          </div>
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">GLOBAL</span>
                       </div>

                       {Object.entries(activeSuite.permissions || {}).map(([userId, role]) => {
                         const user = allUsers.find(u => u.id === userId);
                         if (!user) return null;
                         return (
                           <div key={userId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-lg">{user.avatar}</div>
                                 <div>
                                   <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                   <p className="text-xs text-slate-500">{user.email}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select 
                                   className="text-xs border border-slate-200 rounded p-1"
                                   value={role}
                                   onChange={(e) => handleChangePermission(userId, e.target.value as Role)}
                                >
                                   <option value="ADMIN">Admin</option>
                                   <option value="MEMBER">Member</option>
                                   <option value="OBSERVER">Observer</option>
                                </select>
                                <button 
                                  onClick={() => handleRemovePermission(userId)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                           </div>
                         );
                       })}
                       
                       {(!activeSuite.permissions || Object.keys(activeSuite.permissions).length === 0) && (
                         <p className="text-sm text-slate-400 italic text-center py-4">No explicit permissions set.</p>
                       )}
                    </div>
                 </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowPermModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  Done
                </button>
              </div>
           </div>
        </div>
      )}

      {/* AI Prompt/Import Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 flex flex-col max-h-[90vh]">
            <div className="p-0 mb-4">
               <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                 {importMode ? <FileSpreadsheet className="text-amber-500" /> : <Wand2 className="text-indigo-500" />}
                 {importMode ? 'Import Test Data (Excel)' : 'AI Generate Test Cases'}
               </h3>
               
               <p className="text-slate-500 text-sm">
                 {importMode 
                   ? 'Upload your Excel data. The AI will convert it into a Korean test suite.' 
                   : 'Define your application boundary and feature. The AI will generate test cases in Korean.'}
               </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              
              {!importMode && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Application</label>
                   
                   <div className="flex space-x-2">
                      <button 
                        onClick={() => setAppType('WEB')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md border transition-all ${appType === 'WEB' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'}`}
                      >
                        <Globe size={16} /> Website
                      </button>
                      <button 
                         onClick={() => setAppType('DESKTOP')}
                         className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md border transition-all ${appType === 'DESKTOP' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'}`}
                      >
                        <Monitor size={16} /> Desktop App
                      </button>
                   </div>

                   <div className="grid grid-cols-1 gap-3">
                     <div>
                       <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">
                         {appType === 'WEB' ? 'Website URL' : 'Program File Address'}
                       </label>
                       <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {appType === 'WEB' ? <LinkIcon size={14} className="text-slate-400"/> : <HardDrive size={14} className="text-slate-400"/>}
                          </div>
                          <input 
                              type="text"
                              className="w-full border border-slate-300 rounded-lg pl-9 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder={appType === 'WEB' ? "https://example.com" : "C:\\Program Files\\MyApp\\app.exe"}
                              value={appContextValue}
                              onChange={(e) => setAppContextValue(e.target.value)}
                          />
                       </div>
                     </div>

                     <div>
                       <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">
                         Test Email / Login ID (Optional)
                       </label>
                       <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={14} className="text-slate-400"/>
                          </div>
                          <input 
                              type="text"
                              className="w-full border border-slate-300 rounded-lg pl-9 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="user@example.com"
                              value={testEmail}
                              onChange={(e) => setTestEmail(e.target.value)}
                          />
                       </div>
                     </div>
                   </div>
                </div>
              )}

              {importMode && (
                <div className="space-y-4">
                  <div>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv, .txt"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoadingFile}
                      className="w-full py-4 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex flex-col items-center justify-center gap-2"
                    >
                      {isLoadingFile ? (
                        <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Upload size={24} />
                          <span className="font-medium">Click to Upload Excel File</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {availableSheets.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <Layers size={14} />
                        Select Sheet
                      </label>
                      <select 
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        onChange={(e) => {
                          if (currentFile) readExcelSheet(currentFile, e.target.value);
                        }}
                      >
                        {availableSheets.map((sheet) => (
                          <option key={sheet.name} value={sheet.name}>{sheet.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {importMode ? "Data Preview / Manual Input" : "Feature Description"}
                 </label>
                 <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[120px] font-mono text-xs bg-slate-50"
                  placeholder={importMode ? "Parsed content will appear here..." : "E.g., Login functionality with 2FA..."}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating || isLoadingFile}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100">
              <button 
                onClick={handleCancelGeneration}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                disabled={isLoadingFile}
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerateCases}
                disabled={isGenerating || !prompt.trim() || isLoadingFile}
                className={`px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium shadow-sm text-white ${importMode ? 'bg-amber-600' : 'bg-indigo-600'}`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{importMode ? 'Converting...' : 'Generating (Korean)...'}</span>
                  </>
                ) : (
                  <>
                    {importMode ? <FileSpreadsheet size={16} /> : <Wand2 size={16} />}
                    <span>{importMode ? 'Convert & Import' : 'Generate'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Configuration Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="text-green-600" size={24} />
                  Test Environment Setup
                </h3>
                <p className="text-slate-500 text-sm mt-1">Configure the environment before running.</p>
              </div>
              <button onClick={() => setShowRunModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-2">
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Execution Mode</label>
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setRunMode('MANUAL')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-all ${runMode === 'MANUAL' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Hand size={16} /> Manual
                  </button>
                  <button 
                    onClick={() => setRunMode('AUTOMATED')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-all ${runMode === 'AUTOMATED' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Bot size={16} /> AI Automated
                  </button>
                </div>
                {runMode === 'AUTOMATED' && (
                  <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                    <Wand2 size={12} /> The AI will simulate test execution for you.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Application Type</label>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setRunAppType('WEB')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm rounded-lg border transition-all ${runAppType === 'WEB' ? 'bg-green-50 border-green-500 text-green-700 font-medium' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                  >
                    <Globe size={18} /> Website
                  </button>
                  <button 
                      onClick={() => setRunAppType('DESKTOP')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm rounded-lg border transition-all ${runAppType === 'DESKTOP' ? 'bg-green-50 border-green-500 text-green-700 font-medium' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                  >
                    <Monitor size={18} /> Desktop App
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {runAppType === 'WEB' ? 'Website URL' : 'File Address / Path'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {runAppType === 'WEB' ? <LinkIcon size={16} className="text-slate-400"/> : <HardDrive size={16} className="text-slate-400"/>}
                  </div>
                  <input 
                      type="text"
                      className="w-full border border-slate-300 rounded-lg pl-10 p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder={runAppType === 'WEB' ? "https://example.com" : "C:\\Program Files\\MyApp.exe"}
                      value={runAddress}
                      onChange={(e) => setRunAddress(e.target.value)}
                      autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Test Email / Account (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400"/>
                  </div>
                  <input 
                      type="text"
                      className="w-full border border-slate-300 rounded-lg pl-10 p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="user@example.com"
                      value={runEmail}
                      onChange={(e) => setRunEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Mock Assets Section */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Test Assets (Files/Documents)
                </label>
                <div className="space-y-2">
                   <div 
                     onClick={() => assetInputRef.current?.click()}
                     className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors"
                   >
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={assetInputRef}
                        onChange={handleAssetSelect}
                      />
                      <div className="flex flex-col items-center gap-1 text-slate-500">
                         <FolderOpen size={20} />
                         <span className="text-xs">Click to select files from system</span>
                      </div>
                   </div>

                   {runAssets.length > 0 && (
                     <div className="flex flex-wrap gap-2 mt-2">
                       {runAssets.map(asset => (
                         <span key={asset} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200">
                           <FileIcon size={10} />
                           {asset}
                           <button onClick={() => removeAsset(asset)} className="text-slate-400 hover:text-red-500">
                             <XCircle size={12} />
                           </button>
                         </span>
                       ))}
                     </div>
                   )}
                   {runAssets.length === 0 && (
                     <p className="text-[10px] text-slate-400 italic">No files selected. Auto-runner will not see any local files.</p>
                   )}
                </div>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                onClick={() => setShowRunModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRun}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Play size={16} /> 
                {runMode === 'AUTOMATED' ? 'Start Auto Run' : 'Start Testing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TestCaseCard: React.FC<{ testCase: TestCase; index: number; readOnly?: boolean }> = ({ testCase, index, readOnly }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded">
            TC-{index + 1}
          </span>
          <div>
            <h4 className="font-medium text-slate-800">{testCase.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                testCase.priority === 'High' ? 'bg-red-100 text-red-700' :
                testCase.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                testCase.priority === 'Low' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {testCase.priority}
              </span>
              <span className="text-xs text-slate-400">{testCase.steps.length} Steps</span>
            </div>
          </div>
        </div>
        <div className="text-slate-400">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-600 mb-4 italic">{testCase.description}</p>
          <div className="space-y-3">
            {testCase.steps.map((step, idx) => (
              <div key={step.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-white p-3 rounded border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Step {idx + 1}</span>
                  <p className="text-slate-600">{step.action}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Expected Result</span>
                  <p className="text-slate-600">{step.expectedResult}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiteManager;