import React, { useState, useMemo, useEffect } from 'react';
import { Note, NoteTreeItem } from './types';
import { SidebarItem } from './components/SidebarItem';
import { Editor } from './components/Editor';
import { Icon } from './components/Icon';
import { Button } from './components/Button';

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

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('texnote-notes');
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch (e) {
      console.error("Failed to parse notes from local storage", e);
      return INITIAL_NOTES;
    }
  });
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem('texnote-notes', JSON.stringify(notes));
    } catch (e) {
      console.error("Failed to save notes", e);
    }
  }, [notes]);

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
    
    // If we're adding a child, ensure parent is expanded
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
    // Helper to get all descendant IDs to delete recursively
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
          <Button size="icon" variant="ghost" onClick={() => handleCreateNote(null)} title="New Notebook">
            <Icon name="PlusCircle" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {noteTree.length === 0 ? (
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
        
        <div className="p-3 border-t border-slate-200 text-xs text-slate-400 text-center">
          {notes.length} notes stored
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-white shadow-xl z-0 relative">
        {/* Toggle Sidebar Button (visible when sidebar closed or mobile) */}
        {!isSidebarOpen && (
           <div className="absolute top-4 left-4 z-20">
             <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)}>
               <Icon name="Menu" />
             </Button>
           </div>
        )}

        {/* Floating toggle for desktop convenience when open */}
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
          <Editor 
            note={selectedNote} 
            onUpdate={handleUpdateNote} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
            <Icon name="FileText" size={64} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-400">Select a note to view or edit</p>
            <p className="text-sm mt-2">or create a new notebook from the sidebar</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
