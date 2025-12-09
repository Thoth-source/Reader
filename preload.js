const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  requestTTS: (text, apiKey, voice) =>
    ipcRenderer.invoke("request-tts", { text, apiKey, voice }),

  // Library Persistence
  getLibrary: () => ipcRenderer.invoke("library-get"),
  addToLibrary: (bookMeta) => ipcRenderer.invoke("library-add", bookMeta),
  removeFromLibrary: (path) => ipcRenderer.invoke("library-remove", path),

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
  
  // Open With - listen for files opened via command line or file association
  onOpenFile: (callback) => {
    ipcRenderer.on("open-file", (event, filePath) => callback(filePath));
  }
});
