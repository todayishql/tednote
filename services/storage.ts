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
        const isJsonBin = config.apiUrl.includes('jsonbin.io');
        
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            // JSONBin uses a specific header, others usually use Bearer
            if (isJsonBin) {
                headers['X-Master-Key'] = config.apiKey;
            } else {
                headers['Authorization'] = `Bearer ${config.apiKey}`;
            }
        }
        
        const response = await fetch(config.apiUrl, { method: 'GET', headers });
        if (!response.ok) throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        
        // JSONBin wraps the data in a 'record' property
        if (isJsonBin && data.record && Array.isArray(data.record)) {
            const notes = data.record;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            return notes;
        }

        // Generic API handling
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
       const isJsonBin = config.apiUrl.includes('jsonbin.io');
       const headers: HeadersInit = { 'Content-Type': 'application/json' };
       
       if (config.apiKey) {
           if (isJsonBin) {
               headers['X-Master-Key'] = config.apiKey;
           } else {
               headers['Authorization'] = `Bearer ${config.apiKey}`;
           }
       }

       // JSONBin uses PUT to update an existing bin, generic APIs often use POST
       const method = isJsonBin ? 'PUT' : 'POST';

       const response = await fetch(config.apiUrl, {
          method,
          headers,
          body: JSON.stringify(notes),
       });
       
       if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    } 
  }
};
