// App initialized

// -------------------------------------------------------
// LOADING SCREEN
// -------------------------------------------------------
const loadingScreen = document.getElementById("loading-screen");
let loadingStartTime = Date.now();

function hideLoadingScreen() {
  // Minimum display time for smooth UX (at least see the animation)
  const elapsed = Date.now() - loadingStartTime;
  const minDisplayTime = 1800; // Show for at least 1.8 seconds
  const remainingTime = Math.max(0, minDisplayTime - elapsed);
  
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
      // Remove from DOM after animation completes
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500);
    }
  }, remainingTime);
}

// Fallback: hide loading screen after 5 seconds no matter what
setTimeout(() => {
  if (loadingScreen && !loadingScreen.classList.contains("hidden")) {
    console.warn("Loading screen fallback triggered");
    hideLoadingScreen();
  }
}, 5000);


// -------------------------------------------------------
// STATE & GLOBALS
// -------------------------------------------------------
let library = [];
let currentLibraryName = 'Default';
let allLibraryNames = ['Default'];
let book1, rendition1;
let book2, rendition2;
let pdf1, pdf2; // PDF document instances
let pdfPage1 = 1, pdfPage2 = 1; // Current PDF pages
let pdfTotalPages1 = 0, pdfTotalPages2 = 0;
let viewerType1 = null; // 'epub' or 'pdf'
let viewerType2 = null;
let pdfZoom1 = 1.0, pdfZoom2 = 1.0; // Zoom levels for scroll mode
let pdfViewMode = 'paged'; // 'paged' or 'scroll'
let pdfTextContent = { 1: null, 2: null }; // Extracted text per slot: { pageTextMap: {1: "text...", 2: "..."} }
let pdfOutline = { 1: null, 2: null }; // Extracted outline/bookmarks per slot
let isPdfTextSelecting = false; // Flag to prevent re-rendering during text selection
let hasAppliedDefaultView = false; // Track if default view was already applied this session
let isPlaying = false;
let isPaused = false;
let isAborted = false;
let currentAudio = null;
let ttsChunks = [];
let currentChunkIndex = 0;
let ttsAbortController = null;
// TTS volume (0.0 to 1.0)
let ttsVolume = parseFloat(localStorage.getItem("tts_volume") || "1.0");
let targetSlot = 1;
let focusedSlot = 1;
let currentFilter = 'all';
let currentSort = 'recent';
let librarySearchTerm = '';
let selectedTagColor = '#5ba4e6';
let editingBookPath = null;

// Search, Bookmarks, Highlights state
let searchResults = [];
let currentSearchIndex = 0;
let pendingHighlight = null; // Stores selection info before highlight/note is added
let selectedHighlightColor = '#ffeb3b';

// -------------------------------------------------------
// DOM ELEMENTS
// -------------------------------------------------------
const views = {
  library: document.getElementById("library-page"),
  reader: document.getElementById("reader-page"),
};

const navBtns = {
  library: document.getElementById("nav-lib-btn-bottom"),
};

const splitBtn = document.getElementById("toggle-split-btn-bottom");
const settingsBtn = document.getElementById("settings-btn-bottom");
const settingsBtnLibrary = document.getElementById("settings-btn-lib");
const viewer1El = document.getElementById("viewer");
const viewer2El = document.getElementById("viewer-2");
const pdfCanvas1 = document.getElementById("pdf-viewer-1");
const pdfCanvas2 = document.getElementById("pdf-viewer-2");
const pdfContainer1 = document.getElementById("pdf-container-1");
const pdfContainer2 = document.getElementById("pdf-container-2");
const pdfTextLayer1 = document.getElementById("pdf-text-layer-1");
const pdfTextLayer2 = document.getElementById("pdf-text-layer-2");
const pdfHighlightLayer1 = document.getElementById("pdf-highlight-layer-1");
const pdfHighlightLayer2 = document.getElementById("pdf-highlight-layer-2");
const prevBtn2 = document.getElementById("prev-btn-2");
const nextBtn2 = document.getElementById("next-btn-2");
const pdfScroll1 = document.getElementById("pdf-scroll-1");
const pdfScroll2 = document.getElementById("pdf-scroll-2");
const pdfScrollContent1 = document.getElementById("pdf-scroll-content-1");
const pdfScrollContent2 = document.getElementById("pdf-scroll-content-2");
const pdfZoomControls1 = document.getElementById("pdf-zoom-controls-1");
const pdfZoomControls2 = document.getElementById("pdf-zoom-controls-2");
const viewerWrapper1 = document.getElementById("viewer-wrapper-1");
const viewerWrapper2 = document.getElementById("viewer-wrapper-2");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle-bottom");
const sidebar2 = document.getElementById("toc-2");
const loadBook2Btn = document.getElementById("load-book-2-btn");
const showNotes2Btn = document.getElementById("show-notes-2-btn");
const viewer2SelectBtn = document.getElementById("viewer-2-select-btn");
const viewersContainer = document.getElementById("viewers-container");
const viewer2Controls = document.getElementById("viewer2-controls");
const viewer2NotesBtnBottom = document.getElementById("viewer2-notes-btn-bottom");
const viewer2BookBtnBottom = document.getElementById("viewer2-book-btn-bottom");

// Modal Elements
const settingsModal = document.getElementById("settings-modal");
const tagModal = document.getElementById("tag-modal");
const editBookModal = document.getElementById("edit-book-modal");
const searchModal = document.getElementById("search-modal");
const bookmarksModal = document.getElementById("bookmarks-modal");
const highlightsModal = document.getElementById("highlights-modal");
const noteModal = document.getElementById("note-modal");
const closeModalBtns = document.querySelectorAll(".close-modal");

// Search Elements
const searchBtn = document.getElementById("search-btn-bottom");
const searchInput = document.getElementById("searchInput");
const searchResultsEl = document.getElementById("searchResults");
const searchNav = document.getElementById("searchNav");
const searchResultCount = document.getElementById("searchResultCount");

// Bookmark Elements
const bookmarkBtn = document.getElementById("bookmark-btn-bottom");
const bookmarkNameInput = document.getElementById("bookmarkName");
const addBookmarkBtn = document.getElementById("addBookmarkBtn");
const bookmarksList = document.getElementById("bookmarksList");

// Highlights Elements
const highlightsBtn = document.getElementById("highlights-btn-bottom");
const highlightsList = document.getElementById("highlightsList");
const highlightTooltip = document.getElementById("highlight-tooltip");
const pdfHighlightTooltip = document.getElementById("pdf-highlight-tooltip");
const highlightContextMenu = document.getElementById("highlight-context-menu");
let activeHighlightEntryId = null; // Track which highlight is being acted on

// Voice Controls (for TTS restriction)
const voiceControlsWrapper = document.getElementById("voice-controls-wrapper");

// Library Elements
const libraryGrid = document.getElementById("library-grid");
const addBookBtn = document.getElementById("add-book-btn");
const fileInput = document.getElementById("fileInput");
const recentlyReadSection = document.getElementById("recently-read-section");
const recentlyReadScroll = document.getElementById("recently-read-scroll");
const filterTags = document.getElementById("filterTags");
const sortOptions = document.getElementById("sortOptions");
const sortDropdownBtn = document.getElementById("sortDropdownBtn");
const sortDropdownMenu = document.getElementById("sortDropdownMenu");
const sortLabel = document.getElementById("sortLabel");

// Library Switcher Elements
const librarySwitcher = document.querySelector(".library-switcher");
const librarySwitcherBtn = document.getElementById("librarySwitcherBtn");
const librarySwitcherMenu = document.getElementById("librarySwitcherMenu");
const currentLibraryNameEl = document.getElementById("currentLibraryName");
const librarySelectSettings = document.getElementById("librarySelectSettings");
const newLibraryNameInput = document.getElementById("newLibraryName");
const createLibraryBtn = document.getElementById("createLibraryBtn");
const libraryListEl = document.getElementById("libraryList");

// TTS Elements
const speakBtn = document.getElementById("speakBtn");
const stopTTSBtn = document.getElementById("stopTTSBtn");
const ttsModal = document.getElementById("tts-modal");
const ttsChapterSelect = document.getElementById("ttsChapterSelect");
const startTTSBtn = document.getElementById("start-tts-btn");
const cancelTTSBtn = document.getElementById("cancel-tts-btn");

// -------------------------------------------------------
// SETTINGS MODAL WITH TABS
// -------------------------------------------------------
const settingsTabs = document.querySelectorAll(".settings-tab");
const settingsPanels = document.querySelectorAll(".settings-panel");

settingsTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    settingsTabs.forEach(t => t.classList.remove("active"));
    settingsPanels.forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`settings-${tab.dataset.tab}`).classList.add("active");
  });
});

settingsBtn?.addEventListener("click", () => {
  settingsModal.style.display = "flex";
  loadSettingsValues();
});

settingsBtnLibrary?.addEventListener("click", () => {
  settingsModal.style.display = "flex";
  loadSettingsValues();
});

function loadSettingsValues() {
  const savedKey = localStorage.getItem("openai_api_key");
  if (savedKey) document.getElementById("apiKey").value = savedKey;
  
  const savedVoice = localStorage.getItem("openai_voice");
  if (savedVoice) document.getElementById("voiceSelect").value = savedVoice;
  
  const fontSize = localStorage.getItem("reader_font_size") || "100";
  document.getElementById("fontSizeSlider").value = fontSize;
  document.getElementById("fontSizeValue").textContent = fontSize;
  
  const lineHeight = localStorage.getItem("reader_line_height") || "16";
  document.getElementById("lineHeightSlider").value = lineHeight;
  document.getElementById("lineHeightValue").textContent = (parseInt(lineHeight) / 10).toFixed(1);
  
  const margin = localStorage.getItem("reader_margin") || "50";
  document.getElementById("marginSlider").value = margin;
  document.getElementById("marginValue").textContent = margin;
  
  // Load theme
  const savedTheme = localStorage.getItem("app_theme") || "light";
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  }
  
  // Load column layout (default: 2 = two-page spread)
  const savedColumnLayout = localStorage.getItem("column_layout") || "2";
  const columnLayoutSelect = document.getElementById("columnLayout");
  if (columnLayoutSelect) {
    columnLayoutSelect.value = savedColumnLayout;
    // Apply spread setting immediately when changed
    columnLayoutSelect.addEventListener("change", () => {
      localStorage.setItem("column_layout", columnLayoutSelect.value);
      // Apply to both renditions
      if (rendition1 && viewerType1 === 'epub') {
        applyColumnLayout(rendition1, parseInt(columnLayoutSelect.value));
      }
      if (rendition2 && viewerType2 === 'epub') {
        applyColumnLayout(rendition2, parseInt(columnLayoutSelect.value));
      }
    });
  }
  
  // Load PDF view mode
  const savedPdfMode = localStorage.getItem("pdf_view_mode") || "paged";
  const pdfViewModeSelect = document.getElementById("pdfViewMode");
  if (pdfViewModeSelect) {
    pdfViewModeSelect.value = savedPdfMode;
  }
  pdfViewMode = savedPdfMode;
  
  // Load default view mode
  const savedDefaultView = localStorage.getItem("default_view") || "single";
  const toggleBtns = document.querySelectorAll(".toggle-group .toggle-btn");
  toggleBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === savedDefaultView);
  });
}

// Default View toggle buttons
document.querySelectorAll(".toggle-group .toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // Update active state
    document.querySelectorAll(".toggle-group .toggle-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // Save preference
    localStorage.setItem("default_view", btn.dataset.value);
  });
});

// Settings sliders live update
document.getElementById("fontSizeSlider")?.addEventListener("input", (e) => {
  document.getElementById("fontSizeValue").textContent = e.target.value;
});

document.getElementById("lineHeightSlider")?.addEventListener("input", (e) => {
  document.getElementById("lineHeightValue").textContent = (parseInt(e.target.value) / 10).toFixed(1);
});

document.getElementById("marginSlider")?.addEventListener("input", (e) => {
  document.getElementById("marginValue").textContent = e.target.value;
});

document.getElementById("speechSpeed")?.addEventListener("input", (e) => {
  document.getElementById("speechSpeedValue").textContent = e.target.value;
});

document.getElementById("save-settings-btn")?.addEventListener("click", () => {
  localStorage.setItem("openai_api_key", document.getElementById("apiKey").value.trim());
  localStorage.setItem("openai_voice", document.getElementById("voiceSelect").value);
  localStorage.setItem("reader_font_size", document.getElementById("fontSizeSlider").value);
  localStorage.setItem("reader_line_height", document.getElementById("lineHeightSlider").value);
  localStorage.setItem("reader_margin", document.getElementById("marginSlider").value);
  
  // Save theme
  const theme = document.getElementById("themeSelect").value;
  localStorage.setItem("app_theme", theme);
  applyTheme(theme);
  
  // Save column layout
  const columnLayout = document.getElementById("columnLayout").value;
  localStorage.setItem("column_layout", columnLayout);
  
  // Save PDF view mode
  const newPdfViewMode = document.getElementById("pdfViewMode").value;
  const pdfModeChanged = newPdfViewMode !== pdfViewMode;
  localStorage.setItem("pdf_view_mode", newPdfViewMode);
  pdfViewMode = newPdfViewMode;
  
  applyReaderSettings();
  settingsModal.style.display = "none";
  
  // If PDF view mode changed and a PDF is open, show notice
  if (pdfModeChanged && (viewerType1 === 'pdf' || viewerType2 === 'pdf')) {
    alert("PDF view mode changed. Please reopen the PDF to apply the new view mode.");
  }
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Update EPUB themes if books are loaded
  updateEPUBThemes();
}

function getThemeColors() {
  const theme = localStorage.getItem("app_theme") || "light";
  const styles = getComputedStyle(document.documentElement);
  
  if (theme === "dark") {
    return {
      accent: "#60a5fa",
      bg: "#1e293b",
      text: "#f1f5f9"
    };
  } else if (theme === "sepia") {
    return {
      accent: "#8b6914",
      bg: "#f4e8d7",
      text: "#3d2817"
    };
  } else {
    return {
      accent: "#5ba4e6",
      bg: "#ffffff",
      text: "#2d3748"
    };
  }
}

function updateEPUBThemes() {
  const colors = getThemeColors();
  
  if (rendition1) {
    rendition1.themes.default({
      'body': {
        'background': `${colors.bg} !important`,
        'color': `${colors.text} !important`
      },
      'a': {
        'color': 'inherit !important',
        'text-decoration': 'none !important'
      },
      'a sup, a sub, sup a, sub a': {
        'color': `${colors.accent} !important`,
        'text-decoration': 'none !important'
      },
      'a[href*="note"], a[href*="fn"], a[href*="endnote"], a[epub\\:type="noteref"], a.noteref, a.footnote': {
        'color': `${colors.accent} !important`,
        'text-decoration': 'none !important',
        'font-size': '0.85em',
        'vertical-align': 'super'
      },
      'sup, sub': {
        'font-size': '0.75em'
      },
      'sup a, sub a, a sup, a sub': {
        'color': `${colors.accent} !important`
      }
    });
  }
  
  if (rendition2) {
    rendition2.themes.default({
      'body': {
        'background': `${colors.bg} !important`,
        'color': `${colors.text} !important`
      },
      'a': {
        'color': 'inherit !important',
        'text-decoration': 'none !important'
      },
      'a sup, a sub, sup a, sub a': {
        'color': `${colors.accent} !important`,
        'text-decoration': 'none !important'
      },
      'a[href*="note"], a[href*="fn"], a[href*="endnote"], a[epub\\:type="noteref"], a.noteref, a.footnote': {
        'color': `${colors.accent} !important`,
        'text-decoration': 'none !important',
        'font-size': '0.85em',
        'vertical-align': 'super'
      },
      'sup, sub': {
        'font-size': '0.75em'
      },
      'sup a, sub a, a sup, a sub': {
        'color': `${colors.accent} !important`
      }
    });
  }
}

function applyReaderSettings() {
  const fontSize = localStorage.getItem("reader_font_size") || "100";
  const margin = localStorage.getItem("reader_margin") || "50";
  const columnLayout = localStorage.getItem("column_layout") || "2";
  
  document.querySelectorAll(".epub-viewer").forEach(el => {
    el.style.padding = `0 ${margin}px`;
  });
  
  // Apply column layout
  const columnCount = parseInt(columnLayout);
  if (rendition1) {
    rendition1.themes.fontSize(`${fontSize}%`);
    applyColumnLayout(rendition1, columnCount);
    // Re-apply user highlights after column layout change
    if (currentBookPath1) {
      setTimeout(() => {
        loadHighlightsForBook(currentBookPath1);
      }, 300);
    }
  }
  if (rendition2) {
    rendition2.themes.fontSize(`${fontSize}%`);
    applyColumnLayout(rendition2, columnCount);
  }
}

// Page spread setting uses EPUB.js spread (CSS columns incompatible with pagination)
// 1 = single page, 2 = two-page spread (EPUB.js native)
// Note: Split view always forces single page regardless of preference
function applyColumnLayout(rendition, columnCount) {
  if (!rendition) return;
  
  try {
    // Get the actual spread setting (respects split view state)
    const spreadValue = getSpreadSetting();
    
    // Update spread setting via views manager if available
    if (rendition.views && typeof rendition.views.spread === 'function') {
      rendition.views.spread(spreadValue);
    }
    
    // Force resize to apply changes
    setTimeout(() => {
      if (rendition) {
        rendition.resize();
      }
    }, 50);
  } catch (err) {
    console.warn("Error applying page spread:", err);
  }
}

// Theme change handler (live update)
document.getElementById("themeSelect")?.addEventListener("change", (e) => {
  const theme = e.target.value;
  applyTheme(theme);
  localStorage.setItem("app_theme", theme);
});

// Apply theme on page load
const savedTheme = localStorage.getItem("app_theme") || "light";
applyTheme(savedTheme);

// Initialize TTS button state
updateTTSButtonState();

// Note: Modal close handlers are defined at the end of the file

// -------------------------------------------------------
// TAG MODAL
// -------------------------------------------------------
const tagColors = document.querySelectorAll(".tag-color");
const newTagNameInput = document.getElementById("newTagName");
const addTagBtn = document.getElementById("addTagBtn");
const currentTagsContainer = document.getElementById("currentTags");
const saveTagsBtn = document.getElementById("save-tags-btn");

tagColors.forEach(btn => {
  btn.addEventListener("click", () => {
    tagColors.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTagColor = btn.dataset.color;
  });
});

// Select first color by default
tagColors[0]?.classList.add("selected");

addTagBtn?.addEventListener("click", () => {
  const tagName = newTagNameInput.value.trim();
  if (!tagName) return;
  
  addTagToBook(editingBookPath, tagName, selectedTagColor);
  newTagNameInput.value = "";
  renderCurrentTags();
});

newTagNameInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTagBtn.click();
});

saveTagsBtn?.addEventListener("click", () => {
  tagModal.style.display = "none";
  renderLibrary();
  updateFilterTags();
});

function openTagModal(bookPath) {
  editingBookPath = bookPath;
  tagModal.style.display = "flex";
  renderCurrentTags();
  renderExistingTags();
}

function renderCurrentTags() {
  const book = library.find(b => b.path === editingBookPath);
  if (!book || !currentTagsContainer) return;
  
  const tags = book.tags || [];
  currentTagsContainer.innerHTML = tags.map(tag => `
    <span class="tag-chip" style="background: ${tag.color};">
      ${tag.name}
      <button class="remove-tag" data-name="${tag.name}">&times;</button>
    </span>
  `).join('');
  
  // Add remove listeners
  currentTagsContainer.querySelectorAll(".remove-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      removeTagFromBook(editingBookPath, btn.dataset.name);
      renderCurrentTags();
      renderExistingTags(); // Re-render to show removed tag as available
    });
  });
}

function renderExistingTags() {
  const existingTagsContainer = document.getElementById("existingTags");
  if (!existingTagsContainer) return;
  
  const currentBook = library.find(b => b.path === editingBookPath);
  const currentTagNames = (currentBook?.tags || []).map(t => t.name.toLowerCase());
  
  // Collect all unique tags from all books
  const allTags = new Map();
  library.forEach(book => {
    (book.tags || []).forEach(tag => {
      // Only add if not already on current book
      if (!currentTagNames.includes(tag.name.toLowerCase())) {
        allTags.set(tag.name.toLowerCase(), { name: tag.name, color: tag.color });
      }
    });
  });
  
  if (allTags.size === 0) {
    existingTagsContainer.innerHTML = '';
    return;
  }
  
  existingTagsContainer.innerHTML = Array.from(allTags.values()).map(tag => `
    <button class="existing-tag-btn" style="background: ${tag.color};" data-name="${tag.name}" data-color="${tag.color}">
      <i class="fas fa-plus"></i> ${tag.name}
    </button>
  `).join('');
  
  // Add click listeners to add existing tags
  existingTagsContainer.querySelectorAll(".existing-tag-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await addTagToBook(editingBookPath, btn.dataset.name, btn.dataset.color);
      renderCurrentTags();
      renderExistingTags();
      renderLibrary();
      renderRecentlyRead();
      updateFilterTags();
    });
  });
}

async function addTagToBook(bookPath, tagName, tagColor) {
  const book = library.find(b => b.path === bookPath);
  if (!book) return;
  
  if (!book.tags) book.tags = [];
  if (book.tags.find(t => t.name === tagName)) return; // Already exists
  
  book.tags.push({ name: tagName, color: tagColor });
  await window.electronAPI.addToLibrary(book); // Update in store
}

async function removeTagFromBook(bookPath, tagName) {
  const book = library.find(b => b.path === bookPath);
  if (!book || !book.tags) return;
  
  book.tags = book.tags.filter(t => t.name !== tagName);
  await window.electronAPI.addToLibrary(book);
}

// -------------------------------------------------------
// EDIT BOOK MODAL
// -------------------------------------------------------
const editBookTitle = document.getElementById("editBookTitle");
const editBookAuthor = document.getElementById("editBookAuthor");
const editBookCoverPreview = document.getElementById("editBookCoverPreview");
const saveEditBtn = document.getElementById("save-edit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

function openEditBookModal(bookPath) {
  editingBookPath = bookPath;
  const book = library.find(b => b.path === bookPath);
  if (!book) return;
  
  // Populate fields
  editBookTitle.value = book.title || "";
  editBookAuthor.value = book.author || "";
  
  // Show cover preview
  if (book.cover) {
    editBookCoverPreview.style.backgroundImage = `url('${book.cover}')`;
  } else {
    editBookCoverPreview.style.backgroundImage = "none";
    editBookCoverPreview.style.background = "linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%)";
  }
  
  editBookModal.style.display = "flex";
}

saveEditBtn?.addEventListener("click", async () => {
  const book = library.find(b => b.path === editingBookPath);
  if (!book) return;
  
  const newTitle = editBookTitle.value.trim();
  const newAuthor = editBookAuthor.value.trim();
  
  if (newTitle) book.title = newTitle;
  book.author = newAuthor;
  
  await window.electronAPI.addToLibrary(book);
  
  editBookModal.style.display = "none";
  renderLibrary();
  renderRecentlyRead();
});

cancelEditBtn?.addEventListener("click", () => {
  editBookModal.style.display = "none";
});

// -------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------
function switchView(viewName) {
  Object.values(views).forEach((el) => (el.style.display = "none"));

  if (viewName === "library") {
    views.library.style.display = "flex";
  } else {
    views.reader.style.display = "flex";
  }
}

navBtns.library?.addEventListener("click", () => {
  // Don't reset targetSlot here - preserve the slot selection from "Select Book" buttons
  switchView("library");
  renderRecentlyRead();
});

// -------------------------------------------------------
// SIDEBAR TOGGLE
// -------------------------------------------------------
sidebarToggle?.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebarToggle.classList.toggle("active", !sidebar.classList.contains("collapsed"));
  setTimeout(() => {
    if (isPdfTextSelecting) return; // Don't re-render during text selection
    if (rendition1) rendition1.resize();
    if (rendition2) rendition2.resize();
    if (viewerType1 === 'pdf') renderPdfPage(1);
    if (viewerType2 === 'pdf') renderPdfPage(2);
  }, 300);
});

// Initialize sidebar toggle button state
if (sidebarToggle && !sidebar.classList.contains("collapsed")) {
  sidebarToggle.classList.add("active");
}

// -------------------------------------------------------
// SPLIT VIEW LOGIC
// -------------------------------------------------------

// Helper function to get spread setting based on split view state and user preference
function getSpreadSetting() {
  const isSplitMode = viewersContainer.classList.contains("split-mode");
  // When split view is open: always single page (not enough room)
  if (isSplitMode) return "none";
  
  // When not in split view: respect user's page spread preference
  const savedSpread = localStorage.getItem("column_layout") || "2";
  const spreadPref = parseInt(savedSpread);
  // 1 = single page ("none"), 2 = two-page spread ("always")
  return spreadPref === 2 ? "always" : "none";
}

// Helper function to update EPUB spread settings
function updateEPUBSpread() {
  const spreadSetting = getSpreadSetting();
  console.log("updateEPUBSpread called, spreadSetting:", spreadSetting);
  
  if (rendition1 && viewerType1 === 'epub') {
    try {
      // EPUB.js: change spread setting via views manager
      if (rendition1.views && typeof rendition1.views.spread === 'function') {
        rendition1.views.spread(spreadSetting);
        console.log("Applied spread to rendition1:", spreadSetting);
      }
      // Resize to apply the new spread
      setTimeout(() => {
        if (rendition1) {
          rendition1.resize();
          // Re-apply highlights after spread change
          if (currentBookPath1) {
            setTimeout(() => {
              loadHighlightsForBook(currentBookPath1);
            }, 200);
          }
        }
      }, 100);
    } catch (e) {
      console.warn("Could not update spread for rendition1:", e);
      // Fallback: just resize
      setTimeout(() => {
        if (rendition1) {
          rendition1.resize();
          // Re-apply highlights after resize
          if (currentBookPath1) {
            setTimeout(() => {
              loadHighlightsForBook(currentBookPath1);
            }, 200);
          }
        }
      }, 100);
    }
  }
  
  if (rendition2 && viewerType2 === 'epub') {
    try {
      if (rendition2.views && typeof rendition2.views.spread === 'function') {
        rendition2.views.spread(spreadSetting);
        console.log("Applied spread to rendition2:", spreadSetting);
      }
      setTimeout(() => {
        if (rendition2) rendition2.resize();
      }, 100);
    } catch (e) {
      console.warn("Could not update spread for rendition2:", e);
      setTimeout(() => {
        if (rendition2) rendition2.resize();
      }, 100);
    }
  }
}

splitBtn?.addEventListener("click", () => {
  const isHidden = viewerWrapper2.classList.contains("hidden");
  if (isHidden) {
    viewerWrapper2.classList.remove("hidden");
    sidebar2.classList.remove("hidden");
    viewersContainer.classList.add("split-mode");
    splitBtn.classList.add("active");
    viewer2Controls?.classList.remove("hidden");
    
    // If viewer 2 is empty, set target slot to 2 for next book selection
    if (!book2 && !pdf2) {
      targetSlot = 2;
    }
    
    if (views.reader.style.display === "none") switchView("reader");
    
    // Update EPUB spread to single page when split view opens
    updateEPUBSpread();
    updateViewer2ControlsState();
    
    setTimeout(() => {
      if (isPdfTextSelecting) return; // Don't re-render during text selection
      if (rendition1) rendition1.resize();
      if (rendition2) rendition2.resize();
      if (viewerType1 === 'pdf') {
        if (pdfViewMode === 'scroll') {
          recalculatePdfScrollMode(1);
        } else {
          renderPdfPage(1);
        }
      }
      if (viewerType2 === 'pdf') {
        if (pdfViewMode === 'scroll') {
          recalculatePdfScrollMode(2);
        } else {
          renderPdfPage(2);
        }
      }
    }, 100);
  } else {
    viewerWrapper2.classList.add("hidden");
    sidebar2.classList.add("hidden");
    viewersContainer.classList.remove("split-mode");
    splitBtn.classList.remove("active");
    viewer2Controls?.classList.add("hidden");
    
    // Clear notes state if notes were open in slot 2
    if (notesViewerSlot === 2) {
      notesViewerSlot = null;
      notesViewerBookPath = null;
      viewerType2 = null;
      // Restore paging buttons
      if (prevBtn2) prevBtn2.style.display = '';
      if (nextBtn2) nextBtn2.style.display = '';
    }
    
    // Update EPUB spread to two-page when split view closes
    updateEPUBSpread();
    
    setTimeout(() => {
      if (isPdfTextSelecting) return; // Don't re-render during text selection
      if (rendition1) rendition1.resize();
      if (viewerType1 === 'pdf') {
        if (pdfViewMode === 'scroll') {
          recalculatePdfScrollMode(1);
        } else {
          renderPdfPage(1);
        }
      }
    }, 100);
    
    focusedSlot = 1;
    updateFocusUI();
  }
});

// Viewer 2 Notes button handler - use event delegation for robustness
viewer2El?.addEventListener("click", (e) => {
  const notesBtn = e.target.closest('#viewer-2-notes-btn');
  if (notesBtn) {
    if (!currentBookPath1) {
      showToast("Open a book first to view its notes");
      return;
    }
    openNotesViewer(currentBookPath1, 2);
  }
  
  const selectBtn = e.target.closest('#viewer-2-select-btn');
  if (selectBtn) {
    openLibraryForSlot(2);
  }
});

// -------------------------------------------------------
// SELECT BOOK HANDLERS
// -------------------------------------------------------
function openLibraryForSlot(slot) {
  targetSlot = slot;
  switchView("library");
}

loadBook2Btn.addEventListener("click", () => openLibraryForSlot(2));
if (viewer2SelectBtn) {
  viewer2SelectBtn.addEventListener("click", () => openLibraryForSlot(2));
}

// Show notes in viewer 2 button (in sidebar)
showNotes2Btn?.addEventListener("click", () => {
  if (!currentBookPath1) {
    showToast("Open a book first to view its notes");
    return;
  }
  openNotesViewer(currentBookPath1, 2);
  updateViewer2ControlsState();
});

// Viewer 2 controls in bottom toolbar
viewer2NotesBtnBottom?.addEventListener("click", () => {
  if (!currentBookPath1) {
    showToast("Open a book first to view its notes");
    return;
  }
  openNotesViewer(currentBookPath1, 2);
  updateViewer2ControlsState();
});

viewer2BookBtnBottom?.addEventListener("click", () => {
  openLibraryForSlot(2);
});

// Update viewer 2 control button states
function updateViewer2ControlsState() {
  if (!viewer2NotesBtnBottom || !viewer2BookBtnBottom) return;
  
  // Highlight active state based on what's in viewer 2
  if (notesViewerSlot === 2) {
    viewer2NotesBtnBottom.classList.add("active");
    viewer2BookBtnBottom.classList.remove("active");
  } else if (book2 || pdf2) {
    viewer2NotesBtnBottom.classList.remove("active");
    viewer2BookBtnBottom.classList.add("active");
  } else {
    viewer2NotesBtnBottom.classList.remove("active");
    viewer2BookBtnBottom.classList.remove("active");
  }
}

// -------------------------------------------------------
// FOCUS MANAGEMENT
// -------------------------------------------------------
function setFocus(slot) {
  if (focusedSlot === slot) return;
  focusedSlot = slot;
  updateFocusUI();
}

function updateFocusUI() {
  if (focusedSlot === 1) {
    viewerWrapper1.classList.add("focused");
    viewerWrapper2.classList.remove("focused");
  } else {
    viewerWrapper1.classList.remove("focused");
    viewerWrapper2.classList.add("focused");
  }
}

viewerWrapper1.addEventListener("mousedown", (e) => {
  if (!e.target.closest(".page-btn")) setFocus(1);
}, true);

viewerWrapper2.addEventListener("mousedown", (e) => {
  if (!e.target.closest(".page-btn")) setFocus(2);
}, true);

document.addEventListener("mousedown", (e) => {
  const rect1 = viewerWrapper1.getBoundingClientRect();
  const rect2 = viewerWrapper2.getBoundingClientRect();
  
  if (viewerWrapper2.offsetParent !== null &&
      e.clientX >= rect2.left && e.clientX <= rect2.right &&
      e.clientY >= rect2.top && e.clientY <= rect2.bottom) {
    if (!e.target.closest(".page-btn")) setFocus(2);
  } else if (e.clientX >= rect1.left && e.clientX <= rect1.right &&
             e.clientY >= rect1.top && e.clientY <= rect1.bottom) {
    if (!e.target.closest(".page-btn")) setFocus(1);
  }
}, true);

function setupRenditionFocus(rendition, slot) {
  rendition.on("click", () => setFocus(slot));
  rendition.on("selected", () => setFocus(slot));
}

// -------------------------------------------------------
// READING PROGRESS TRACKING
// -------------------------------------------------------
let currentBookPath1 = null;
let currentBookPath2 = null;

function setupProgressTracking(rendition, bookInstance, slot) {
  rendition.on("relocated", async (location) => {
    const bookPath = slot === 1 ? currentBookPath1 : currentBookPath2;
    if (!bookPath) return;
    
    const book = library.find(b => b.path === bookPath);
    if (!book) return;
    
    // Calculate progress percentage
    const progress = bookInstance.locations.percentageFromCfi(location.start.cfi);
    const percentage = Math.round((progress || 0) * 100);
    
    // Save progress
    book.readingProgress = {
      cfi: location.start.cfi,
      percentage: percentage
    };
    
    await window.electronAPI.addToLibrary(book);
  });
}

function getSavedPosition(bookPath) {
  const book = library.find(b => b.path === bookPath);
  return book?.readingProgress?.cfi || null;
}

