const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  requestTTS: (text, apiKey, voice) =>
    ipcRenderer.invoke("request-tts", { text, apiKey, voice }),

  // Library Persistence (Multi-Library Support)
  getLibrary: () => ipcRenderer.invoke("library-get"),
  addToLibrary: (bookMeta) => ipcRenderer.invoke("library-add", bookMeta),
  removeFromLibrary: (path) => ipcRenderer.invoke("library-remove", path),
  
  // Multi-Library Management
  getCurrentLibraryName: () => ipcRenderer.invoke("library-get-current-name"),
  getAllLibraryNames: () => ipcRenderer.invoke("library-get-all-names"),
  switchLibrary: (name) => ipcRenderer.invoke("library-switch", name),
  createLibrary: (name) => ipcRenderer.invoke("library-create", name),
  renameLibrary: (oldName, newName) => ipcRenderer.invoke("library-rename", { oldName, newName }),
  deleteLibrary: (name) => ipcRenderer.invoke("library-delete", name),
  moveBookToLibrary: (bookPath, targetLibrary) => ipcRenderer.invoke("library-move-book", { bookPath, targetLibrary }),

  // File Reading (delegated to Main process to avoid sandbox issues)
  readBook: (filePath) => ipcRenderer.invoke("read-book", filePath),
  
  // MP3 Recording
  selectOutputFolder: () => ipcRenderer.invoke("select-output-folder"),
  getAudioStoragePath: () => ipcRenderer.invoke("get-audio-storage-path"),
  createAudioFolder: (bookName) => ipcRenderer.invoke("create-audio-folder", bookName),
  saveMp3Chunk: (folderPath, fileName, base64Audio) => 
    ipcRenderer.invoke("save-mp3-chunk", { folderPath, fileName, base64Audio }),
  generateTtsChunk: (text, apiKey, voice) =>
    ipcRenderer.invoke("generate-tts-chunk", { text, apiKey, voice }),
  checkAudioFileExists: (filePath) => ipcRenderer.invoke("check-audio-file-exists", filePath),
  exportNotesPdf: (title, html) => ipcRenderer.invoke("export-notes-pdf", { title, html }),
  
  // Obsidian/Markdown export
  exportNotesMarkdown: (title, content) => ipcRenderer.invoke("export-notes-markdown", { title, content }),
  
  // Reading position sync
  exportReadingPositions: (data) => ipcRenderer.invoke("export-reading-positions", { data }),
  importReadingPositions: () => ipcRenderer.invoke("import-reading-positions"),
  
  // Open With - listen for files opened via command line or file association
  onOpenFile: (callback) => {
    ipcRenderer.on("open-file", (event, filePath) => callback(filePath));
  }
});
