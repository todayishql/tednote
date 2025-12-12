export interface Note {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isExpanded?: boolean; // For UI state in sidebar
}

export type NoteTreeItem = Note & {
  children: NoteTreeItem[];
  depth: number;
};