function savePdfProgress(slot) {
  const bookPath = slot === 1 ? currentBookPath1 : currentBookPath2;
  let pageNum = slot === 1 ? pdfPage1 : pdfPage2;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  
  // In scroll mode, detect current page from scroll position
  if (pdfViewMode === 'scroll') {
    pageNum = getCurrentScrollPage(slot);
    if (slot === 1) pdfPage1 = pageNum;
    else pdfPage2 = pageNum;
  }
  
  if (!bookPath) return;
  
  const book = library.find(b => b.path === bookPath);
  if (!book) return;
  
  const percentage = Math.round((pageNum / totalPages) * 100);
  book.readingProgress = {
    page: pageNum,
    percentage: percentage
  };
  
  window.electronAPI.addToLibrary(book);
}

function getCurrentScrollPage(slot) {
  const scrollContainer = slot === 1 ? pdfScroll1 : pdfScroll2;
  if (!scrollContainer) return 1;
  
  // Query both rendered pages and placeholders
  const pages = scrollContainer.querySelectorAll('.pdf-scroll-page, .pdf-scroll-page-placeholder');
  const containerRect = scrollContainer.getBoundingClientRect();
  const containerMiddle = containerRect.top + containerRect.height / 2;
  
  for (const page of pages) {
    const rect = page.getBoundingClientRect();
    if (rect.top <= containerMiddle && rect.bottom >= containerMiddle) {
      return parseInt(page.dataset.pageNum) || 1; // Fixed: was .page, should be .pageNum
    }
  }
  
  return 1;
}

// -------------------------------------------------------
// PAGE TURN LOGIC
// -------------------------------------------------------
function getPdfPageStep(slot) {
  // In single viewer mode (not split), we show 2 pages, so step by 2
  const isSplitMode = viewersContainer.classList.contains("split-mode");
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  return (!isSplitMode && totalPages > 1) ? 2 : 1;
}

function prevPage(slot) {
  if (slot === 1) {
    if (viewerType1 === 'pdf' && pdfPage1 > 1) {
      const step = getPdfPageStep(1);
      pdfPage1 = Math.max(1, pdfPage1 - step);
      renderPdfPage(1);
      savePdfProgress(1);
    } else if (rendition1) {
      rendition1.prev();
    }
  }
  if (slot === 2) {
    if (viewerType2 === 'pdf' && pdfPage2 > 1) {
      const step = getPdfPageStep(2);
      pdfPage2 = Math.max(1, pdfPage2 - step);
      renderPdfPage(2);
      savePdfProgress(2);
    } else if (rendition2) {
      rendition2.prev();
    }
  }
}

function nextPage(slot) {
  if (slot === 1) {
    if (viewerType1 === 'pdf' && pdfPage1 < pdfTotalPages1) {
      const step = getPdfPageStep(1);
      pdfPage1 = Math.min(pdfTotalPages1, pdfPage1 + step);
      renderPdfPage(1);
      savePdfProgress(1);
    } else if (rendition1) {
      rendition1.next();
    }
  }
  if (slot === 2) {
    if (viewerType2 === 'pdf' && pdfPage2 < pdfTotalPages2) {
      const step = getPdfPageStep(2);
      pdfPage2 = Math.min(pdfTotalPages2, pdfPage2 + step);
      renderPdfPage(2);
      savePdfProgress(2);
    } else if (rendition2) {
      rendition2.next();
    }
  }
}

document.getElementById("prev-btn-1").addEventListener("click", (e) => {
  e.stopPropagation();
  setFocus(1);
  prevPage(1);
});
document.getElementById("next-btn-1").addEventListener("click", (e) => {
  e.stopPropagation();
  setFocus(1);
  nextPage(1);
});
document.getElementById("prev-btn-2").addEventListener("click", (e) => {
  e.stopPropagation();
  setFocus(2);
  prevPage(2);
});
document.getElementById("next-btn-2").addEventListener("click", (e) => {
  e.stopPropagation();
  setFocus(2);
  nextPage(2);
});

document.addEventListener("keyup", (e) => {
  if (views.reader.style.display === "none") return;
  
  if (e.key === "ArrowLeft") prevPage(focusedSlot);
  else if (e.key === "ArrowRight") nextPage(focusedSlot);
});

// -------------------------------------------------------
// LIBRARY LOGIC
// -------------------------------------------------------
(async () => {
  await loadLibrary();
  loadSettingsValues();
  hideLoadingScreen(); // Hide loading screen after initialization
})();

async function loadLibrary() {
  try {
    // Load current library name and all library names
    currentLibraryName = await window.electronAPI.getCurrentLibraryName();
    allLibraryNames = await window.electronAPI.getAllLibraryNames();
    
    // Load books from current library
    library = await window.electronAPI.getLibrary();
    if (!Array.isArray(library)) library = [];
  } catch (err) {
    console.error("Failed to load library:", err);
    library = [];
  }
  
  // Update UI
  updateLibrarySwitcher();
  renderLibrary();
  renderRecentlyRead();
  updateFilterTags();
}

// -------------------------------------------------------
// MULTI-LIBRARY MANAGEMENT
// -------------------------------------------------------

// Update the library switcher dropdown
function updateLibrarySwitcher() {
  if (currentLibraryNameEl) {
    currentLibraryNameEl.textContent = currentLibraryName;
  }
  
  // Update switcher dropdown menu
  if (librarySwitcherMenu) {
    let html = '';
    allLibraryNames.forEach(name => {
      const isActive = name === currentLibraryName;
      html += `
        <button class="library-menu-item ${isActive ? 'active' : ''}" data-library="${name}">
          <i class="fas ${isActive ? 'fa-check' : 'fa-folder'}"></i>
          ${name}
        </button>
      `;
    });
    html += '<div class="library-menu-divider"></div>';
    html += `
      <button class="library-menu-item manage-btn" id="openLibrarySettings">
        <i class="fas fa-cog"></i>
        Manage Libraries...
      </button>
    `;
    librarySwitcherMenu.innerHTML = html;
    
    // Add click handlers
    librarySwitcherMenu.querySelectorAll('.library-menu-item[data-library]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.library;
        if (name !== currentLibraryName) {
          await switchLibrary(name);
        }
        librarySwitcher?.classList.remove('open');
      });
    });
    
    // Manage libraries button
    document.getElementById('openLibrarySettings')?.addEventListener('click', () => {
      librarySwitcher?.classList.remove('open');
      settingsModal.style.display = 'flex';
      loadSettingsValues();
      // Switch to Libraries tab
      settingsTabs.forEach(t => t.classList.remove('active'));
      settingsPanels.forEach(p => p.classList.remove('active'));
      document.querySelector('.settings-tab[data-tab="libraries"]')?.classList.add('active');
      document.getElementById('settings-libraries')?.classList.add('active');
    });
  }
  
  // Update settings select
  if (librarySelectSettings) {
    librarySelectSettings.innerHTML = allLibraryNames.map(name => 
      `<option value="${name}" ${name === currentLibraryName ? 'selected' : ''}>${name}</option>`
    ).join('');
  }
  
  // Update library list in settings
  updateLibraryListInSettings();
}

// Update the library list in settings
function updateLibraryListInSettings() {
  if (!libraryListEl) return;
  
  // We need to get book counts for each library - for now show current library count
  let html = '';
  allLibraryNames.forEach(name => {
    const isCurrent = name === currentLibraryName;
    const count = isCurrent ? library.length : '—';
    html += `
      <div class="library-list-item ${isCurrent ? 'current' : ''}" data-library="${name}">
        <i class="fas fa-folder lib-icon"></i>
        <span class="lib-name">${name}</span>
        <span class="lib-count">${count} books</span>
        <div class="lib-actions">
          <button class="lib-action-btn rename" title="Rename" data-library="${name}">
            <i class="fas fa-pen"></i>
          </button>
          <button class="lib-action-btn delete" title="Delete" data-library="${name}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
  libraryListEl.innerHTML = html;
  
  // Add event listeners
  libraryListEl.querySelectorAll('.lib-action-btn.rename').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const libName = btn.dataset.library;
      const newName = prompt(`Rename "${libName}" to:`, libName);
      if (newName && newName.trim() && newName.trim() !== libName) {
        await renameLibrary(libName, newName.trim());
      }
    });
  });
  
  libraryListEl.querySelectorAll('.lib-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const libName = btn.dataset.library;
      if (allLibraryNames.length <= 1) {
        alert('Cannot delete the last library.');
        return;
      }
      if (confirm(`Delete library "${libName}"? All books in this library will be removed.`)) {
        await deleteLibrary(libName);
      }
    });
  });
}

// Switch to a different library
async function switchLibrary(name) {
  try {
    const result = await window.electronAPI.switchLibrary(name);
    if (result.success) {
      currentLibraryName = name;
      library = result.library;
      updateLibrarySwitcher();
      renderLibrary();
      renderRecentlyRead();
      updateFilterTags();
    } else {
      alert('Failed to switch library: ' + result.error);
    }
  } catch (err) {
    console.error('Failed to switch library:', err);
    alert('Failed to switch library.');
  }
}

// Create a new library
async function createLibrary(name) {
  if (!name || !name.trim()) return;
  name = name.trim();
  
  try {
    const result = await window.electronAPI.createLibrary(name);
    if (result.success) {
      allLibraryNames = result.names;
      updateLibrarySwitcher();
      // Optionally switch to the new library
      await switchLibrary(name);
    } else {
      alert('Failed to create library: ' + result.error);
    }
  } catch (err) {
    console.error('Failed to create library:', err);
    alert('Failed to create library.');
  }
}

// Rename a library
async function renameLibrary(oldName, newName) {
  try {
    const result = await window.electronAPI.renameLibrary(oldName, newName);
    if (result.success) {
      allLibraryNames = result.names;
      currentLibraryName = result.currentLibrary;
      updateLibrarySwitcher();
    } else {
      alert('Failed to rename library: ' + result.error);
    }
  } catch (err) {
    console.error('Failed to rename library:', err);
    alert('Failed to rename library.');
  }
}

// Delete a library
async function deleteLibrary(name) {
  try {
    const result = await window.electronAPI.deleteLibrary(name);
    if (result.success) {
      allLibraryNames = result.names;
      // If we deleted the current library, reload
      if (currentLibraryName === name) {
        currentLibraryName = result.currentLibrary;
        await loadLibrary();
      } else {
        updateLibrarySwitcher();
      }
    } else {
      alert('Failed to delete library: ' + result.error);
    }
  } catch (err) {
    console.error('Failed to delete library:', err);
    alert('Failed to delete library.');
  }
}

// Move a book to another library
async function moveBookToLibrary(bookPath, targetLibrary) {
  try {
    const result = await window.electronAPI.moveBookToLibrary(bookPath, targetLibrary);
    if (result.success) {
      library = result.library;
      renderLibrary();
      renderRecentlyRead();
      updateFilterTags();
    } else {
      alert('Failed to move book: ' + result.error);
    }
  } catch (err) {
    console.error('Failed to move book:', err);
    alert('Failed to move book.');
  }
}

// Library switcher dropdown toggle
librarySwitcherBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  librarySwitcher?.classList.toggle('open');
});

// Close library switcher when clicking outside
document.addEventListener('click', (e) => {
  if (librarySwitcher && !librarySwitcher.contains(e.target)) {
    librarySwitcher.classList.remove('open');
  }
});

// Settings library select change
librarySelectSettings?.addEventListener('change', async () => {
  const name = librarySelectSettings.value;
  if (name !== currentLibraryName) {
    await switchLibrary(name);
  }
});

// Create library button
createLibraryBtn?.addEventListener('click', async () => {
  const name = newLibraryNameInput?.value;
  if (name && name.trim()) {
    await createLibrary(name.trim());
    if (newLibraryNameInput) newLibraryNameInput.value = '';
  }
});

// Create library on Enter key
newLibraryNameInput?.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const name = newLibraryNameInput.value;
    if (name && name.trim()) {
      await createLibrary(name.trim());
      newLibraryNameInput.value = '';
    }
  }
});

// -------------------------------------------------------
// SORTING & FILTERING
// -------------------------------------------------------
// Custom sort dropdown
sortDropdownBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  sortOptions.classList.toggle("open");
});

sortDropdownMenu?.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentSort = btn.dataset.sort;
    sortLabel.textContent = btn.textContent.trim();
    
    // Update active state
    sortDropdownMenu.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    sortOptions.classList.remove("open");
    renderLibrary();
  });
});

// Close sort dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!sortOptions?.contains(e.target)) {
    sortOptions?.classList.remove("open");
  }
});

function updateFilterTags() {
  if (!filterTags) return;
  
  // Collect all unique tags
  const allTags = new Map();
  library.forEach(book => {
    (book.tags || []).forEach(tag => {
      if (!allTags.has(tag.name)) {
        allTags.set(tag.name, tag.color);
      }
    });
  });
  
  // Render filter buttons
  filterTags.innerHTML = `<button class="filter-tag ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>`;
  
  allTags.forEach((color, name) => {
    filterTags.innerHTML += `
      <button class="filter-tag ${currentFilter === name ? 'active' : ''}" 
              data-filter="${name}" 
              style="border-left-color: ${color};">
        ${name}
      </button>
    `;
  });
  
  // Add click listeners
  filterTags.querySelectorAll(".filter-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      filterTags.querySelectorAll(".filter-tag").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderLibrary();
    });
  });
}

function getSortedLibrary() {
  let filtered = [...library];
  
  // Apply search filter
  if (librarySearchTerm) {
    filtered = filtered.filter(book => {
      const title = (book.title || '').toLowerCase();
      const author = (book.author || '').toLowerCase();
      const tags = (book.tags || []).map(t => t.name.toLowerCase()).join(' ');
      return title.includes(librarySearchTerm) || 
             author.includes(librarySearchTerm) || 
             tags.includes(librarySearchTerm);
    });
  }
  
  // Apply tag filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(book => 
      (book.tags || []).some(t => t.name === currentFilter)
    );
  }
  
  // Apply sort
  switch (currentSort) {
    case 'title':
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'title-desc':
      filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    case 'author':
      filtered.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
      break;
    case 'lastRead':
      filtered.sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0));
      break;
    case 'recent':
    default:
      filtered.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      break;
  }
  
  return filtered;
}

// -------------------------------------------------------
// RECENTLY READ
// -------------------------------------------------------
function renderRecentlyRead() {
  const recent = library
    .filter(b => b.lastRead)
    .sort((a, b) => b.lastRead - a.lastRead)
    .slice(0, 10);
  
  if (recent.length === 0) {
    recentlyReadSection.style.display = "none";
    return;
  }
  
  recentlyReadSection.style.display = "block";
  recentlyReadScroll.innerHTML = recent.map(book => {
    const fileType = book.fileType || (book.path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub');
    const coverStyle = book.cover 
      ? `background-image: url('${book.cover}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);`;
    
    // Progress bar
    const progress = book.readingProgress?.percentage || 0;
    const progressBar = progress > 0 ? `
      <div class="recent-book-progress-bar">
        <div class="recent-book-progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="recent-book-progress-text">${progress}%</div>
    ` : '';
    
    return `
      <div class="recent-book-card" data-path="${book.path}">
        <div class="recent-book-card-inner">
          <div class="recent-book-cover" style="${coverStyle}">
            <div class="recent-book-shine"></div>
            <span class="file-type-badge ${fileType}">${fileType}</span>
            ${!book.cover ? `<div class="book-cover-placeholder"><i class="fas fa-${fileType === 'pdf' ? 'file-pdf' : 'book'}"></i></div>` : ''}
          </div>
          <div class="recent-book-info">
            <div class="recent-book-title">${book.title || "Unknown Title"}</div>
            <div class="recent-book-author">${book.author || ""}</div>
            ${progressBar}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Add 3D tilt effect to recent book cards
  recentlyReadScroll.querySelectorAll(".recent-book-card").forEach(card => {
    const inner = card.querySelector(".recent-book-card-inner");
    const shine = card.querySelector(".recent-book-shine");
    
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 12;
      const rotateY = (centerX - x) / 12;
      
      inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
      
      const shineX = (x / rect.width) * 100;
      const shineY = (y / rect.height) * 100;
      shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`;
      shine.style.opacity = "1";
    });
    
    card.addEventListener("mouseleave", () => {
      inner.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
      shine.style.opacity = "0";
    });
    
    card.addEventListener("click", async () => {
      await openBookWithTransition(card.dataset.path, targetSlot);
      targetSlot = 1; // Reset after use
    });
  });
}

async function updateLastRead(bookPath) {
  const book = library.find(b => b.path === bookPath);
  if (book) {
    book.lastRead = Date.now();
    await window.electronAPI.addToLibrary(book);
  }
}

