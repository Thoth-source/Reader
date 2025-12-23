const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let store;
let mainWindow;
async function initStore() {
  try {
    const { default: Store } = await import("electron-store");
    store = new Store();
  } catch (err) {
    console.error("Failed to initialize electron-store:", err);
  }
}
async function ensureStoreReady() {
  if (store) return;
  await initStore();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    try { mainWindow.center(); } catch {}
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("unresponsive", () => {
    dialog.showErrorBox("Window Unresponsive", "The renderer process is not responding.");
  });
  mainWindow.webContents.on("did-fail-load", (e, code, desc) => {
    dialog.showErrorBox("Load Failed", (desc || "") + " (" + code + ")");
  });
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    dialog.showErrorBox("Renderer Crashed", (details && details.reason) ? details.reason : "unknown");
  });
}

// Handle "Open With" - files opened via command line or file association
let pendingFileToOpen = null;

// macOS: Handle files opened via "Open With"
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  
  // If window is already created and ready, send the file immediately
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send("open-file", filePath);
  } else {
    // Store for later - will be sent when window is ready
    pendingFileToOpen = filePath;
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Windows/Linux: Handle files passed as command-line arguments when app is already running
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      try { mainWindow.center(); } catch {}
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
    
    // Check for file paths in command line arguments
    const filePaths = commandLine.slice(1).filter(arg => {
      const lower = arg.toLowerCase();
      return lower.endsWith('.epub') || lower.endsWith('.pdf');
    });
    
    if (filePaths.length > 0 && mainWindow) {
      // Send first file to open
      mainWindow.webContents.send("open-file", filePaths[0]);
    }
  });
}

app.whenReady().then(async () => {
  await initStore();
  prepareCachePath();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  // Determine file to open on startup (macOS pending or Windows/Linux command-line)
  let fileToOpen = pendingFileToOpen;
  
  if (!fileToOpen) {
    // Check for file paths in command-line arguments (Windows/Linux)
    const filePaths = process.argv.slice(1).filter(arg => {
      const lower = arg.toLowerCase();
      return lower.endsWith('.epub') || lower.endsWith('.pdf');
    });
    if (filePaths.length > 0) {
      fileToOpen = filePaths[0];
    }
  }
  
  // Send file to open after window is ready (if any)
  if (fileToOpen && mainWindow) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.send("open-file", fileToOpen);
    });
    pendingFileToOpen = null; // Clear pending file
  }
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// ------------------- Library Persistence (Multi-Library Support) -------------------

// Helper function to migrate old single-library data to new multi-library format
function migrateToMultiLibrary() {
  const oldLibrary = store.get("library");
  const libraries = store.get("libraries");
  
  // If we have old format data and no new format, migrate
  if (Array.isArray(oldLibrary) && oldLibrary.length > 0 && !libraries) {
    store.set("libraries", {
      "Default": oldLibrary
    });
    store.set("currentLibrary", "Default");
    store.delete("library"); // Clean up old format
    console.log("Migrated library data to multi-library format");
  }
  
  // Ensure we have at least a Default library
  if (!store.get("libraries")) {
    store.set("libraries", { "Default": [] });
  }
  if (!store.get("currentLibrary")) {
    store.set("currentLibrary", "Default");
  }
}

// Get current library name
ipcMain.handle("library-get-current-name", async () => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  return store.get("currentLibrary", "Default");
});

// Get all library names
ipcMain.handle("library-get-all-names", async () => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", { "Default": [] });
  return Object.keys(libraries);
});

// Switch to a different library
ipcMain.handle("library-switch", async (event, libraryName) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", {});
  if (libraries[libraryName]) {
    store.set("currentLibrary", libraryName);
    return { success: true, library: libraries[libraryName] };
  }
  return { success: false, error: "Library not found" };
});

// Create a new library
ipcMain.handle("library-create", async (event, libraryName) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", {});
  
  if (libraries[libraryName]) {
    return { success: false, error: "Library already exists" };
  }
  
  libraries[libraryName] = [];
  store.set("libraries", libraries);
  return { success: true, names: Object.keys(libraries) };
});

// Rename a library
ipcMain.handle("library-rename", async (event, { oldName, newName }) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", {});
  
  if (!libraries[oldName]) {
    return { success: false, error: "Library not found" };
  }
  if (libraries[newName]) {
    return { success: false, error: "A library with that name already exists" };
  }
  
  libraries[newName] = libraries[oldName];
  delete libraries[oldName];
  store.set("libraries", libraries);
  
  // Update currentLibrary if it was the renamed one
  if (store.get("currentLibrary") === oldName) {
    store.set("currentLibrary", newName);
  }
  
  return { success: true, names: Object.keys(libraries), currentLibrary: store.get("currentLibrary") };
});

// Delete a library
ipcMain.handle("library-delete", async (event, libraryName) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", {});
  
  if (!libraries[libraryName]) {
    return { success: false, error: "Library not found" };
  }
  
  // Can't delete the last library
  if (Object.keys(libraries).length <= 1) {
    return { success: false, error: "Cannot delete the last library" };
  }
  
  delete libraries[libraryName];
  store.set("libraries", libraries);
  
  // If current library was deleted, switch to first available
  let currentLibrary = store.get("currentLibrary");
  if (currentLibrary === libraryName) {
    currentLibrary = Object.keys(libraries)[0];
    store.set("currentLibrary", currentLibrary);
  }
  
  return { success: true, names: Object.keys(libraries), currentLibrary };
});

