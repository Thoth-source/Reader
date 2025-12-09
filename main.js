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

// ------------------- Library Persistence -------------------
ipcMain.handle("library-get", async () => {
  await ensureStoreReady();
  return store.get("library", []);
});

ipcMain.handle("library-add", async (event, bookMeta) => {
  await ensureStoreReady();
  let library = store.get("library", []);
  const existingIndex = library.findIndex((b) => b.path === bookMeta.path);
  
  if (existingIndex >= 0) {
    // Update existing book (preserves tags, lastRead, etc.)
    library[existingIndex] = { ...library[existingIndex], ...bookMeta };
  } else {
    // Add new book
    library.push(bookMeta);
  }
  
  store.set("library", library);
  return library;
});

ipcMain.handle("library-remove", async (event, bookPath) => {
  await ensureStoreReady();
  let library = store.get("library", []);
  library = library.filter((b) => b.path !== bookPath);
  store.set("library", library);
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