// -------------------------------------------------------
// RENDER LIBRARY
// -------------------------------------------------------
function renderLibrary() {
  const books = getSortedLibrary();
  libraryGrid.innerHTML = "";
  
  if (books.length === 0) {
    libraryGrid.innerHTML = `<p class="empty-msg">No books found. Import EPUB or PDF files to get started.</p>`;
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";
    
    const fileType = book.fileType || (book.path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub');
    const coverStyle = book.cover 
      ? `background-image: url('${book.cover}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);`;
    
    // Set tag glow color
    const primaryTag = (book.tags || [])[0];
    if (primaryTag) {
      card.style.setProperty('--tag-glow', primaryTag.color);
      card.style.setProperty('--tag-glow-light', primaryTag.color + '66');
      card.setAttribute('data-tag-color', primaryTag.color);
    }
    
    const tagDots = (book.tags || []).slice(0, 3).map(t => 
      `<div class="book-tag-dot" style="background: ${t.color};"></div>`
    ).join('');
    
    // Progress bar
    const progress = book.readingProgress?.percentage || 0;
    const progressBar = progress > 0 ? `
      <div class="book-progress-bar">
        <div class="book-progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="book-progress-text">${progress}%</div>
    ` : '';
    
    // Check if book has notes
    const hasNotes = book.notes && book.notes.entries && book.notes.entries.length > 0;
    const notesBadge = hasNotes ? `<div class="book-notes-badge" title="Has notes"><i class="fas fa-sticky-note"></i></div>` : '';
    
    card.innerHTML = `
      <div class="book-card-inner">
        <div class="book-cover" style="${coverStyle}">
          <div class="book-shine"></div>
          <span class="file-type-badge ${fileType}">${fileType}</span>
          ${notesBadge}
          ${!book.cover ? `<div class="book-cover-placeholder"><i class="fas fa-${fileType === 'pdf' ? 'file-pdf' : 'book'}"></i></div>` : ''}
        </div>
        <div class="book-info">
          <div class="book-title">${book.title || "Unknown Title"}</div>
          <div class="book-author">${book.author || ""}</div>
          ${progressBar}
        </div>
        ${tagDots ? `<div class="book-tag-indicator">${tagDots}</div>` : ''}
        <button class="book-tag-btn" title="Manage Tags">
          <i class="fas fa-tag"></i>
        </button>
        <button class="book-options-btn" title="Options">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div class="book-options-menu">
          <button class="option-open-1"><i class="fas fa-book-open"></i> Open in Viewer 1</button>
          <button class="option-open-2"><i class="fas fa-columns"></i> Open in Viewer 2</button>
          <button class="option-open-notes"><i class="fas fa-sticky-note"></i> Open Notes</button>
          <div class="option-divider"></div>
          <button class="option-edit"><i class="fas fa-edit"></i> Edit Details</button>
          <div class="option-move-library"><i class="fas fa-folder-open"></i> Move to Library <i class="fas fa-chevron-right" style="margin-left:auto;font-size:10px;"></i></div>
          <div class="move-library-submenu" style="display:none;">
            ${allLibraryNames.filter(n => n !== currentLibraryName).map(n => 
              `<button class="move-library-option" data-target="${n}"><i class="fas fa-folder"></i> ${n}</button>`
            ).join('')}
          </div>
          <div class="option-divider"></div>
          <button class="option-remove"><i class="fas fa-trash"></i> Remove</button>
        </div>
      </div>
    `;

    // 3D tilt effect
    const inner = card.querySelector(".book-card-inner");
    const shine = card.querySelector(".book-shine");
    
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
      
      const shineX = (x / rect.width) * 100;
      const shineY = (y / rect.height) * 100;
      shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`;
      shine.style.opacity = "1";
    });
    
    card.addEventListener("mouseleave", () => {
      inner.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
      shine.style.opacity = "0";
    });

    // Options menu
    const optionsBtn = card.querySelector(".book-options-btn");
    const optionsMenu = card.querySelector(".book-options-menu");
    const tagBtn = card.querySelector(".book-tag-btn");
    
    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".book-options-menu.show").forEach(m => {
        if (m !== optionsMenu) m.classList.remove("show");
      });
      optionsMenu.classList.toggle("show");
    });
    
    tagBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openTagModal(book.path);
    });

    card.querySelector(".option-open-1").addEventListener("click", async (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      await openBookWithTransition(book.path, 1);
    });
    
    card.querySelector(".option-open-2").addEventListener("click", async (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      if (viewerWrapper2.classList.contains("hidden")) splitBtn.click();
      await openBookWithTransition(book.path, 2);
    });
    
    card.querySelector(".option-open-notes").addEventListener("click", async (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      if (viewerWrapper2.classList.contains("hidden")) splitBtn.click();
      switchView("reader");
      openNotesViewer(book.path, 2);
    });
    
    card.querySelector(".option-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      openEditBookModal(book.path);
    });
    
    // Move to library submenu
    const moveLibraryBtn = card.querySelector(".option-move-library");
    const moveLibrarySubmenu = card.querySelector(".move-library-submenu");
    
    moveLibraryBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      // Toggle submenu visibility
      const isVisible = moveLibrarySubmenu.style.display === "block";
      moveLibrarySubmenu.style.display = isVisible ? "none" : "block";
    });
    
    card.querySelectorAll(".move-library-option").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const targetLib = btn.dataset.target;
        optionsMenu.classList.remove("show");
        await moveBookToLibrary(book.path, targetLib);
      });
    });
    
    card.querySelector(".option-remove").addEventListener("click", async (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      const confirmDelete = localStorage.getItem("confirmDelete") !== "false";
      if (!confirmDelete || confirm("Remove this book from library?")) {
        await window.electronAPI.removeFromLibrary(book.path);
        loadLibrary();
      }
    });

    card.addEventListener("click", async (e) => {
      if (e.target.closest(".book-options-btn") || 
          e.target.closest(".book-options-menu") ||
          e.target.closest(".book-tag-btn")) return;
      await openBookWithTransition(book.path, targetSlot);
      targetSlot = 1; // Reset after use
    });

    libraryGrid.appendChild(card);
  });
}

async function openBookWithTransition(path, slot) {
  const readerPage = document.getElementById("reader-page");
  readerPage.classList.add("page-entering");
  
  try {
    await openBook(path, slot);
    await updateLastRead(path);
  } catch (err) {
    console.error("Error in openBookWithTransition:", err);
  }
  
  setTimeout(() => {
    readerPage.classList.remove("page-entering");
  }, 500);
}

document.addEventListener("click", () => {
  document.querySelectorAll(".book-options-menu.show").forEach(m => m.classList.remove("show"));
});

// -------------------------------------------------------
// FILE IMPORT
// -------------------------------------------------------
addBookBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  for (const file of files) {
    const filePath = file.path;
    if (!filePath) continue;

    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    
    try {
      if (isPDF) {
        await importPDF(file, filePath);
      } else {
        await importEPUB(file, filePath);
      }
    } catch (err) {
      console.error("Error adding book:", err);
      alert("Failed to add " + file.name + ": " + err.message);
    }
  }
  
  await loadLibrary();
  fileInput.value = "";
});

async function importEPUB(file, filePath) {
  const buffer = await file.arrayBuffer();
  if (typeof ePub === "undefined") throw new Error("ePub.js library not loaded.");
  
  const tempBook = ePub(buffer);
  const metadata = await tempBook.loaded.metadata;
  
  let coverDataUrl = null;
  try {
    const coverUrl = await tempBook.loaded.cover;
    if (coverUrl) {
      const coverBlob = await tempBook.archive.getBlob(coverUrl);
      coverDataUrl = await blobToDataUrl(coverBlob);
    }
  } catch (coverErr) {
    console.warn("Could not extract cover:", coverErr);
  }
  
  const bookMeta = {
    path: filePath,
    title: metadata.title || file.name.replace('.epub', ''),
    author: metadata.creator || "Unknown Author",
    cover: coverDataUrl,
    fileType: 'epub',
    addedAt: Date.now(),
    tags: []
  };

  await window.electronAPI.addToLibrary(bookMeta);
  tempBook.destroy();
}

async function importPDF(file, filePath) {
  // For PDFs, we can try to get the first page as a thumbnail
  let coverDataUrl = null;
  
  try {
    const buffer = await file.arrayBuffer();
    if (window.pdfjsLib) {
      const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(1);
      
      // Render first page to canvas for thumbnail
      const scale = 0.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      coverDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    }
  } catch (err) {
    console.warn("Could not extract PDF thumbnail:", err);
  }
  
  const bookMeta = {
    path: filePath,
    title: file.name.replace('.pdf', ''),
    author: "Unknown Author",
    cover: coverDataUrl,
    fileType: 'pdf',
    addedAt: Date.now(),
    tags: []
  };

  await window.electronAPI.addToLibrary(bookMeta);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Import and open file from path (for "Open With" functionality)
async function importAndOpenFile(filePath) {
  try {
    const fileName = filePath.split(/[/\\]/).pop();
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    
    // Read the file
    const data = await window.electronAPI.readBook(filePath);
    if (!data) throw new Error("Could not read file");
    
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const file = new File([arrayBuffer], fileName);
    
    // Import the file (add to library)
    if (isPDF) {
      await importPDF(file, filePath);
    } else {
      await importEPUB(file, filePath);
    }
    
    // Reload library to get the new book
    await loadLibrary();
    
    // Determine which slot to use for "Open With"
    // For "Open With", use the focused slot (where user is currently working)
    // If split view is open and viewer 2 is empty, use slot 2
    const isSplitMode = viewersContainer.classList.contains("split-mode");
    let slotToUse = focusedSlot || 1;
    
    if (isSplitMode && !book2 && !pdf2) {
      // Split view is open but slot 2 is empty - use slot 2
      slotToUse = 2;
    }
    
    // Switch to reader page first
    switchView("reader");
    
    // Open the book in the determined slot
    await openBookWithTransition(filePath, slotToUse);
  } catch (err) {
    console.error("Error importing/opening file:", err);
    alert("Failed to open file: " + err.message);
  }
}

// Handle "Open With" - files opened via command line or file association
if (window.electronAPI && window.electronAPI.onOpenFile) {
  window.electronAPI.onOpenFile((filePath) => {
    importAndOpenFile(filePath);
  });
}

// -------------------------------------------------------
// READER LOGIC
// -------------------------------------------------------
async function openBook(path, slot) {
  try {
    // Clear old book path first to ensure clean state
    if (slot === 1) {
      currentBookPath1 = null;
    } else {
      currentBookPath2 = null;
    }
    
    const isPDF = path.toLowerCase().endsWith('.pdf');
    const data = await window.electronAPI.readBook(path);
    
    // Validate data BEFORE setting the new path
    if (!data) throw new Error("Could not read file (empty response)");
    
    // Set new book path only after file is successfully read and validated
    if (slot === 1) {
      currentBookPath1 = path;
    } else {
      currentBookPath2 = path;
    }

    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

    // Switch to reader view FIRST so viewer has proper dimensions
    switchView("reader");
    
    // Apply default view setting ONLY on first book open in this session
    try {
      if (!hasAppliedDefaultView && slot === 1) {
        hasAppliedDefaultView = true;
        const defaultView = localStorage.getItem("default_view") || "single";
        const currentlySplit = viewersContainer.classList.contains("split-mode");
        
        if (defaultView === "split" && !currentlySplit) {
          // Open split view
          viewerWrapper2?.classList.remove("hidden");
          sidebar2?.classList.remove("hidden");
          viewersContainer?.classList.add("split-mode");
          splitBtn?.classList.add("active");
          viewer2Controls?.classList.remove("hidden");
          updateEPUBSpread();
          updateViewer2ControlsState();
        }
        // Don't close split view - only open it if that's the default
      }
    } catch (viewErr) {
      console.error("Error applying default view:", viewErr);
    }
    
    // Wait for view to be visible and layout to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    if (isPDF) {
      await openPDF(arrayBuffer, slot, path);
    } else {
      await openEPUB(arrayBuffer, slot, path);
    }
    
    applyReaderSettings();
    
    // If loading a new book in slot 1 and notes are open in slot 2, update notes for the new book
    if (slot === 1 && notesViewerSlot === 2 && notesViewerBookPath !== path) {
      openNotesViewer(path, 2);
    }
  } catch (err) {
    console.error("Error opening book:", err);
    alert("Failed to open book: " + err.message);
  }
}

async function openEPUB(arrayBuffer, slot, bookPath) {
  // Refresh library to get latest saved positions
  await loadLibrary();
  
  if (slot === 1) {
    // Close notes viewer if open
    if (viewerType1 === 'notes') {
      closeNotesViewer(1);
    }
    
    // Clean up old book and rendition completely
    if (rendition1) {
      rendition1.destroy();
      rendition1 = null;
    }
    if (book1) {
      book1.destroy();
      book1 = null;
    }
    if (pdf1) {
      pdf1 = null;
      if (pdfContainer1) pdfContainer1.style.display = 'none';
    }
    // Clean up PDF scroll resources
    if (pdfScrollObservers[1]) {
      pdfScrollObservers[1].disconnect();
      pdfScrollObservers[1] = null;
    }
    pdfRenderedPages[1].clear();
    
    viewerType1 = 'epub';
    
    // Reset all display states - EPUB viewer visible, PDF elements hidden
    viewer1El.style.display = 'block';
    viewer1El.innerHTML = "";
    
    // Show chapters sidebar (PDF hides it)
    const chaptersEl = document.getElementById("chapters");
    chaptersEl.innerHTML = "";
    chaptersEl.style.display = "block";
    
    // Hide PDF elements
    document.getElementById("pdf-pages-1").style.display = "none";
    document.getElementById("pdf-pages-1").innerHTML = "";
    
    // Hide PDF scroll containers
    const scroll1 = document.getElementById("pdf-scroll-1");
    if (scroll1) scroll1.style.display = 'none';
    const scrollContent1 = document.getElementById("pdf-scroll-content-1");
    if (scrollContent1) scrollContent1.innerHTML = '';
    viewerWrapper1.classList.remove('pdf-scroll-mode');
    
    // Hide PDF zoom controls
    if (pdfZoomControls1) pdfZoomControls1.style.display = 'none';
    
    book1 = ePub(arrayBuffer);
    
    // Wait for book to be ready
    await book1.ready;
    
    // Ensure viewer is visible and has proper dimensions before rendering
    viewer1El.style.display = 'block';
    
    // Use requestAnimationFrame to ensure layout is calculated
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify viewer has dimensions
    const rect = viewer1El.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn("Viewer has no dimensions, waiting for layout...");
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Use dynamic spread: two pages when split view is closed, single page when open
    const spreadSetting = getSpreadSetting();
    rendition1 = book1.renderTo("viewer", { 
      width: "100%",
      height: "100%",
      flow: "paginated", 
      manager: "default",
      spread: spreadSetting
    });
    
    // Apply theme-aware styles
    updateEPUBThemes();
    
    // Wait a bit for rendition to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the first spine item to ensure we display the cover
    const spine = await book1.loaded.spine;
    const firstItem = spine.items[0];
    
    // Display from beginning (cover) explicitly
    if (firstItem) {
      await rendition1.display(firstItem.href);
    } else {
      await rendition1.display();
    }
    
    // Apply column layout (spread setting) after display
    const savedColumnLayoutAfterDisplay = localStorage.getItem("column_layout") || "2";
    const columnCountAfterDisplay = parseInt(savedColumnLayoutAfterDisplay);
    applyColumnLayout(rendition1, columnCountAfterDisplay);
    
    // Force resize immediately and multiple times to ensure content renders
    if (rendition1) {
      rendition1.resize();
    }
    
    setTimeout(() => {
      if (rendition1) {
        rendition1.resize();
        // Try again after a short delay
        setTimeout(() => {
          if (rendition1) {
            rendition1.resize();
          }
        }, 150);
      }
    }, 100);
    
    loadTOC(book1, rendition1, "chapters");
    setupRenditionFocus(rendition1, 1);
    setupHighlightSelection(rendition1, 1);
    
    // Listen for rendition resize events to re-apply highlights
    rendition1.on("resized", () => {
      // Re-apply user highlights after resize (they may be lost during re-render)
      if (currentBookPath1) {
        setTimeout(() => {
          loadHighlightsForBook(currentBookPath1);
        }, 200);
      }
    });
    
    // Restore saved position after initial render (only if not a new book)
    const savedCfi = getSavedPosition(bookPath);
    if (savedCfi) {
      // Longer delay to let the cover render first
      setTimeout(() => {
        rendition1.display(savedCfi).catch(e => {
          console.warn("Could not restore position:", e);
        });
        // Resize again after position restore
        setTimeout(() => {
          if (rendition1) rendition1.resize();
        }, 100);
      }, 500);
    }
    
    // Generate locations in background for progress tracking (non-blocking)
    book1.locations.generate(2048).then(() => {
      setupProgressTracking(rendition1, book1, 1);
    });
    
    // Load existing highlights
    loadHighlightsForBook(bookPath);
    
    // Update TTS availability
    updateTTSAvailability();

    rendition1.on("keyup", (e) => {
      if (e.key === "ArrowLeft") rendition1.prev();
      if (e.key === "ArrowRight") rendition1.next();
    });

  } else {
    // Close notes viewer if open in slot 2
    if (viewerType2 === 'notes' || notesViewerSlot === 2) {
      // Clear notes state without restoring placeholder (book is about to load)
      notesViewerSlot = null;
      notesViewerBookPath = null;
      if (prevBtn2) prevBtn2.style.display = '';
      if (nextBtn2) nextBtn2.style.display = '';
    }
    
    // Clean up old book and rendition completely
    if (rendition2) {
      rendition2.destroy();
      rendition2 = null;
    }
    if (book2) {
      book2.destroy();
      book2 = null;
    }
    if (pdf2) {
      pdf2 = null;
      if (pdfContainer2) pdfContainer2.style.display = 'none';
    }
    // Clean up PDF scroll resources
    if (pdfScrollObservers[2]) {
      pdfScrollObservers[2].disconnect();
      pdfScrollObservers[2] = null;
    }
    pdfRenderedPages[2].clear();
    
    viewerType2 = 'epub';
    
    // Reset all display states - EPUB viewer visible, PDF elements hidden
    viewer2El.style.display = 'block';
    viewer2El.innerHTML = "";
    
    // Show chapters sidebar (PDF hides it)
    const chaptersEl2 = document.getElementById("chapters-2");
    chaptersEl2.innerHTML = "";
    chaptersEl2.style.display = "block";
    
    // Hide PDF elements
    document.getElementById("pdf-pages-2").style.display = "none";
    document.getElementById("pdf-pages-2").innerHTML = "";
    
    // Hide PDF scroll containers
    const scroll2 = document.getElementById("pdf-scroll-2");
    if (scroll2) scroll2.style.display = 'none';
    const scrollContent2 = document.getElementById("pdf-scroll-content-2");
    if (scrollContent2) scrollContent2.innerHTML = '';
    viewerWrapper2.classList.remove('pdf-scroll-mode');
    
    // Hide PDF zoom controls
    if (pdfZoomControls2) pdfZoomControls2.style.display = 'none';
    
    book2 = ePub(arrayBuffer);
    
    // Wait for book to be ready
    await book2.ready;
    
    // Ensure viewer is visible and has proper dimensions before rendering
    viewer2El.style.display = 'block';
    
    // Use requestAnimationFrame to ensure layout is calculated
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify viewer has dimensions
    const rect = viewer2El.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn("Viewer 2 has no dimensions, waiting for layout...");
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Use dynamic spread: two pages when split view is closed, single page when open
    const spreadSetting = getSpreadSetting();
    rendition2 = book2.renderTo("viewer-2", { 
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: spreadSetting
    });
    
    // Apply theme-aware styles
    updateEPUBThemes();
    
    // Wait a bit for rendition to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the first spine item to ensure we display the cover
    const spine = await book2.loaded.spine;
    const firstItem = spine.items[0];
    
    // Display from beginning (cover) explicitly
    if (firstItem) {
      await rendition2.display(firstItem.href);
    } else {
      await rendition2.display();
    }
    
    // Re-apply column layout after display (ensures it's applied correctly)
    const savedColumnLayoutAfterDisplay2 = localStorage.getItem("column_layout") || "2";
    const columnCountAfterDisplay2 = parseInt(savedColumnLayoutAfterDisplay2);
    applyColumnLayout(rendition2, columnCountAfterDisplay2);
    
    // Force resize immediately and multiple times to ensure content renders
    if (rendition2) {
      rendition2.resize();
    }
    
    setTimeout(() => {
      if (rendition2) {
        rendition2.resize();
        // Try again after a short delay
        setTimeout(() => {
          if (rendition2) {
            rendition2.resize();
          }
        }, 150);
      }
    }, 100);
    
    loadTOC(book2, rendition2, "chapters-2");
    setupRenditionFocus(rendition2, 2);
    
    // Restore saved position after initial render (only if not a new book)
    const savedCfi2 = getSavedPosition(bookPath);
    if (savedCfi2) {
      // Longer delay to let the cover render first
      setTimeout(() => {
        rendition2.display(savedCfi2).catch(e => {
          console.warn("Could not restore position:", e);
        });
        // Resize again after position restore
        setTimeout(() => {
          if (rendition2) rendition2.resize();
        }, 100);
      }, 500);
    }
    
    // Generate locations in background for progress tracking (non-blocking)
    book2.locations.generate(2048).then(() => {
      setupProgressTracking(rendition2, book2, 2);
    });

    rendition2.on("keyup", (e) => {
      if (e.key === "ArrowLeft") rendition2.prev();
      if (e.key === "ArrowRight") rendition2.next();
    });
    
    // Update bottom bar controls state
    updateViewer2ControlsState();
  }
}

async function openPDF(arrayBuffer, slot, bookPath) {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded. Please restart the app.");
  }
  
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Get saved page from library (refresh library first to get latest data)
  await loadLibrary();
  const book = library.find(b => b.path === bookPath);
  const savedPage = book?.readingProgress?.page || 1;
  
  // Get current PDF view mode from settings
  pdfViewMode = localStorage.getItem('pdf_view_mode') || 'paged';
  
  if (slot === 1) {
    // Close notes viewer if open
    if (viewerType1 === 'notes') {
      closeNotesViewer(1);
    }
    
    // Clean up old EPUB book and rendition
    if (rendition1) {
      rendition1.destroy();
      rendition1 = null;
    }
    if (book1) {
      book1.destroy();
      book1 = null;
    }
    
    // Clean up old PDF resources
    if (pdfScrollObservers[1]) {
      pdfScrollObservers[1].disconnect();
      pdfScrollObservers[1] = null;
    }
    pdfRenderedPages[1].clear();
    
    // Set new PDF
    pdf1 = pdf;
    pdfPage1 = Math.min(savedPage, pdf.numPages);
    pdfTotalPages1 = pdf.numPages;
    viewerType1 = 'pdf';
    pdfZoom1 = 1.0;
    
    // Hide EPUB viewer and clear its content
    viewer1El.style.display = 'none';
    viewer1El.innerHTML = "";
    
    // Clear old PDF text content and outline
    pdfTextContent[1] = null;
    pdfOutline[1] = null;
    
    // Reset chapters sidebar (will be populated with outline or page list)
    document.getElementById("chapters").innerHTML = "";
    document.getElementById("pdf-pages-1").innerHTML = "";
    
    // Re-query elements to ensure they exist (in case DOM changed)
    const scroll1 = document.getElementById("pdf-scroll-1");
    const scrollContent1 = document.getElementById("pdf-scroll-content-1");
    
    if (pdfViewMode === 'scroll' && scroll1 && scrollContent1) {
      try {
        if (pdfContainer1) pdfContainer1.style.display = 'none';
        scroll1.style.display = 'flex';
        if (pdfZoomControls1) pdfZoomControls1.style.display = 'flex';
        viewerWrapper1.classList.add('pdf-scroll-mode');
        await renderPdfScrollMode(1);
        // Scroll to saved page after a delay
        setTimeout(() => scrollToPage(1, pdfPage1), 100);
      } catch (scrollErr) {
        console.error("Scroll mode failed, falling back to paged:", scrollErr);
        // Fallback to paged mode
        if (pdfContainer1) pdfContainer1.style.display = 'block';
        if (scroll1) scroll1.style.display = 'none';
        if (pdfZoomControls1) pdfZoomControls1.style.display = 'none';
        viewerWrapper1.classList.remove('pdf-scroll-mode');
        await renderPdfPage(1);
      }
    } else {
      if (pdfContainer1) pdfContainer1.style.display = 'block';
      if (scroll1) scroll1.style.display = 'none';
      if (pdfZoomControls1) pdfZoomControls1.style.display = 'none';
      viewerWrapper1.classList.remove('pdf-scroll-mode');
      await renderPdfPage(1);
    }
    
    // Extract and display PDF outline asynchronously
    extractPdfOutline(pdf, 1).then(outline => {
      if (outline && outline.length > 0) {
        renderPdfOutline(1, outline);
      } else {
        // No outline - show page list
        loadPdfPageList(1);
      }
    }).catch(err => {
      console.warn("Could not extract PDF outline:", err);
      loadPdfPageList(1);
    });
    
    // Update TTS availability (disabled for PDF)
    updateTTSAvailability();
    
  } else {
    // Close notes viewer if open in slot 2
    if (viewerType2 === 'notes' || notesViewerSlot === 2) {
      // Clear notes state without restoring placeholder (PDF is about to load)
      notesViewerSlot = null;
      notesViewerBookPath = null;
      if (prevBtn2) prevBtn2.style.display = '';
      if (nextBtn2) nextBtn2.style.display = '';
    }
    
    // Clean up old EPUB book and rendition
    if (rendition2) {
      rendition2.destroy();
      rendition2 = null;
    }
    if (book2) {
      book2.destroy();
      book2 = null;
    }
    
    // Clean up old PDF resources
    if (pdfScrollObservers[2]) {
      pdfScrollObservers[2].disconnect();
      pdfScrollObservers[2] = null;
    }
    pdfRenderedPages[2].clear();
    
    // Set new PDF
    pdf2 = pdf;
    pdfPage2 = Math.min(savedPage, pdf.numPages);
    pdfTotalPages2 = pdf.numPages;
    viewerType2 = 'pdf';
    pdfZoom2 = 1.0;
    
    // Hide EPUB viewer and clear its content
    viewer2El.style.display = 'none';
    viewer2El.innerHTML = "";
    
    // Clear old PDF text content and outline
    pdfTextContent[2] = null;
    pdfOutline[2] = null;
    
    // Reset chapters sidebar (will be populated with outline or page list)
    document.getElementById("chapters-2").innerHTML = "";
    document.getElementById("pdf-pages-2").innerHTML = "";
    
    // Re-query elements to ensure they exist
    const scroll2 = document.getElementById("pdf-scroll-2");
    const scrollContent2 = document.getElementById("pdf-scroll-content-2");
    
    if (pdfViewMode === 'scroll' && scroll2 && scrollContent2) {
      try {
        if (pdfContainer2) pdfContainer2.style.display = 'none';
        scroll2.style.display = 'flex';
        if (pdfZoomControls2) pdfZoomControls2.style.display = 'flex';
        viewerWrapper2.classList.add('pdf-scroll-mode');
        await renderPdfScrollMode(2);
        setTimeout(() => scrollToPage(2, pdfPage2), 100);
      } catch (scrollErr) {
        console.error("Scroll mode failed (slot 2), falling back to paged:", scrollErr);
        if (pdfContainer2) pdfContainer2.style.display = 'block';
        if (scroll2) scroll2.style.display = 'none';
        if (pdfZoomControls2) pdfZoomControls2.style.display = 'none';
        await renderPdfPage(2);
      }
    } else {
      if (pdfContainer2) pdfContainer2.style.display = 'block';
      if (scroll2) scroll2.style.display = 'none';
      if (pdfZoomControls2) pdfZoomControls2.style.display = 'none';
      await renderPdfPage(2);
    }
    
    // Extract and display PDF outline asynchronously
    extractPdfOutline(pdf, 2).then(outline => {
      if (outline && outline.length > 0) {
        renderPdfOutline(2, outline);
      } else {
        // No outline - show page list
        loadPdfPageList(2);
      }
    }).catch(err => {
      console.warn("Could not extract PDF outline (slot 2):", err);
      loadPdfPageList(2);
    });
    
    // Update bottom bar controls state
    updateViewer2ControlsState();
  }
}

async function renderPdfPage(slot) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  const pageNum = slot === 1 ? pdfPage1 : pdfPage2;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const canvas = slot === 1 ? pdfCanvas1 : pdfCanvas2;
  const container = slot === 1 ? pdfContainer1 : pdfContainer2;
  const textLayer = slot === 1 ? pdfTextLayer1 : pdfTextLayer2;
  
  if (!pdf || !canvas) return;
  
  const wrapper = slot === 1 ? viewerWrapper1 : viewerWrapper2;
  let wrapperWidth = wrapper.clientWidth - 100; // Account for page buttons
  let wrapperHeight = wrapper.clientHeight;
  
  // If dimensions are too small, wait for layout and retry
  if (wrapperWidth < 100 || wrapperHeight < 100) {
    await new Promise(resolve => setTimeout(resolve, 100));
    wrapperWidth = wrapper.clientWidth - 100;
    wrapperHeight = wrapper.clientHeight;
    
    // Still too small? Use fallback dimensions
    if (wrapperWidth < 100) wrapperWidth = 600;
    if (wrapperHeight < 100) wrapperHeight = 800;
  }
  
  // Check if we should show two pages (single viewer mode, not split)
  const isSplitMode = viewersContainer.classList.contains("split-mode");
  const showTwoPages = !isSplitMode && totalPages > 1;
  
  if (showTwoPages) {
    // Two-page spread view
    const page1 = await pdf.getPage(pageNum);
    const viewport1 = page1.getViewport({ scale: 1 });
    
    // Calculate scale to fit two pages side by side
    const twoPageWidth = viewport1.width * 2 + 20; // 20px gap
    const scaleX = wrapperWidth / twoPageWidth;
    const scaleY = wrapperHeight / viewport1.height;
    const displayScale = Math.min(scaleX, scaleY); // No cap - fit to container
    
    // Account for device pixel ratio for crisp rendering
    // Use higher quality multiplier for sharper text
    const pixelRatio = window.devicePixelRatio || 1;
    const qualityMultiplier = Math.max(2, pixelRatio); // At least 2x for quality
    const renderScale = displayScale * qualityMultiplier;
    
    const scaledViewport = page1.getViewport({ scale: renderScale });
    const pageWidth = scaledViewport.width;
    const pageHeight = scaledViewport.height;
    const gap = 10 * qualityMultiplier;
    
    // Set canvas actual size (in pixels) - high resolution for quality
    canvas.width = pageWidth * 2 + gap;
    canvas.height = pageHeight;
    
    // Set canvas display size (CSS) - scaled down for display
    canvas.style.width = `${(pageWidth * 2 + gap) / qualityMultiplier}px`;
    canvas.style.height = `${pageHeight / qualityMultiplier}px`;
    
    const context = canvas.getContext('2d');
    // Enable high-quality image rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#f0f0f0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render left page with high quality intent
    await page1.render({ 
      canvasContext: context, 
      viewport: scaledViewport,
      intent: 'display'
    }).promise;
    
    // Render right page if exists
    const rightPageNum = pageNum + 1;
    if (rightPageNum <= totalPages) {
      const page2 = await pdf.getPage(rightPageNum);
      const viewport2 = page2.getViewport({ scale: renderScale });
      
      // Offset for right page
      context.save();
      context.translate(pageWidth + gap, 0);
      await page2.render({ 
        canvasContext: context, 
        viewport: viewport2,
        intent: 'display'
      }).promise;
      context.restore();
    }
    
    // Render text layer for two-page spread
    if (textLayer && container) {
      const displayWidth = (pageWidth * 2 + gap) / qualityMultiplier;
      const displayHeight = pageHeight / qualityMultiplier;
      const singlePageDisplayWidth = pageWidth / qualityMultiplier;
      const gapDisplay = gap / qualityMultiplier;
      
      textLayer.innerHTML = '';
      container.style.width = `${displayWidth}px`;
      container.style.height = `${displayHeight}px`;
      textLayer.style.width = `${displayWidth}px`;
      textLayer.style.height = `${displayHeight}px`;
      
      try {
        // Render text for left page (use displayScale for text layer positioning)
        const textContent1 = await page1.getTextContent();
        const textViewport1 = page1.getViewport({ scale: displayScale });
        renderTextLayerWithSpacing(textLayer, textContent1, textViewport1, displayHeight, 0);
        
        // Render text for right page (if exists)
        if (rightPageNum <= totalPages) {
          // Need to fetch page2 again since it was scoped to the canvas rendering block
          const page2ForText = await pdf.getPage(rightPageNum);
          const textContent2 = await page2ForText.getTextContent();
          const textViewport2 = page2ForText.getViewport({ scale: displayScale });
          renderTextLayerWithSpacing(textLayer, textContent2, textViewport2, displayHeight, singlePageDisplayWidth + gapDisplay);
        }
      } catch (err) {
        console.warn('Could not render text layer for two-page spread:', err);
      }
    }
  } else {
    // Single page view (split mode or single page PDF)
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const scaleX = wrapperWidth / viewport.width;
    const scaleY = wrapperHeight / viewport.height;
    const displayScale = Math.min(scaleX, scaleY); // No cap - fit to container
    
    // Use higher quality multiplier for sharper text
    const pixelRatio = window.devicePixelRatio || 1;
    const qualityMultiplier = Math.max(2, pixelRatio); // At least 2x for quality
    const renderScale = displayScale * qualityMultiplier;
    
    const scaledViewport = page.getViewport({ scale: renderScale });
    
    // Set canvas actual size (in pixels) - high resolution for quality
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Set canvas display size (CSS) - scaled down for display
    const displayWidth = scaledViewport.width / qualityMultiplier;
    const displayHeight = scaledViewport.height / qualityMultiplier;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    const context = canvas.getContext('2d');
    // Enable high-quality image rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    await page.render({ 
      canvasContext: context, 
      viewport: scaledViewport,
      intent: 'display'
    }).promise;
    
    // Render text layer for text selection
    if (textLayer && container) {
      // Clear existing text layer
      textLayer.innerHTML = '';
      
      // Size the container and text layer to match canvas display size
      container.style.width = `${displayWidth}px`;
      container.style.height = `${displayHeight}px`;
      textLayer.style.width = `${displayWidth}px`;
      textLayer.style.height = `${displayHeight}px`;
      
      try {
        const textContent = await page.getTextContent();
        const textViewport = page.getViewport({ scale: displayScale });
        
        // Process and render text with proper spacing
        renderTextLayerWithSpacing(textLayer, textContent, textViewport, displayHeight);
      } catch (err) {
        console.warn('Could not render text layer:', err);
      }
    }
  }
  
  // Update page indicator
  updatePageIndicator(slot);
  
  // Render highlights for this page
  // isSplitMode and showTwoPages already defined above
  const rightPageForHighlight = showTwoPages ? pageNum + 1 : null;
  renderPdfHighlightsForPage(slot, pageNum, rightPageForHighlight <= totalPages ? rightPageForHighlight : null);
}

function loadPdfPageList(slot) {
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const containerId = slot === 1 ? "pdf-pages-1" : "pdf-pages-2";
  const container = document.getElementById(containerId);
  
  container.style.display = "block";
  container.innerHTML = "";
  
  for (let i = 1; i <= totalPages; i++) {
    const item = document.createElement("div");
    item.className = "pdf-page-item";
    item.textContent = `Page ${i}`;
    item.addEventListener("click", () => {
      if (pdfViewMode === 'scroll') {
        scrollToPage(slot, i);
      } else {
        if (slot === 1) {
          pdfPage1 = i;
          renderPdfPage(1);
        } else {
          pdfPage2 = i;
          renderPdfPage(2);
        }
      }
    });
    container.appendChild(item);
  }
}

// -------------------------------------------------------
// PDF TEXT AND OUTLINE EXTRACTION
// -------------------------------------------------------

// Render text layer with proper spacing between words/items
function renderTextLayerWithSpacing(textLayer, textContent, textViewport, containerHeight, xOffset = 0) {
  // Group items by line (similar Y position)
  const lines = [];
  const lineThreshold = 5; // Pixels tolerance for same line
  
  textContent.items.forEach(item => {
    if (!item.str) return;
    
    const tx = pdfjsLib.Util.transform(textViewport.transform, item.transform);
    const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    const x = tx[4] + xOffset;
    const y = tx[5];
    
    // Calculate width from transform matrix (more reliable than item.width)
    // The width in PDF units * scale factor from transform
    const scaleX = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
    const estimatedWidth = item.str.length * fontHeight * 0.5; // Fallback estimate
    const width = (item.width && item.width > 0) ? item.width * scaleX : estimatedWidth;
    
    // Find existing line with similar Y position
    let foundLine = null;
    for (const line of lines) {
      if (Math.abs(line.y - y) < lineThreshold) {
        foundLine = line;
        break;
      }
    }
    
    if (foundLine) {
      foundLine.items.push({ str: item.str, x, y, width, fontHeight, fontName: item.fontName });
    } else {
      lines.push({
        y,
        fontHeight,
        items: [{ str: item.str, x, y, width, fontHeight, fontName: item.fontName }]
      });
    }
  });
  
  // Sort lines by Y position (top to bottom)
  lines.sort((a, b) => a.y - b.y);
  
  // Process each line
  lines.forEach(line => {
    // Sort items within line by X position (left to right)
    line.items.sort((a, b) => a.x - b.x);
    
    // Merge items with space detection
    let lineText = '';
    let prevItem = null;
    
    line.items.forEach(item => {
      if (prevItem) {
        // Calculate gap between previous item end and current item start
        const prevEnd = prevItem.x + prevItem.width;
        const gap = item.x - prevEnd;
        const spaceWidth = item.fontHeight * 0.25; // Approximate space width (narrower estimate)
        
        // Check if previous item ends with space or current starts with space
        const prevEndsWithSpace = prevItem.str.endsWith(' ');
        const currStartsWithSpace = item.str.startsWith(' ');
        
        // Add space if there's any positive gap and items don't already have spaces
        if (!prevEndsWithSpace && !currStartsWithSpace) {
          if (gap > spaceWidth * 0.2) {
            // Any noticeable gap gets a space
            lineText += ' ';
          } else if (gap > -spaceWidth * 0.5) {
            // Small overlap or touching - check if it looks like separate words
            // If previous ends with letter and current starts with letter, add space
            const prevLastChar = prevItem.str.slice(-1);
            const currFirstChar = item.str.charAt(0);
            if (/[a-zA-Z0-9]/.test(prevLastChar) && /[a-zA-Z0-9]/.test(currFirstChar)) {
              // Check for hyphenation at line end (don't add space for hyphenated words)
              if (!prevItem.str.endsWith('-')) {
                lineText += ' ';
              }
            }
          }
        }
      }
      
      lineText += item.str;
      prevItem = item;
    });
    
    if (!lineText.trim()) return;
    
    // Create span for the entire line
    const firstItem = line.items[0];
    const span = document.createElement('span');
    // Add newline at end for proper copy/paste across lines
    span.textContent = lineText + '\n';
    span.style.fontSize = `${line.fontHeight}px`;
    span.style.fontFamily = firstItem.fontName || 'sans-serif';
    span.style.left = `${firstItem.x}px`;
    span.style.top = `${line.y - line.fontHeight}px`;
    
    textLayer.appendChild(span);
  });
}

// Extract text from a single PDF page
async function extractPdfPageText(pdf, pageNum) {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Combine all text items into a single string with proper spacing
    let lastY = null;
    let text = '';
    
    textContent.items.forEach(item => {
      // Add newline if Y position changed significantly (new line)
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        text += '\n';
      } else if (text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')) {
        text += ' ';
      }
      text += item.str;
      lastY = item.transform[5];
    });
    
    return text.trim();
  } catch (err) {
    console.error(`Error extracting text from page ${pageNum}:`, err);
    return '';
  }
}

// Extract text from all PDF pages (for search)
async function extractAllPdfText(pdf, slot) {
  try {
    const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
    const pageTextMap = {};
    
    // Extract text from each page
    for (let i = 1; i <= totalPages; i++) {
      const pageText = await extractPdfPageText(pdf, i);
      pageTextMap[i] = pageText;
    }
    
    // Store in state
    pdfTextContent[slot] = {
      pageTextMap: pageTextMap,
      extractedAt: Date.now()
    };
    
    return pdfTextContent[slot];
  } catch (err) {
    console.error('Error extracting PDF text:', err);
    return null;
  }
}

// Extract PDF outline/bookmarks (chapter structure)
async function extractPdfOutline(pdf, slot) {
  try {
    const outline = await pdf.getOutline();
    
    if (!outline || outline.length === 0) {
      pdfOutline[slot] = null;
      return null;
    }
    
    // Process outline recursively to a cleaner structure
    const processOutline = (items) => {
      return items.map(item => ({
        title: item.title,
        dest: item.dest,
        url: item.url,
        items: item.items ? processOutline(item.items) : []
      }));
    };
    
    pdfOutline[slot] = processOutline(outline);
    return pdfOutline[slot];
  } catch (err) {
    console.error('Error extracting PDF outline:', err);
    pdfOutline[slot] = null;
    return null;
  }
}

// Render PDF outline in sidebar (like EPUB TOC)
function renderPdfOutline(slot, outline) {
  const chapterListId = slot === 1 ? "chapters" : "chapters-2";
  const chapterList = document.getElementById(chapterListId);
  const pdfPagesId = slot === 1 ? "pdf-pages-1" : "pdf-pages-2";
  const pdfPagesEl = document.getElementById(pdfPagesId);
  
  if (!chapterList || !outline || outline.length === 0) {
    // No outline - fall back to page list
    if (chapterList) {
      chapterList.style.display = "none";
      chapterList.innerHTML = "";
    }
    loadPdfPageList(slot);
    return;
  }
  
  // Hide page list, show chapter list
  if (pdfPagesEl) pdfPagesEl.style.display = "none";
  chapterList.style.display = "block";
  chapterList.innerHTML = "";
  
  const renderOutlineItem = (item, level = 0) => {
    const li = document.createElement("li");
    if (level > 0) {
      li.classList.add("pdf-outline-nested");
      li.style.paddingLeft = `${24 + level * 16}px`;
    }
    
    const link = document.createElement("span");
    link.className = "chapter-title";
    link.textContent = item.title;
    link.title = item.title;
    
    link.addEventListener("click", async () => {
      await navigateToPdfDestination(slot, item.dest);
    });
    
    li.appendChild(link);
    
    // Handle sub-items - render them as siblings after this item for flat list appearance
    const items = [li];
    if (item.items && item.items.length > 0) {
      item.items.forEach(subItem => {
        items.push(...renderOutlineItem(subItem, level + 1));
      });
    }
    
    return items;
  };
  
  outline.forEach(item => {
    const items = renderOutlineItem(item);
    items.forEach(li => chapterList.appendChild(li));
  });
}

// Navigate to PDF destination (from outline click)
async function navigateToPdfDestination(slot, dest) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  if (!pdf || !dest) return;
  
  try {
    let pageNum = 1;
    
    if (typeof dest === 'string') {
      // Named destination - resolve it
      const resolvedDest = await pdf.getDestination(dest);
      if (resolvedDest && resolvedDest.length > 0) {
        const pageRef = resolvedDest[0];
        const pageIndex = await pdf.getPageIndex(pageRef);
        pageNum = pageIndex + 1; // PDF.js uses 0-based indexing
      }
    } else if (Array.isArray(dest) && dest.length > 0) {
      // Direct page reference array
      const pageRef = dest[0];
      if (typeof pageRef === 'object') {
        const pageIndex = await pdf.getPageIndex(pageRef);
        pageNum = pageIndex + 1;
      } else if (typeof pageRef === 'number') {
        pageNum = pageRef + 1;
      }
    }
    
    // Navigate to the page
    const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
    pageNum = Math.max(1, Math.min(pageNum, totalPages));
    
    if (slot === 1) {
      pdfPage1 = pageNum;
    } else {
      pdfPage2 = pageNum;
    }
    
    if (pdfViewMode === 'scroll') {
      scrollToPage(slot, pageNum);
    } else {
      await renderPdfPage(slot);
    }
    
    savePdfProgress(slot);
  } catch (err) {
    console.error('Error navigating to PDF destination:', err);
  }
}

// Search within a PDF
async function searchInPDF(query, slot) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  if (!pdf) return [];
  
  // Extract text if not already done
  if (!pdfTextContent[slot] || !pdfTextContent[slot].pageTextMap) {
    await extractAllPdfText(pdf, slot);
  }
  
  const textData = pdfTextContent[slot];
  if (!textData || !textData.pageTextMap) {
    return [];
  }
  
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  // Search through each page's text
  Object.entries(textData.pageTextMap).forEach(([pageNumStr, text]) => {
    const pageNum = parseInt(pageNumStr);
    const lowerText = text.toLowerCase();
    let startIndex = 0;
    let matchIndex;
    
    while ((matchIndex = lowerText.indexOf(lowerQuery, startIndex)) !== -1) {
      // Get excerpt around the match
      const excerptStart = Math.max(0, matchIndex - 40);
      const excerptEnd = Math.min(text.length, matchIndex + query.length + 40);
      let excerpt = text.substring(excerptStart, excerptEnd);
      
      if (excerptStart > 0) excerpt = '...' + excerpt;
      if (excerptEnd < text.length) excerpt = excerpt + '...';
      
      // Highlight the match
      const highlightedExcerpt = excerpt.replace(
        new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<mark>$1</mark>'
      );
      
      results.push({
        type: 'pdf',
        page: pageNum,
        excerpt: highlightedExcerpt,
        chapter: `Page ${pageNum}`
      });
      
      startIndex = matchIndex + 1;
      
      // Limit results per page
      if (results.filter(r => r.page === pageNum).length >= 5) break;
    }
    
    // Limit total results
    if (results.length >= 100) return;
  });
  
  return results;
}

// -------------------------------------------------------
// PDF SCROLL MODE - Virtual Scrolling with Lazy Loading
// -------------------------------------------------------
// Store rendered pages cache and observers per slot
const pdfScrollObservers = { 1: null, 2: null };
const pdfRenderedPages = { 1: new Map(), 2: new Map() };

async function renderPdfScrollMode(slot) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  const scrollContainer = slot === 1 ? pdfScroll1 : pdfScroll2;
  
  // Validate inputs
  if (!pdf || !scrollContent || !scrollContainer) {
    console.error("PDF scroll mode: missing required elements", { pdf: !!pdf, scrollContent: !!scrollContent, scrollContainer: !!scrollContainer });
    return;
  }
  
  // CRITICAL: Clear rendered pages cache when re-opening PDF
  // Without this, re-opening shows blank pages because cache thinks pages are rendered
  pdfRenderedPages[slot].clear();
  
  // Disconnect old observer if exists
  if (pdfScrollObservers[slot]) {
    pdfScrollObservers[slot].disconnect();
    pdfScrollObservers[slot] = null;
  }
  
  // Safety check for totalPages
  if (!totalPages || totalPages <= 0 || totalPages > 5000 || isNaN(totalPages)) {
    console.error("PDF scroll mode: invalid totalPages", totalPages);
    return;
  }
  
  // Clear previous content and show loading
  scrollContent.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Initializing PDF viewer...</div>';
  
  // Wait for container to have dimensions
  let containerWidth = scrollContainer.clientWidth - 60;
  let attempts = 0;
  while (containerWidth <= 0 && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 50));
    containerWidth = scrollContainer.clientWidth - 60;
    attempts++;
  }
  
  // Fallback if still no width
  if (containerWidth <= 0) {
    const wrapper = scrollContainer.parentElement;
    containerWidth = wrapper ? wrapper.clientWidth - 100 : 600;
    console.warn("PDF scroll: using fallback width:", containerWidth);
  }
  
  // Get first page to estimate page dimensions
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });
  const baseScale = Math.min(containerWidth / firstViewport.width, 2);
  const scaledViewport = firstPage.getViewport({ scale: baseScale });
  const estimatedPageHeight = scaledViewport.height;
  const estimatedPageWidth = scaledViewport.width;
  
  // Clear loading message
  scrollContent.innerHTML = '';
  
  // Reset zoom
  scrollContent.style.transform = 'scale(1)';
  scrollContent.style.transformOrigin = '0 0';
  if (slot === 1) pdfZoom1 = 1.0;
  else pdfZoom2 = 1.0;
  
  // Store container width, scale, and base dimensions for later use
  scrollContent.dataset.containerWidth = containerWidth;
  scrollContent.dataset.baseScale = baseScale;
  
  // Store the ORIGINAL render scale - this is our quality baseline
  // We'll always render at at least this scale to maintain quality in split view
  scrollContent.dataset.originalRenderScale = baseScale.toString();
  
  // CRITICAL: Store base PAGE dimensions for zoom calculations
  scrollContent.dataset.basePageWidth = estimatedPageWidth.toString();
  scrollContent.dataset.basePageHeight = estimatedPageHeight.toString();
  
  // Create placeholder structure for all pages
  const gap = 20; // Gap between pages
  const padding = 40; // Padding around content (20px each side)
  
  // Calculate and store base content dimensions (before any zoom)
  const estimatedTotalHeight = (estimatedPageHeight + gap) * totalPages - gap + padding;
  const totalWidth = estimatedPageWidth + padding;
  scrollContent.dataset.baseContentWidth = totalWidth.toString();
  scrollContent.dataset.baseContentHeight = estimatedTotalHeight.toString();
  
  // No need to set min-width/height - natural content size will be correct
  scrollContent.style.transform = 'none';
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pagePlaceholder = document.createElement('div');
    pagePlaceholder.className = 'pdf-scroll-page-placeholder';
    pagePlaceholder.dataset.pageNum = pageNum;
    pagePlaceholder.dataset.rendered = 'false';
    // Set explicit dimensions that won't change
    pagePlaceholder.style.width = `${estimatedPageWidth}px`;
    pagePlaceholder.style.height = `${estimatedPageHeight}px`;
    pagePlaceholder.style.minHeight = `${estimatedPageHeight}px`;
    pagePlaceholder.style.maxHeight = `${estimatedPageHeight}px`;
    pagePlaceholder.style.margin = `0 auto ${gap}px`;
    pagePlaceholder.style.position = 'relative';
    pagePlaceholder.style.boxSizing = 'border-box';
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-muted); font-size: 12px;';
    loadingDiv.textContent = `Page ${pageNum}`;
    pagePlaceholder.appendChild(loadingDiv);
    
    scrollContent.appendChild(pagePlaceholder);
  }
  
  // Create Intersection Observer to detect visible pages
  pdfScrollObservers[slot] = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.dataset.pageNum);
        if (entry.target.dataset.rendered !== 'true') {
          renderPageIfNeeded(slot, pageNum);
        }
      }
    });
  }, {
    root: scrollContainer,
    rootMargin: '200px', // Render pages 200px before they enter viewport
    threshold: 0.01
  });
  
  // Observe all placeholders
  scrollContent.querySelectorAll('.pdf-scroll-page-placeholder').forEach(placeholder => {
    pdfScrollObservers[slot].observe(placeholder);
  });
  
  // Render first few pages immediately (visible on load)
  const initialPages = Math.min(5, totalPages);
  for (let i = 1; i <= initialPages; i++) {
    await renderPageIfNeeded(slot, i);
  }
  
  // Update zoom level display
  updateZoomDisplay(slot);
  
  // Update page indicator
  updatePageIndicator(slot);
  
  // Load the page list for navigation
  loadPdfPageList(slot);
}

async function renderPageIfNeeded(slot, pageNum) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  const renderedPages = pdfRenderedPages[slot];
  
  // Check if already rendered or currently rendering
  if (renderedPages.has(pageNum)) {
    return;
  }
  
  const placeholder = scrollContent.querySelector(`[data-page-num="${pageNum}"]`);
  if (!placeholder || placeholder.dataset.rendered === 'true' || placeholder.dataset.rendered === 'rendering') {
    return;
  }
  
  try {
    placeholder.dataset.rendered = 'rendering';
    
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    
    // Get stored scales and base dimensions
    const baseScale = parseFloat(scrollContent.dataset.baseScale) || 1;
    const originalRenderScale = parseFloat(scrollContent.dataset.originalRenderScale) || baseScale;
    const basePageWidth = parseFloat(scrollContent.dataset.basePageWidth) || viewport.width * baseScale;
    const basePageHeight = parseFloat(scrollContent.dataset.basePageHeight) || viewport.height * baseScale;
    
    // Get current zoom at render start (for render quality)
    const zoomAtRenderStart = slot === 1 ? pdfZoom1 : pdfZoom2;
    
    // Render at high resolution for quality (accounting for potential zoom)
    // Always render at least at original scale, or higher if zoomed in
    const renderScale = Math.max(baseScale, originalRenderScale) * Math.max(1, zoomAtRenderStart);
    const renderViewport = page.getViewport({ scale: renderScale });
    
    // Create canvas at HIGH resolution
    const canvas = document.createElement('canvas');
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = renderViewport.width * pixelRatio;
    canvas.height = renderViewport.height * pixelRatio;
    canvas.style.display = 'block';
    canvas.style.margin = '0';
    
    // Render page at high resolution
    const context = canvas.getContext('2d');
    context.scale(pixelRatio, pixelRatio);
    await page.render({ canvasContext: context, viewport: renderViewport }).promise;
    
    // CRITICAL: Re-read current zoom AFTER async render completes
    // Zoom may have changed while we were rendering
    const finalZoom = slot === 1 ? pdfZoom1 : pdfZoom2;
    
    // Calculate final display size using base dimensions * current zoom
    // This ensures we match other pages that were resized by setZoom
    const finalWidth = basePageWidth * finalZoom;
    const finalHeight = basePageHeight * finalZoom;
    
    // Set canvas display size
    canvas.style.width = `${finalWidth}px`;
    canvas.style.height = `${finalHeight}px`;
    
    // Update placeholder to match
    placeholder.style.width = `${finalWidth}px`;
    placeholder.style.height = `${finalHeight}px`;
    placeholder.style.minHeight = `${finalHeight}px`;
    placeholder.style.maxHeight = `${finalHeight}px`;
    
    // Replace placeholder content with canvas
    placeholder.innerHTML = '';
    placeholder.appendChild(canvas);
    
    // Add text layer for text selection
    try {
      const textContent = await page.getTextContent();
      const textLayer = document.createElement('div');
      textLayer.className = 'pdf-text-layer pdf-scroll-text-layer';
      
      // Text layer uses BASE scale for positioning, then CSS transform for zoom
      textLayer.style.width = `${basePageWidth}px`;
      textLayer.style.height = `${basePageHeight}px`;
      textLayer.style.transform = `scale(${finalZoom})`;
      textLayer.dataset.baseScale = baseScale.toString();
      
      // Create a viewport at base scale for text positioning
      const textViewport = page.getViewport({ scale: baseScale });
      
      // Use the spacing-aware text rendering
      renderTextLayerWithSpacing(textLayer, textContent, textViewport, basePageHeight, 0);
      
      placeholder.appendChild(textLayer);
    } catch (textErr) {
      console.warn('Could not render text layer for page', pageNum, textErr);
    }
    
    // Render highlights for this page
    renderPdfHighlightsForScrollPage(slot, pageNum, placeholder);
    
    placeholder.className = 'pdf-scroll-page';
    placeholder.dataset.rendered = 'true';
    placeholder.dataset.renderedAtZoom = finalZoom.toString();
    
    // Store in cache
    renderedPages.set(pageNum, canvas);
  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err);
    placeholder.dataset.rendered = 'error';
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; text-align: center; color: var(--text-muted);';
    errorDiv.textContent = `Error loading page ${pageNum}`;
    placeholder.innerHTML = '';
    placeholder.appendChild(errorDiv);
  }
}

function scrollToPage(slot, pageNum) {
  const scrollContainer = slot === 1 ? pdfScroll1 : pdfScroll2;
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  
  if (!scrollContainer || !scrollContent) {
    console.warn("scrollToPage: container not found");
    return;
  }
  
  // Find placeholder or rendered page
  const pageElement = scrollContent.querySelector(`[data-page-num="${pageNum}"]`);
  
  if (pageElement) {
    // Calculate the scroll position relative to the scroll container
    // The page element's offsetTop is relative to its offset parent (scrollContent)
    const targetScrollTop = pageElement.offsetTop - 20; // 20px padding from top
    
    // Smooth scroll to the target position
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
    
    // Ensure page is rendered
    renderPageIfNeeded(slot, pageNum);
  } else {
    console.warn(`scrollToPage: page element ${pageNum} not found`);
  }
}

// Recalculate PDF scroll mode when viewer size changes (e.g., split view)
async function recalculatePdfScrollMode(slot) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  const scrollContainer = slot === 1 ? pdfScroll1 : pdfScroll2;
  
  if (!pdf || !scrollContent || !scrollContainer) return;
  
  // Wait a bit for layout to settle after split view change
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Get new container width (account for padding)
  let containerWidth = scrollContainer.clientWidth - 60;
  if (containerWidth <= 0) {
    // Try again with a longer delay
    await new Promise(resolve => setTimeout(resolve, 100));
    containerWidth = scrollContainer.clientWidth - 60;
  }
  
  if (containerWidth <= 0) {
    // Fallback: use parent width
    const wrapper = scrollContainer.parentElement;
    containerWidth = wrapper ? wrapper.clientWidth - 100 : 600;
    console.warn("Using fallback container width:", containerWidth);
  }
  
  // Get first page to recalculate scale
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });
  const newBaseScale = Math.min(containerWidth / firstViewport.width, 2);
  const scaledViewport = firstPage.getViewport({ scale: newBaseScale });
  const newPageWidth = scaledViewport.width;
  const newPageHeight = scaledViewport.height;
  
  // Store new dimensions for DISPLAY (not render quality)
  scrollContent.dataset.containerWidth = containerWidth;
  scrollContent.dataset.baseScale = newBaseScale;
  
  // PRESERVE the original render scale - don't lower quality in split view
  // If originalRenderScale doesn't exist or new scale is higher, update it
  const existingOriginalScale = parseFloat(scrollContent.dataset.originalRenderScale) || 0;
  if (newBaseScale > existingOriginalScale) {
    scrollContent.dataset.originalRenderScale = newBaseScale.toString();
  }
  // Otherwise keep the existing (higher) original scale for quality
  
  // CRITICAL: Store base PAGE dimensions for zoom calculations
  scrollContent.dataset.basePageWidth = newPageWidth.toString();
  scrollContent.dataset.basePageHeight = newPageHeight.toString();
  
  // Update base content dimensions
  const gap = 20;
  const padding = 40;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const estimatedTotalHeight = (newPageHeight + gap) * totalPages - gap + padding;
  const totalWidth = newPageWidth + padding;
  scrollContent.dataset.baseContentWidth = totalWidth.toString();
  scrollContent.dataset.baseContentHeight = estimatedTotalHeight.toString();
  
  // No CSS transform - use natural sizing
  scrollContent.style.transform = 'none';
  scrollContent.style.minWidth = '';
  scrollContent.style.minHeight = '';
  
  // Get current zoom and scroll
  const currentZoom = slot === 1 ? pdfZoom1 : pdfZoom2;
  const currentScrollX = scrollContainer.scrollLeft;
  const currentScrollY = scrollContainer.scrollTop;
  
  // Calculate scaled page dimensions
  const scaledPageWidth = newPageWidth * currentZoom;
  const scaledPageHeight = newPageHeight * currentZoom;
  
  // Update all placeholder dimensions to match current zoom
  const placeholders = scrollContent.querySelectorAll('.pdf-scroll-page-placeholder, .pdf-scroll-page');
  placeholders.forEach(placeholder => {
    placeholder.style.width = `${scaledPageWidth}px`;
    placeholder.style.height = `${scaledPageHeight}px`;
    placeholder.style.minHeight = `${scaledPageHeight}px`;
    placeholder.style.maxHeight = `${scaledPageHeight}px`;
    
    // Scale canvas if present
    const canvas = placeholder.querySelector('canvas');
    if (canvas) {
      canvas.style.width = `${scaledPageWidth}px`;
      canvas.style.height = `${scaledPageHeight}px`;
    }
    
    // Scale text layer using CSS transform (keeps text positions accurate)
    const textLayer = placeholder.querySelector('.pdf-text-layer');
    if (textLayer) {
      textLayer.style.transform = `scale(${zoom})`;
    }
    
    // Scale highlight layer using CSS transform
    const highlightLayer = placeholder.querySelector('.pdf-highlight-layer');
    if (highlightLayer) {
      highlightLayer.style.transform = `scale(${zoom})`;
    }
  });
  
  // Re-render currently visible pages at new scale
  const visiblePlaceholders = Array.from(placeholders).filter(p => {
    const rect = p.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    return rect.top < containerRect.bottom + 200 && rect.bottom > containerRect.top - 200;
  });
  
  // Clear rendered cache for visible pages so they re-render at new resolution
  const renderedPages = pdfRenderedPages[slot];
  visiblePlaceholders.forEach(placeholder => {
    const pageNum = parseInt(placeholder.dataset.pageNum);
    if (pageNum) {
      renderedPages.delete(pageNum);
      placeholder.dataset.rendered = 'false';
      placeholder.innerHTML = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-muted); font-size: 12px;';
      loadingDiv.textContent = `Page ${pageNum}`;
      placeholder.className = 'pdf-scroll-page-placeholder';
      // Dimensions already set above
      placeholder.appendChild(loadingDiv);
    }
  });
  
  // Re-render visible pages
  for (const placeholder of visiblePlaceholders) {
    const pageNum = parseInt(placeholder.dataset.pageNum);
    if (pageNum) {
      await renderPageIfNeeded(slot, pageNum);
    }
  }
  
  // Adjust scroll position to keep same relative position
  // Calculate new scroll to show approximately the same content
  const newScrollY = (currentScrollY / currentZoom) * currentZoom;
  scrollContainer.scrollTop = Math.max(0, newScrollY);
}

function updateZoomDisplay(slot) {
  const zoom = slot === 1 ? pdfZoom1 : pdfZoom2;
  const zoomLevelEl = document.getElementById(`zoom-level-${slot}`);
  if (zoomLevelEl) {
    zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
  }
}

// Throttle zoom with requestAnimationFrame for smoothness
let zoomRAF = { 1: null, 2: null };
let pendingZoom = { 1: null, 2: null };

// Debounce timer for re-rendering after zoom ends
let zoomEndTimer = { 1: null, 2: null };
const ZOOM_RE_RENDER_DELAY = 300; // ms to wait after last zoom before re-rendering

function setZoom(slot, newZoom, mouseX = null, mouseY = null) {
  // Clamp zoom between 0.5 and 3
  newZoom = Math.max(0.5, Math.min(3, newZoom));
  
  // CRITICAL: Ensure button clicks NEVER use mouse coordinates
  // Convert undefined, null, or any non-number to null
  if (mouseX === undefined || mouseX === null || typeof mouseX !== 'number' || isNaN(mouseX)) {
    mouseX = null;
  }
  if (mouseY === undefined || mouseY === null || typeof mouseY !== 'number' || isNaN(mouseY)) {
    mouseY = null;
  }
  
  // If either coordinate is null, both must be null (button click = center zoom)
  if (mouseX === null || mouseY === null) {
    mouseX = null;
    mouseY = null;
  }
  
  // Store pending zoom (latest wins) - explicitly store null for button clicks
  pendingZoom[slot] = { zoom: newZoom, mouseX, mouseY };
  
  // Cancel any pending frame
  if (zoomRAF[slot]) {
    cancelAnimationFrame(zoomRAF[slot]);
  }
  
  // Schedule update for next frame
  zoomRAF[slot] = requestAnimationFrame(() => {
    performZoomUpdate(slot);
    zoomRAF[slot] = null;
  });
}

function performZoomUpdate(slot) {
  const pending = pendingZoom[slot];
  if (!pending) return;
  
  const newZoom = pending.zoom;
  const mouseX = pending.mouseX;
  const mouseY = pending.mouseY;
  pendingZoom[slot] = null;
  
  const oldZoom = slot === 1 ? pdfZoom1 : pdfZoom2;
  
  // Update zoom state
  if (slot === 1) pdfZoom1 = newZoom;
  else pdfZoom2 = newZoom;
  
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  const scrollContainer = slot === 1 ? pdfScroll1 : pdfScroll2;
  
  if (!scrollContent || !scrollContainer) {
    updateZoomDisplay(slot);
    return;
  }
  
  // Get base page dimensions (stored during init)
  const basePageWidth = parseFloat(scrollContent.dataset.basePageWidth);
  const basePageHeight = parseFloat(scrollContent.dataset.basePageHeight);
  
  if (!basePageWidth || !basePageHeight) {
    console.warn("Base page dimensions not found");
    updateZoomDisplay(slot);
    return;
  }
  
  // Read current state
  const containerRect = scrollContainer.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  const currentScrollX = scrollContainer.scrollLeft;
  const currentScrollY = scrollContainer.scrollTop;
  
  // Determine focal point (viewport-relative)
  // For button clicks (null mouse), use center
  // For ctrl+scroll, use mouse position
  let focalX = containerWidth / 2;
  let focalY = containerHeight / 2;
  
  const hasValidMouse = (typeof mouseX === 'number' && typeof mouseY === 'number' && 
                         !isNaN(mouseX) && !isNaN(mouseY));
  
  if (hasValidMouse) {
    const relX = mouseX - containerRect.left;
    const relY = mouseY - containerRect.top;
    if (relX >= 0 && relX <= containerWidth && relY >= 0 && relY <= containerHeight) {
      focalX = relX;
      focalY = relY;
    }
  }
  
  // Calculate the content point at the focal position (in BASE coordinates)
  // Current scroll is in current-zoom coordinates, so divide by oldZoom
  const contentPointX = (currentScrollX + focalX) / oldZoom;
  const contentPointY = (currentScrollY + focalY) / oldZoom;
  
  // Calculate new page dimensions
  const newPageWidth = basePageWidth * newZoom;
  const newPageHeight = basePageHeight * newZoom;
  
  // NO CSS TRANSFORM - resize page elements directly instead
  // This ensures scroll range is correct without double-scaling
  scrollContent.style.transform = 'none';
  scrollContent.style.minWidth = '';
  scrollContent.style.minHeight = '';
  
  // Resize all page elements
  const pages = scrollContent.querySelectorAll('.pdf-scroll-page, .pdf-scroll-page-placeholder');
  pages.forEach(page => {
    page.style.width = `${newPageWidth}px`;
    page.style.height = `${newPageHeight}px`;
    page.style.minHeight = `${newPageHeight}px`;
    page.style.maxHeight = `${newPageHeight}px`;
    
    // Scale the canvas inside (if rendered)
    const canvas = page.querySelector('canvas');
    if (canvas) {
      canvas.style.width = `${newPageWidth}px`;
      canvas.style.height = `${newPageHeight}px`;
    }
    
    // Scale text layer using CSS transform
    const textLayer = page.querySelector('.pdf-text-layer');
    if (textLayer) {
      textLayer.style.transform = `scale(${newZoom})`;
    }
    
    // Scale highlight layer using CSS transform
    const highlightLayer = page.querySelector('.pdf-highlight-layer');
    if (highlightLayer) {
      highlightLayer.style.transform = `scale(${newZoom})`;
    }
  });
  
  // Calculate new scroll position to keep content point at focal position
  // After zoom, content point is at (contentPointX * newZoom, contentPointY * newZoom)
  // To keep it at focal: newScroll + focal = contentPoint * newZoom
  const newScrollX = (contentPointX * newZoom) - focalX;
  const newScrollY = (contentPointY * newZoom) - focalY;
  
  // Get actual content dimensions after resize
  const gap = 20;
  const padding = 40;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const totalWidth = newPageWidth + padding;
  const totalHeight = (newPageHeight + gap) * totalPages - gap + padding;
  
  // Clamp to valid scroll range
  const maxScrollX = Math.max(0, totalWidth - containerWidth);
  const maxScrollY = Math.max(0, totalHeight - containerHeight);
  
  scrollContainer.scrollLeft = Math.max(0, Math.min(newScrollX, maxScrollX));
  scrollContainer.scrollTop = Math.max(0, Math.min(newScrollY, maxScrollY));
  
  updateZoomDisplay(slot);
  
  // Schedule high-resolution re-render after zoom ends (debounced)
  scheduleZoomReRender(slot);
}

// Schedule re-render of visible pages at full resolution after zoom stops
function scheduleZoomReRender(slot) {
  // Clear any existing timer
  if (zoomEndTimer[slot]) {
    clearTimeout(zoomEndTimer[slot]);
  }
  
  // Set new timer - will fire when zooming stops
  zoomEndTimer[slot] = setTimeout(() => {
    reRenderVisiblePagesAtZoom(slot);
    zoomEndTimer[slot] = null;
  }, ZOOM_RE_RENDER_DELAY);
}

// Re-render visible pages at current zoom level for crisp text
async function reRenderVisiblePagesAtZoom(slot) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  const scrollContainer = slot === 1 ? pdfScroll1 : pdfScroll2;
  const currentZoom = slot === 1 ? pdfZoom1 : pdfZoom2;
  const renderedPages = pdfRenderedPages[slot];
  
  if (!pdf || !scrollContent || !scrollContainer) return;
  
  // Get base scale (used for original render)
  const baseScale = parseFloat(scrollContent.dataset.baseScale) || 1;
  
  // Only re-render when zoomed IN beyond 1.0
  // When zooming out (zoom <= 1.0), CSS downscaling the original looks fine
  if (currentZoom <= 1.02) return;
  
  // Find visible pages that need re-rendering
  const containerRect = scrollContainer.getBoundingClientRect();
  const pagesToReRender = [];
  
  scrollContent.querySelectorAll('.pdf-scroll-page').forEach(page => {
    const pageRect = page.getBoundingClientRect();
    const isVisible = pageRect.bottom > containerRect.top && pageRect.top < containerRect.bottom;
    if (isVisible) {
      const pageNum = parseInt(page.dataset.pageNum);
      // Check what zoom level this page was last rendered at
      const renderedAtZoom = parseFloat(page.dataset.renderedAtZoom) || 1.0;
      // Only re-render if current zoom is higher than what we have
      if (currentZoom > renderedAtZoom + 0.05) {
        pagesToReRender.push(pageNum);
      }
    }
  });
  
  // No pages need re-rendering
  if (pagesToReRender.length === 0) return;
  
  // Re-render each page that needs it
  for (const pageNum of pagesToReRender) {
    const pageElement = scrollContent.querySelector(`[data-page-num="${pageNum}"]`);
    if (!pageElement || pageElement.classList.contains('pdf-scroll-page-placeholder')) continue;
    
    // Check if zoom changed during re-render (user zoomed again)
    const checkZoom = slot === 1 ? pdfZoom1 : pdfZoom2;
    if (Math.abs(checkZoom - currentZoom) > 0.01) return; // Zoom changed, abort
    
    try {
      const page = await pdf.getPage(pageNum);
      
      // Render at the zoomed scale for crisp text
      // Use originalRenderScale to maintain quality in split view
      const originalRenderScale = parseFloat(scrollContent.dataset.originalRenderScale) || baseScale;
      const renderScale = Math.max(baseScale, originalRenderScale) * currentZoom;
      const viewport = page.getViewport({ scale: renderScale });
      
      // Create new canvas at high resolution
      const newCanvas = document.createElement('canvas');
      const pixelRatio = window.devicePixelRatio || 1;
      newCanvas.width = viewport.width * pixelRatio;
      newCanvas.height = viewport.height * pixelRatio;
      
      // Set display size to match current page element size
      const displayWidth = parseFloat(pageElement.style.width);
      const displayHeight = parseFloat(pageElement.style.height);
      newCanvas.style.display = 'block';
      newCanvas.style.width = `${displayWidth}px`;
      newCanvas.style.height = `${displayHeight}px`;
      newCanvas.style.margin = '0';
      newCanvas.style.position = 'absolute';
      newCanvas.style.top = '0';
      newCanvas.style.left = '0';
      newCanvas.style.opacity = '0'; // Start invisible
      
      // Render at high resolution
      const context = newCanvas.getContext('2d');
      context.scale(pixelRatio, pixelRatio);
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      // Double-check zoom hasn't changed
      const finalZoom = slot === 1 ? pdfZoom1 : pdfZoom2;
      if (Math.abs(finalZoom - currentZoom) > 0.01) {
        // Zoom changed during render, discard this canvas
        return;
      }
      
      // Get the old canvas
      const oldCanvas = pageElement.querySelector('canvas');
      
      // Make page element position relative for absolute positioning of new canvas
      pageElement.style.position = 'relative';
      
      // Add new canvas behind old one
      if (oldCanvas) {
        pageElement.insertBefore(newCanvas, oldCanvas);
      } else {
        pageElement.appendChild(newCanvas);
      }
      
      // Instant swap: make new canvas visible and remove old one
      // Using requestAnimationFrame ensures the new canvas is painted first
      requestAnimationFrame(() => {
        newCanvas.style.position = 'relative';
        newCanvas.style.opacity = '1';
        if (oldCanvas && oldCanvas !== newCanvas) {
          oldCanvas.remove();
        }
      });
      
      // Update cache and track what zoom we rendered at
      renderedPages.set(pageNum, newCanvas);
      pageElement.dataset.renderedAtZoom = currentZoom.toString();
      
    } catch (err) {
      console.warn(`Re-render failed for page ${pageNum}:`, err);
    }
  }
}

// Zoom controls event listeners
// Always zoom to center - use a special flag to force center zoom
// Zoom controller buttons - ALWAYS zoom to center, NEVER use mouse coordinates
document.getElementById('zoom-in-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  // Explicitly pass null (not undefined) to ensure no mouse coordinates are used
  setZoom(1, pdfZoom1 + 0.25, null, null);
});
document.getElementById('zoom-out-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  setZoom(1, pdfZoom1 - 0.25, null, null);
});
document.getElementById('zoom-fit-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  setZoom(1, 1.0, null, null);
});
document.getElementById('zoom-in-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  setZoom(2, pdfZoom2 + 0.25, null, null);
});
document.getElementById('zoom-out-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  setZoom(2, pdfZoom2 - 0.25, null, null);
});
document.getElementById('zoom-fit-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  setZoom(2, 1.0, null, null);
});

// PDF Note buttons (scroll mode)
document.getElementById('pdf-add-note-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  showPdfNoteModal();
});

// PDF Note buttons (paged mode)
document.getElementById('pdf-paged-note-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  showPdfNoteModal();
});

document.getElementById('pdf-paged-note-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  showPdfNoteModalSlot2();
});

// PDF Delete highlights buttons (paged mode)
document.getElementById('pdf-delete-hl-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  deletePageHighlights(1);
});

document.getElementById('pdf-delete-hl-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  deletePageHighlights(2);
});

document.getElementById('pdf-add-note-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  showPdfNoteModalSlot2();
});

// PDF Delete highlights buttons (scroll mode)
document.getElementById('pdf-delete-hl-scroll-1')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  deletePageHighlights(1);
});

document.getElementById('pdf-delete-hl-scroll-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  deletePageHighlights(2);
});

document.getElementById('pdf-paged-note-2')?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  showPdfNoteModalSlot2();
});

function showPdfNoteModalSlot2() {
  // For slot 2, use a similar approach
  if (viewerType2 === 'pdf' && pdf2 && currentBookPath2) {
    const page = pdfPage2;
    
    pendingHighlight = {
      isPdfNote: true,
      page: page,
      text: '',
      editMode: false,
      slot: 2,
      bookPath: currentBookPath2
    };
    
    const notePreview = document.getElementById("notePreviewText");
    if (notePreview) {
      notePreview.innerHTML = `<i class="fas fa-file-alt"></i> Adding note for <strong>Page ${page}</strong> (Secondary View)`;
      notePreview.style.borderLeftColor = '#2196f3';
    }
    
    const noteTextarea = document.getElementById("noteTextarea");
    if (noteTextarea) noteTextarea.value = '';
    
    selectedHighlightColor = '#ffeb3b';
    document.querySelectorAll(".note-color").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.color === selectedHighlightColor);
    });
    
    noteModal.style.display = "flex";
  }
}

// Mouse wheel zoom (Ctrl + scroll) - Zoom to mouse position
// Use smoother delta calculation for better feel
pdfScroll1?.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    // Use smaller increments for smoother zoom (like Chrome)
    const zoomSpeed = 0.05;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    // Pass mouse coordinates for zoom-to-mouse
    setZoom(1, pdfZoom1 + delta, e.clientX, e.clientY);
  }
}, { passive: false });

pdfScroll2?.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    // Use smaller increments for smoother zoom (like Chrome)
    const zoomSpeed = 0.05;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    // Pass mouse coordinates for zoom-to-mouse
    setZoom(2, pdfZoom2 + delta, e.clientX, e.clientY);
  }
}, { passive: false });

// Page indicator update function
// Flag to prevent scroll updates during programmatic jumps
let isJumpingToPage = { 1: false, 2: false };

function updatePageIndicator(slot, forceUpdate = false) {
  // Don't update during jump (scroll hasn't settled yet)
  if (isJumpingToPage[slot] && !forceUpdate) return;
  
  const pageInput = document.getElementById(`page-input-${slot}`);
  const pageTotal = document.getElementById(`page-total-${slot}`);
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  let currentPage = slot === 1 ? pdfPage1 : pdfPage2;
  
  // In scroll mode, get current page from scroll position
  if (pdfViewMode === 'scroll') {
    currentPage = getCurrentScrollPage(slot);
  }
  
  if (pageInput && pageInput !== document.activeElement) {
    pageInput.value = currentPage;
  }
  if (pageTotal) {
    pageTotal.textContent = totalPages;
  }
}

// Jump to page function
function jumpToPage(slot, pageNum) {
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const page = Math.max(1, Math.min(totalPages, parseInt(pageNum) || 1));
  
  if (slot === 1) {
    pdfPage1 = page;
  } else {
    pdfPage2 = page;
  }
  
  if (pdfViewMode === 'scroll') {
    // Set flag to prevent scroll events from overwriting the input
    isJumpingToPage[slot] = true;
    scrollToPage(slot, page);
    
    // Clear flag after scroll animation completes
    setTimeout(() => {
      isJumpingToPage[slot] = false;
      updatePageIndicator(slot, true);
    }, 600); // Slightly longer than smooth scroll duration
  } else {
    renderPdfPage(slot);
  }
  
  // Update input immediately to show target page
  const pageInput = document.getElementById(`page-input-${slot}`);
  if (pageInput) {
    pageInput.value = page;
  }
  
  savePdfProgress(slot);
}

// Page input event listeners
// Track if Enter was just pressed to prevent double-jump from blur
let enterJustPressed = { 1: false, 2: false };

document.getElementById('page-input-1')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    enterJustPressed[1] = true;
    jumpToPage(1, e.target.value);
    e.target.blur();
    // Reset flag after a short delay
    setTimeout(() => { enterJustPressed[1] = false; }, 100);
  }
});

document.getElementById('page-input-1')?.addEventListener('blur', (e) => {
  // Only jump if Enter wasn't just pressed
  if (!enterJustPressed[1]) {
    jumpToPage(1, e.target.value);
  }
});

document.getElementById('page-input-2')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    enterJustPressed[2] = true;
    jumpToPage(2, e.target.value);
    e.target.blur();
    setTimeout(() => { enterJustPressed[2] = false; }, 100);
  }
});

document.getElementById('page-input-2')?.addEventListener('blur', (e) => {
  if (!enterJustPressed[2]) {
    jumpToPage(2, e.target.value);
  }
});

// Scroll event listeners for progress tracking (debounced)
let scrollSaveTimeout1 = null;
let scrollSaveTimeout2 = null;

pdfScroll1?.addEventListener('scroll', () => {
  // Update page indicator on scroll (throttled)
  updatePageIndicator(1);
  
  if (scrollSaveTimeout1) clearTimeout(scrollSaveTimeout1);
  scrollSaveTimeout1 = setTimeout(() => {
    if (viewerType1 === 'pdf' && pdfViewMode === 'scroll') {
      savePdfProgress(1);
    }
  }, 500);
});

pdfScroll2?.addEventListener('scroll', () => {
  // Update page indicator on scroll (throttled)
  updatePageIndicator(2);
  
  if (scrollSaveTimeout2) clearTimeout(scrollSaveTimeout2);
  scrollSaveTimeout2 = setTimeout(() => {
    if (viewerType2 === 'pdf' && pdfViewMode === 'scroll') {
      savePdfProgress(2);
    }
  }, 500);
});

async function loadTOC(bookInstance, renditionInstance, listId) {
  const list = document.getElementById(listId);
  list.style.display = "block";
  try {
    const toc = await bookInstance.loaded.navigation;
    list.innerHTML = "";
    
    toc.toc.forEach((item) => {
      const li = document.createElement("li");
      
      // Check if this chapter has audio
      const audioPaths = getChapterAudioPaths(item.href);
      const hasAudio = audioPaths && audioPaths.length > 0;
      
      if (hasAudio) {
        li.classList.add("has-audio");
        li.innerHTML = `
          <span class="chapter-title">${item.label}</span>
          <button class="chapter-audio-btn" title="Play Audio">
            <i class="fas fa-headphones"></i>
          </button>
        `;
        
        li.querySelector(".chapter-title").onclick = () => {
          renditionInstance.display(item.href);
          scrollNotesToChapter(item.label);
        };
        li.querySelector(".chapter-audio-btn").onclick = (e) => {
          e.stopPropagation();
          playChapterAudio(audioPaths);
        };
      } else {
        li.innerHTML = `<span class="chapter-title">${item.label}</span>`;
        li.onclick = () => {
          renditionInstance.display(item.href);
          scrollNotesToChapter(item.label);
        };
      }
      
      list.appendChild(li);
    });
  } catch (err) {
    console.warn("No TOC found:", err);
    list.innerHTML = "<li>No Table of Contents</li>";
  }
}

// -------------------------------------------------------
// TTS LOGIC
// -------------------------------------------------------
async function getCurrentChapterText(renditionInstance) {
  // Try to get contents from the rendition
  let contents = renditionInstance.getContents()[0];
  
  // If no contents, wait a bit and try again (content might still be loading)
  if (!contents) {
    await new Promise(resolve => setTimeout(resolve, 500));
    contents = renditionInstance.getContents()[0];
  }
  
  // Still no contents? Try alternative method via current location
  if (!contents) {
    try {
      const location = renditionInstance.currentLocation();
      if (location?.start?.href) {
        // Try to get text directly from the spine item
        const book = renditionInstance.book;
        const spine = book.spine;
        const item = spine.get(location.start.href);
        if (item) {
          const doc = await item.load(book.load.bind(book));
          const text = doc.body?.innerText || doc.body?.textContent || "";
          item.unload();
          return text;
        }
      }
    } catch (err) {
      console.warn("Alternative text extraction failed:", err);
    }
    return "";
  }
  
  return contents.document.body.innerText || "";
}

function splitTextIntoChunks(text, maxTokens = 1000) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const estimatedTokens = Math.ceil(sentence.split(/\s+/).length * 1.33);
    const currentTokens = Math.ceil(currentChunk.split(/\s+/).length * 1.33);

    if (currentTokens + estimatedTokens > maxTokens) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

// TTS Loading indicator
const ttsLoadingEl = document.getElementById("ttsLoading");

function showTTSLoading() {
  if (ttsLoadingEl) {
    ttsLoadingEl.classList.add("visible");
  }
}

function hideTTSLoading() {
  if (ttsLoadingEl) {
    ttsLoadingEl.classList.remove("visible");
  }
}

async function playChapterTTS(text, key, voice) {
  ttsChunks = splitTextIntoChunks(text);
  currentChunkIndex = 0;
  isAborted = false;
  isPaused = false;
  ttsAbortController = { aborted: false };
  
  for (let i = 0; i < ttsChunks.length; i++) {
    // Check if aborted
    if (isAborted || ttsAbortController.aborted || !isPlaying) {
      break;
    }

    // Wait if paused
    while (isPaused && isPlaying && !isAborted) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check again after pause
    if (isAborted || ttsAbortController.aborted || !isPlaying) {
      break;
    }

    currentChunkIndex = i;
    const chunk = ttsChunks[i];
    
    try {
    // Show loading indicator while fetching audio
    showTTSLoading();
    
    const base64Audio = await window.electronAPI.requestTTS(chunk, key, voice);
    if (!base64Audio) {
      hideTTSLoading();
      continue;
    }

      await new Promise((resolve, reject) => {
        // Check if aborted before creating audio
        if (isAborted || ttsAbortController.aborted || !isPlaying) {
          hideTTSLoading();
          resolve();
          return;
        }

      currentAudio = new Audio("data:audio/mpeg;base64," + base64Audio);
        
        // Apply speech speed from settings
        const speechSpeed = parseFloat(document.getElementById("speechSpeed")?.value) || 1.0;
        currentAudio.playbackRate = speechSpeed;
        
        // Apply volume from settings
        currentAudio.volume = ttsVolume;
        
        let checkInterval = null;
        
        const cleanup = () => {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        };

      currentAudio.onended = () => {
          cleanup();
        currentAudio = null;
        resolve();
      };

        currentAudio.onerror = (err) => {
          console.error("Audio playback error:", err);
          cleanup();
          currentAudio = null;
          resolve();
        };

        const playPromise = currentAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Audio started playing - hide loading indicator
            hideTTSLoading();
          }).catch(err => {
            console.error("Play error:", err);
            hideTTSLoading();
            cleanup();
            currentAudio = null;
            resolve();
          });
        } else {
          hideTTSLoading();
        }

        // Check for abort/pause during playback
        checkInterval = setInterval(() => {
          if (!currentAudio) {
            cleanup();
            resolve();
            return;
          }
          
          if (isAborted || ttsAbortController.aborted || !isPlaying) {
            if (currentAudio) {
              currentAudio.pause();
              currentAudio.currentTime = 0;
              currentAudio = null;
            }
            cleanup();
            resolve();
          } else if (isPaused && currentAudio && !currentAudio.paused) {
            currentAudio.pause();
          } else if (!isPaused && currentAudio && currentAudio.paused && isPlaying && !isAborted) {
            currentAudio.play().catch(err => {
              console.error("Resume error:", err);
            });
          }
        }, 100);
      });
    } catch (err) {
      console.error("TTS chunk error:", err);
      if (isAborted || ttsAbortController.aborted) break;
    }
  }

  // Cleanup
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  
  ttsChunks = [];
  currentChunkIndex = 0;
}

// Check if TTS is currently active (playing or paused)
function isTTSActive() {
  return isPlaying;
}

// Pause TTS
function pauseTTS() {
  if (isPlaying && currentAudio) {
    isPaused = true;
    currentAudio.pause();
    updateTTSButtonState();
  }
}

// Resume TTS
function resumeTTS() {
  if (isPlaying && isPaused) {
    isPaused = false;
    if (currentAudio) {
      currentAudio.play().catch(err => {
        console.error("Resume error:", err);
      });
    }
    updateTTSButtonState();
  }
}

// Abort/Stop TTS completely
function abortTTS() {
  isAborted = true;
  isPlaying = false;
  isPaused = false;
  if (ttsAbortController) {
    ttsAbortController.aborted = true;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  hideTTSLoading();
  ttsChunks = [];
  currentChunkIndex = 0;
  updateTTSButtonState();
}

// Update TTS button icon based on state
function updateTTSButtonState() {
  if (!speakBtn) return;
  
  const icon = speakBtn.querySelector('i');
  if (!icon) return;
  
  // Update stop button state
  if (stopTTSBtn) {
    stopTTSBtn.disabled = !isTTSActive();
  }
  
  if (isPlaying) {
    if (isPaused) {
      icon.className = 'fas fa-play';
      speakBtn.title = 'Resume TTS';
    } else {
      icon.className = 'fas fa-pause';
      speakBtn.title = 'Pause TTS';
    }
  } else {
    icon.className = 'fas fa-play';
    speakBtn.title = 'Play TTS (or select text to read selected portion)';
  }
}

speakBtn?.addEventListener("click", async () => {
  // Close the popup
  voicePopup?.classList.remove("open");
  voiceMenuBtn?.classList.remove("active");
  
  if (viewerType1 !== 'epub' || !rendition1) {
    return alert("Text-to-Speech is only available for EPUB files.");
  }

  // Check if recording is in progress
  if (isRecording) {
    return alert("Cannot start TTS while recording is in progress. Please stop recording first.");
  }

  // If paused, resume
  if (isPaused && isPlaying) {
    resumeTTS();
    return;
  }

  // If playing, pause it
  if (isPlaying && !isPaused) {
    pauseTTS();
    return;
  }

  // Check for selected text - if found, read it directly
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    const text = selection.toString().trim();
    await startTTSPlayback(text);
    return;
  }
  
  // Otherwise, show chapter selection modal
  openTTSModal();
});

async function openTTSModal() {
  if (!book1 || !ttsModal) return;
  
  const nav = await book1.loaded.navigation;
  const chapters = nav.toc || [];
  
  // Populate chapter dropdown
  ttsChapterSelect.innerHTML = '<option value="current">Current Chapter</option>';
  chapters.forEach((chapter, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = chapter.label || `Chapter ${index + 1}`;
    ttsChapterSelect.appendChild(option);
  });
  
  // Try to select current chapter
  if (rendition1) {
    try {
      const location = rendition1.currentLocation();
      const currentHref = location?.start?.href;
      if (currentHref) {
        const matchingIndex = chapters.findIndex(ch => 
          currentHref.includes(ch.href) || ch.href.includes(currentHref.split('#')[0])
        );
        if (matchingIndex !== -1) {
          ttsChapterSelect.value = matchingIndex;
        }
      }
    } catch (e) {
      // Keep default
    }
  }
  
  ttsModal.style.display = "flex";
}

startTTSBtn?.addEventListener("click", async () => {
  ttsModal.style.display = "none";
  
  const chapterSelection = ttsChapterSelect.value;
  let text = "";
  
  if (chapterSelection === "current") {
    text = await getCurrentChapterText(rendition1);
  } else {
    const nav = await book1.loaded.navigation;
    const chapters = nav.toc || [];
    const chapterIndex = parseInt(chapterSelection);
    
    if (!isNaN(chapterIndex) && chapters[chapterIndex]) {
      // Navigate to chapter and get text
      await rendition1.display(chapters[chapterIndex].href);
      await new Promise(r => setTimeout(r, 300));
      text = await getCurrentChapterText(rendition1);
    }
  }
  
  if (!text || text.trim().length === 0) {
    return alert("No text found in this chapter.");
  }
  
  await startTTSPlayback(text);
});

cancelTTSBtn?.addEventListener("click", () => {
  ttsModal.style.display = "none";
});

ttsModal?.querySelector(".close-modal")?.addEventListener("click", () => {
  ttsModal.style.display = "none";
});

async function startTTSPlayback(text) {
  const key = document.getElementById("apiKey").value.trim();
  const voice = document.getElementById("voiceSelect").value;

  if (!key) return alert("Please set your OpenAI API Key in Settings.");

  isPlaying = true;
  isPaused = false;
  isAborted = false;
  updateTTSButtonState();

  try {
    await playChapterTTS(text, key, voice);
  } catch (err) {
    console.error(err);
    alert("TTS Error: " + err.message);
  } finally {
    isPlaying = false;
    isPaused = false;
    updateTTSButtonState();
  }
}

// Stop button functionality
stopTTSBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  voicePopup?.classList.remove("open");
  voiceMenuBtn?.classList.remove("active");
  if (isTTSActive()) {
    abortTTS();
  }
});

// Add double-click to stop on speak button
speakBtn?.addEventListener("dblclick", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (isTTSActive()) {
    abortTTS();
  }
});

// -------------------------------------------------------
// MP3 RECORDING
// -------------------------------------------------------
const recordBtn = document.getElementById("recordBtn");
const recordModal = document.getElementById("record-modal");
const recordBookTitle = document.getElementById("recordBookTitle");
const recordBookChapters = document.getElementById("recordBookChapters");
const recordProgress = document.getElementById("recordProgress");
const recordProgressText = document.getElementById("recordProgressText");
const recordProgressPercent = document.getElementById("recordProgressPercent");
const recordProgressBar = document.getElementById("recordProgressBar");
const recordCurrentChapterEl = document.getElementById("recordCurrentChapter");
const startRecordBtn = document.getElementById("start-record-btn");
const cancelRecordBtn = document.getElementById("cancel-record-btn");
const recordVoiceSelect = document.getElementById("recordVoiceSelect");
const recordChapterSelect = document.getElementById("recordChapterSelect");

let isRecording = false;
let cancelRecording = false;
let chaptersToRecord = [];

// Voice menu toggle
const voiceMenuBtn = document.getElementById("voiceMenuBtn");
const voicePopup = document.getElementById("voicePopup");

voiceMenuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  voicePopup.classList.toggle("open");
  voiceMenuBtn.classList.toggle("active");
});

// Close voice popup when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".voice-controls")) {
    voicePopup?.classList.remove("open");
    voiceMenuBtn?.classList.remove("active");
  }
});

// Volume control
const ttsVolumeSlider = document.getElementById("ttsVolume");
if (ttsVolumeSlider) {
  // Load saved volume
  const savedVolume = localStorage.getItem("tts_volume");
  if (savedVolume) {
    ttsVolume = parseFloat(savedVolume);
    ttsVolumeSlider.value = Math.round(ttsVolume * 100);
  }
  
  // Update volume when slider changes
  ttsVolumeSlider.addEventListener("input", (e) => {
    ttsVolume = parseInt(e.target.value) / 100;
    localStorage.setItem("tts_volume", ttsVolume.toString());
    
    // Apply to current audio if playing
    if (currentAudio) {
      currentAudio.volume = ttsVolume;
    }
    
    // Also update chapter audio volume slider if it exists
    const chapterVolumeSlider = document.getElementById("chapterAudioVolume");
    if (chapterVolumeSlider) {
      chapterVolumeSlider.value = Math.round(ttsVolume * 100);
    }
    
    // Apply to chapter audio if playing
    if (chapterAudio) {
      chapterAudio.volume = ttsVolume;
    }
  });
}

recordBtn?.addEventListener("click", () => {
  // Close the popup
  voicePopup?.classList.remove("open");
  voiceMenuBtn?.classList.remove("active");
  
  if (viewerType1 !== 'epub' || !book1) {
    return alert("Audiobook recording is only available for EPUB files.");
  }
  
  // Confirmation dialog
  const confirmed = confirm(
    "⏺️ Record Audiobook\n\n" +
    "This will convert the book to MP3 files using OpenAI's TTS API.\n\n" +
    "• Requires an OpenAI API key (set in Settings)\n" +
    "• API usage will be charged to your OpenAI account\n" +
    "• Each chapter will be saved as a separate MP3 file\n\n" +
    "Do you want to continue?"
  );
  
  if (confirmed) {
    openRecordModal();
  }
});

async function openRecordModal() {
  // Get book info
  const meta = await book1.loaded.metadata;
  const nav = await book1.loaded.navigation;
  
  recordBookTitle.textContent = meta.title || "Unknown Title";
  chaptersToRecord = nav.toc || [];
  recordBookChapters.textContent = `${chaptersToRecord.length} chapters`;
  
  // Populate chapter dropdown
  if (recordChapterSelect) {
    recordChapterSelect.innerHTML = '<option value="current">Current Chapter</option><option value="all">All Chapters</option>';
    
    // Add individual chapters
    chaptersToRecord.forEach((chapter, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = chapter.label || `Chapter ${index + 1}`;
      recordChapterSelect.appendChild(option);
    });
    
    // Try to detect and select current chapter
    if (rendition1) {
      try {
        const location = rendition1.currentLocation();
        const currentHref = location?.start?.href;
        
        if (currentHref) {
          const matchingIndex = chaptersToRecord.findIndex(ch => 
            currentHref.includes(ch.href) || ch.href.includes(currentHref.split('#')[0])
          );
          if (matchingIndex !== -1) {
            recordChapterSelect.value = matchingIndex;
          } else {
            recordChapterSelect.value = "current";
          }
        } else {
          recordChapterSelect.value = "current";
        }
      } catch (e) {
        recordChapterSelect.value = "current";
      }
    } else {
      recordChapterSelect.value = "current";
    }
  }
  
  // Get current chapter name for display
  const currentChapterEl = document.getElementById("currentChapterName");
  if (currentChapterEl && rendition1) {
    try {
      const location = rendition1.currentLocation();
      const currentHref = location?.start?.href;
      
      // Find matching chapter in TOC
      let currentChapterName = "Unknown";
      if (currentHref) {
        const matchingChapter = chaptersToRecord.find(ch => 
          currentHref.includes(ch.href) || ch.href.includes(currentHref.split('#')[0])
        );
        if (matchingChapter) {
          currentChapterName = matchingChapter.label;
        }
      }
      currentChapterEl.textContent = currentChapterName;
    } catch (e) {
      currentChapterEl.textContent = "Unknown";
    }
  }
  
  // Copy voice selection from settings
  const settingsVoice = document.getElementById("voiceSelect").value;
  recordVoiceSelect.value = settingsVoice;
  
  // Reset UI
  recordProgress.style.display = "none";
  startRecordBtn.disabled = false;
  startRecordBtn.innerHTML = '<i class="fas fa-circle"></i> Start Recording';
  startRecordBtn.classList.remove("recording");
  cancelRecordBtn.textContent = "Cancel";
  
  recordModal.style.display = "flex";
}

startRecordBtn?.addEventListener("click", startRecording);
cancelRecordBtn?.addEventListener("click", () => {
  if (isRecording) {
    cancelRecording = true;
    cancelRecordBtn.textContent = "Cancelling...";
    cancelRecordBtn.disabled = true;
  } else {
    recordModal.style.display = "none";
  }
});

// Close modal on X
recordModal?.querySelector(".close-modal")?.addEventListener("click", () => {
  if (!isRecording) {
    recordModal.style.display = "none";
  }
});

async function startRecording() {
  // Check if TTS is currently active
  if (isTTSActive()) {
    return alert("Cannot start recording while TTS is playing. Please stop TTS first.");
  }
  
  const apiKey = document.getElementById("apiKey").value.trim();
  if (!apiKey) {
    return alert("Please set your OpenAI API key in Settings first.");
  }
  
  // Get book title for folder name
  const meta = await book1.loaded.metadata;
  const bookTitle = meta.title || "Unknown_Book";
  
  // Create dedicated audio folder for this book
  const folderResult = await window.electronAPI.createAudioFolder(bookTitle);
  if (!folderResult.success) {
    return alert("Failed to create audio folder: " + folderResult.error);
  }
  const folderPath = folderResult.path;
  
  const voice = recordVoiceSelect.value;
  const chapterSelection = recordChapterSelect ? recordChapterSelect.value : "current";
  
  isRecording = true;
  cancelRecording = false;
  
  // Update UI
  recordProgress.style.display = "block";
  startRecordBtn.disabled = true;
  startRecordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
  startRecordBtn.classList.add("recording");
  
  try {
    if (chapterSelection === "all") {
      // Record all chapters
      await recordAllChapters(folderPath, apiKey, voice);
    } else if (chapterSelection === "current") {
      // Record current chapter only
      await recordCurrentChapter(folderPath, apiKey, voice);
    } else {
      // Record specific chapter by index
      const chapterIndex = parseInt(chapterSelection);
      if (!isNaN(chapterIndex) && chapterIndex >= 0 && chapterIndex < chaptersToRecord.length) {
        await recordSpecificChapter(folderPath, apiKey, voice, chapterIndex);
      } else {
        await recordCurrentChapter(folderPath, apiKey, voice);
      }
    }
    
    if (!cancelRecording) {
      alert("Recording complete!\n\nAudio files saved to app storage.\nClick the 🎧 icon in the Table of Contents to play.");
    }
  } catch (err) {
    console.error("Recording error:", err);
    alert("Recording failed: " + err.message);
  } finally {
    isRecording = false;
    cancelRecording = false;
    recordModal.style.display = "none";
  }
}

async function recordSpecificChapter(folderPath, apiKey, voice, chapterIndex) {
  if (chapterIndex < 0 || chapterIndex >= chaptersToRecord.length) {
    return alert("Invalid chapter index");
  }
  
  const chapter = chaptersToRecord[chapterIndex];
  recordCurrentChapterEl.textContent = chapter.label || `Chapter ${chapterIndex + 1}`;
  
  updateRecordProgress(
    `Recording: ${chapter.label}`, 
    0,
    `Chapter ${chapterIndex + 1}`
  );
  
  try {
    // Navigate to chapter and get text
    await rendition1.display(chapter.href);
    await new Promise(r => setTimeout(r, 800)); // Wait for render
    
    // Use getCurrentChapterText since we just navigated to this chapter
    let text = await getCurrentChapterText(rendition1);
    if (!text || text.trim().length < 10) {
      // Try alternate method if first fails
      console.warn("First text extraction attempt returned empty, trying alternate...");
      text = await getChapterText(book1, chapter.href);
      if (!text || text.trim().length < 10) {
        throw new Error("Chapter has no text content");
      }
    }
    
    // Process chapter in chunks - save each separately
    const chunks = splitTextIntoChunks(text, 4000);
    const audioPaths = [];
    
    for (let j = 0; j < chunks.length; j++) {
      if (cancelRecording) return;
      
      const progress = Math.round(((j + 1) / chunks.length) * 100);
      updateRecordProgress(
        `Processing: ${chapter.label}`,
        progress,
        `Part ${j + 1}/${chunks.length}`
      );
      
      const result = await window.electronAPI.generateTtsChunk(chunks[j], apiKey, voice);
      if (!result.success) {
        console.error(`TTS error for chapter ${chapterIndex + 1}, part ${j + 1}:`, result.error);
        continue;
      }
      
      // Save each chunk as separate file
      const partNum = String(j + 1).padStart(3, '0');
      const fileName = sanitizeFileName(chapter.label || `Chapter_${chapterIndex + 1}`);
      const partFileName = `${fileName}_part${partNum}.mp3`;
      
      const saveResult = await window.electronAPI.saveMp3Chunk(folderPath, partFileName, result.audio);
      if (!saveResult.success) {
        console.error(`Failed to save chunk ${j + 1}:`, saveResult.error);
        continue;
      }
      audioPaths.push(saveResult.filePath);
    }
    
    // Save audio paths to book metadata
    await saveChapterAudio(chapter.href, audioPaths);
    
    updateRecordProgress(
      `Completed: ${chapter.label}`, 
      100,
      `Chapter ${chapterIndex + 1}`
    );
  } catch (err) {
    console.error(`Error recording chapter ${chapterIndex + 1}:`, err);
    alert(`Error recording chapter: ${err.message}`);
  }
}

async function recordCurrentChapter(folderPath, apiKey, voice) {
  const text = await getCurrentChapterText(rendition1);
  if (!text || text.trim().length === 0) {
    throw new Error("No text found in current chapter");
  }
  
  updateRecordProgress("Recording current chapter...", 0, "Processing...");
  
  const chunks = splitTextIntoChunks(text, 4000);
  const audioPaths = [];
  
  // Get current chapter info
  const location = rendition1.currentLocation();
  const currentHref = location?.start?.href || "current";
  const chapterName = sanitizeFileName("current_chapter");
  
  for (let i = 0; i < chunks.length; i++) {
    if (cancelRecording) return;
    
    const progress = Math.round(((i + 1) / chunks.length) * 100);
    updateRecordProgress(`Processing part ${i + 1}/${chunks.length}`, progress, "Current chapter");
    
    const result = await window.electronAPI.generateTtsChunk(chunks[i], apiKey, voice);
    if (!result.success) {
      throw new Error(result.error || "TTS generation failed");
    }
    
    // Save each chunk as separate file
    const partNum = String(i + 1).padStart(3, '0');
    const fileName = `${chapterName}_part${partNum}.mp3`;
    
    const saveResult = await window.electronAPI.saveMp3Chunk(folderPath, fileName, result.audio);
    if (!saveResult.success) {
      throw new Error(saveResult.error || "Failed to save MP3");
    }
    audioPaths.push(saveResult.filePath);
  }
  
  // Save audio paths to book metadata
  await saveChapterAudio(currentHref, audioPaths);
}

async function recordAllChapters(folderPath, apiKey, voice) {
  const meta = await book1.loaded.metadata;
  const bookTitle = sanitizeFileName(meta.title || "book");
  
  for (let i = 0; i < chaptersToRecord.length; i++) {
    if (cancelRecording) return;
    
    const chapter = chaptersToRecord[i];
    const chapterNum = String(i + 1).padStart(2, '0');
    const chapterLabel = sanitizeFileName(chapter.label || `Chapter ${i + 1}`);
    
    updateRecordProgress(
      `Recording: ${chapter.label}`, 
      Math.round((i / chaptersToRecord.length) * 100),
      `Chapter ${i + 1} of ${chaptersToRecord.length}`
    );
    
    try {
      // Navigate to chapter and get text
      await rendition1.display(chapter.href);
      await new Promise(r => setTimeout(r, 800)); // Wait for render
      
      // Use getCurrentChapterText since we just navigated to this chapter
      let text = await getCurrentChapterText(rendition1);
      if (!text || text.trim().length < 10) {
        // Try alternate method
        text = await getChapterText(book1, chapter.href);
      }
      if (!text || text.trim().length < 10) {
        console.warn(`Skipping empty chapter: ${chapter.label}`);
        continue;
      }
      
      // Process chapter in chunks - save each separately
      const chunks = splitTextIntoChunks(text, 4000);
      const audioPaths = [];
      
      for (let j = 0; j < chunks.length; j++) {
        if (cancelRecording) return;
        
        const subProgress = Math.round((i / chaptersToRecord.length + (j + 1) / chunks.length / chaptersToRecord.length) * 100);
        updateRecordProgress(
          `Processing: ${chapter.label}`,
          subProgress,
          `Chapter ${i + 1}/${chaptersToRecord.length}, part ${j + 1}/${chunks.length}`
        );
        
        const result = await window.electronAPI.generateTtsChunk(chunks[j], apiKey, voice);
        if (!result.success) {
          console.error(`TTS error for chapter ${i + 1}:`, result.error);
          continue;
        }
        
        // Save each chunk as separate file
        const partNum = String(j + 1).padStart(3, '0');
        const fileName = `${chapterNum}_${chapterLabel}_part${partNum}.mp3`;
        
        const saveResult = await window.electronAPI.saveMp3Chunk(folderPath, fileName, result.audio);
        if (!saveResult.success) {
          console.error(`Failed to save part ${j + 1}:`, saveResult.error);
          continue;
        }
        audioPaths.push(saveResult.filePath);
      }
      
      // Save audio paths to book metadata for this chapter
      if (audioPaths.length > 0) {
        await saveChapterAudio(chapter.href, audioPaths);
      }
      
    } catch (err) {
      console.error(`Error processing chapter ${i + 1}:`, err);
    }
  }
  
  updateRecordProgress("Complete!", 100, `${chaptersToRecord.length} chapters recorded`);
}

async function getChapterText(bookInstance, href) {
  try {
    const spine = bookInstance.spine;
    
    // Try to find the item in the spine
    let item = spine.get(href);
    
    // If not found directly, try finding by partial match
    if (!item) {
      const hrefBase = href.split('#')[0];
      for (const spineItem of spine.items) {
        if (spineItem.href === hrefBase || spineItem.href.includes(hrefBase) || hrefBase.includes(spineItem.href)) {
          item = spineItem;
          break;
        }
      }
    }
    
    if (!item) {
      console.warn("Could not find spine item for href:", href);
      return "";
    }
    
    const doc = await item.load(bookInstance.load.bind(bookInstance));
    const text = doc.body?.innerText || doc.body?.textContent || "";
    item.unload();
    return text;
  } catch (err) {
    console.warn("Could not get chapter text:", err);
    // Fallback to current view
    return await getCurrentChapterText(rendition1);
  }
}

function updateRecordProgress(text, percent, chapter) {
  recordProgressText.textContent = text;
  recordProgressPercent.textContent = `${percent}%`;
  recordProgressBar.style.width = `${percent}%`;
  recordCurrentChapterEl.textContent = chapter;
}

function combineBase64Audio(base64Chunks) {
  // For simplicity, just return the last chunk if there's only one
  // In reality, you'd want to properly concatenate MP3 files
  // but that requires more complex handling
  if (base64Chunks.length === 1) return base64Chunks[0];
  
  // Concatenate the raw bytes
  const buffers = base64Chunks.map(b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(buf, offset);
    offset += buf.length;
  }
  
  // Convert back to base64
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

// -------------------------------------------------------
// CHAPTER AUDIO LINKING & PLAYBACK
// -------------------------------------------------------
async function saveChapterAudio(chapterHref, audioPaths) {
  if (!currentBookPath1) return;
  
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) return;
  
  // Initialize audioChapters if needed
  if (!book.audioChapters) {
    book.audioChapters = {};
  }
  
  // Store paths for this chapter
  book.audioChapters[chapterHref] = audioPaths;
  
  // Save to library
  await window.electronAPI.addToLibrary(book);
  
  // Refresh TOC to show audio indicators
  if (book1) {
    loadTOC(book1, rendition1, "chapters");
  }
}

function getChapterAudioPaths(chapterHref) {
  if (!currentBookPath1) return null;
  
  const book = library.find(b => b.path === currentBookPath1);
  if (!book?.audioChapters) return null;
  
  // Try exact match first
  if (book.audioChapters[chapterHref]) {
    return book.audioChapters[chapterHref];
  }
  
  // Try partial match
  for (const href in book.audioChapters) {
    if (chapterHref.includes(href) || href.includes(chapterHref.split('#')[0])) {
      return book.audioChapters[href];
    }
  }
  
  return null;
}

// Audio player state
let chapterAudio = null;
let chapterAudioPaths = [];
let chapterAudioIndex = 0;
let isPlayingChapterAudio = false;

async function playChapterAudio(audioPaths) {
  if (!audioPaths || audioPaths.length === 0) return;
  
  // Verify at least the first file exists
  const firstFileExists = await window.electronAPI.checkAudioFileExists(audioPaths[0]);
  if (!firstFileExists) {
    alert("Audio files not found. They may have been moved or deleted.");
    return;
  }
  
  // Stop any existing playback
  stopChapterAudio();
  
  chapterAudioPaths = audioPaths;
  chapterAudioIndex = 0;
  isPlayingChapterAudio = true;
  
  playNextAudioPart();
  showAudioPlayer();
}

function playNextAudioPart() {
  if (!isPlayingChapterAudio || chapterAudioIndex >= chapterAudioPaths.length) {
    stopChapterAudio();
    return;
  }
  
  const audioPath = chapterAudioPaths[chapterAudioIndex];
  
  // Load audio file
  chapterAudio = new Audio(`file://${audioPath}`);
  
  // Apply volume from slider
  const volumeSlider = document.getElementById("chapterAudioVolume");
  if (volumeSlider) {
    chapterAudio.volume = parseInt(volumeSlider.value) / 100;
  } else {
    chapterAudio.volume = ttsVolume;
  }
  
  chapterAudio.onended = () => {
    chapterAudioIndex++;
    playNextAudioPart();
  };
  
  chapterAudio.onerror = (e) => {
    console.error("Audio playback error:", e);
    chapterAudioIndex++;
    playNextAudioPart();
  };
  
  chapterAudio.play();
  updateAudioPlayerUI();
}

function stopChapterAudio() {
  if (chapterAudio) {
    chapterAudio.pause();
    chapterAudio = null;
  }
  isPlayingChapterAudio = false;
  chapterAudioPaths = [];
  chapterAudioIndex = 0;
  hideAudioPlayer();
}

function toggleChapterAudioPlayback() {
  if (!chapterAudio) return;
  
  if (chapterAudio.paused) {
    chapterAudio.play();
    isPlayingChapterAudio = true;
  } else {
    chapterAudio.pause();
    isPlayingChapterAudio = false;
  }
  updateAudioPlayerUI();
}

function showAudioPlayer() {
  let player = document.getElementById("chapter-audio-player");
  if (!player) {
    player = document.createElement("div");
    player.id = "chapter-audio-player";
    player.innerHTML = `
      <div class="audio-buttons">
        <button id="audio-play-pause" class="voice-option" title="Play/Pause">
          <i class="fas fa-pause"></i>
        </button>
        <button id="audio-stop" class="voice-option" title="Stop">
          <i class="fas fa-stop"></i>
        </button>
      </div>
      <div class="audio-progress-info">
        <span id="audio-part-info">Part 1 of 1</span>
      </div>
      <div class="voice-volume">
        <i class="fas fa-volume-down"></i>
        <input type="range" id="chapterAudioVolume" min="0" max="100" value="100" title="Volume">
        <i class="fas fa-volume-up"></i>
      </div>
    `;
    document.getElementById("reader-page").appendChild(player);
    
    document.getElementById("audio-play-pause").addEventListener("click", toggleChapterAudioPlayback);
    document.getElementById("audio-stop").addEventListener("click", stopChapterAudio);
    
    // Volume control for chapter audio - sync with main TTS volume
    const chapterVolumeSlider = document.getElementById("chapterAudioVolume");
    if (chapterVolumeSlider) {
      // Load saved volume (same as main TTS volume)
      chapterVolumeSlider.value = Math.round(ttsVolume * 100);
      
      // Update volume when slider changes
      chapterVolumeSlider.addEventListener("input", (e) => {
        const volume = parseInt(e.target.value) / 100;
        ttsVolume = volume;
        localStorage.setItem("tts_volume", volume.toString());
        
        // Apply to chapter audio if playing
        if (chapterAudio) {
          chapterAudio.volume = volume;
        }
        
        // Also update main TTS volume slider if it exists
        const mainVolumeSlider = document.getElementById("ttsVolume");
        if (mainVolumeSlider) {
          mainVolumeSlider.value = Math.round(volume * 100);
        }
        
        // Apply to current TTS audio if playing
        if (currentAudio) {
          currentAudio.volume = volume;
        }
      });
    }
  }
  player.classList.add("visible");
  updateAudioPlayerUI();
  
  // Apply current volume to audio if playing
  if (chapterAudio) {
    const volumeSlider = document.getElementById("chapterAudioVolume");
    if (volumeSlider) {
      chapterAudio.volume = parseInt(volumeSlider.value) / 100;
    }
  }
}

function hideAudioPlayer() {
  const player = document.getElementById("chapter-audio-player");
  if (player) {
    player.classList.remove("visible");
  }
}

function updateAudioPlayerUI() {
  const playPauseBtn = document.getElementById("audio-play-pause");
  const partInfo = document.getElementById("audio-part-info");
  
  if (playPauseBtn) {
    playPauseBtn.innerHTML = isPlayingChapterAudio && chapterAudio && !chapterAudio.paused 
      ? '<i class="fas fa-pause"></i>' 
      : '<i class="fas fa-play"></i>';
  }
  
  if (partInfo) {
    partInfo.textContent = `Part ${chapterAudioIndex + 1} of ${chapterAudioPaths.length}`;
  }
}

// -------------------------------------------------------
// SEARCH FUNCTIONALITY
// -------------------------------------------------------
searchBtn?.addEventListener("click", () => {
  if (!book1 && !pdf1) {
    alert("Please open a book first.");
    return;
  }
  searchModal.style.display = "flex";
  searchInput.focus();
  searchInput.select();
});

document.getElementById("searchBtn")?.addEventListener("click", performSearch);
searchInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});

