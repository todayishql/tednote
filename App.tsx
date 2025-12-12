import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Note, NoteTreeItem } from './types';
import { SidebarItem } from './components/SidebarItem';
import { Editor } from './components/Editor';
import { Icon } from './components/Icon';
import { Button } from './components/Button';
import { storage, StorageConfig } from './services/storage';

// Initial dummy data
const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    parentId: null,
    title: 'Physics 101',
    content: '# Physics 101\n\nWelcome to your physics notebook. Start by adding some equations.\n\n## Kinematics\n\nThe position of a particle is given by:\n\n$$\nx(t) = x_0 + v_0 t + \\frac{1}{2} a t^2\n$$\n',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isExpanded: true,
  },
  {
    id: '2',
    parentId: '1',
    title: 'Quantum Mechanics',
    content: '# Quantum Mechanics\n\nThe Schrödinger equation:\n\n$$\ni\\hbar\\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r},t) = \\hat{H} \\Psi(\\mathbf{r},t)\n$$\n',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isExpanded: false,
  },
  {
    id: '3',
    parentId: null,
    title: 'Math Notes',
    content: '# Calculus\n\nLet\'s talk about integrals.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isExpanded: false,
  },
];

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

const App: React.FC = () => {
  // Storage Config State
  const [config, setConfig] = useState<StorageConfig>(() => {
    const saved = localStorage.getItem('texnote-config');
    return saved ? JSON.parse(saved) : { apiUrl: '', apiKey: '' };
  });
  const [showSettings, setShowSettings] = useState(false);

  // Data State
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sync Status State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initial Load
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      try {
        const loadedNotes = await storage.load(config);
        if (loadedNotes) {
          setNotes(loadedNotes);
          if (loadedNotes.length > 0 && !selectedNoteId) {
             setSelectedNoteId(loadedNotes[0].id);
          }
        } else {
             // Fallback to initial if nothing loaded anywhere
             setSelectedNoteId(INITIAL_NOTES[0].id);
        }
      } catch (e) {
        console.error("Load failed", e);
        // Even if backend fails, we might have local data from storage.load fallback, 
        // but if that fails too, we keep INITIAL_NOTES
        setErrorMessage("Failed to load notes from backend. Using offline mode.");
      } finally {
        setIsLoading(false);
      }
    };
    initLoad();
  }, [config.apiUrl]); // Reload if API URL changes

  // Save / Sync Logic (Debounced)
  useEffect(() => {
    if (isLoading) return; // Don't save while initial loading

    setSyncStatus('syncing');
    setErrorMessage(null);

    const timer = setTimeout(async () => {
      try {
        await storage.save(notes, config);
        setSyncStatus('saved');
        setLastSynced(Date.now());
      } catch (e) {
        console.error(e);
        setSyncStatus('error');
        setErrorMessage("Sync failed. Data saved locally.");
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [notes, config, isLoading]);


  // Update config wrapper
  const handleSaveConfig = (newConfig: StorageConfig) => {
    setConfig(newConfig);
    localStorage.setItem('texnote-config', JSON.stringify(newConfig));
    setShowSettings(false);
  };

  // Convert flat list to tree
  const noteTree = useMemo(() => {
    const buildTree = (parentId: string | null, depth: number = 0): NoteTreeItem[] => {
      return notes
        .filter((note) => note.parentId === parentId)
        .map((note) => ({
          ...note,
          depth,
          children: buildTree(note.id, depth + 1),
        }))
        .sort((a, b) => b.createdAt - a.createdAt); // Newest first
    };
    return buildTree(null);
  }, [notes]);

  const selectedNote = useMemo(() => 
    notes.find(n => n.id === selectedNoteId), 
  [notes, selectedNoteId]);

  // --- Actions ---

  const handleCreateNote = (parentId: string | null = null) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      parentId,
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isExpanded: true,
    };

    setNotes(prev => [newNote, ...prev]);
    if (parentId) {
      setNotes(prev => prev.map(n => 
        n.id === parentId ? { ...n, isExpanded: true } : n
      ));
    }
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
    ));
  };

  const handleDeleteNote = (id: string) => {
    const getDescendants = (rootId: string): string[] => {
      const children = notes.filter(n => n.parentId === rootId);
      return [rootId, ...children.flatMap(c => getDescendants(c.id))];
    };
    const idsToDelete = new Set(getDescendants(id));
    setNotes(prev => prev.filter(n => !idsToDelete.has(n.id)));
    if (selectedNoteId && idsToDelete.has(selectedNoteId)) {
      setSelectedNoteId(null);
    }
  };

  const handleToggleExpand = (id: string) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, isExpanded: !n.isExpanded } : n
    ));
  };

  // --- Import / Export Handlers ---
  const handleExport = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `texnote-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
            if (window.confirm(`Overwrite ${notes.length} notes with backup?`)) {
                setNotes(parsed);
                setSelectedNoteId(parsed[0].id);
            }
        } else {
            alert("Invalid backup file.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      
      {/* Sidebar */}
      <aside 
        className={`
          flex-shrink-0 bg-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
        `}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-slate-50 z-10">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
            <Icon name="BookOpen" className="text-indigo-600" />
            TexNote
          </div>
          <div className="flex gap-1">
             <Button size="icon" variant="ghost" onClick={() => setShowSettings(true)} title="Settings">
               <Icon name="Settings" size={18} />
             </Button>
             <Button size="icon" variant="ghost" onClick={() => handleCreateNote(null)} title="New Notebook">
               <Icon name="PlusCircle" />
             </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center mt-10 text-slate-400 gap-2">
                <Icon name="Loader2" className="animate-spin" />
                <span className="text-xs">Loading notebooks...</span>
             </div>
          ) : noteTree.length === 0 ? (
            <div className="text-center text-slate-400 mt-10 text-sm px-4">
              <p className="mb-2">No notebooks yet.</p>
              <Button size="sm" variant="secondary" onClick={() => handleCreateNote(null)}>Create One</Button>
            </div>
          ) : (
            noteTree.map(item => (
              <SidebarItem
                key={item.id}
                item={item}
                selectedId={selectedNoteId}
                onSelect={setSelectedNoteId}
                onToggleExpand={handleToggleExpand}
                onAddChild={handleCreateNote}
                onDelete={handleDeleteNote}
              />
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-3">
          {/* Sync Status Indicator */}
          <div className="flex items-center justify-between text-xs px-1">
             <div className="flex items-center gap-1.5">
                {syncStatus === 'syncing' && <Icon name="Loader2" className="animate-spin text-indigo-500" size={12} />}
                {syncStatus === 'saved' && <Icon name="CheckCircle" className="text-green-500" size={12} />}
                {syncStatus === 'error' && <Icon name="AlertCircle" className="text-red-500" size={12} />}
                {syncStatus === 'idle' && <Icon name="Cloud" className="text-slate-400" size={12} />}
                
                <span className={`${syncStatus === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
                  {syncStatus === 'syncing' && 'Syncing...'}
                  {syncStatus === 'saved' && 'Saved'}
                  {syncStatus === 'error' && 'Sync failed'}
                  {syncStatus === 'idle' && 'Offline'}
                </span>
             </div>
             {config.apiUrl && (
                 <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Backend Active</span>
             )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 h-8 text-xs" onClick={handleExport} title="Download backup file">
              <Icon name="Download" size={14} className="mr-2" /> Export
            </Button>
            <div className="relative flex-1">
                <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Upload backup file"
                />
                <Button variant="secondary" size="sm" className="w-full h-8 text-xs pointer-events-none">
                    <Icon name="Upload" size={14} className="mr-2" /> Import
                </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-white shadow-xl z-0 relative">
        {!isSidebarOpen && (
           <div className="absolute top-4 left-4 z-20">
             <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)}>
               <Icon name="Menu" />
             </Button>
           </div>
        )}
        {isSidebarOpen && (
           <div className="absolute top-1/2 -left-3 z-20 hidden md:block group">
             <button 
                onClick={() => setIsSidebarOpen(false)}
                className="bg-white border border-slate-200 rounded-full p-1 shadow-md text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all"
             >
               <Icon name="ChevronLeft" size={14} />
             </button>
           </div>
        )}

        {selectedNote ? (
          <Editor note={selectedNote} onUpdate={handleUpdateNote} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
            <Icon name="FileText" size={64} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-400">Select a note to view or edit</p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Icon name="Settings" className="text-slate-500" /> Storage Settings
                    </h2>
                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                        <Icon name="X" size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100">
                        <strong>Recommended Free Option:</strong>
                        <p className="mt-1">
                           Use <a href="https://jsonbin.io" target="_blank" className="underline font-bold">JSONBin.io</a>. 
                           Create a bin with <code>[]</code>, then paste the <strong>Bin URL</strong> and <strong>Master Key</strong> below.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Backend API URL</label>
                        <input 
                            type="text" 
                            placeholder="https://api.jsonbin.io/v3/b/..."
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            defaultValue={config.apiUrl}
                            id="apiUrlInput"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">API Key (Bearer Token or Master Key)</label>
                        <input 
                            type="password" 
                            placeholder="Key..."
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            defaultValue={config.apiKey}
                            id="apiKeyInput"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowSettings(false)}>Cancel</Button>
                    <Button onClick={() => {
                        const apiUrl = (document.getElementById('apiUrlInput') as HTMLInputElement).value;
                        const apiKey = (document.getElementById('apiKeyInput') as HTMLInputElement).value;
                        handleSaveConfig({ apiUrl, apiKey });
                    }}>Save Configuration</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
