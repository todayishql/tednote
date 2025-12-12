import React from 'react';
import { NoteTreeItem } from '../types';
import { Icon } from './Icon';
import { Button } from './Button';

interface SidebarItemProps {
  item: NoteTreeItem;
  selectedId: string | null;
  unlockedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  selectedId,
  unlockedIds,
  onSelect,
  onToggleExpand,
  onAddChild,
  onDelete,
}) => {
  const isSelected = selectedId === item.id;
  const hasChildren = item.children.length > 0;
  
  // A note is visible (unlocked for viewing details) if it is NOT locked OR it is in the unlocked set
  const isUnlocked = !item.isLocked || unlockedIds.has(item.id);

  // Only show children if expanded AND unlocked
  const showChildren = item.isExpanded && hasChildren && isUnlocked;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUnlocked) {
        // If locked, clicking chevron selects it to prompt password
        onSelect(item.id);
    } else {
        onToggleExpand(item.id);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddChild(item.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note and all its children?')) {
      onDelete(item.id);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`
          group flex items-center gap-1.5 py-1.5 px-2 pr-1 rounded-md cursor-pointer text-sm transition-colors
          ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        `}
        style={{ paddingLeft: `${Math.max(8, item.depth * 16 + 8)}px` }}
        onClick={() => onSelect(item.id)}
      >
        <div
          className={`p-0.5 rounded-sm hover:bg-slate-200 ${item.children.length === 0 ? 'invisible' : ''}`}
          onClick={handleExpandClick}
        >
          <Icon 
            name={item.isExpanded && isUnlocked ? 'ChevronDown' : 'ChevronRight'} 
            size={14} 
            className={!isUnlocked && item.children.length > 0 ? "text-slate-300" : "text-slate-400"}
          />
        </div>
        
        {item.isLocked ? (
          <Icon name="Lock" size={14} className={isUnlocked ? "text-slate-400" : "text-amber-500"} />
        ) : (
          <Icon 
            name={hasChildren ? (item.isExpanded && isUnlocked ? 'FolderOpen' : 'Folder') : 'FileText'} 
            size={16} 
            className={isSelected ? 'text-indigo-600' : 'text-slate-400'} 
          />
        )}
        
        <span className="truncate flex-1">{item.title || 'Untitled Note'}</span>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isUnlocked && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                onClick={handleAddClick}
                title="Add Child Page"
              >
                <Icon name="Plus" size={12} />
              </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-red-600"
            onClick={handleDeleteClick}
            title="Delete Page"
          >
            <Icon name="Trash2" size={12} />
          </Button>
        </div>
      </div>

      {showChildren && (
        <div>
          {item.children.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              selectedId={selectedId}
              unlockedIds={unlockedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