document.getElementById("searchPrevBtn")?.addEventListener("click", () => navigateSearch(-1));
document.getElementById("searchNextBtn")?.addEventListener("click", () => navigateSearch(1));

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  if (!book1 && !pdf1) return;
  
  searchResultsEl.innerHTML = '<p class="search-placeholder"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';
  searchNav.style.display = "none";
  
  try {
    let results = [];
    
    if (viewerType1 === 'pdf' && pdf1) {
      // PDF search
      results = await searchInPDF(query, 1);
    } else if (book1) {
      // EPUB search
      results = await searchInEPUB(query);
    }
    
    searchResults = results;
    currentSearchIndex = 0;
    
    if (results.length === 0) {
      const noTextMsg = viewerType1 === 'pdf' 
        ? 'No results found. This PDF may not contain searchable text (scanned images).'
        : 'No results found for "' + escapeHtml(query) + '"';
      searchResultsEl.innerHTML = `<p class="search-placeholder">${noTextMsg}</p>`;
      searchNav.style.display = "none";
    } else {
      renderSearchResults(results);
      searchNav.style.display = "flex";
      searchResultCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    }
  } catch (err) {
    console.error("Search error:", err);
    searchResultsEl.innerHTML = '<p class="search-placeholder">Search failed. Please try again.</p>';
  }
}

