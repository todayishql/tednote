import { Note } from '../types';

const STORAGE_KEY = 'texnote-notes';

export interface StorageConfig {
  apiUrl: string;
  apiKey: string;
}

export const storage = {
  // Load notes from backend if configured, otherwise local storage
  async load(config: StorageConfig): Promise<Note[] | null> {
    if (config.apiUrl) {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        
        const response = await fetch(config.apiUrl, { method: 'GET', headers });
        if (!response.ok) throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        // Validation: Ensure it's an array
        if (!Array.isArray(data)) throw new Error("Backend response is not an array of notes");
        
        // Update local cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      } catch (e) {
        console.error('Backend load failed:', e);
        throw e;
      }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    }
  },

  // Save notes to backend if configured, AND always save to local storage
  async save(notes: Note[], config: StorageConfig): Promise<void> {
    // Always save to local as backup/cache immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));

    if (config.apiUrl) {
       const headers: HeadersInit = { 'Content-Type': 'application/json' };
       if (config.apiKey) {
           headers['Authorization'] = `Bearer ${config.apiKey}`;
       }

       const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(notes),
       });
       
       if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    } 
  }
};