// Move a book to another library
ipcMain.handle("library-move-book", async (event, { bookPath, targetLibrary }) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", {});
  const currentLibrary = store.get("currentLibrary", "Default");
  
  if (!libraries[targetLibrary]) {
    return { success: false, error: "Target library not found" };
  }
  
  // Find the book in current library
  const bookIndex = libraries[currentLibrary].findIndex(b => b.path === bookPath);
  if (bookIndex < 0) {
    return { success: false, error: "Book not found in current library" };
  }
  
  // Move the book
  const book = libraries[currentLibrary][bookIndex];
  libraries[currentLibrary].splice(bookIndex, 1);
  
  // Check if book already exists in target library
  const targetIndex = libraries[targetLibrary].findIndex(b => b.path === bookPath);
  if (targetIndex < 0) {
    libraries[targetLibrary].push(book);
  }
  
  store.set("libraries", libraries);
  return { success: true, library: libraries[currentLibrary] };
});

// Get books from current library
ipcMain.handle("library-get", async () => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", { "Default": [] });
  const currentLibrary = store.get("currentLibrary", "Default");
  return libraries[currentLibrary] || [];
});

// Add book to current library
ipcMain.handle("library-add", async (event, bookMeta) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", { "Default": [] });
  const currentLibrary = store.get("currentLibrary", "Default");
  
  if (!libraries[currentLibrary]) {
    libraries[currentLibrary] = [];
  }
  
  let library = libraries[currentLibrary];
  const existingIndex = library.findIndex((b) => b.path === bookMeta.path);
  
  if (existingIndex >= 0) {
    // Update existing book (preserves tags, lastRead, etc.)
    library[existingIndex] = { ...library[existingIndex], ...bookMeta };
  } else {
    // Add new book
    library.push(bookMeta);
  }
  
  libraries[currentLibrary] = library;
  store.set("libraries", libraries);
  return library;
});

// Remove book from current library
ipcMain.handle("library-remove", async (event, bookPath) => {
  await ensureStoreReady();
  migrateToMultiLibrary();
  const libraries = store.get("libraries", { "Default": [] });
  const currentLibrary = store.get("currentLibrary", "Default");
  
  let library = libraries[currentLibrary] || [];
  library = library.filter((b) => b.path !== bookPath);
  libraries[currentLibrary] = library;
  store.set("libraries", libraries);
  return library;
});

// ------------------- File Access -------------------
ipcMain.handle("read-book", async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return data; // Returns Buffer
  } catch (err) {
    console.error("Failed to read book file:", err);
    throw err;
  }
});

// ------------------- TTS Bridge -------------------
ipcMain.handle("request-tts", async (event, { text, apiKey, voice }) => {
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: voice,
        input: text
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI TTS error: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  } catch (err) {
    console.error("TTS ERROR:", err);
    return "";
  }
});

// ------------------- MP3 Recording -------------------
// Get the app's audio storage directory
function getAudioStoragePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'audiobooks');
}

ipcMain.handle("get-audio-storage-path", async () => {
  return getAudioStoragePath();
});

ipcMain.handle("select-output-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select folder to save MP3 files'
  });
  
  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle("create-audio-folder", async (event, bookName) => {
  try {
    const audioBasePath = getAudioStoragePath();
    const sanitizedName = bookName.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);
    const bookAudioPath = path.join(audioBasePath, sanitizedName);
    
    // Create directories if they don't exist
    await fs.promises.mkdir(bookAudioPath, { recursive: true });
    
    return { success: true, path: bookAudioPath };
  } catch (err) {
    console.error("Failed to create audio folder:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("save-mp3-chunk", async (event, { folderPath, fileName, base64Audio }) => {
  try {
    // Ensure the folder exists
    await fs.promises.mkdir(folderPath, { recursive: true });
    
    const filePath = path.join(folderPath, fileName);
    const buffer = Buffer.from(base64Audio, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    console.error("Failed to save MP3:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("check-audio-file-exists", async (event, filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("generate-tts-chunk", async (event, { text, apiKey, voice }) => {
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: voice,
        input: text
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI TTS error: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { success: true, audio: buffer.toString("base64") };
  } catch (err) {
    console.error("TTS ERROR:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("export-notes-pdf", async (event, { title, html }) => {
  try {
    const result = await dialog.showSaveDialog({
      title: "Export Notes PDF",
      defaultPath: `${(title || "Notes").replace(/[/\\?%*:|"<>]/g, "_")}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: "canceled" };
    }
    const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true } });
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await win.loadURL(dataUrl);
    const pdfBuffer = await win.webContents.printToPDF({ printBackground: true, pageSize: "A4" });
    await fs.promises.writeFile(result.filePath, pdfBuffer);
    win.destroy();
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export highlights to Markdown (Obsidian format)
ipcMain.handle("export-notes-markdown", async (event, { title, content }) => {
  try {
    const result = await dialog.showSaveDialog({
      title: "Export Notes to Markdown",
      defaultPath: `${(title || "Notes").replace(/[/\\?%*:|"<>]/g, "_")}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: "canceled" };
    }
    await fs.promises.writeFile(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export reading positions
ipcMain.handle("export-reading-positions", async (event, { data }) => {
  try {
    const result = await dialog.showSaveDialog({
      title: "Export Reading Positions",
      defaultPath: `reader-positions-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: "canceled" };
    }
    await fs.promises.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Import reading positions
ipcMain.handle("import-reading-positions", async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Import Reading Positions",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: "canceled" };
    }
    const content = await fs.promises.readFile(result.filePaths[0], 'utf-8');
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
// Reduce cache-related failures on restricted environments
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function prepareCachePath() {
  try {
    const userData = app.getPath('userData');
    const cachePath = path.join(userData, 'Cache');
    fs.mkdirSync(cachePath, { recursive: true });
    app.setPath('cache', cachePath);
  } catch (e) {
    console.error('Failed to prepare cache path:', e);
  }
}