// Search within EPUB
async function searchInEPUB(query) {
  if (!book1) return [];
  
  // Get the table of contents for chapter name lookup
  const toc = book1.navigation?.toc || [];
  
  function getChapterNameFromHref(href) {
    const hrefFileName = href.split('/').pop().split('#')[0].toLowerCase();
    
    for (const chapter of toc) {
      const tocFileName = chapter.href.split('/').pop().split('#')[0].toLowerCase();
      if (hrefFileName === tocFileName || 
          hrefFileName.includes(tocFileName) || 
          tocFileName.includes(hrefFileName)) {
        return chapter.label.trim();
      }
    }
    
    for (const chapter of toc) {
      if (chapter.subitems) {
        for (const sub of chapter.subitems) {
          const subFileName = sub.href.split('/').pop().split('#')[0].toLowerCase();
          if (hrefFileName === subFileName || 
              hrefFileName.includes(subFileName) || 
              subFileName.includes(hrefFileName)) {
            return sub.label.trim();
          }
        }
      }
    }
    
    let readable = hrefFileName
      .replace(/\.x?html?$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/chap(\d+)/i, 'Chapter $1')
      .replace(/ch(\d+)/i, 'Chapter $1')
      .replace(/part(\d+)/i, 'Part $1')
      .replace(/section(\d+)/i, 'Section $1')
      .replace(/index\s*split\s*/i, 'Section ')
      .trim();
    
    readable = readable.replace(/\b\w/g, c => c.toUpperCase());
    return readable || 'Unknown Section';
  }
  
  const results = await book1.spine.spineItems.reduce(async (accPromise, item) => {
    const acc = await accPromise;
    await item.load(book1.load.bind(book1));
    const doc = item.document;
    
    if (doc) {
      const text = doc.body.innerText || doc.body.textContent;
      const regex = new RegExp(query, 'gi');
      let match;
      
      const chapterName = getChapterNameFromHref(item.href);
      
      while ((match = regex.exec(text)) !== null) {
        const start = Math.max(0, match.index - 40);
        const end = Math.min(text.length, match.index + query.length + 40);
        let excerpt = text.substring(start, end);
        
        if (start > 0) excerpt = '...' + excerpt;
        if (end < text.length) excerpt = excerpt + '...';
        
        excerpt = excerpt.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
        
        acc.push({
          type: 'epub',
          cfi: item.cfiFromElement(doc.body),
          href: item.href,
          excerpt: excerpt,
          chapter: chapterName
        });
        
        if (acc.length >= 100) break;
      }
    }
    
    item.unload();
    return acc;
  }, Promise.resolve([]));
  
  return results;
}

