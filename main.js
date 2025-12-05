const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch"); // make sure installed

let store;

// Initialize electron-store dynamically
(async () => {
  try {
    const { default: Store } = await import("electron-store");
    store = new Store();
    console.log("Electron Store initialized successfully");
  } catch (err) {
    console.error("Failed to initialize electron-store:", err);
  }
})();

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    autoHideMenuBar: true, // Hide menu bar, press Alt to show
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
      allowRunningInsecureContent: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false // Explicitly disable sandbox to ensure preload works
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// ------------------- Library Persistence -------------------
ipcMain.handle("library-get", async () => {
  if (!store) {
    console.warn("Store not ready yet for library-get");
    return [];
  }
  return store.get("library", []);
});

ipcMain.handle("library-add", async (event, bookMeta) => {
  if (!store) {
    console.error("Store not ready yet for library-add");
    return [];
  }
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
  if (!store) return [];
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
