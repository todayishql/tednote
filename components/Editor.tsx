import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Icon } from './Icon';

interface EditorProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

export const Editor: React.FC<EditorProps> = ({ note, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'split'>('split');
  
  // Handle mobile responsiveness for initial tab state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setActiveTab('write');
      }
    };
    handleResize(); // Check initially
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const insertText = (textToInsert: string, cursorOffset: number = 0) => {
    const textarea = document.getElementById('note-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = note.content;
    
    // If there is a selection, wrap it (for simple wrappers like bold/italic/color)
    const selection = text.substring(start, end);
    let finalInsert = textToInsert;
    
    // Handle wrapping logic simply
    if (selection.length > 0) {
       // Logic to replace placeholder with selection if needed, or just append
       // For this simple implementation, if we have a selection and the insert text looks like a wrapper, we wrap it.
       if (textToInsert === '**Bold**') finalInsert = `**${selection}**`;
       else if (textToInsert === '*Italic*') finalInsert = `*${selection}*`;
       else if (textToInsert.includes('Colored Text')) finalInsert = textToInsert.replace('Colored Text', selection);
    }

    const newText = text.substring(0, start) + finalInsert + text.substring(end);
    
    onUpdate(note.id, { content: newText });
    
    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + finalInsert.length + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 pb-2">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          placeholder="Untitled Note"
          className="w-full text-3xl font-bold text-slate-800 placeholder-slate-300 focus:outline-none"
        />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-1 text-slate-500">
            <button 
              onClick={() => insertText('**Bold**')} 
              className="p-1.5 hover:bg-slate-100 rounded" title="Bold">
              <Icon name="Bold" size={16} />
            </button>
            <button 
              onClick={() => insertText('*Italic*')} 
              className="p-1.5 hover:bg-slate-100 rounded" title="Italic">
              <Icon name="Italic" size={16} />
            </button>
            <button 
              onClick={() => insertText('<span style="color: #ef4444">Colored Text</span>')} 
              className="p-1.5 hover:bg-slate-100 rounded" title="Color (Red)">
              <Icon name="Palette" size={16} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => insertText('$ x^2 $')} 
              className="p-1.5 hover:bg-slate-100 rounded font-mono text-xs font-bold" title="Inline Math">
              ∑
            </button>
            <button 
              onClick={() => insertText('\n$$\n\\frac{a}{b}\n$$\n')} 
              className="p-1.5 hover:bg-slate-100 rounded font-mono text-xs font-bold" title="Block Math">
              $$
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => insertText('- List Item')} 
              className="p-1.5 hover:bg-slate-100 rounded" title="List">
              <Icon name="List" size={16} />
            </button>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('write')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Write
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`hidden md:block px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Split
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 flex">
          {/* Editor Pane */}
          <div className={`
            flex-1 h-full flex flex-col
            ${activeTab === 'preview' ? 'hidden' : 'flex'}
            ${activeTab === 'split' ? 'border-r border-slate-200 w-1/2' : 'w-full'}
          `}>
            <textarea
              id="note-editor"
              value={note.content}
              onChange={(e) => onUpdate(note.id, { content: e.target.value })}
              className="flex-1 w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-800 bg-white"
              placeholder="Start writing... Use Markdown and LaTeX (e.g., $E=mc^2$)"
              spellCheck={false}
            />
          </div>

          {/* Preview Pane */}
          <div className={`
            flex-1 h-full bg-slate-50 overflow-y-auto
            ${activeTab === 'write' ? 'hidden' : 'block'}
            ${activeTab === 'split' ? 'w-1/2' : 'w-full'}
          `}>
            <div className="p-8 max-w-3xl mx-auto">
              {note.content.trim() ? (
                <MarkdownRenderer content={note.content} />
              ) : (
                <div className="text-slate-400 italic text-center mt-20">
                  Preview area is empty
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};