function renderSearchResults(results) {
  searchResultsEl.innerHTML = results.map((r, i) => `
    <div class="search-result-item" data-index="${i}">
      <div class="search-result-chapter">${r.chapter}</div>
      <div class="search-result-excerpt">${r.excerpt}</div>
    </div>
  `).join('');
  
  searchResultsEl.querySelectorAll(".search-result-item").forEach(item => {
    item.addEventListener("click", () => {
      const index = parseInt(item.dataset.index);
      currentSearchIndex = index;
      goToSearchResult(index);
    });
  });
}

function navigateSearch(direction) {
  if (searchResults.length === 0) return;
  currentSearchIndex = (currentSearchIndex + direction + searchResults.length) % searchResults.length;
  goToSearchResult(currentSearchIndex);
}

function goToSearchResult(index) {
  const result = searchResults[index];
  if (!result) return;
  
  searchModal.style.display = "none";
  
  if (result.type === 'pdf' && pdf1) {
    // PDF search result - navigate to page
    pdfPage1 = result.page;
    if (pdfViewMode === 'scroll') {
      scrollToPage(1, result.page);
    } else {
      renderPdfPage(1);
    }
    savePdfProgress(1);
  } else if (rendition1) {
    // EPUB search result - navigate to href
    rendition1.display(result.href);
  }
}

// -------------------------------------------------------
// BOOKMARKS FUNCTIONALITY
// -------------------------------------------------------
bookmarkBtn?.addEventListener("click", () => {
  if (!currentBookPath1) {
    alert("Please open a book first.");
    return;
  }
  bookmarksModal.style.display = "flex";
  renderBookmarks();
});

addBookmarkBtn?.addEventListener("click", addBookmark);
bookmarkNameInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addBookmark();
});

async function addBookmark() {
  if (!currentBookPath1) return;
  
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) return;
  
  let location, locationText;
  
  if (viewerType1 === 'epub' && rendition1) {
    const currentLoc = rendition1.currentLocation();
    if (!currentLoc?.start?.cfi) {
      alert("Could not determine current location.");
      return;
    }
    location = { type: 'cfi', value: currentLoc.start.cfi };
    locationText = `Page ${book.readingProgress?.percentage || 0}%`;
  } else if (viewerType1 === 'pdf') {
    location = { type: 'page', value: pdfPage1 };
    locationText = `Page ${pdfPage1} of ${pdfTotalPages1}`;
  } else {
    return;
  }
  
  const name = bookmarkNameInput.value.trim() || `Bookmark ${(book.bookmarks?.length || 0) + 1}`;
  
  if (!book.bookmarks) book.bookmarks = [];
  
  book.bookmarks.push({
    id: Date.now(),
    name: name,
    location: location,
    locationText: locationText,
    createdAt: Date.now()
  });
  
  await window.electronAPI.addToLibrary(book);
  bookmarkNameInput.value = "";
  renderBookmarks();
}

function renderBookmarks() {
  const book = library.find(b => b.path === currentBookPath1);
  const bookmarks = book?.bookmarks || [];
  
  if (bookmarks.length === 0) {
    bookmarksList.innerHTML = '<p class="bookmarks-placeholder">No bookmarks yet. Add one to save your place!</p>';
    return;
  }
  
  bookmarksList.innerHTML = bookmarks.map(bm => `
    <div class="bookmark-item" data-id="${bm.id}">
      <div class="bookmark-icon"><i class="fas fa-bookmark"></i></div>
      <div class="bookmark-info">
        <div class="bookmark-name">${bm.name}</div>
        <div class="bookmark-location">${bm.locationText}</div>
      </div>
      <button class="bookmark-delete" data-id="${bm.id}" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
  
  bookmarksList.querySelectorAll(".bookmark-item").forEach(item => {
    item.addEventListener("click", (e) => {
      if (e.target.closest(".bookmark-delete")) return;
      const id = parseInt(item.dataset.id);
      goToBookmark(id);
    });
  });
  
  bookmarksList.querySelectorAll(".bookmark-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      await deleteBookmark(id);
    });
  });
}

function goToBookmark(id) {
  const book = library.find(b => b.path === currentBookPath1);
  const bookmark = book?.bookmarks?.find(bm => bm.id === id);
  if (!bookmark) return;
  
  if (bookmark.location.type === 'cfi' && rendition1) {
    rendition1.display(bookmark.location.value);
  } else if (bookmark.location.type === 'page' && viewerType1 === 'pdf') {
    pdfPage1 = bookmark.location.value;
    renderPdfPage(1);
  }
  
  bookmarksModal.style.display = "none";
}

async function deleteBookmark(id) {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book?.bookmarks) return;
  
  book.bookmarks = book.bookmarks.filter(bm => bm.id !== id);
  await window.electronAPI.addToLibrary(book);
  renderBookmarks();
}

// -------------------------------------------------------
// HIGHLIGHTS FUNCTIONALITY
// -------------------------------------------------------
highlightsBtn?.addEventListener("click", () => {
  if (!currentBookPath1) {
    alert("Please open a book first.");
    return;
  }
  highlightsModal.style.display = "flex";
  renderHighlights();
});

function renderHighlights() {
  const book = library.find(b => b.path === currentBookPath1);
  const highlights = book?.notes?.entries?.filter(e => e.type === 'quote') || [];
  
  if (highlights.length === 0) {
    highlightsList.innerHTML = '<p class="highlights-placeholder">No highlights yet. Select text while reading to highlight it!</p>';
    return;
  }
  
  highlightsList.innerHTML = highlights.map(hl => `
    <div class="highlight-item" data-id="${hl.id}" style="--highlight-color: ${hl.color}">
      <div class="highlight-text">${hl.text}</div>
      ${hl.comment ? `<div class="highlight-note">${hl.comment}</div>` : ''}
      <div class="highlight-meta">
        <span class="highlight-chapter">${hl.chapter || 'Unknown chapter'}</span>
        <div class="highlight-actions">
          <button class="edit-highlight" data-id="${hl.id}" title="Edit Comment"><i class="fas fa-edit"></i></button>
          <button class="delete-highlight" data-id="${hl.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
  
  highlightsList.querySelectorAll(".highlight-item").forEach(item => {
    item.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const id = parseInt(item.dataset.id);
      goToHighlight(id);
    });
  });
  
  highlightsList.querySelectorAll(".delete-highlight").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      await deleteHighlight(id);
    });
  });
  
  highlightsList.querySelectorAll(".edit-highlight").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      editHighlightNote(id);
    });
  });
}

function goToHighlight(id) {
  const book = library.find(b => b.path === currentBookPath1);
  const entry = book?.notes?.entries?.find(e => e.id === id && e.type === 'quote');
  if (!entry?.cfi || !rendition1) return;
  
  rendition1.display(entry.cfi);
  highlightsModal.style.display = "none";
}

// Export Highlights to PDF
document.getElementById("exportHighlightsPdfBtn")?.addEventListener("click", async () => {
  await exportHighlightsToPdf();
});

async function exportHighlightsToPdf() {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) {
    alert("No book loaded.");
    return;
  }
  
  const highlights = book.notes?.entries?.filter(e => e.type === 'quote') || [];
  if (highlights.length === 0) {
    alert("No highlights to export.");
    return;
  }
  
  // Group highlights by chapter
  const byChapter = {};
  highlights.forEach(hl => {
    const chapter = hl.chapter || "Unknown Chapter";
    if (!byChapter[chapter]) byChapter[chapter] = [];
    byChapter[chapter].push(hl);
  });
  
  // Sort each chapter's highlights by CFI position (book order)
  Object.values(byChapter).forEach(arr => {
    arr.sort((a, b) => {
      if (a.cfi && b.cfi) {
        return compareCFI(a.cfi, b.cfi);
      }
      if (a.cfi && !b.cfi) return -1;
      if (!a.cfi && b.cfi) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  });
  
  // Build HTML
  const title = book.title || "Book Notes";
  const author = book.author || "";
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 30px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e0e0e0;
    }
    .header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      color: #1a1a1a;
    }
    .header .author {
      font-size: 16px;
      color: #666;
      font-style: italic;
    }
    .header .export-date {
      font-size: 12px;
      color: #999;
      margin-top: 12px;
    }
    .chapter {
      margin-bottom: 35px;
    }
    .chapter h2 {
      font-size: 18px;
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }
    .highlight {
      margin-bottom: 20px;
      padding-left: 16px;
      border-left: 4px solid #ddd;
    }
    .highlight-text {
      font-size: 15px;
      color: #444;
      font-style: italic;
      margin-bottom: 8px;
      quotes: '"' '"';
    }
    .highlight-text::before { content: open-quote; }
    .highlight-text::after { content: close-quote; }
    .highlight-note {
      font-size: 14px;
      color: #555;
      background: #f8f9fa;
      padding: 10px 14px;
      border-radius: 6px;
      margin-top: 8px;
    }
    .highlight-note::before {
      content: "Note: ";
      font-weight: 600;
      color: #666;
    }
    .stats {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    ${author ? `<p class="author">by ${escapeHtml(author)}</p>` : ''}
    <p class="export-date">Exported on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })}</p>
  </div>
`;

  // Add chapters and highlights
  for (const [chapter, chapterHighlights] of Object.entries(byChapter)) {
    html += `
  <div class="chapter">
    <h2>${escapeHtml(chapter)}</h2>
`;
    for (const hl of chapterHighlights) {
      html += `
    <div class="highlight" style="border-left-color: ${hl.color};">
      <p class="highlight-text">${escapeHtml(hl.text)}</p>
      ${hl.comment ? `<div class="highlight-note">${escapeHtml(hl.comment)}</div>` : ''}
    </div>
`;
    }
    html += `  </div>\n`;
  }
  
  const noteCount = highlights.filter(h => h.comment).length;
  html += `
  <div class="stats">
    ${highlights.length} highlight${highlights.length !== 1 ? 's' : ''} &bull; 
    ${noteCount} note${noteCount !== 1 ? 's' : ''} &bull; 
    ${Object.keys(byChapter).length} chapter${Object.keys(byChapter).length !== 1 ? 's' : ''}
  </div>
</body>
</html>
`;

  try {
    const result = await window.electronAPI.exportNotesPdf(title, html);
    if (result) {
      highlightsModal.style.display = "none";
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export PDF. Please try again.");
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// -------------------------------------------------------
// OBSIDIAN/MARKDOWN EXPORT
// -------------------------------------------------------
document.getElementById("exportHighlightsMdBtn")?.addEventListener("click", async () => {
  await exportHighlightsToMarkdown();
});

async function exportHighlightsToMarkdown() {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) {
    alert("No book loaded.");
    return;
  }
  
  const highlights = book.notes?.entries?.filter(e => e.type === 'quote') || [];
  if (highlights.length === 0) {
    alert("No highlights to export.");
    return;
  }
  
  // Group highlights by chapter
  const byChapter = {};
  highlights.forEach(hl => {
    const chapter = hl.chapter || "Unknown Chapter";
    if (!byChapter[chapter]) byChapter[chapter] = [];
    byChapter[chapter].push(hl);
  });
  
  // Sort each chapter's highlights by CFI position (book order)
  Object.values(byChapter).forEach(arr => {
    arr.sort((a, b) => {
      if (a.cfi && b.cfi) {
        return compareCFI(a.cfi, b.cfi);
      }
      if (a.cfi && !b.cfi) return -1;
      if (!a.cfi && b.cfi) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  });
  
  const title = book.title || "Book Notes";
  const author = book.author || "";
  const date = new Date().toISOString().split('T')[0];
  
  // Build Markdown content
  let md = `# ${title}\n\n`;
  if (author) md += `**Author:** ${author}\n\n`;
  md += `**Exported:** ${date}\n\n`;
  md += `---\n\n`;
  
  // Add chapters and highlights
  for (const [chapter, chapterHighlights] of Object.entries(byChapter)) {
    md += `## ${chapter}\n\n`;
    
    for (const hl of chapterHighlights) {
      // Highlight text as blockquote
      md += `> ${hl.text.replace(/\n/g, '\n> ')}\n\n`;
      
      // Comment if exists
      if (hl.comment) {
        md += `**Note:** ${hl.comment}\n\n`;
      }
      
      md += `---\n\n`;
    }
  }
  
  // Stats
  const noteCount = highlights.filter(h => h.comment).length;
  md += `*${highlights.length} highlight${highlights.length !== 1 ? 's' : ''} • ${noteCount} note${noteCount !== 1 ? 's' : ''} • ${Object.keys(byChapter).length} chapter${Object.keys(byChapter).length !== 1 ? 's' : ''}*\n`;
  
  try {
    const result = await window.electronAPI.exportNotesMarkdown(title, md);
    if (result && result.success) {
      highlightsModal.style.display = "none";
      alert("Exported to: " + result.path);
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export Markdown. Please try again.");
  }
}

// -------------------------------------------------------
// READING POSITION SYNC
// -------------------------------------------------------
document.getElementById("exportPositionsBtn")?.addEventListener("click", async () => {
  await exportReadingPositions();
});

document.getElementById("importPositionsBtn")?.addEventListener("click", async () => {
  await importReadingPositions();
});

async function exportReadingPositions() {
  const positions = library.map(book => ({
    path: book.path,
    title: book.title,
    author: book.author,
    readingProgress: book.readingProgress,
    lastRead: book.lastRead
  }));
  
  try {
    const result = await window.electronAPI.exportReadingPositions(positions);
    if (result && result.success) {
      alert("Reading positions exported to: " + result.path);
    }
  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export reading positions.");
  }
}

async function importReadingPositions() {
  try {
    const result = await window.electronAPI.importReadingPositions();
    if (!result || !result.success) {
      if (result?.error !== "canceled") {
        alert("Failed to import positions: " + (result?.error || "Unknown error"));
      }
      return;
    }
    
    const positions = result.data;
    if (!Array.isArray(positions)) {
      alert("Invalid positions file format.");
      return;
    }
    
    let updated = 0;
    for (const pos of positions) {
      const book = library.find(b => b.path === pos.path);
      if (book && pos.readingProgress) {
        book.readingProgress = pos.readingProgress;
        if (pos.lastRead) book.lastRead = pos.lastRead;
        await window.electronAPI.addToLibrary(book);
        updated++;
      }
    }
    
    await loadLibrary();
    alert(`Imported reading positions for ${updated} book${updated !== 1 ? 's' : ''}.`);
  } catch (err) {
    console.error("Import failed:", err);
    alert("Failed to import reading positions.");
  }
}

// -------------------------------------------------------
// LIBRARY SEARCH
// -------------------------------------------------------
const librarySearchInput = document.getElementById("librarySearchInput");
const librarySearchClear = document.getElementById("librarySearchClear");

librarySearchInput?.addEventListener("input", (e) => {
  librarySearchTerm = e.target.value.trim().toLowerCase();
  librarySearchClear.style.display = librarySearchTerm ? "block" : "none";
  renderLibrary();
});

librarySearchClear?.addEventListener("click", () => {
  librarySearchInput.value = "";
  librarySearchTerm = "";
  librarySearchClear.style.display = "none";
  renderLibrary();
});

// -------------------------------------------------------
// ANNOTATIONS SEARCH
// -------------------------------------------------------
const annotationsSearchModal = document.getElementById("annotations-search-modal");
const annotationsSearchInput = document.getElementById("annotationsSearchInput");
const annotationsSearchResults = document.getElementById("annotationsSearchResults");

document.getElementById("searchAnnotationsBtn")?.addEventListener("click", () => {
  annotationsSearchModal.style.display = "flex";
  annotationsSearchInput.value = "";
  annotationsSearchResults.innerHTML = '<p class="annotations-placeholder">Enter a search term to find highlights and notes across your library.</p>';
  setTimeout(() => annotationsSearchInput.focus(), 100);
});

annotationsSearchModal?.querySelector(".close-modal")?.addEventListener("click", () => {
  annotationsSearchModal.style.display = "none";
});

annotationsSearchInput?.addEventListener("input", (e) => {
  const term = e.target.value.trim().toLowerCase();
  if (term.length < 2) {
    annotationsSearchResults.innerHTML = '<p class="annotations-placeholder">Enter at least 2 characters to search.</p>';
    return;
  }
  searchAnnotations(term);
});

