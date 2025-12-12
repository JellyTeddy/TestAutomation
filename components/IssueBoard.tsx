
import React, { useState, useEffect, useRef } from 'react';
import { Issue, IssueStatus, IssuePriority, User, TestSuite, Comment, Attachment } from '../types';
import { Plus, MoreHorizontal, Calendar, Trash2, X, AlertCircle, ChevronDown, Clock, CheckCircle2, Circle, RotateCcw, Columns, List, Archive, ArchiveRestore, Send, Paperclip, Image as ImageIcon, MessageSquare, Search, AlertTriangle, FileText, FileSpreadsheet, File as FileIcon, Download, Video, FileCode } from 'lucide-react';

interface IssueBoardProps {
  activeSuite: TestSuite;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  onNotify?: (message: string, recipientId: string) => void;
  onUpdateSuite: (suite: TestSuite) => void;
  users: User[];
  currentUser: User;
}

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-slate-100' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'DONE', title: 'Done', color: 'bg-green-50' },
];

const IssueBoard: React.FC<IssueBoardProps> = ({ activeSuite, issues, setIssues, onNotify, onUpdateSuite, users, currentUser }) => {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Delete Confirmation State
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Dropdown State
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<IssuePriority>('Medium');
  const [newAssignee, setNewAssignee] = useState<string>('');
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Comment Form State
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | undefined>(undefined);
  const commentFileRef = useRef<HTMLInputElement>(null);

  // Mention State
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Set default assignee when currentUser changes or component mounts
  useEffect(() => {
    if (!newAssignee) {
      setNewAssignee(currentUser.name);
    }
  }, [currentUser.name]);
  
  // Drag and Drop state
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);

  // Filter issues based on Archive Toggle and Search Query
  const visibleIssues = issues.filter(i => {
    // 1. Archive Filter
    const isArchived = i.status === 'ARCHIVED';
    if (showArchived !== isArchived) return false;

    // 2. Search Filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      i.title.toLowerCase().includes(query) || 
      i.description.toLowerCase().includes(query) ||
      i.key.toLowerCase().includes(query)
    );
  });

  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const processedAttachments: Attachment[] = [];

      for (const file of files) {
        const reader = new FileReader();
        const result = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        processedAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: result
        });
      }

      setNewAttachments(prev => [...prev, ...processedAttachments]);
    }
    // Reset input to allow selecting same file again
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const removeNewAttachment = (id: string) => {
    setNewAttachments(prev => prev.filter(a => a.id !== id));
  };

  const createIssue = () => {
    if (!newTitle.trim()) return;
    
    // Generate Sequential Issue Key
    const prefix = activeSuite.issuePrefix || 'ISS';
    const nextNumber = activeSuite.nextIssueNumber || 1;
    const issueKey = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
    
    const newIssue: Issue = {
      id: crypto.randomUUID(),
      suiteId: activeSuite.id, // Link to active project
      key: issueKey, 
      title: newTitle,
      description: newDesc,
      status: 'TODO',
      priority: newPriority,
      assignee: newAssignee,
      reopenCount: 0,
      createdAt: new Date().toISOString(),
      comments: [],
      attachments: newAttachments
    };

    // Update parent state (which holds all issues)
    setIssues(prevIssues => [...prevIssues, newIssue]);
    
    // Update Suite's Next Issue Number
    onUpdateSuite({
      ...activeSuite,
      nextIssueNumber: nextNumber + 1
    });

    setShowCreateModal(false);
    resetForm();

    // Notify Assignee if it's someone else
    if (onNotify && newAssignee && newAssignee !== currentUser.name) {
       const assignedUser = users.find(u => u.name === newAssignee);
       if (assignedUser) {
         onNotify(`You have been assigned to new issue ${newIssue.key}: ${newIssue.title}`, assignedUser.id);
       }
    }
  };

  const updateIssue = (updated: Issue) => {
    const oldIssue = issues.find(i => i.id === updated.id);

    // Reopen Logic: If status changed from DONE to !DONE, increment reopen count
    if (oldIssue && oldIssue.status === 'DONE' && updated.status !== 'DONE' && updated.status !== 'ARCHIVED') {
      updated.reopenCount = (oldIssue.reopenCount || 0) + 1;
    }

    // Check for assignee change notification
    if (oldIssue && onNotify) {
      if (oldIssue.assignee !== updated.assignee && updated.assignee !== currentUser.name) {
        const assignedUser = users.find(u => u.name === updated.assignee);
        if (assignedUser) {
           onNotify(`You have been assigned to issue ${updated.key}: ${updated.title}`, assignedUser.id);
        }
      }
    }

    setIssues(prevIssues => prevIssues.map(i => i.id === updated.id ? updated : i));
    setSelectedIssue(updated);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewPriority('Medium');
    setNewAssignee(currentUser.name);
    setNewAttachments([]);
  };

  const deleteIssue = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIssueToDelete(id);
  };

  const confirmDelete = () => {
    if (issueToDelete) {
      setIssues(prevIssues => prevIssues.filter(i => i.id !== issueToDelete));
      if (selectedIssue?.id === issueToDelete) setSelectedIssue(null);
      setIssueToDelete(null);
    }
  };

  const handleReopen = () => {
    if (!selectedIssue) return;
    const reopenedIssue = {
      ...selectedIssue,
      status: 'TODO' as IssueStatus,
      reopenCount: (selectedIssue.reopenCount || 0) + 1
    };
    updateIssue(reopenedIssue);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedIssueId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, status: IssueStatus) => {
    e.preventDefault();
    if (draggedIssueId) {
      setIssues(prevIssues => prevIssues.map(i => {
        if (i.id === draggedIssueId) {
          const isReopen = i.status === 'DONE' && status !== 'DONE' && status !== 'ARCHIVED';
          return { 
            ...i, 
            status,
            reopenCount: isReopen ? (i.reopenCount || 0) + 1 : (i.reopenCount || 0)
          };
        }
        return i;
      }));
      setDraggedIssueId(null);
    }
  };

  // --- Comment Logic ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCommentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewCommentText(val);

    // Basic detection for @mention at end of string
    const lastWord = val.split(/[\s\n]+/).pop();
    if (lastWord && lastWord.startsWith('@')) {
       setShowMentionList(true);
       setMentionQuery(lastWord.substring(1));
    } else {
       setShowMentionList(false);
    }
  };

  const selectMention = (userName: string) => {
    // Replace the last @query with @Name
    const words = newCommentText.split(/([\s\n]+)/); // Split keeping delimiters
    let newText = "";
    
    // Find the last segment that is our mention query
    let found = false;
    for (let i = words.length - 1; i >= 0; i--) {
        if (!found && words[i].startsWith('@')) {
            words[i] = `@${userName} `;
            found = true;
        }
    }
    
    setNewCommentText(words.join(''));
    setShowMentionList(false);
  };

  const handleAddComment = () => {
    if ((!newCommentText.trim() && !newCommentImage) || !selectedIssue) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: newCommentText,
      image: newCommentImage,
      timestamp: new Date().toISOString()
    };

    const updatedIssue = {
      ...selectedIssue,
      comments: [...(selectedIssue.comments || []), newComment]
    };

    // Check for Tags/Mentions and Notify
    if (onNotify) {
       // Notify Issue Assignee if someone else comments
       if (selectedIssue.assignee && selectedIssue.assignee !== currentUser.name) {
          const owner = users.find(u => u.name === selectedIssue.assignee);
          if (owner) {
             onNotify(`💬 New comment on ${selectedIssue.key} by ${currentUser.name}`, owner.id);
          }
       }

       // Notify Mentioned Users
       // Simple regex to find @Name patterns. 
       // Note: This relies on exact name matching. Robust systems use IDs in text.
       users.forEach(user => {
         if (newCommentText.includes(`@${user.name}`)) {
           // Avoid double notification if they are the assignee
           if (user.name !== selectedIssue.assignee && user.id !== currentUser.id) {
             onNotify(`👋 You were mentioned in ${selectedIssue.key} by ${currentUser.name}`, user.id);
           }
         }
       });
    }

    updateIssue(updatedIssue);
    setNewCommentText('');
    setNewCommentImage(undefined);
    setShowMentionList(false);
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Helper Renderers ---

  const getPriorityColor = (p: IssuePriority) => {
    switch (p) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: IssueStatus) => {
    switch (status) {
      case 'DONE': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'IN_PROGRESS': return <Clock size={16} className="text-blue-600" />;
      case 'ARCHIVED': return <Archive size={16} className="text-slate-500" />;
      default: return <Circle size={16} className="text-slate-400" />;
    }
  };

  const getStatusBadge = (status: IssueStatus) => {
    const baseClasses = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap";
    switch (status) {
        case 'DONE': return (
            <span className={`${baseClasses} bg-green-50 text-green-700 border-green-200`}>
                <CheckCircle2 size={12} className="flex-shrink-0" /> Done
            </span>
        );
        case 'IN_PROGRESS': return (
            <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}>
                <Clock size={12} className="flex-shrink-0" /> In Progress
            </span>
        );
        case 'ARCHIVED': return (
            <span className={`${baseClasses} bg-slate-100 text-slate-600 border-slate-200`}>
                <Archive size={12} className="flex-shrink-0" /> Archived
            </span>
        );
        default: return (
            <span className={`${baseClasses} bg-slate-100 text-slate-600 border-slate-200`}>
                <Circle size={12} className="flex-shrink-0" /> To Do
            </span>
        );
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="text-orange-500" size={16} />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-green-600" size={16} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText className="text-blue-600" size={16} />;
    if (['pdf'].includes(ext || '')) return <FileText className="text-red-500" size={16} />;
    if (['zip', 'rar'].includes(ext || '')) return <FileCode className="text-yellow-600" size={16} />;
    if (['mp4', 'avi', 'mov'].includes(ext || '')) return <Video className="text-purple-600" size={16} />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <ImageIcon className="text-indigo-500" size={16} />;
    return <FileIcon className="text-slate-400" size={16} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getUserAvatar = (name: string | undefined) => {
    if (!name) return <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">?</div>;
    const user = users.find(u => u.name === name);
    if (user) {
      return (
        <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm shadow-sm" title={user.name}>
          {user.avatar}
        </div>
      );
    }
    // Fallback if user is not found in list but name exists
    return (
      <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold" title={name}>
        {name.charAt(0)}
      </div>
    );
  };

  // Filter users for mentions
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            {showArchived ? (
              <>
                <Archive className="text-slate-500" /> Archived Issues
              </>
            ) : (
              'Issue Board'
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {showArchived ? 'Viewing past resolved items for' : 'Manage bugs for'} <b>{activeSuite.name}</b>
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Search issues..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48 focus:w-64 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setShowArchived(!showArchived);
              if (!showArchived) setViewMode('LIST'); // Force List view when opening archive
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showArchived 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
             {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
             {showArchived ? 'Back to Board' : 'View Archive'}
          </button>

          {!showArchived && (
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                  onClick={() => setViewMode('KANBAN')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'KANBAN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Kanban Board"
              >
                  <Columns size={18} />
              </button>
              <button 
                  onClick={() => setViewMode('LIST')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="List View"
              >
                  <List size={18} />
              </button>
            </div>
          )}
          
          {!showArchived && (
            <button 
              onClick={() => {
                setNewAssignee(currentUser.name);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} /> Create Issue
            </button>
          )}
        </div>
      </div>

      {viewMode === 'KANBAN' && !showArchived ? (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {COLUMNS.map(column => {
            const columnIssues = visibleIssues.filter(i => i.status === column.id);
            
            return (
              <div 
                key={column.id} 
                className={`flex-1 min-w-[300px] rounded-xl flex flex-col ${column.color} border border-slate-200/60`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, column.id)}
              >
                <div className="p-4 flex justify-between items-center border-b border-black/5">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    {column.title}
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 border border-slate-200">
                      {columnIssues.length}
                    </span>
                  </h3>
                  <MoreHorizontal size={16} className="text-slate-400 cursor-pointer" />
                </div>
                
                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                  {columnIssues.map(issue => (
                    <div 
                      key={issue.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, issue.id)}
                      onClick={() => setSelectedIssue(issue)}
                      className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-move group relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-slate-500 hover:underline cursor-pointer">{issue.key}</span>
                        <button 
                          onClick={(e) => deleteIssue(issue.id, e)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <h4 className="font-medium text-slate-800 mb-3 line-clamp-2">{issue.title}</h4>
                      
                      {issue.attachments && issue.attachments.length > 0 && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                          <Paperclip size={12} />
                          <span>{issue.attachments.length} attachment{issue.attachments.length > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${getPriorityColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                          {issue.reopenCount && issue.reopenCount > 0 ? (
                              <span className="text-[10px] flex items-center gap-0.5 text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded" title={`Reopened ${issue.reopenCount} times`}>
                                <RotateCcw size={10} /> {issue.reopenCount}
                              </span>
                          ) : null}
                          {issue.dueDate && (
                             <span className="text-[10px] flex items-center gap-0.5 text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                <Calendar size={10} className="flex-shrink-0" /> {new Date(issue.dueDate).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
                             </span>
                          )}
                        </div>
                        {getUserAvatar(issue.assignee)}
                      </div>
                    </div>
                  ))}
                  {columnIssues.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      {searchQuery ? 'No matches' : 'Drag items here'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4">Key</th>
                            <th className="p-4">Title</th>
                            <th className="p-4">Priority</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Assignee</th>
                            <th className="p-4">Due Date</th>
                            <th className="p-4">Created</th>
                            <th className="p-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visibleIssues.length === 0 ? (
                           <tr>
                               <td colSpan={8} className="p-12 text-center text-slate-400 text-sm">
                                  {showArchived ? (
                                    <div className="flex flex-col items-center gap-2">
                                       <Archive size={32} className="opacity-20" />
                                       <p>No archived issues found.</p>
                                    </div>
                                  ) : (
                                    searchQuery ? 'No issues match your search.' : 'No active issues found. Create one to get started!'
                                  )}
                               </td>
                           </tr>
                        ) : (
                            visibleIssues.map(issue => (
                                <tr 
                                  key={issue.id} 
                                  onClick={() => setSelectedIssue(issue)}
                                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 text-xs font-mono text-slate-500 font-medium">{issue.key}</td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-slate-800 truncate max-w-xs md:max-w-md">{issue.title}</p>
                                        {issue.attachments && issue.attachments.length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              <Paperclip size={10} /> {issue.attachments.length}
                                            </span>
                                        )}
                                        {issue.reopenCount && issue.reopenCount > 0 ? (
                                           <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 mt-0.5 ml-2">
                                              <RotateCcw size={10} /> Reopened {issue.reopenCount}x
                                           </span>
                                        ) : null}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${getPriorityColor(issue.priority)}`}>
                                            {issue.priority}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(issue.status)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {getUserAvatar(issue.assignee)}
                                            <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                                {issue.assignee || <span className="text-slate-400 italic">Unassigned</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                                       {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                                        {new Date(issue.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                       <button 
                                          onClick={(e) => deleteIssue(issue.id, e)}
                                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-red-50"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-xl font-bold text-slate-800">Create New Issue</h3>
               <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summary</label>
                <input 
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="What's the issue?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                  placeholder="Describe the steps to reproduce..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              {/* Attachment Section */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Attachments (Planning/Review)
                </label>
                <div 
                  onClick={() => attachmentInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input 
                    type="file"
                    multiple
                    className="hidden"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentSelect}
                    accept=".ppt,.pptx,.xlsx,.xls,.doc,.docx,.pdf,.zip,.jpg,.jpeg,.png,.mp4,.avi"
                  />
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <Paperclip size={20} />
                    <span className="text-xs">Click to attach PPT, Excel, Video, etc.</span>
                  </div>
                </div>

                {newAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {newAttachments.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2 truncate">
                           {getFileIcon(file.name)}
                           <span className="truncate max-w-[180px]">{file.name}</span>
                           <span className="text-xs text-slate-400">({formatFileSize(file.size)})</span>
                        </div>
                        <button onClick={() => removeNewAttachment(file.id)} className="text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as IssuePriority)}
                  >
                    {(['Low', 'Medium', 'High', 'Critical'] as IssuePriority[]).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assignee</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {users.map(user => (
                        <option key={user.id} value={user.name}>
                          {user.avatar} {user.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                      <ChevronDown size={14} className="text-slate-400"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={() => setShowCreateModal(false)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={createIssue}
                 disabled={!newTitle.trim()}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
               >
                 Create
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex-1 mr-8">
                <div className="flex items-center gap-3 mb-3">
                   <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                     {selectedIssue.key}
                   </span>
                   {selectedIssue.reopenCount && selectedIssue.reopenCount > 0 ? (
                     <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                       <RotateCcw size={12} /> Reopened {selectedIssue.reopenCount} times
                     </span>
                   ) : null}
                </div>
                <input 
                  className="text-2xl font-bold text-slate-900 w-full border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-300"
                  value={selectedIssue.title}
                  onChange={(e) => updateIssue({...selectedIssue, title: e.target.value})}
                  placeholder="Issue Title"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIssue(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                  <X size={24}/>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* Left: Main Content */}
               <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 custom-scrollbar">
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Description</label>
                    <textarea 
                      className="w-full min-h-[120px] p-4 text-sm text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y leading-relaxed"
                      value={selectedIssue.description}
                      onChange={(e) => updateIssue({...selectedIssue, description: e.target.value})}
                      placeholder="Add a description..."
                    />
                  </div>

                  {/* Attachments Section in Detail View */}
                  {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                     <div className="mb-8 bg-slate-50 rounded-lg border border-slate-200 p-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Paperclip size={14} /> Attached Planning Documents
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {selectedIssue.attachments.map(att => (
                              <button
                                key={att.id}
                                onClick={() => downloadAttachment(att)}
                                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                              >
                                 <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                    {getFileIcon(att.name)}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{att.name}</p>
                                    <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
                                 </div>
                                 <Download size={16} className="text-slate-300 group-hover:text-blue-500" />
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
                  
                  {/* Comments Section */}
                  <div className="mt-8 border-t border-slate-100 pt-8">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <MessageSquare size={16} /> Comments ({selectedIssue.comments?.length || 0})
                    </h4>
                    
                    <div className="space-y-6 mb-8">
                      {(!selectedIssue.comments || selectedIssue.comments.length === 0) && (
                        <p className="text-sm text-slate-400 italic">No comments yet.</p>
                      )}
                      {selectedIssue.comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm">
                            {comment.userAvatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-slate-800">{comment.userName}</span>
                              <span className="text-xs text-slate-400">{new Date(comment.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {comment.content}
                            </div>
                            {comment.image && (
                              <div className="mt-2">
                                <img src={comment.image} alt="Attachment" className="max-w-xs rounded-lg border border-slate-200 shadow-sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Comment Input */}
                    <div className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
                       <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm flex-shrink-0">
                         {currentUser.avatar}
                       </div>
                       <div className="flex-1 space-y-3 relative">
                          <textarea 
                             className="w-full text-sm outline-none resize-none bg-transparent placeholder:text-slate-400"
                             placeholder="Write a comment... (Type @ to mention)"
                             rows={2}
                             value={newCommentText}
                             onChange={handleCommentChange}
                          />
                          
                          {/* Mention Dropdown */}
                          {showMentionList && (
                             <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                   <div 
                                      key={user.id}
                                      onClick={() => selectMention(user.name)}
                                      className="p-2 hover:bg-slate-100 cursor-pointer flex items-center gap-2 text-sm"
                                   >
                                      <span>{user.avatar}</span>
                                      <span className="font-medium text-slate-700">{user.name}</span>
                                   </div>
                                )) : (
                                   <div className="p-2 text-xs text-slate-400 text-center">No user found</div>
                                )}
                             </div>
                          )}
                          
                          {newCommentImage && (
                            <div className="relative inline-block">
                              <img src={newCommentImage} alt="Preview" className="h-20 rounded-lg border border-slate-200" />
                              <button 
                                onClick={() => setNewCommentImage(undefined)}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-slate-200 shadow-sm hover:bg-red-50 hover:text-red-500"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <input 
                                 type="file" 
                                 accept="image/*" 
                                 className="hidden" 
                                 ref={commentFileRef}
                                 onChange={handleImageUpload}
                               />
                               <button 
                                 onClick={() => commentFileRef.current?.click()}
                                 className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                 title="Attach Image"
                               >
                                 <ImageIcon size={18} />
                               </button>
                             </div>
                             <button 
                               onClick={handleAddComment}
                               disabled={!newCommentText.trim() && !newCommentImage}
                               className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                             >
                               <Send size={14} /> Send
                             </button>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Right: Meta & Status */}
               <div className="w-full md:w-80 bg-slate-50/50 p-6 overflow-y-auto">
                 <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
                      <div className="relative">
                        {/* Overlay for closing dropdown */}
                        {showStatusMenu && (
                          <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)}></div>
                        )}
                        
                        <button 
                          onClick={() => setShowStatusMenu(!showStatusMenu)}
                          className="relative z-50 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                           <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="flex-shrink-0 flex items-center justify-center">
                                 {getStatusIcon(selectedIssue.status)}
                              </div>
                              <span className="truncate">
                                {selectedIssue.status === 'TODO' && 'To Do'}
                                {selectedIssue.status === 'IN_PROGRESS' && 'In Progress'}
                                {selectedIssue.status === 'DONE' && 'Done'}
                                {selectedIssue.status === 'ARCHIVED' && 'Archived'}
                              </span>
                           </div>
                           <ChevronDown size={14} className={`text-slate-400 transition-transform ml-2 flex-shrink-0 ${showStatusMenu ? 'rotate-180' : ''}`}/>
                        </button>

                        {showStatusMenu && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in-up">
                            {(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'] as IssueStatus[]).map(status => (
                                <button
                                   key={status}
                                   onClick={() => {
                                      updateIssue({...selectedIssue, status});
                                      setShowStatusMenu(false);
                                   }}
                                   className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left hover:bg-slate-50
                                     ${selectedIssue.status === status ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}
                                   `}
                                >
                                   <div className="flex-shrink-0">{getStatusIcon(status)}</div>
                                   <span className="flex-1 truncate">
                                     {status === 'TODO' && 'To Do'}
                                     {status === 'IN_PROGRESS' && 'In Progress'}
                                     {status === 'DONE' && 'Done'}
                                     {status === 'ARCHIVED' && 'Archived'}
                                   </span>
                                   {selectedIssue.status === status && <CheckCircle2 size={14} className="flex-shrink-0" />}
                                </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {selectedIssue.status === 'DONE' && (
                        <button 
                          onClick={handleReopen}
                          className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <RotateCcw size={14} /> Reopen Issue
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Priority</label>
                      <div className="flex flex-wrap gap-2">
                         {(['Low', 'Medium', 'High', 'Critical'] as IssuePriority[]).map(p => (
                            <button
                              key={p}
                              onClick={() => updateIssue({...selectedIssue, priority: p})}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                                selectedIssue.priority === p 
                                  ? getPriorityColor(p) + ' ring-1 ring-offset-1'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                         ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Due Date</label>
                      <div className="relative">
                         <input 
                            type="date"
                            className="w-full border border-slate-300 rounded-lg pl-10 p-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedIssue.dueDate || ''}
                            onChange={(e) => updateIssue({...selectedIssue, dueDate: e.target.value})}
                         />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar size={16} className="text-slate-400" />
                         </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 space-y-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Assignee</span>
                        <div className="relative">
                          <select 
                             className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                             value={selectedIssue.assignee || ''}
                             onChange={(e) => updateIssue({...selectedIssue, assignee: e.target.value})}
                          >
                             <option value="">Unassigned</option>
                             {users.map(user => (
                               <option key={user.id} value={user.name}>
                                 {user.avatar} {user.name}
                               </option>
                             ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown size={14} className="text-slate-400"/>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Resolver</span>
                        <div className="relative">
                          <select 
                             className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                             value={selectedIssue.resolver || ''}
                             onChange={(e) => updateIssue({...selectedIssue, resolver: e.target.value})}
                          >
                             <option value="">Unassigned</option>
                             {users.map(user => (
                               <option key={user.id} value={user.name}>
                                 {user.avatar} {user.name}
                               </option>
                             ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown size={14} className="text-slate-400"/>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Created</span>
                        <div className="text-xs text-slate-600 font-mono">
                          {new Date(selectedIssue.createdAt).toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Stats</span>
                        <div className="text-xs text-slate-600 flex justify-between">
                           <span>Reopened:</span>
                           <span className="font-mono font-bold">{selectedIssue.reopenCount || 0}</span>
                        </div>
                      </div>
                    </div>
                 </div>

                 <div className="mt-auto pt-8">
                    <button 
                      onClick={() => deleteIssue(selectedIssue.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} /> Delete Issue
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {issueToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
             <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Issue?</h3>
                <p className="text-slate-500 text-sm mb-6">
                  This action cannot be undone.<br/>
                  The issue and all its comments will be permanently removed.
                </p>
                
                <div className="flex gap-3">
                   <button 
                     onClick={() => setIssueToDelete(null)}
                     className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={confirmDelete}
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

export default IssueBoard;
