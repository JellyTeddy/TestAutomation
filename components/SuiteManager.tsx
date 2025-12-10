import React, { useState, useRef } from 'react';
import { TestSuite, TestCase } from '../types';
import { Plus, Trash2, Wand2, ChevronRight, FileText, Play, ChevronDown, ChevronUp, FileSpreadsheet, Upload, Link as LinkIcon, Layers, Monitor, Globe, Mail, HardDrive, Settings, X, Bot, Hand } from 'lucide-react';
import { generateTestCases } from '../services/geminiService';
// @ts-ignore
import readXlsxFile from 'read-excel-file';

interface SuiteManagerProps {
  suites: TestSuite[];
  setSuites: React.Dispatch<React.SetStateAction<TestSuite[]>>;
  onRunSuite: (suite: TestSuite) => void;
}

type AppContextType = 'WEB' | 'DESKTOP';
type ExecutionMode = 'MANUAL' | 'AUTOMATED';

const SuiteManager: React.FC<SuiteManagerProps> = ({ suites, setSuites, onRunSuite }) => {
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

  // Excel Sheet Management
  const [availableSheets, setAvailableSheets] = useState<{name: string}[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const genOpRef = useRef(0); // Ref to track current generation operation ID for cancellation
  
  const activeSuite = suites.find(s => s.id === activeSuiteId);

  const createSuite = () => {
    const newSuite: TestSuite = {
      id: crypto.randomUUID(),
      name: 'New Test Suite',
      description: 'Description of the test suite',
      createdAt: new Date().toISOString(),
      cases: []
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

  const handleGenerateCases = async () => {
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
        // Construct context info based on user selection
        const locationLabel = appType === 'WEB' ? 'URL' : 'File Path/Address';
        contextInfo = `${appType === 'WEB' ? 'Web' : 'Desktop'} Application`;
        if (appContextValue) contextInfo += ` (${locationLabel}: ${appContextValue})`;
        if (testEmail) contextInfo += ` [Test Account: ${testEmail}]`;
      }

      const newCases = await generateTestCases(finalPrompt, contextInfo);
      
      // Check if the operation was cancelled or superseded
      if (genOpRef.current !== opId) {
        return;
      }
      
      setSuites(prevSuites => prevSuites.map(suite => {
        if (suite.id === activeSuiteId) {
          const updatedSuite = {
            ...suite,
            cases: [...suite.cases, ...newCases as TestCase[]]
          };
          
          // Optionally save the generation context as the default run config if empty
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
    genOpRef.current = 0; // Invalidate current operation
    setIsGenerating(false);
    setShowPromptModal(false);
  };

  const initiateRun = () => {
    if (!activeSuite) return;
    
    // Pre-fill from existing config if available, otherwise defaults
    const config = activeSuite.targetConfig;
    setRunAppType(config?.appType || 'WEB');
    setRunAddress(config?.appAddress || '');
    setRunEmail(config?.testEmail || '');
    setRunMode(config?.executionMode || 'MANUAL');
    
    setShowRunModal(true);
  };

  const confirmRun = () => {
    if (!activeSuite) return;

    // Update suite with latest config
    const updatedSuite = {
      ...activeSuite,
      targetConfig: {
        appType: runAppType,
        appAddress: runAddress,
        testEmail: runEmail,
        executionMode: runMode
      }
    };

    setSuites(suites.map(s => s.id === activeSuite.id ? updatedSuite : s));
    onRunSuite(updatedSuite);
    setShowRunModal(false);
  };

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
      const rows = await readXlsxFile(file, { sheet: sheetName });
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
        const sheets = await readXlsxFile(file, { getSheets: true });
        setAvailableSheets(sheets);
        
        if (sheets.length > 0) {
          await readExcelSheet(file, sheets[0].name);
        } else {
          const rows = await readXlsxFile(file);
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
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {suites.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm">
              No suites found. Create one to get started.
            </div>
          )}
          {suites.map(suite => (
            <div 
              key={suite.id}
              onClick={() => setActiveSuiteId(suite.id)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${activeSuiteId === suite.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-medium ${activeSuiteId === suite.id ? 'text-blue-700' : 'text-slate-700'}`}>
                    {suite.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{suite.cases.length} Test Cases</p>
                </div>
                <button 
                  onClick={(e) => deleteSuite(suite.id, e)}
                  className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        {activeSuite ? (
          <>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <input 
                  className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full"
                  value={activeSuite.name}
                  onChange={(e) => {
                    setSuites(suites.map(s => s.id === activeSuite.id ? {...s, name: e.target.value} : s));
                  }}
                />
                <input 
                  className="text-sm text-slate-500 bg-transparent border-none focus:ring-0 p-0 w-full mt-1"
                  value={activeSuite.description}
                  onChange={(e) => {
                    setSuites(suites.map(s => s.id === activeSuite.id ? {...s, description: e.target.value} : s));
                  }}
                />
              </div>
              <div className="flex space-x-2">
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
                <button 
                  onClick={initiateRun}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Play size={16} />
                  <span>Run Suite</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="space-y-4">
                {activeSuite.cases.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No test cases yet.</p>
                    <p className="text-sm mt-2">Click "AI Generate" or "Import Data" to automagically create some.</p>
                  </div>
                ) : (
                  activeSuite.cases.map((testCase, index) => (
                    <TestCaseCard key={testCase.id} testCase={testCase} index={index} />
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 flex flex-col">
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

            <div className="space-y-5">
              
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

            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end space-x-3">
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

const TestCaseCard: React.FC<{ testCase: TestCase; index: number }> = ({ testCase, index }) => {
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
                'bg-green-100 text-green-700'
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