function searchAnnotations(term) {
  const results = [];
  
  for (const book of library) {
    const highlights = book.notes?.entries?.filter(e => e.type === 'quote') || [];
    for (const hl of highlights) {
      const textMatch = hl.text?.toLowerCase().includes(term);
      const noteMatch = hl.comment?.toLowerCase().includes(term);
      
      if (textMatch || noteMatch) {
        results.push({
          book: book,
          highlight: hl,
          matchIn: textMatch ? 'text' : 'note'
        });
      }
    }
  }
  
  if (results.length === 0) {
    annotationsSearchResults.innerHTML = '<p class="annotations-placeholder">No matching highlights or notes found.</p>';
    return;
  }
  
  // Render results
  annotationsSearchResults.innerHTML = results.map(r => {
    const highlightedText = highlightSearchTerm(r.highlight.text, term);
    const highlightedNote = r.highlight.comment ? highlightSearchTerm(r.highlight.comment, term) : '';
    
    return `
      <div class="annotation-result-item" data-book-path="${escapeHtml(r.book.path)}" data-cfi="${escapeHtml(r.highlight.cfi || '')}">
        <div class="annotation-result-book">${escapeHtml(r.book.title || 'Unknown Book')}</div>
        <div class="annotation-result-text">${highlightedText}</div>
        ${highlightedNote ? `<div class="annotation-result-note">${highlightedNote}</div>` : ''}
        <div class="annotation-result-meta">${escapeHtml(r.highlight.chapter || '')}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  annotationsSearchResults.querySelectorAll('.annotation-result-item').forEach(item => {
    item.addEventListener('click', async () => {
      const bookPath = item.dataset.bookPath;
      const cfi = item.dataset.cfi;
      
      annotationsSearchModal.style.display = "none";
      
      // Open the book and navigate to highlight
      await openBookWithTransition(bookPath, 1);
      
      if (cfi && rendition1) {
        setTimeout(() => {
          rendition1.display(cfi).catch(e => console.warn("Could not navigate to highlight:", e));
        }, 500);
      }
    });
  });
}

function highlightSearchTerm(text, term) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

async function deleteHighlight(id) {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book?.notes?.entries) return;
  
  const entry = book.notes.entries.find(e => e.id === id && e.type === 'quote');
  if (entry && rendition1) {
    // Remove from rendition
    rendition1.annotations.remove(entry.cfi, "highlight");
  }
  
  book.notes.entries = book.notes.entries.filter(e => e.id !== id);
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  renderHighlights();
  
  // Refresh notes viewer if open
  if (notesViewerSlot && notesViewerBookPath === currentBookPath1) {
    renderNotesContent(book, notesViewerSlot);
  }
  
  // Refresh library to update notes badge
  renderLibrary();
}

function editHighlightNote(id) {
  const book = library.find(b => b.path === currentBookPath1);
  const entry = book?.notes?.entries?.find(e => e.id === id && e.type === 'quote');
  if (!entry) return;
  
  pendingHighlight = { ...entry, editMode: true };
  document.getElementById("notePreviewText").textContent = entry.text;
  document.getElementById("noteTextarea").value = entry.comment || '';
  
  // Set color
  document.querySelectorAll(".note-color").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === entry.color);
  });
  selectedHighlightColor = entry.color;
  
  highlightsModal.style.display = "none";
  noteModal.style.display = "flex";
}

// Text Selection Handler for Highlights
let selectionTimeout = null;

function setupHighlightSelection(rendition, slot) {
  if (slot !== 1) return; // Only handle slot 1 for now
  
  rendition.on("selected", (cfiRange, contents) => {
    if (viewerType1 !== 'epub') return;
    
    // Clear any pending hide timeout
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }
    
    const selection = contents.window.getSelection();
    const text = selection.toString().trim();
    
    if (!text || text.length < 2) {
      hideHighlightTooltip();
      return;
    }
    
    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const iframe = document.querySelector("#viewer iframe");
    if (!iframe) return;
    
    const iframeRect = iframe.getBoundingClientRect();
    
    // Store pending highlight info
    pendingHighlight = {
      cfi: cfiRange,
      text: text,
      chapter: getCurrentChapterName()
    };
    
    // Position and show tooltip at TOP of selection
    const tooltipX = iframeRect.left + rect.left + (rect.width / 2);
    const tooltipY = iframeRect.top + rect.top;
    
    showHighlightTooltip(tooltipX, tooltipY);
  });
  
  // Hide tooltip and context menu when clicking elsewhere (but not if there's still a selection)
  rendition.on("click", () => {
    // Always hide context menu on any click in the book
    hideHighlightContextMenu();
    
    selectionTimeout = setTimeout(() => {
      // Check if there's still an active selection in the iframe
      const iframe = document.querySelector("#viewer iframe");
      if (iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const selection = iframeDoc?.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          return; // Don't hide if text is still selected
        }
      }
      
      // Check if hovering over tooltip
      if (!document.querySelector(".highlight-tooltip:hover")) {
        hideHighlightTooltip();
      }
    }, 200);
  });
}

function showHighlightTooltip(x, y) {
  // Clear any pending hide
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
    selectionTimeout = null;
  }
  
  // Reset styles first
  highlightTooltip.style.transform = "";
  highlightTooltip.style.marginTop = "";
  
  // Position tooltip above the selection
  highlightTooltip.style.left = `${x}px`;
  highlightTooltip.style.top = `${y}px`;
  highlightTooltip.style.display = "flex";
  
  // Re-trigger animation
  highlightTooltip.style.animation = 'none';
  void highlightTooltip.offsetHeight; // Trigger reflow
  highlightTooltip.style.animation = '';
  
  // Ensure tooltip stays within viewport after it's visible
  requestAnimationFrame(() => {
    const rect = highlightTooltip.getBoundingClientRect();
    let newX = x;
    let newY = y;
    
    // Horizontal adjustments
    if (rect.left < 10) {
      newX = 10 + rect.width / 2;
    } else if (rect.right > window.innerWidth - 10) {
      newX = window.innerWidth - 10 - rect.width / 2;
    }
    
    // If tooltip goes off the top, show below selection instead
    if (rect.top < 10) {
      highlightTooltip.style.transform = "translate(-50%, 10px)";
      highlightTooltip.style.marginTop = "0";
      newY = y + 30;
    }
    
    highlightTooltip.style.left = `${newX}px`;
    highlightTooltip.style.top = `${newY}px`;
  });
}

function hideHighlightTooltip() {
  highlightTooltip.style.display = "none";
  // Reset any modified styles
  highlightTooltip.style.transform = "";
  highlightTooltip.style.marginTop = "";
  pendingHighlight = null;
}

function getCurrentChapterName() {
  if (!rendition1) return "Unknown";
  try {
    const location = rendition1.currentLocation();
    const href = location?.start?.href;
    if (href && book1?.navigation?.toc) {
      const chapter = book1.navigation.toc.find(item => 
        href.includes(item.href) || item.href.includes(href.split('#')[0])
      );
      return chapter?.label || href;
    }
    return href || "Unknown";
  } catch {
    return "Unknown";
  }
}

// Highlight color buttons (EPUB only - PDF uses separate tooltip)
highlightTooltip?.querySelectorAll(".highlight-color").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!pendingHighlight) return;
    
    const color = btn.dataset.color;
    
    // Handle EPUB highlight
    await createHighlight(pendingHighlight.cfi, pendingHighlight.text, color, '', pendingHighlight.chapter);
    hideHighlightTooltip();
    
    // Clear selection
    if (rendition1) {
      const contents = rendition1.getContents()[0];
      if (contents) {
        contents.window.getSelection().removeAllRanges();
      }
    }
  });
});

// Add Note button (EPUB only - PDF uses separate simpler tooltip)
document.getElementById("addNoteBtn")?.addEventListener("click", () => {
  if (!pendingHighlight) return;
  
  // Save the pending highlight data before hiding tooltip
  const highlightData = { ...pendingHighlight };
  
  document.getElementById("notePreviewText").textContent = highlightData.text;
  document.getElementById("noteTextarea").value = '';
  
  // Reset color selection
  document.querySelectorAll(".note-color").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === "#ffeb3b");
  });
  selectedHighlightColor = "#ffeb3b";
  
  // Hide tooltip WITHOUT clearing pendingHighlight
  highlightTooltip.style.display = "none";
  highlightTooltip.style.transform = "";
  highlightTooltip.style.marginTop = "";
  
  // Restore the highlight data for the note modal
  pendingHighlight = highlightData;
  
  noteModal.style.display = "flex";
});

// Copy text button
document.getElementById("copyTextBtn")?.addEventListener("click", async () => {
  if (!pendingHighlight) return;
  
  try {
    const textToCopy = pendingHighlight.text;
    await navigator.clipboard.writeText(textToCopy);
    hideHighlightTooltip();
    // Could show a toast notification here
  } catch (err) {
    console.error("Failed to copy:", err);
  }
});

// Highlight context menu - Go to Notes
document.getElementById("highlight-goto-notes")?.addEventListener("click", () => {
  if (activeHighlightEntryId && currentBookPath1) {
    hideHighlightContextMenu();
    openNotesAndJumpToEntry(currentBookPath1, activeHighlightEntryId);
  }
});

// Highlight context menu - Delete
document.getElementById("highlight-delete")?.addEventListener("click", async () => {
  if (activeHighlightEntryId && currentBookPath1) {
    hideHighlightContextMenu();
    await deleteNoteEntry(currentBookPath1, activeHighlightEntryId);
    showToast("Highlight deleted");
  }
});

// (Removed "Add to Notes" - all highlights are now automatically notes)

// Note modal color picker
document.querySelectorAll(".note-color").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".note-color").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedHighlightColor = btn.dataset.color;
  });
});

// Save note
document.getElementById("save-note-btn")?.addEventListener("click", async () => {
  if (!pendingHighlight) {
    console.error("No pending highlight data");
    return;
  }
  
  const note = document.getElementById("noteTextarea").value.trim();
  
  try {
    if (pendingHighlight.isPdfHighlight && pendingHighlight.selectionData) {
      // Create new PDF highlight (note: PDF highlights don't support comments, just colors)
      await createPdfHighlight(pendingHighlight.slot, pendingHighlight.selectionData, selectedHighlightColor);
    } else if (pendingHighlight.isPdfNote) {
      // Create PDF note (page-indexed, no quoted text)
      if (pendingHighlight.slot === 2 && pendingHighlight.bookPath) {
        // Handle slot 2 PDF note
        const book = library.find(b => b.path === pendingHighlight.bookPath);
        if (book) {
          if (!book.notes) {
            book.notes = { entries: [], chapterConclusions: {}, lastModified: Date.now() };
          }
          book.notes.entries.push({
            id: Date.now(),
            type: 'pdf-note',
            page: pendingHighlight.page,
            color: selectedHighlightColor,
            comment: note,
            createdAt: Date.now()
          });
          book.notes.lastModified = Date.now();
          await window.electronAPI.addToLibrary(book);
          renderLibrary();
          showToast("Note added to page " + pendingHighlight.page);
        }
      } else {
        // Slot 1 PDF note
        await createPdfNote(pendingHighlight.page, note, selectedHighlightColor);
      }
      
      // Reset the note preview style
      const notePreview = document.getElementById("notePreviewText");
      if (notePreview) {
        notePreview.style.borderLeftColor = '#ffeb3b';
      }
    } else if (pendingHighlight.editMode) {
      // Update existing EPUB highlight
      await updateHighlightNote(pendingHighlight.id, note, selectedHighlightColor);
    } else {
      // Create new EPUB highlight with note
      await createHighlight(pendingHighlight.cfi, pendingHighlight.text, selectedHighlightColor, note, pendingHighlight.chapter);
    }
    
    noteModal.style.display = "none";
    pendingHighlight = null;
    
    // Clear selection (only for EPUB)
    if (rendition1 && viewerType1 === 'epub') {
      const contents = rendition1.getContents()[0];
      if (contents) {
        contents.window.getSelection().removeAllRanges();
      }
    }
  } catch (err) {
    console.error("Error saving highlight:", err);
  }
});

document.getElementById("cancel-note-btn")?.addEventListener("click", () => {
  noteModal.style.display = "none";
  pendingHighlight = null;
});

async function createHighlight(cfi, text, color, comment, chapter) {
  if (!currentBookPath1) return;
  
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) return;
  
  // Initialize notes structure if needed
  if (!book.notes) {
    book.notes = {
      entries: [],
      chapterConclusions: {},
      lastModified: Date.now()
    };
  }
  
  // Check if this CFI is already highlighted
  const existingEntry = book.notes.entries.find(e => e.type === 'quote' && e.cfi === cfi);
  if (existingEntry) {
    // Already highlighted - just show a message
    showToast("This text is already highlighted");
    return;
  }
  
  // Create unified note entry (this IS the highlight)
  const entry = {
    id: Date.now(),
    type: 'quote',
    cfi: cfi,
    text: text,
    color: color,
    comment: comment || '',
    chapter: chapter || 'Unknown Chapter',
    createdAt: Date.now()
  };
  
  book.notes.entries.push(entry);
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  // Apply highlight to rendition with click handler
  applyHighlightToRendition(entry);
  
  // Refresh notes viewer if open
  if (notesViewerSlot && notesViewerBookPath === currentBookPath1) {
    renderNotesContent(book, notesViewerSlot);
  }
  
  // Refresh library to update notes badge
  renderLibrary();
}

// Create a note for PDF (indexed by page number, no quoted text)
async function createPdfNote(page, comment, color) {
  if (!currentBookPath1) return;
  
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) return;
  
  // Initialize notes structure if needed
  if (!book.notes) {
    book.notes = {
      entries: [],
      chapterConclusions: {},
      lastModified: Date.now()
    };
  }
  
  // Create PDF note entry
  const entry = {
    id: Date.now(),
    type: 'pdf-note',
    page: page,
    color: color || '#ffeb3b',
    comment: comment || '',
    createdAt: Date.now()
  };
  
  book.notes.entries.push(entry);
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  // Refresh notes viewer if open
  if (notesViewerSlot && notesViewerBookPath === currentBookPath1) {
    renderNotesContent(book, notesViewerSlot);
  }
  
  // Refresh library to update notes badge
  renderLibrary();
  
  showToast("Note added to page " + page);
}

// -------------------------------------------------------
// PDF HIGHLIGHTING SYSTEM
// -------------------------------------------------------

// Capture current PDF text selection with bounding rectangles
function capturePdfSelection(slot) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const text = selection.toString().trim();
  if (!text || text.length < 2) return null;
  
  const textLayer = slot === 1 ? pdfTextLayer1 : pdfTextLayer2;
  const highlightLayer = slot === 1 ? pdfHighlightLayer1 : pdfHighlightLayer2;
  if (!textLayer || !highlightLayer) return null;
  
  const range = selection.getRangeAt(0);
  
  // Check if selection is within this text layer
  if (!textLayer.contains(range.commonAncestorContainer)) return null;
  
  // Get all client rects from the selection
  const clientRects = range.getClientRects();
  if (clientRects.length === 0) return null;
  
  const layerRect = textLayer.getBoundingClientRect();
  
  // Convert to positions relative to the text layer
  // Merge adjacent/overlapping rects on the same line
  const rects = [];
  let lastRect = null;
  
  for (const rect of clientRects) {
    if (rect.width < 1 || rect.height < 1) continue;
    
    const relRect = {
      left: rect.left - layerRect.left,
      top: rect.top - layerRect.top,
      width: rect.width,
      height: rect.height
    };
    
    // Merge with last rect if on same line and close together
    if (lastRect && Math.abs(lastRect.top - relRect.top) < 5 && 
        relRect.left - (lastRect.left + lastRect.width) < 10) {
      lastRect.width = (relRect.left + relRect.width) - lastRect.left;
    } else {
      rects.push(relRect);
      lastRect = relRect;
    }
  }
  
  if (rects.length === 0) return null;
  
  // Get current page number(s)
  const pageNum = slot === 1 ? pdfPage1 : pdfPage2;
  
  // For two-page spread, determine which page the selection is on
  const isSplitMode = viewersContainer.classList.contains("split-mode");
  const container = slot === 1 ? pdfContainer1 : pdfContainer2;
  const containerWidth = container?.clientWidth || 0;
  
  // Check if most of the selection is on the left or right page
  let selectionPage = pageNum;
  if (!isSplitMode && containerWidth > 0) {
    const midpoint = containerWidth / 2;
    const avgX = rects.reduce((sum, r) => sum + r.left + r.width/2, 0) / rects.length;
    if (avgX > midpoint) {
      selectionPage = pageNum + 1; // Right page
    }
  }
  
  return {
    text: text,
    rects: rects,
    page: selectionPage,
    containerWidth: containerWidth,
    containerHeight: textLayer.clientHeight
  };
}

// Create a PDF highlight
async function createPdfHighlight(slot, selectionData, color, comment = '') {
  const bookPath = slot === 1 ? currentBookPath1 : currentBookPath2;
  if (!bookPath) return;
  
  const book = library.find(b => b.path === bookPath);
  if (!book) return;
  
  // Initialize notes structure if needed
  if (!book.notes) {
    book.notes = {
      entries: [],
      chapterConclusions: {},
      lastModified: Date.now()
    };
  }
  
  // Normalize rects to percentages for zoom-independence
  const normalizedRects = selectionData.rects.map(r => ({
    leftPct: r.left / selectionData.containerWidth,
    topPct: r.top / selectionData.containerHeight,
    widthPct: r.width / selectionData.containerWidth,
    heightPct: r.height / selectionData.containerHeight
  }));
  
  // Create PDF highlight entry
  const entry = {
    id: Date.now(),
    type: 'pdf-highlight',
    page: selectionData.page,
    text: selectionData.text,
    color: color,
    comment: comment,
    rects: normalizedRects,
    createdAt: Date.now()
  };
  
  book.notes.entries.push(entry);
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  // Render the highlight immediately
  renderPdfHighlightsForPage(slot, selectionData.page);
  
  // Refresh library
  renderLibrary();
  
  showToast("Text highlighted on page " + selectionData.page);
  
  // Clear selection
  window.getSelection()?.removeAllRanges();
  
  return entry;
}

// Render PDF highlights for a specific page in paged mode
function renderPdfHighlightsForPage(slot, pageNum, rightPageNum = null) {
  const bookPath = slot === 1 ? currentBookPath1 : currentBookPath2;
  const highlightLayer = slot === 1 ? pdfHighlightLayer1 : pdfHighlightLayer2;
  const container = slot === 1 ? pdfContainer1 : pdfContainer2;
  
  if (!highlightLayer || !container) return;
  
  // Clear existing highlights
  highlightLayer.innerHTML = '';
  
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  // Get highlights for this page (and right page if in spread mode)
  const pagesToRender = [pageNum];
  if (rightPageNum) pagesToRender.push(rightPageNum);
  
  const highlights = book.notes.entries.filter(
    e => e.type === 'pdf-highlight' && pagesToRender.includes(e.page)
  );
  
  if (highlights.length === 0) return;
  
  // Get container dimensions
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // Set highlight layer size to match container
  highlightLayer.style.width = `${containerWidth}px`;
  highlightLayer.style.height = `${containerHeight}px`;
  
  // For two-page spread, calculate page offset
  const isSplitMode = viewersContainer.classList.contains("split-mode");
  const isTwoPage = !isSplitMode && rightPageNum;
  const singlePageWidth = isTwoPage ? containerWidth / 2 : containerWidth;
  
  highlights.forEach(hl => {
    // Calculate X offset for right page in spread mode
    const isRightPage = isTwoPage && hl.page === rightPageNum;
    const xOffset = isRightPage ? singlePageWidth : 0;
    const pageWidth = isTwoPage ? singlePageWidth : containerWidth;
    
    hl.rects.forEach(rect => {
      const div = document.createElement('div');
      div.className = 'pdf-highlight-rect';
      div.dataset.highlightId = hl.id;
      div.style.left = `${rect.leftPct * pageWidth + xOffset}px`;
      div.style.top = `${rect.topPct * containerHeight}px`;
      div.style.width = `${rect.widthPct * pageWidth}px`;
      div.style.height = `${rect.heightPct * containerHeight}px`;
      div.style.backgroundColor = hl.color;
      div.style.opacity = '0.4';
      
      highlightLayer.appendChild(div);
    });
  });
}

// Render PDF highlights for scroll mode (called when page is rendered)
function renderPdfHighlightsForScrollPage(slot, pageNum, pageElement) {
  const bookPath = slot === 1 ? currentBookPath1 : currentBookPath2;
  if (!bookPath) return;
  
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  // Find or create highlight layer for this page
  let highlightLayer = pageElement.querySelector('.pdf-scroll-highlight-layer');
  if (!highlightLayer) {
    highlightLayer = document.createElement('div');
    highlightLayer.className = 'pdf-highlight-layer pdf-scroll-highlight-layer';
    // Insert after canvas, before text layer
    const textLayer = pageElement.querySelector('.pdf-text-layer');
    if (textLayer) {
      pageElement.insertBefore(highlightLayer, textLayer);
    } else {
      pageElement.appendChild(highlightLayer);
    }
  }
  
  // Clear existing highlights for this page
  highlightLayer.innerHTML = '';
  
  // Get highlights for this page
  const highlights = book.notes.entries.filter(
    e => e.type === 'pdf-highlight' && e.page === pageNum
  );
  
  if (highlights.length === 0) return;
  
  // Get page dimensions
  const pageWidth = pageElement.clientWidth;
  const pageHeight = pageElement.clientHeight;
  
  // Get current zoom
  const zoom = slot === 1 ? pdfZoom1 : pdfZoom2;
  
  // Set highlight layer size
  highlightLayer.style.width = `${pageWidth}px`;
  highlightLayer.style.height = `${pageHeight}px`;
  highlightLayer.style.transform = `scale(${zoom})`;
  highlightLayer.style.transformOrigin = '0 0';
  
  // Get base dimensions for proper scaling
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  const basePageWidth = parseFloat(scrollContent?.dataset.basePageWidth) || pageWidth;
  const basePageHeight = parseFloat(scrollContent?.dataset.basePageHeight) || pageHeight;
  
  highlights.forEach(hl => {
    hl.rects.forEach(rect => {
      const div = document.createElement('div');
      div.className = 'pdf-highlight-rect';
      div.dataset.highlightId = hl.id;
      // Use base dimensions for positioning (CSS transform handles zoom)
      div.style.left = `${rect.leftPct * basePageWidth}px`;
      div.style.top = `${rect.topPct * basePageHeight}px`;
      div.style.width = `${rect.widthPct * basePageWidth}px`;
      div.style.height = `${rect.heightPct * basePageHeight}px`;
      div.style.backgroundColor = hl.color;
      div.style.opacity = '0.4';
      
      highlightLayer.appendChild(div);
    });
  });
}

// Update highlights when zoom changes in scroll mode
function updatePdfHighlightZoom(slot, zoom) {
  const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
  if (!scrollContent) return;
  
  scrollContent.querySelectorAll('.pdf-scroll-highlight-layer').forEach(layer => {
    layer.style.transform = `scale(${zoom})`;
  });
}

// Hide any PDF highlight context menus (kept for compatibility)
function hidePdfHighlightContextMenu() {
  document.querySelectorAll('.pdf-highlight-context-menu').forEach(m => m.remove());
}

// Show PDF note modal - reuse the existing note modal
function showPdfNoteModal() {
  if (!currentBookPath1 || viewerType1 !== 'pdf') return;
  
  const page = pdfPage1;
  
  // Set up pendingHighlight for PDF note mode
  pendingHighlight = {
    isPdfNote: true,
    page: page,
    text: '', // No quoted text for PDFs
    editMode: false
  };
  
  // Update modal to show PDF page instead of quote preview
  const notePreview = document.getElementById("notePreviewText");
  if (notePreview) {
    notePreview.innerHTML = `<i class="fas fa-file-alt"></i> Adding note for <strong>Page ${page}</strong>`;
    notePreview.style.borderLeftColor = '#2196f3'; // Blue for PDF
  }
  
  // Clear the textarea
  const noteTextarea = document.getElementById("noteTextarea");
  if (noteTextarea) {
    noteTextarea.value = '';
  }
  
  // Reset color selection
  selectedHighlightColor = '#ffeb3b';
  document.querySelectorAll(".note-color").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === selectedHighlightColor);
  });
  
  noteModal.style.display = "flex";
}

async function updateHighlightNote(id, comment, color) {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book?.notes?.entries) return;
  
  const entry = book.notes.entries.find(e => e.id === id && e.type === 'quote');
  if (!entry) return;
  
  // Remove old highlight from rendition
  if (rendition1) {
    rendition1.annotations.remove(entry.cfi, "highlight");
  }
  
  entry.comment = comment;
  entry.color = color;
  book.notes.lastModified = Date.now();
  
  await window.electronAPI.addToLibrary(book);
  
  // Re-apply with new color
  applyHighlightToRendition(entry);
  
  // Refresh notes viewer if open
  if (notesViewerSlot && notesViewerBookPath === currentBookPath1) {
    renderNotesContent(book, notesViewerSlot);
  }
}

function applyHighlightToRendition(entry) {
  if (!rendition1) return;
  
  try {
    rendition1.annotations.highlight(entry.cfi, {}, (e) => {
      // Click handler - show context menu
      e.stopPropagation();
      
      let x, y;
      
      if (e.target) {
        // getBoundingClientRect() returns viewport-relative coordinates in Electron/EPUB.js
        const targetRect = e.target.getBoundingClientRect();
        x = targetRect.left + (targetRect.width / 2);
        y = targetRect.top;
      }
      
      // Final fallback
      if (x === undefined || y === undefined) {
        const viewer = document.getElementById("viewer");
        const rect = viewer?.getBoundingClientRect();
        x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        y = rect ? rect.top + 100 : 100;
      }
      
      showHighlightContextMenu(x, y, entry.id);
    }, "hl-" + entry.id, {
      "fill": entry.color,
      "fill-opacity": "0.4"
    });
  } catch (err) {
    console.warn("Could not apply highlight:", err);
  }
}

// Show context menu for existing highlight (positioned above, like tooltip)
function showHighlightContextMenu(x, y, entryId) {
  activeHighlightEntryId = entryId;
  
  // Position using transform (same approach as highlight tooltip)
  highlightContextMenu.style.left = `${x}px`;
  highlightContextMenu.style.top = `${y}px`;
  highlightContextMenu.style.display = 'flex';
  highlightContextMenu.classList.remove('below');
  
  // Check if menu goes off screen and adjust
  requestAnimationFrame(() => {
    const rect = highlightContextMenu.getBoundingClientRect();
    
    // If menu goes off top, show below instead
    if (rect.top < 10) {
      highlightContextMenu.classList.add('below');
    }
  });
}

function hideHighlightContextMenu() {
  highlightContextMenu.style.display = 'none';
  highlightContextMenu.classList.remove('below');
  activeHighlightEntryId = null;
}

// Open notes viewer and scroll to a specific entry
function openNotesAndJumpToEntry(bookPath, entryId) {
  // Check if notes are already open for this book
  if (notesViewerSlot === 2 && notesViewerBookPath === bookPath) {
    // Just scroll to the entry
    const entryElement = viewer2El.querySelector(`[data-entry-id="${entryId}"]`);
    if (entryElement) {
      entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      entryElement.style.boxShadow = '0 0 0 3px var(--accent)';
      setTimeout(() => {
        entryElement.style.boxShadow = '';
      }, 2000);
    }
    return;
  }
  
  // If split view is hidden, open it
  const wasHidden = viewerWrapper2.classList.contains("hidden");
  if (wasHidden) {
    viewerWrapper2.classList.remove("hidden");
    sidebar2.classList.remove("hidden");
    viewersContainer.classList.add("split-mode");
    splitBtn.classList.add("active");
    viewer2Controls?.classList.remove("hidden");
  }
  
  // Open notes in slot 2
  openNotesViewer(bookPath, 2);
  
  // Update EPUB spread and resize after a short delay
  setTimeout(() => {
    updateEPUBSpread();
    if (rendition1) rendition1.resize();
    
    // Then scroll to the entry after notes are rendered
    setTimeout(() => {
      const entryElement = viewer2El.querySelector(`[data-entry-id="${entryId}"]`);
      if (entryElement) {
        entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        entryElement.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => {
          entryElement.style.boxShadow = '';
        }, 2000);
      }
    }, 200);
  }, 100);
}

function loadHighlightsForBook(bookPath) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries || !rendition1) return;
  
  // Wait for rendition to be ready
  setTimeout(() => {
    try {
      // Filter for quote entries (these are the highlights)
      const highlights = book.notes.entries.filter(e => e.type === 'quote');
      
      highlights.forEach(entry => {
        // Try to remove old highlight first (in case it exists from previous render)
        // This prevents duplicates when re-applying after resize/column changes
        try {
          rendition1.annotations.remove(entry.cfi, "highlight");
        } catch (e) {
          // Ignore if highlight doesn't exist - that's fine
        }
        // Apply highlight (CFI is stable across column/layout changes)
        applyHighlightToRendition(entry);
      });
    } catch (err) {
      console.warn("Error loading highlights:", err);
    }
  }, 100);
}

// -------------------------------------------------------
// NOTES SYSTEM - Integrated Book Notes
// -------------------------------------------------------

// Track which viewer has notes open and for which book
let notesViewerSlot = null; // 1 or 2
let notesViewerBookPath = null;

// Simple toast notification
function showToast(message, duration = 3000) {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--text-primary);
      color: var(--bg-primary);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
  }, duration);
}

// Add a quote to the book's notes
// (addQuoteToNotes removed - createHighlight now handles this)

// Update a quote's comment
async function updateQuoteComment(bookPath, entryId, newComment) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  const entry = book.notes.entries.find(e => e.id === entryId);
  if (entry) {
    entry.comment = newComment;
    book.notes.lastModified = Date.now();
    await window.electronAPI.addToLibrary(book);
    
    if (notesViewerSlot && notesViewerBookPath === bookPath) {
      renderNotesContent(book, notesViewerSlot);
    }
  }
}

// Delete a note entry and its highlight
async function deleteNoteEntry(bookPath, entryId) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  // Find the entry to get its CFI before deleting
  const entry = book.notes.entries.find(e => e.id === entryId);
  
  // Remove highlight from rendition if this is for the current book and it's a quote entry
  if (bookPath === currentBookPath1 && entry && entry.type === 'quote' && entry.cfi && rendition1) {
    try {
      rendition1.annotations.remove(entry.cfi, "highlight");
    } catch (err) {
      // Highlight might not exist, that's fine
      console.warn("Could not remove highlight:", err);
    }
  }
  
  book.notes.entries = book.notes.entries.filter(e => e.id !== entryId);
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  if (notesViewerSlot && notesViewerBookPath === bookPath) {
    renderNotesContent(book, notesViewerSlot);
  }
  
  renderLibrary(); // Update notes badge
}

// Update chapter conclusion
async function updateChapterConclusion(bookPath, chapter, conclusion) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes) return;
  
  if (!book.notes.chapterConclusions) {
    book.notes.chapterConclusions = {};
  }
  
  book.notes.chapterConclusions[chapter] = conclusion;
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  if (notesViewerSlot && notesViewerBookPath === bookPath) {
    renderNotesContent(book, notesViewerSlot);
  }
}

// Add freeform note
async function addFreeformNote(bookPath, content) {
  const book = library.find(b => b.path === bookPath);
  if (!book) return;
  
  if (!book.notes) {
    book.notes = {
      entries: [],
      chapterConclusions: {},
      lastModified: Date.now()
    };
  }
  
  const entry = {
    id: Date.now(),
    type: 'freeform',
    content: content,
    createdAt: Date.now()
  };
  
  book.notes.entries.push(entry);
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  if (notesViewerSlot && notesViewerBookPath === bookPath) {
    renderNotesContent(book, notesViewerSlot);
  }
  
  renderLibrary();
}

// Close notes viewer in a slot
function closeNotesViewer(slot, alsoCloseSplit = false) {
  const viewer = slot === 1 ? viewer1El : viewer2El;
  
  // Reset notes viewer state
  if (notesViewerSlot === slot) {
    notesViewerSlot = null;
    notesViewerBookPath = null;
  }
  
  // Restore paging buttons for slot 2
  if (slot === 2) {
    if (prevBtn2) prevBtn2.style.display = '';
    if (nextBtn2) nextBtn2.style.display = '';
    
    // Restore the placeholder in viewer 2 with both options
    // Event listeners are handled via delegation on viewer2El
    viewer.innerHTML = `
      <div id="viewer-2-placeholder" class="viewer-placeholder">
        <p>Secondary View</p>
        <div class="viewer-2-options">
          <button id="viewer-2-notes-btn" class="viewer-option-btn">
            <i class="fas fa-sticky-note"></i>
            <span>Notes</span>
          </button>
          <button id="viewer-2-select-btn" class="viewer-option-btn">
            <i class="fas fa-book"></i>
            <span>Book</span>
          </button>
        </div>
      </div>
    `;
  } else {
    viewer.innerHTML = '';
  }
  
  // Reset viewer type
  if (slot === 1) {
    viewerType1 = null;
  } else {
    viewerType2 = null;
  }
  
  // Close split view if requested and in split mode
  if (alsoCloseSplit && slot === 2 && !viewerWrapper2.classList.contains("hidden")) {
    // Manually close split view
    viewerWrapper2.classList.add("hidden");
    sidebar2.classList.add("hidden");
    viewersContainer.classList.remove("split-mode");
    splitBtn.classList.remove("active");
    viewer2Controls?.classList.add("hidden");
    
    // Update EPUB spread back to full width and resize
    setTimeout(() => {
      updateEPUBSpread();
      if (rendition1) rendition1.resize();
    }, 50);
    
    focusedSlot = 1;
    updateFocusUI();
  }
  
  // Update bottom bar controls state
  updateViewer2ControlsState();
}

// Open notes viewer in a slot
function openNotesViewer(bookPath, slot = 2) {
  const book = library.find(b => b.path === bookPath);
  if (!book) return;
  
  notesViewerSlot = slot;
  notesViewerBookPath = bookPath;
  
  // Get the correct viewer elements
  const viewerWrapper = slot === 1 ? viewerWrapper1 : viewerWrapper2;
  const viewer = slot === 1 ? viewer1El : viewer2El;
  
  // Clear any existing content (book or PDF)
  if (slot === 1) {
    if (rendition1) {
      rendition1.destroy();
      rendition1 = null;
    }
    if (book1) {
      book1.destroy();
      book1 = null;
    }
    currentBookPath1 = null;
    viewerType1 = 'notes';
  } else {
    if (rendition2) {
      rendition2.destroy();
      rendition2 = null;
    }
    if (book2) {
      book2.destroy();
      book2 = null;
    }
    // Clear PDF resources for slot 2
    if (pdf2) {
      pdf2 = null;
    }
    currentBookPath2 = null;
    viewerType2 = 'notes';
    
    // Hide paging buttons for slot 2 when showing notes
    if (prevBtn2) prevBtn2.style.display = 'none';
    if (nextBtn2) nextBtn2.style.display = 'none';
    
    // Hide PDF elements for slot 2
    if (pdfContainer2) pdfContainer2.style.display = 'none';
    if (pdfScroll2) pdfScroll2.style.display = 'none';
    const pdfZoomControls2 = document.getElementById("pdf-zoom-controls-2");
    if (pdfZoomControls2) pdfZoomControls2.style.display = 'none';
  }
  
  // Make sure viewer is visible
  viewer.style.display = 'block';
  
  // Clear the viewer and create notes viewer
  viewer.innerHTML = '';
  
  const notesViewer = document.createElement('div');
  notesViewer.className = 'notes-viewer';
  notesViewer.innerHTML = `
    <div class="notes-header">
      <div class="notes-book-info">
        <h2 class="notes-book-title">${escapeHtml(book.title || 'Untitled')}</h2>
        <p class="notes-book-author">${escapeHtml(book.author || '')}</p>
      </div>
      <div class="notes-actions">
        <button class="notes-switch-book-btn" title="Switch to Book"><i class="fas fa-book"></i></button>
        <button class="notes-export-md-btn" title="Export to Markdown (Obsidian)"><i class="fab fa-markdown"></i></button>
        <button class="notes-export-pdf-btn" title="Export to PDF"><i class="fas fa-file-pdf"></i></button>
      </div>
    </div>
    
    <div class="notes-content">
      <!-- Content will be rendered here -->
    </div>
  `;
  
  viewer.appendChild(notesViewer);
  
  // Add event listeners
  notesViewer.querySelector('.notes-switch-book-btn').addEventListener('click', () => {
    // Close notes and go to library to select a book
    closeNotesViewer(slot, false);
    openLibraryForSlot(2);
  });
  
  notesViewer.querySelector('.notes-export-md-btn').addEventListener('click', () => {
    exportBookNotesMarkdown(bookPath);
  });
  
  notesViewer.querySelector('.notes-export-pdf-btn').addEventListener('click', () => {
    exportBookNotesPdf(bookPath);
  });
  
  // Render the notes content
  renderNotesContent(book, slot);
  
  // Update sidebar (hide TOC since we're showing notes)
  if (slot === 1) {
    chapterList.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">Notes viewer active</div>';
  } else {
    const chapterList2 = document.getElementById("chapters-2");
    if (chapterList2) {
      chapterList2.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">Notes viewer active</div>';
    }
  }
  
  // Update bottom bar controls state
  updateViewer2ControlsState();
}

// Helper function to compare CFI positions
// CFI strings can be compared by extracting numeric path components
function compareCFI(cfi1, cfi2) {
  if (!cfi1 && !cfi2) return 0;
  if (!cfi1) return 1;
  if (!cfi2) return -1;
  
  // CFI format: epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)
  // Extract numeric path components for comparison
  const extractPath = (cfi) => {
    if (!cfi) return [];
    // Remove epubcfi( and ) wrapper
    const path = cfi.replace(/^epubcfi\(/, '').replace(/\)$/, '');
    // Extract all numeric values from the path
    const matches = path.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  };
  
  const path1 = extractPath(cfi1);
  const path2 = extractPath(cfi2);
  
  // Compare path components
  const minLen = Math.min(path1.length, path2.length);
  for (let i = 0; i < minLen; i++) {
    if (path1[i] !== path2[i]) {
      return path1[i] - path2[i];
    }
  }
  
  // If one path is longer, it comes after
  return path1.length - path2.length;
}

// Render PDF notes content organized by page
function renderPdfNotesContent(contentDiv, book, pdfNotes, freeformNotes) {
  // Group notes by page
  const byPage = {};
  pdfNotes.forEach(note => {
    const page = note.page || 1;
    if (!byPage[page]) {
      byPage[page] = [];
    }
    byPage[page].push(note);
  });
  
  // Sort pages numerically
  const sortedPages = Object.keys(byPage).map(Number).sort((a, b) => a - b);
  
  let html = '';
  
  // Render each page's notes
  sortedPages.forEach(page => {
    const entries = byPage[page];
    // Sort entries within page by creation time
    entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    
    html += `
      <div class="notes-chapter notes-pdf-page" data-page="${page}">
        <div class="notes-chapter-header">
          <h3 class="notes-chapter-title">
            <i class="fas fa-file-alt"></i>
            Page ${page}
          </h3>
          <span class="notes-chapter-count">${entries.length} note${entries.length !== 1 ? 's' : ''}</span>
        </div>
        
        ${entries.map(entry => `
          <div class="notes-entry pdf-note-entry" data-entry-id="${entry.id}" data-page="${entry.page}">
            <div class="notes-pdf-page-link" data-page="${entry.page}" title="Click to go to page ${entry.page}">
              <i class="fas fa-arrow-right"></i>
              <span>Go to page ${entry.page}</span>
            </div>
            <div class="notes-entry-editor">
              <textarea 
                class="notes-textarea" 
                data-entry-id="${entry.id}" 
                placeholder="Write your notes for this page..."
                spellcheck="true"
              >${entry.comment ? escapeHtml(entry.comment) : ''}</textarea>
            </div>
            <div class="notes-entry-footer">
              <span class="notes-entry-date">
                <i class="fas fa-clock"></i>
                ${formatDate(entry.createdAt)}
              </span>
              <button class="notes-delete-btn" data-entry-id="${entry.id}" title="Delete note">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  });
  
  // Render freeform notes at the end
  if (freeformNotes.length > 0) {
    html += `
      <div class="notes-chapter notes-general-section">
        <div class="notes-chapter-header">
          <h3 class="notes-chapter-title">
            <i class="fas fa-sticky-note"></i>
            General Notes
          </h3>
          <span class="notes-chapter-count">${freeformNotes.length} note${freeformNotes.length !== 1 ? 's' : ''}</span>
        </div>
        
        ${freeformNotes.map(entry => `
          <div class="notes-freeform-entry" data-entry-id="${entry.id}">
            <textarea 
              class="notes-freeform-textarea" 
              data-entry-id="${entry.id}"
              placeholder="Write your note..."
              spellcheck="true"
            >${escapeHtml(entry.content)}</textarea>
            <div class="notes-entry-footer">
              <span class="notes-entry-date">
                <i class="fas fa-clock"></i>
                ${formatDate(entry.createdAt)}
              </span>
              <button class="notes-delete-btn" data-entry-id="${entry.id}" title="Delete note">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  contentDiv.innerHTML = html;
}

// Render notes content organized by chapter (or page for PDFs)
function renderNotesContent(book, slot) {
  const viewer = slot === 1 ? viewer1El : viewer2El;
  const contentDiv = viewer.querySelector('.notes-content');
  if (!contentDiv) return;
  
  // Check if this is a PDF by looking for pdf-note entries or file extension
  const isPdf = book.path?.toLowerCase().endsWith('.pdf') || 
                book.notes?.entries?.some(e => e.type === 'pdf-note');
  
  if (!book.notes?.entries || book.notes.entries.length === 0) {
    contentDiv.innerHTML = `
      <div class="notes-empty">
        <i class="fas fa-sticky-note"></i>
        <h3>No Notes Yet</h3>
        <p>${isPdf 
          ? 'Click the note button in the PDF controls to add notes for the current page.' 
          : 'Highlight text in the book to start building your notes. Click any highlight to jump to it here.'
        }</p>
      </div>
    `;
    return;
  }
  
  // Separate PDF notes from other types
  const pdfNotes = book.notes.entries.filter(e => e.type === 'pdf-note');
  const epubQuotes = book.notes.entries.filter(e => e.type === 'quote');
  const freeformNotes = book.notes.entries.filter(e => e.type === 'freeform');
  
  // If this is a PDF with PDF notes, use page-based grouping
  if (isPdf && pdfNotes.length > 0) {
    renderPdfNotesContent(contentDiv, book, pdfNotes, freeformNotes);
    attachNotesEventListeners(contentDiv, book.path);
    return;
  }
  
  // Group EPUB entries by chapter
  const byChapter = {};
  
  epubQuotes.forEach(entry => {
    const chapter = entry.chapter || 'Unknown Chapter';
    if (!byChapter[chapter]) {
      byChapter[chapter] = [];
    }
    byChapter[chapter].push(entry);
  });
  
  // Sort chapters by first entry's CFI position (book order)
  const sortedChapters = Object.entries(byChapter).sort((a, b) => {
    // Get the first entry from each chapter (sorted by CFI)
    const aEntries = a[1].filter(e => e.cfi).sort((e1, e2) => compareCFI(e1.cfi, e2.cfi));
    const bEntries = b[1].filter(e => e.cfi).sort((e1, e2) => compareCFI(e1.cfi, e2.cfi));
    
    if (aEntries.length === 0 && bEntries.length === 0) return 0;
    if (aEntries.length === 0) return 1;
    if (bEntries.length === 0) return -1;
    
    return compareCFI(aEntries[0].cfi, bEntries[0].cfi);
  });
  
  let html = '';
  
  // Render each chapter
  sortedChapters.forEach(([chapter, entries]) => {
    // Sort entries within chapter by CFI position (book order), not creation time
    entries.sort((a, b) => {
      // If both have CFIs, compare by CFI
      if (a.cfi && b.cfi) {
        return compareCFI(a.cfi, b.cfi);
      }
      // If only one has CFI, prioritize it
      if (a.cfi && !b.cfi) return -1;
      if (!a.cfi && b.cfi) return 1;
      // If neither has CFI, fall back to creation time
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    
    const conclusion = book.notes.chapterConclusions?.[chapter] || '';
    
    html += `
      <div class="notes-chapter" data-chapter="${escapeHtml(chapter)}">
        <div class="notes-chapter-header">
          <h3 class="notes-chapter-title">
            <i class="fas fa-bookmark"></i>
            ${escapeHtml(chapter)}
          </h3>
          <span class="notes-chapter-count">${entries.length} quote${entries.length !== 1 ? 's' : ''}</span>
        </div>
        
        ${entries.map(entry => `
          <div class="notes-entry" data-entry-id="${entry.id}">
            <div class="notes-entry-quote" data-cfi="${escapeHtml(entry.cfi)}" title="Click to jump to this passage">
              <i class="fas fa-quote-left notes-quote-icon"></i>
              <span class="notes-quote-content">${escapeHtml(entry.text)}</span>
            </div>
            <div class="notes-entry-editor">
              <textarea 
                class="notes-textarea" 
                data-entry-id="${entry.id}" 
                placeholder="Write your thoughts here..."
                spellcheck="true"
              >${entry.comment ? escapeHtml(entry.comment) : ''}</textarea>
            </div>
            <div class="notes-entry-footer">
              <span class="notes-entry-date">
                <i class="fas fa-clock"></i>
                ${formatDate(entry.createdAt)}
              </span>
              <button class="notes-delete-btn" data-entry-id="${entry.id}" title="Delete entry">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
        
        <div class="notes-chapter-summary">
          <div class="notes-chapter-summary-header">
            <i class="fas fa-lightbulb"></i>
            <span>Chapter Summary</span>
          </div>
          <textarea 
            class="notes-summary-textarea" 
            data-chapter="${escapeHtml(chapter)}"
            placeholder="Summarize your key takeaways from this chapter..."
            spellcheck="true"
          >${escapeHtml(conclusion)}</textarea>
        </div>
      </div>
    `;
  });
  
  // Render freeform notes at the end
  if (freeformNotes.length > 0) {
    html += `
      <div class="notes-chapter notes-general-section">
        <div class="notes-chapter-header">
          <h3 class="notes-chapter-title">
            <i class="fas fa-sticky-note"></i>
            General Notes
          </h3>
          <span class="notes-chapter-count">${freeformNotes.length} note${freeformNotes.length !== 1 ? 's' : ''}</span>
        </div>
        
        ${freeformNotes.map(entry => `
          <div class="notes-freeform-entry" data-entry-id="${entry.id}">
            <textarea 
              class="notes-freeform-textarea" 
              data-entry-id="${entry.id}"
              placeholder="Write your note..."
              spellcheck="true"
            >${escapeHtml(entry.content)}</textarea>
            <div class="notes-entry-footer">
              <span class="notes-entry-date">
                <i class="fas fa-clock"></i>
                ${formatDate(entry.createdAt)}
              </span>
              <button class="notes-delete-btn" data-entry-id="${entry.id}" title="Delete note">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  contentDiv.innerHTML = html;
  
  // Add event listeners for interactivity
  attachNotesEventListeners(contentDiv, book.path);
}

// Attach event listeners to notes content
function attachNotesEventListeners(container, bookPath) {
  // Click on quote to navigate to book location (EPUB)
  container.querySelectorAll('.notes-entry-quote').forEach(el => {
    el.addEventListener('click', () => {
      const cfi = el.dataset.cfi;
      if (cfi) {
        navigateToQuoteInBook(bookPath, cfi);
      }
    });
  });
  
  // Click on page link to navigate to PDF page
  container.querySelectorAll('.notes-pdf-page-link').forEach(el => {
    el.addEventListener('click', () => {
      const page = parseInt(el.dataset.page);
      if (page) {
        navigateToPdfPage(bookPath, page);
      }
    });
  });
  
  // Auto-save quote comments on blur
  container.querySelectorAll('.notes-textarea').forEach(textarea => {
    let originalValue = textarea.value;
    
    textarea.addEventListener('focus', () => {
      originalValue = textarea.value;
      textarea.closest('.notes-entry')?.classList.add('editing');
    });
    
    textarea.addEventListener('blur', () => {
      textarea.closest('.notes-entry')?.classList.remove('editing');
      const newValue = textarea.value.trim();
      if (newValue !== originalValue.trim()) {
        const entryId = parseInt(textarea.dataset.entryId);
        updateQuoteComment(bookPath, entryId, newValue);
      }
    });
    
    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
    
    // Initial resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
  });
  
  // Auto-save chapter summaries on blur
  container.querySelectorAll('.notes-summary-textarea').forEach(textarea => {
    let originalValue = textarea.value;
    
    textarea.addEventListener('focus', () => {
      originalValue = textarea.value;
      textarea.closest('.notes-chapter-summary')?.classList.add('editing');
    });
    
    textarea.addEventListener('blur', () => {
      textarea.closest('.notes-chapter-summary')?.classList.remove('editing');
      const newValue = textarea.value.trim();
      if (newValue !== originalValue.trim()) {
        const chapter = textarea.dataset.chapter;
        updateChapterConclusion(bookPath, chapter, newValue);
      }
    });
    
    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
    
    // Initial resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(36, textarea.scrollHeight) + 'px';
  });
  
  // Auto-save freeform notes on blur
  container.querySelectorAll('.notes-freeform-textarea').forEach(textarea => {
    let originalValue = textarea.value;
    
    textarea.addEventListener('focus', () => {
      originalValue = textarea.value;
      textarea.closest('.notes-freeform-entry')?.classList.add('editing');
    });
    
    textarea.addEventListener('blur', () => {
      textarea.closest('.notes-freeform-entry')?.classList.remove('editing');
      const newValue = textarea.value.trim();
      if (newValue !== originalValue.trim()) {
        const entryId = parseInt(textarea.dataset.entryId);
        updateFreeformNote(bookPath, entryId, newValue);
      }
    });
    
    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
    
    // Initial resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
  });
  
  // Delete entry buttons
  container.querySelectorAll('.notes-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const entryId = parseInt(btn.dataset.entryId);
      if (confirm('Delete this entry?')) {
        await deleteNoteEntry(bookPath, entryId);
      }
    });
  });
}

// Update freeform note content
function updateFreeformNote(bookPath, entryId, content) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  const entry = book.notes.entries.find(e => e.id === entryId);
  if (entry) {
    entry.content = content;
    book.notes.lastModified = Date.now();
    window.electronAPI.addToLibrary(book);
  }
}

// Scroll notes panel to a specific chapter
function scrollNotesToChapter(chapterLabel) {
  // Only do this if notes are open
  if (!notesViewerSlot) return;
  
  const viewer = notesViewerSlot === 1 ? viewer1El : viewer2El;
  const notesContent = viewer.querySelector('.notes-content');
  if (!notesContent) return;
  
  // Find the chapter section with matching name
  const chapterSections = notesContent.querySelectorAll('.notes-chapter[data-chapter]');
  for (const section of chapterSections) {
    const sectionChapter = section.dataset.chapter;
    // Check if chapter names match (case-insensitive, trimmed)
    if (sectionChapter && sectionChapter.trim().toLowerCase() === chapterLabel.trim().toLowerCase()) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Brief highlight effect
      section.style.boxShadow = '0 0 0 2px var(--accent)';
      setTimeout(() => {
        section.style.boxShadow = '';
      }, 1500);
      return;
    }
  }
}

// Navigate to a quote's location in the book
async function navigateToQuoteInBook(bookPath, cfi) {
  // If book is in viewer 1, just navigate
  if (currentBookPath1 === bookPath && rendition1) {
    try {
      await rendition1.display(cfi);
      showToast("Navigated to quote location");
    } catch (err) {
      console.warn("Could not navigate to CFI:", err);
    }
  } else {
    // Open the book in viewer 1 then navigate
    await openBookWithTransition(bookPath, 1);
    // Wait for book to render
    setTimeout(async () => {
      if (rendition1) {
        try {
          await rendition1.display(cfi);
          showToast("Navigated to quote location");
        } catch (err) {
          console.warn("Could not navigate to CFI:", err);
        }
      }
    }, 800);
  }
}

// Navigate to a PDF page from notes viewer
async function navigateToPdfPage(bookPath, page) {
  // If book is in viewer 1 as PDF, just navigate
  if (currentBookPath1 === bookPath && viewerType1 === 'pdf' && pdf1) {
    pdfPage1 = page; // Set the page first
    if (pdfViewMode === 'scroll') {
      scrollToPage(1, page);
    } else {
      await renderPdfPage(1);
    }
    savePdfProgress(1);
    showToast("Navigated to page " + page);
  } else {
    // Open the PDF in viewer 1 then navigate
    await openBookWithTransition(bookPath, 1);
    // Wait for PDF to load
    setTimeout(async () => {
      if (viewerType1 === 'pdf' && pdf1) {
        pdfPage1 = page; // Set the page first
        if (pdfViewMode === 'scroll') {
          scrollToPage(1, page);
        } else {
          await renderPdfPage(1);
        }
        savePdfProgress(1);
        showToast("Navigated to page " + page);
      }
    }, 800);
  }
}

// Format date helper
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Prompt functions for editing
function showEditCommentPrompt(bookPath, entryId, currentComment) {
  const newComment = prompt('Your thoughts on this quote:', currentComment);
  if (newComment !== null) {
    updateQuoteComment(bookPath, entryId, newComment.trim());
  }
}

function showEditConclusionPrompt(bookPath, chapter, currentConclusion) {
  const newConclusion = prompt('Chapter takeaways:', currentConclusion);
  if (newConclusion !== null) {
    updateChapterConclusion(bookPath, chapter, newConclusion.trim());
  }
}

function showAddFreeformNotePrompt(bookPath) {
  const content = prompt('Add a general note:');
  if (content && content.trim()) {
    addFreeformNote(bookPath, content.trim());
  }
}

function showEditFreeformPrompt(bookPath, entryId, currentContent) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  const newContent = prompt('Edit note:', currentContent);
  if (newContent !== null) {
    const entry = book.notes.entries.find(e => e.id === entryId);
    if (entry) {
      entry.content = newContent.trim();
      book.notes.lastModified = Date.now();
      window.electronAPI.addToLibrary(book);
      
      if (notesViewerSlot && notesViewerBookPath === bookPath) {
        renderNotesContent(book, notesViewerSlot);
      }
    }
  }
}

// Export book notes to markdown (for Obsidian)
async function exportBookNotesMarkdown(bookPath) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries || book.notes.entries.length === 0) {
    alert("No notes to export.");
    return;
  }
  
  // Group entries by chapter
  const byChapter = {};
  const freeformNotes = [];
  
  book.notes.entries.forEach(entry => {
    if (entry.type === 'freeform') {
      freeformNotes.push(entry);
    } else {
      const chapter = entry.chapter || 'Unknown Chapter';
      if (!byChapter[chapter]) {
        byChapter[chapter] = [];
      }
      byChapter[chapter].push(entry);
    }
  });
  
  // Build markdown
  const title = book.title || 'Book Notes';
  const author = book.author || 'Unknown Author';
  const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let markdown = `---
title: "${title}"
author: "${author}"
exported: "${exportDate}"
type: book-notes
---

# ${title}
${author ? `*By ${author}*` : ''}

---

`;
  
  // Sort chapters by first entry's CFI position (book order)
  const sortedChapters = Object.entries(byChapter).sort((a, b) => {
    const aEntries = a[1].filter(e => e.cfi).sort((e1, e2) => compareCFI(e1.cfi, e2.cfi));
    const bEntries = b[1].filter(e => e.cfi).sort((e1, e2) => compareCFI(e1.cfi, e2.cfi));
    
    if (aEntries.length === 0 && bEntries.length === 0) return 0;
    if (aEntries.length === 0) return 1;
    if (bEntries.length === 0) return -1;
    
    return compareCFI(aEntries[0].cfi, bEntries[0].cfi);
  });
  
  // Render each chapter
  for (const [chapter, entries] of sortedChapters) {
    // Sort entries by CFI position (book order)
    entries.sort((a, b) => {
      if (a.cfi && b.cfi) {
        return compareCFI(a.cfi, b.cfi);
      }
      if (a.cfi && !b.cfi) return -1;
      if (!a.cfi && b.cfi) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    
    markdown += `## ${chapter}\n\n`;
    
    for (const entry of entries) {
      markdown += `> ${entry.text}\n\n`;
      if (entry.comment) {
        markdown += `${entry.comment}\n\n`;
      }
    }
    
    // Add chapter conclusion if exists
    const conclusion = book.notes.chapterConclusions?.[chapter];
    if (conclusion) {
      markdown += `### 💡 Chapter Takeaways\n\n${conclusion}\n\n`;
    }
    
    markdown += `---\n\n`;
  }
  
  // Add freeform notes
  if (freeformNotes.length > 0) {
    markdown += `## General Notes\n\n`;
    for (const note of freeformNotes) {
      markdown += `- ${note.content}\n`;
    }
    markdown += '\n';
  }
  
  // Stats footer
  const quoteCount = book.notes.entries.filter(e => e.type === 'quote').length;
  const commentCount = book.notes.entries.filter(e => e.type === 'quote' && e.comment).length;
  markdown += `---\n*${quoteCount} quotes • ${commentCount} comments • ${Object.keys(byChapter).length} chapters*\n`;
  
  try {
    const result = await window.electronAPI.exportNotesMarkdown(title + ' - Notes', markdown);
    if (result.success) {
      showToast(`Notes exported to: ${result.path}`);
    } else if (result.error !== 'canceled') {
      alert(`Failed to export notes: ${result.error}`);
    }
  } catch (err) {
    console.error("Export notes failed:", err);
    alert("Failed to export notes. Please try again.");
  }
}

// Export book notes to PDF
async function exportBookNotesPdf(bookPath) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries || book.notes.entries.length === 0) {
    alert("No notes to export.");
    return;
  }
  
  // Group entries by chapter
  const byChapter = {};
  const freeformNotes = [];
  
  book.notes.entries.forEach(entry => {
    if (entry.type === 'freeform') {
      freeformNotes.push(entry);
    } else {
      const chapter = entry.chapter || 'Unknown Chapter';
      if (!byChapter[chapter]) {
        byChapter[chapter] = [];
      }
      byChapter[chapter].push(entry);
    }
  });
  
  // Build HTML for PDF
  const title = book.title || 'Book Notes';
  const author = book.author || 'Unknown Author';
  const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let html = `
    <style>
      body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
      h1 { font-size: 28px; margin-bottom: 5px; color: #1a1a1a; }
      .author { font-style: italic; color: #666; margin-bottom: 10px; }
      .date { font-size: 12px; color: #999; margin-bottom: 30px; }
      hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
      h2 { font-size: 20px; color: #2c3e50; margin-top: 30px; margin-bottom: 15px; }
      .quote { background: #f8f9fa; border-left: 3px solid #6c5ce7; padding: 12px 16px; margin: 15px 0; font-style: italic; }
      .comment { margin: 10px 0 20px 20px; color: #444; }
      .takeaways { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
      .takeaways h3 { font-size: 14px; margin: 0 0 10px 0; color: #856404; }
      .stats { font-size: 12px; color: #888; text-align: center; margin-top: 40px; }
    </style>
    <h1>${escapeHtml(title)}</h1>
    ${author ? `<p class="author">By ${escapeHtml(author)}</p>` : ''}
    <p class="date">Exported: ${exportDate}</p>
    <hr>
  `;
  
  // Sort chapters by first entry's CFI position (book order)
  const sortedChapters = Object.entries(byChapter).sort((a, b) => {
    const aEntries = a[1].filter(e => e.cfi).sort((e1, e2) => compareCFI(e1.cfi, e2.cfi));
    const bEntries = b[1].filter(e => e.cfi).sort((e1, e2) => compareCFI(e1.cfi, e2.cfi));
    
    if (aEntries.length === 0 && bEntries.length === 0) return 0;
    if (aEntries.length === 0) return 1;
    if (bEntries.length === 0) return -1;
    
    return compareCFI(aEntries[0].cfi, bEntries[0].cfi);
  });
  
  // Render each chapter
  for (const [chapter, entries] of sortedChapters) {
    // Sort entries by CFI position (book order)
    entries.sort((a, b) => {
      if (a.cfi && b.cfi) {
        return compareCFI(a.cfi, b.cfi);
      }
      if (a.cfi && !b.cfi) return -1;
      if (!a.cfi && b.cfi) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    
    html += `<h2>${escapeHtml(chapter)}</h2>`;
    
    for (const entry of entries) {
      html += `<div class="quote">${escapeHtml(entry.text)}</div>`;
      if (entry.comment) {
        html += `<p class="comment">${escapeHtml(entry.comment)}</p>`;
      }
    }
    
    // Add chapter conclusion if exists
    const conclusion = book.notes.chapterConclusions?.[chapter];
    if (conclusion) {
      html += `<div class="takeaways"><h3>💡 Chapter Takeaways</h3>${escapeHtml(conclusion)}</div>`;
    }
    
    html += `<hr>`;
  }
  
  // Add freeform notes
  if (freeformNotes.length > 0) {
    html += `<h2>General Notes</h2><ul>`;
    for (const note of freeformNotes) {
      html += `<li>${escapeHtml(note.content)}</li>`;
    }
    html += `</ul>`;
  }
  
  // Stats footer
  const quoteCount = book.notes.entries.filter(e => e.type === 'quote').length;
  const commentCount = book.notes.entries.filter(e => e.type === 'quote' && e.comment).length;
  html += `<p class="stats">${quoteCount} quotes • ${commentCount} comments • ${Object.keys(byChapter).length} chapters</p>`;
  
  try {
    const result = await window.electronAPI.exportNotesPdf(title + ' - Notes', html);
    if (result) {
      showToast('Notes exported to PDF');
    }
  } catch (err) {
    console.error("Export PDF failed:", err);
    alert("Failed to export PDF. Please try again.");
  }
}

// -------------------------------------------------------
// TTS RESTRICTION - EPUB ONLY
// -------------------------------------------------------
function updateTTSAvailability() {
  if (!voiceControlsWrapper) return;
  
  const isEpub = viewerType1 === 'epub';
  
  if (isEpub) {
    voiceControlsWrapper.classList.remove("disabled");
    voiceControlsWrapper.title = "Voice Options";
  } else {
    voiceControlsWrapper.classList.add("disabled");
    voiceControlsWrapper.title = "TTS available for EPUB only";
  }
}

// -------------------------------------------------------
// CLOSE MODALS - Updated
// -------------------------------------------------------
const searchAnnotationsModal = document.getElementById("search-annotations-modal");

closeModalBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    settingsModal.style.display = "none";
    tagModal.style.display = "none";
    editBookModal.style.display = "none";
    searchModal.style.display = "none";
    bookmarksModal.style.display = "none";
    highlightsModal.style.display = "none";
    noteModal.style.display = "none";
    if (searchAnnotationsModal) searchAnnotationsModal.style.display = "none";
  });
});

window.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.style.display = "none";
  if (e.target === tagModal) tagModal.style.display = "none";
  if (e.target === editBookModal) editBookModal.style.display = "none";
  if (e.target === searchModal) searchModal.style.display = "none";
  if (e.target === bookmarksModal) bookmarksModal.style.display = "none";
  if (e.target === highlightsModal) highlightsModal.style.display = "none";
  if (e.target === noteModal) noteModal.style.display = "none";
  if (searchAnnotationsModal && e.target === searchAnnotationsModal) searchAnnotationsModal.style.display = "none";
});

// -------------------------------------------------------
// KEYBOARD SHORTCUTS SYSTEM
// -------------------------------------------------------

// Check if user is typing in an input field
function isTyping() {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || active.isContentEditable;
}

// Check if any modal is open
function isModalOpen() {
  const modals = [settingsModal, tagModal, editBookModal, searchModal, bookmarksModal, highlightsModal, noteModal];
  return modals.some(m => m && (m.style.display === 'flex' || m.style.display === 'block'));
}

// Check if in reader view
function isInReaderView() {
  return views.reader.style.display !== "none";
}

// Go to page dialog for PDFs
function showGoToPageDialog(slot) {
  const dialog = document.getElementById('goto-page-dialog');
  const input = document.getElementById('goto-page-input');
  const totalSpan = document.getElementById('goto-page-total');
  
  if (!dialog || !input) return;
  
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const currentPage = slot === 1 ? pdfPage1 : pdfPage2;
  
  // Set max and current values
  input.max = totalPages;
  input.value = currentPage;
  totalSpan.textContent = totalPages;
  
  // Store which slot we're navigating
  dialog.dataset.slot = slot;
  
  // Show dialog
  dialog.style.display = 'block';
  
  // Focus and select input
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

function hideGoToPageDialog() {
  const dialog = document.getElementById('goto-page-dialog');
  if (dialog) dialog.style.display = 'none';
}

// Handle Go to page input
document.getElementById('goto-page-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const dialog = document.getElementById('goto-page-dialog');
    const input = document.getElementById('goto-page-input');
    const slot = parseInt(dialog?.dataset.slot) || 1;
    const page = parseInt(input?.value);
    const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
    
    if (page && page >= 1 && page <= totalPages) {
      if (slot === 1) {
        pdfPage1 = page;
        if (pdfViewMode === 'scroll') {
          scrollToPage(1, page);
        } else {
          renderPdfPage(1);
        }
        savePdfProgress(1);
      } else {
        pdfPage2 = page;
        if (pdfViewMode === 'scroll') {
          scrollToPage(2, page);
        } else {
          renderPdfPage(2);
        }
        savePdfProgress(2);
      }
      showToast(`Page ${page}`);
    }
    
    hideGoToPageDialog();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    hideGoToPageDialog();
  }
});

// Close dialog when clicking outside
document.getElementById('goto-page-dialog')?.addEventListener('click', (e) => {
  if (e.target.id === 'goto-page-dialog') {
    hideGoToPageDialog();
  }
});

// Show keyboard shortcuts help
function showKeyboardShortcutsHelp() {
  const shortcuts = `
    <div class="shortcuts-grid">
      <div class="shortcuts-section">
        <h4><i class="fas fa-compass"></i> Navigation</h4>
        <div class="shortcut-row"><kbd>←</kbd> / <kbd>→</kbd><span>Previous / Next page</span></div>
        <div class="shortcut-row"><kbd>Home</kbd><span>Go to beginning</span></div>
        <div class="shortcut-row"><kbd>End</kbd><span>Go to end</span></div>
        <div class="shortcut-row"><kbd>G</kbd><span>Go to page</span></div>
        <div class="shortcut-row"><kbd>Page Up</kbd><span>Previous chapter / -10 pages</span></div>
        <div class="shortcut-row"><kbd>Page Down</kbd><span>Next chapter / +10 pages</span></div>
      </div>
      <div class="shortcuts-section">
        <h4><i class="fas fa-window-restore"></i> Views</h4>
        <div class="shortcut-row"><kbd>L</kbd><span>Library</span></div>
        <div class="shortcut-row"><kbd>T</kbd><span>Table of Contents</span></div>
        <div class="shortcut-row"><kbd>V</kbd><span>Toggle Split View</span></div>
        <div class="shortcut-row"><kbd>1</kbd> / <kbd>2</kbd><span>Focus Viewer 1 / 2</span></div>
      </div>
      <div class="shortcuts-section">
        <h4><i class="fas fa-book-reader"></i> Reading</h4>
        <div class="shortcut-row"><kbd>Ctrl+F</kbd><span>Search in book</span></div>
        <div class="shortcut-row"><kbd>Ctrl+B</kbd><span>Bookmarks</span></div>
        <div class="shortcut-row"><kbd>H</kbd><span>Highlights</span></div>
        <div class="shortcut-row"><kbd>N</kbd><span>Notes viewer</span></div>
        <div class="shortcut-row"><kbd>Space</kbd><span>Play/Pause TTS</span></div>
        <div class="shortcut-row"><kbd>Ctrl+C</kbd><span>Copy selected text</span></div>
      </div>
      <div class="shortcuts-section">
        <h4><i class="fas fa-search-plus"></i> Zoom (PDF)</h4>
        <div class="shortcut-row"><kbd>+</kbd> / <kbd>=</kbd><span>Zoom in</span></div>
        <div class="shortcut-row"><kbd>-</kbd><span>Zoom out</span></div>
        <div class="shortcut-row"><kbd>0</kbd><span>Fit to width</span></div>
      </div>
      <div class="shortcuts-section">
        <h4><i class="fas fa-cog"></i> General</h4>
        <div class="shortcut-row"><kbd>S</kbd><span>Settings</span></div>
        <div class="shortcut-row"><kbd>Esc</kbd><span>Close modals</span></div>
        <div class="shortcut-row"><kbd>?</kbd> / <kbd>F1</kbd><span>Show this help</span></div>
      </div>
    </div>
  `;
  
  // Create or update shortcuts modal
  let shortcutsModal = document.getElementById('shortcuts-modal');
  if (!shortcutsModal) {
    shortcutsModal = document.createElement('div');
    shortcutsModal.id = 'shortcuts-modal';
    shortcutsModal.className = 'modal';
    shortcutsModal.innerHTML = `
      <div class="modal-content shortcuts-modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body shortcuts-body">
          ${shortcuts}
        </div>
      </div>
    `;
    document.body.appendChild(shortcutsModal);
    
    shortcutsModal.querySelector('.close-modal').addEventListener('click', () => {
      shortcutsModal.style.display = 'none';
    });
    
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) shortcutsModal.style.display = 'none';
    });
  }
  
  shortcutsModal.style.display = 'flex';
}

// Main keyboard shortcut handler
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  
  // Escape - always works to close modals
  if (e.key === "Escape") {
    hideHighlightTooltip();
    hidePdfHighlightTooltip();
    hideHighlightContextMenu();
    hidePdfHighlightContextMenu();
    hideGoToPageDialog();
    settingsModal.style.display = "none";
    searchModal.style.display = "none";
    bookmarksModal.style.display = "none";
    highlightsModal.style.display = "none";
    noteModal.style.display = "none";
    document.getElementById('shortcuts-modal')?.style && (document.getElementById('shortcuts-modal').style.display = 'none');
    return;
  }
  
  // Don't process shortcuts when typing in input fields (except Escape, Ctrl combos, ?, and F1)
  if (isTyping() && !ctrl && e.key !== '?' && e.key !== 'F1') return;
  
  // ? or F1 - Show shortcuts help (works anytime except when typing)
  if ((e.key === '?' || e.key === 'F1') && !isTyping()) {
    e.preventDefault();
    showKeyboardShortcutsHelp();
    return;
  }
  
  // =============== CTRL/CMD SHORTCUTS ===============
  if (ctrl) {
    switch (key) {
      case 'f': // Search
        if (isInReaderView()) {
          e.preventDefault();
          searchBtn?.click();
        }
        break;
      case 'b': // Bookmarks
        if (isInReaderView()) {
          e.preventDefault();
          bookmarkBtn?.click();
        }
        break;
      case 'g': // Go to page (alternative)
        if (isInReaderView() && viewerType1 === 'pdf') {
          e.preventDefault();
          showGoToPageDialog(1);
        }
        break;
    }
    return;
  }
  
  // =============== SINGLE KEY SHORTCUTS (only when not in modal) ===============
  if (isModalOpen()) return;
  
  // =============== READER VIEW SHORTCUTS ===============
  if (isInReaderView()) {
    switch (key) {
      // Navigation
      case 'home':
        e.preventDefault();
        if (viewerType1 === 'pdf') {
          pdfPage1 = 1;
          if (pdfViewMode === 'scroll') scrollToPage(1, 1);
          else renderPdfPage(1);
          savePdfProgress(1);
        } else if (rendition1) {
          rendition1.display(0);
        }
        break;
        
      case 'end':
        e.preventDefault();
        if (viewerType1 === 'pdf') {
          pdfPage1 = pdfTotalPages1;
          if (pdfViewMode === 'scroll') scrollToPage(1, pdfTotalPages1);
          else renderPdfPage(1);
          savePdfProgress(1);
        } else if (book1?.spine) {
          const lastItem = book1.spine.last();
          if (lastItem) rendition1.display(lastItem.href);
        }
        break;
        
      case 'pageup':
        e.preventDefault();
        if (viewerType1 === 'pdf') {
          pdfPage1 = Math.max(1, pdfPage1 - 10);
          if (pdfViewMode === 'scroll') scrollToPage(1, pdfPage1);
          else renderPdfPage(1);
          savePdfProgress(1);
        } else if (rendition1) {
          // Previous chapter - find current chapter and go to previous
          const loc = rendition1.currentLocation();
          if (loc?.start?.href && book1?.spine) {
            const currentIndex = book1.spine.spineItems.findIndex(item => loc.start.href.includes(item.href));
            if (currentIndex > 0) {
              rendition1.display(book1.spine.spineItems[currentIndex - 1].href);
            }
          }
        }
        break;
        
      case 'pagedown':
        e.preventDefault();
        if (viewerType1 === 'pdf') {
          pdfPage1 = Math.min(pdfTotalPages1, pdfPage1 + 10);
          if (pdfViewMode === 'scroll') scrollToPage(1, pdfPage1);
          else renderPdfPage(1);
          savePdfProgress(1);
        } else if (rendition1) {
          // Next chapter
          const loc = rendition1.currentLocation();
          if (loc?.start?.href && book1?.spine) {
            const currentIndex = book1.spine.spineItems.findIndex(item => loc.start.href.includes(item.href));
            if (currentIndex < book1.spine.spineItems.length - 1) {
              rendition1.display(book1.spine.spineItems[currentIndex + 1].href);
            }
          }
        }
        break;
        
      case 'g': // Go to page
        e.preventDefault();
        if (viewerType1 === 'pdf') {
          showGoToPageDialog(1);
        }
        break;
        
      // Views
      case 't': // Table of contents / sidebar
        e.preventDefault();
        document.getElementById('sidebar-toggle-bottom')?.click();
        break;
        
      case 'v': // Split view
        e.preventDefault();
        splitBtn?.click();
        break;
        
      case '1': // Focus viewer 1
        e.preventDefault();
        focusedSlot = 1;
        updateFocusUI();
        break;
        
      case '2': // Focus viewer 2
        e.preventDefault();
        if (viewersContainer.classList.contains('split-mode')) {
          focusedSlot = 2;
          updateFocusUI();
        }
        break;
        
      // Reading features
      case 'h': // Highlights
        e.preventDefault();
        highlightsBtn?.click();
        break;
        
      case 'n': // Notes viewer
        e.preventDefault();
        if (currentBookPath1) {
          if (viewersContainer.classList.contains('split-mode')) {
            openNotesViewer(currentBookPath1, 2);
          } else {
            // Toggle split view and open notes
            splitBtn?.click();
            setTimeout(() => openNotesViewer(currentBookPath1, 2), 100);
          }
        }
        break;
        
      case ' ': // Space - Play/Pause TTS
        e.preventDefault();
        document.getElementById('speakBtn')?.click();
        break;
        
      // PDF Zoom
      case '+':
      case '=':
        if (viewerType1 === 'pdf' && pdfViewMode === 'scroll') {
          e.preventDefault();
          document.getElementById('zoom-in-1')?.click();
        }
        break;
        
      case '-':
        if (viewerType1 === 'pdf' && pdfViewMode === 'scroll') {
          e.preventDefault();
          document.getElementById('zoom-out-1')?.click();
        }
        break;
        
      case '0':
        if (viewerType1 === 'pdf' && pdfViewMode === 'scroll') {
          e.preventDefault();
          document.getElementById('zoom-fit-1')?.click();
        }
        break;
    }
  }
  
  // =============== GLOBAL SHORTCUTS ===============
  switch (key) {
    case 'l': // Library
      e.preventDefault();
      if (isInReaderView()) {
        switchView('library');
      } else {
        // If already in library, do nothing or maybe focus search
      }
      break;
      
    case 's': // Settings (only when not in modal or typing)
      if (!isTyping()) {
        e.preventDefault();
        document.getElementById('settings-btn-bottom')?.click();
      }
      break;
  }
});

// Hide highlight tooltip and context menu when clicking elsewhere
document.addEventListener("mousedown", (e) => {
  // Don't hide if clicking on the tooltip itself
  if (e.target.closest(".highlight-tooltip")) return;
  if (e.target.closest(".pdf-highlight-tooltip")) return;
  
  // Don't hide context menu if clicking on it
  if (e.target.closest(".highlight-context-menu")) return;
  
  // Don't hide if clicking in a modal (note modal needs pendingHighlight)
  if (e.target.closest(".modal")) return;
  
  // Don't immediately hide tooltip if clicking in the viewer (selection might be happening)
  // But DO hide context menu since we're clicking elsewhere
  if (e.target.closest("#viewer") || e.target.closest("#viewer-2")) {
    hideHighlightContextMenu();
    return;
  }
  
  // Don't hide tooltip if clicking in PDF text layer (selection might be happening)
  if (e.target.closest(".pdf-text-layer")) {
    hideHighlightContextMenu();
    hidePdfHighlightContextMenu();
    return;
  }
  
  // Hide if clicking elsewhere
  hideHighlightTooltip();
  hidePdfHighlightTooltip();
  hideHighlightContextMenu();
  hidePdfHighlightContextMenu();
});

// Handle window resize for PDF and EPUB
let resizeTimeout = null;
window.addEventListener('resize', () => {
  // Debounce resize handling
  if (resizeTimeout) clearTimeout(resizeTimeout);
  
  resizeTimeout = setTimeout(() => {
    // Don't re-render if user is selecting text
    if (isPdfTextSelecting) return;
    
    // Handle PDF resize
    if (viewerType1 === 'pdf') renderPdfPage(1);
    if (viewerType2 === 'pdf') renderPdfPage(2);
    
    // Handle EPUB resize - recalculate TTS highlighting if active and re-apply highlights
    if (viewerType1 === 'epub' && rendition1) {
      rendition1.resize();
      // Re-apply highlights after window resize
      if (currentBookPath1) {
        setTimeout(() => {
          loadHighlightsForBook(currentBookPath1);
        }, 250);
      }
    }
    
    if (viewerType2 === 'epub' && rendition2) {
      rendition2.resize();
    }
    
    hideHighlightTooltip();
  }, 150);
});

// Detect PDF text selection to prevent re-rendering during selection
let pdfSelectionTimeout = null;

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    // Check if selection is within a PDF text layer
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (anchorNode || focusNode) {
      const anchorInPdf = anchorNode?.parentElement?.closest('.pdf-text-layer');
      const focusInPdf = focusNode?.parentElement?.closest('.pdf-text-layer');
      if (anchorInPdf || focusInPdf) {
        isPdfTextSelecting = true;
        // Reset the timeout each time selection changes
        if (pdfSelectionTimeout) clearTimeout(pdfSelectionTimeout);
        pdfSelectionTimeout = setTimeout(() => {
          isPdfTextSelecting = false;
        }, 2000); // Keep flag active for 2 seconds after last selection change
      }
    }
  }
});

document.addEventListener('mouseup', (e) => {
  // Clear selection flag after mouse up with a longer delay
  if (pdfSelectionTimeout) clearTimeout(pdfSelectionTimeout);
  pdfSelectionTimeout = setTimeout(() => {
    isPdfTextSelecting = false;
  }, 1000);
  
  // Check for PDF text selection to show highlight tooltip
  if (e.target.closest('.pdf-text-layer')) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      handlePdfTextSelection(e);
    }, 50);
  }
});

// Handle PDF text selection and show highlight tooltip
function handlePdfTextSelection(e) {
  // Determine which slot the selection is in
  let slot = 1;
  const textLayer = e.target.closest('.pdf-text-layer');
  if (textLayer) {
    if (textLayer.id === 'pdf-text-layer-2' || textLayer.closest('#pdf-container-2') || textLayer.closest('#pdf-scroll-2')) {
      slot = 2;
    }
  }
  
  // Capture selection
  const selectionData = capturePdfSelection(slot);
  if (!selectionData) return;
  
  // Store in pendingHighlight
  pendingHighlight = {
    isPdfHighlight: true,
    slot: slot,
    selectionData: selectionData,
    editMode: false
  };
  
  // Get selection position for tooltip
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Position tooltip above selection - use PDF-specific tooltip
  const tooltipX = rect.left + rect.width / 2;
  const tooltipY = rect.top;
  
  showPdfHighlightTooltip(tooltipX, tooltipY);
}

// Show PDF highlight tooltip (simpler version)
function showPdfHighlightTooltip(x, y) {
  if (!pdfHighlightTooltip) return;
  
  // Reset styles
  pdfHighlightTooltip.style.transform = "";
  pdfHighlightTooltip.style.marginTop = "";
  
  // Position tooltip above selection
  pdfHighlightTooltip.style.left = `${x}px`;
  pdfHighlightTooltip.style.top = `${y}px`;
  pdfHighlightTooltip.style.display = "flex";
  
  // Re-trigger animation
  pdfHighlightTooltip.style.animation = 'none';
  void pdfHighlightTooltip.offsetHeight;
  pdfHighlightTooltip.style.animation = '';
  
  // Adjust position if off-screen
  requestAnimationFrame(() => {
    const rect = pdfHighlightTooltip.getBoundingClientRect();
    let newX = x;
    let newY = y;
    
    if (rect.left < 10) {
      newX = 10 + rect.width / 2;
    } else if (rect.right > window.innerWidth - 10) {
      newX = window.innerWidth - 10 - rect.width / 2;
    }
    
    if (rect.top < 10) {
      pdfHighlightTooltip.style.transform = "translate(-50%, 10px)";
      pdfHighlightTooltip.style.marginTop = "0";
      newY = y + 25;
    }
    
    pdfHighlightTooltip.style.left = `${newX}px`;
    pdfHighlightTooltip.style.top = `${newY}px`;
  });
}

function hidePdfHighlightTooltip() {
  if (pdfHighlightTooltip) {
    pdfHighlightTooltip.style.display = "none";
    pdfHighlightTooltip.style.transform = "";
    pdfHighlightTooltip.style.marginTop = "";
  }
}

// PDF highlight tooltip color buttons
pdfHighlightTooltip?.querySelectorAll(".pdf-hl-color").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!pendingHighlight || !pendingHighlight.isPdfHighlight) return;
    
    const color = btn.dataset.color;
    await createPdfHighlight(pendingHighlight.slot, pendingHighlight.selectionData, color);
    hidePdfHighlightTooltip();
    pendingHighlight = null;
  });
});

// PDF copy text button
document.getElementById("pdfCopyTextBtn")?.addEventListener("click", async () => {
  if (!pendingHighlight || !pendingHighlight.selectionData) return;
  
  try {
    await navigator.clipboard.writeText(pendingHighlight.selectionData.text);
    showToast("Text copied to clipboard");
    hidePdfHighlightTooltip();
    window.getSelection()?.removeAllRanges();
    pendingHighlight = null;
  } catch (err) {
    console.error("Failed to copy:", err);
  }
});

// Delete all highlights on current page
async function deletePageHighlights(slot) {
  const bookPath = slot === 1 ? currentBookPath1 : currentBookPath2;
  const pageNum = slot === 1 ? pdfPage1 : pdfPage2;
  
  const book = library.find(b => b.path === bookPath);
  if (!book?.notes?.entries) return;
  
  // In spread mode, also include the right page
  const isSplitMode = viewersContainer.classList.contains("split-mode");
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const pagesToDelete = [pageNum];
  if (!isSplitMode && pageNum + 1 <= totalPages) {
    pagesToDelete.push(pageNum + 1);
  }
  
  // Count highlights to delete
  const highlightsToDelete = book.notes.entries.filter(
    e => e.type === 'pdf-highlight' && pagesToDelete.includes(e.page)
  );
  
  if (highlightsToDelete.length === 0) {
    showToast("No highlights on this page");
    return;
  }
  
  // Confirm deletion
  const pageLabel = pagesToDelete.length > 1 ? `pages ${pagesToDelete.join(' & ')}` : `page ${pageNum}`;
  if (!confirm(`Delete ${highlightsToDelete.length} highlight(s) on ${pageLabel}?`)) {
    return;
  }
  
  // Remove highlights
  book.notes.entries = book.notes.entries.filter(
    e => !(e.type === 'pdf-highlight' && pagesToDelete.includes(e.page))
  );
  book.notes.lastModified = Date.now();
  await window.electronAPI.addToLibrary(book);
  
  // Re-render
  if (pdfViewMode === 'scroll') {
    const scrollContent = slot === 1 ? pdfScrollContent1 : pdfScrollContent2;
    pagesToDelete.forEach(p => {
      const pageEl = scrollContent?.querySelector(`[data-page-num="${p}"]`);
      if (pageEl) renderPdfHighlightsForScrollPage(slot, p, pageEl);
    });
  } else {
    renderPdfHighlightsForPage(slot, pageNum, pagesToDelete.length > 1 ? pagesToDelete[1] : null);
  }
  
  renderLibrary();
  showToast(`Deleted ${highlightsToDelete.length} highlight(s)`);
}

document.addEventListener('mousedown', (e) => {
  // If clicking in PDF text layer, set selection flag
  if (e.target.closest('.pdf-text-layer')) {
    isPdfTextSelecting = true;
    // Clear any pending timeout
    if (pdfSelectionTimeout) clearTimeout(pdfSelectionTimeout);
  }
});

