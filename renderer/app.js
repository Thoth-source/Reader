console.log("App.js loaded");

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
let book1, rendition1;
let book2, rendition2;
let pdf1, pdf2; // PDF document instances
let pdfPage1 = 1, pdfPage2 = 1; // Current PDF pages
let pdfTotalPages1 = 0, pdfTotalPages2 = 0;
let viewerType1 = null; // 'epub' or 'pdf'
let viewerType2 = null;
let isPlaying = false;
let currentAudio = null;
let targetSlot = 1;
let focusedSlot = 1;
let currentFilter = 'all';
let currentSort = 'recent';
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
const viewerWrapper1 = document.getElementById("viewer-wrapper-1");
const viewerWrapper2 = document.getElementById("viewer-wrapper-2");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle-bottom");
const sidebar2 = document.getElementById("toc-2");
const loadBook2Btn = document.getElementById("load-book-2-btn");
const viewer2SelectBtn = document.getElementById("viewer-2-select-btn");
const viewersContainer = document.getElementById("viewers-container");

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

// TTS Elements
const speakBtn = document.getElementById("speakBtn");

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
}

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
  
  applyReaderSettings();
  settingsModal.style.display = "none";
});

function applyReaderSettings() {
  const fontSize = localStorage.getItem("reader_font_size") || "100";
  const margin = localStorage.getItem("reader_margin") || "50";
  
  document.querySelectorAll(".epub-viewer").forEach(el => {
    el.style.padding = `0 ${margin}px`;
  });
  
  // Apply to epub.js renditions if available
  if (rendition1) {
    rendition1.themes.fontSize(`${fontSize}%`);
  }
  if (rendition2) {
    rendition2.themes.fontSize(`${fontSize}%`);
  }
}

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
}

function renderCurrentTags() {
  const book = library.find(b => b.path === editingBookPath);
  if (!book || !currentTagsContainer) return;
  
  const tags = book.tags || [];
  currentTagsContainer.innerHTML = tags.length === 0 
    ? '<span style="color: var(--text-muted); font-size: 13px;">No tags yet</span>'
    : tags.map(tag => `
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
splitBtn?.addEventListener("click", () => {
  const isHidden = viewerWrapper2.classList.contains("hidden");
  if (isHidden) {
    viewerWrapper2.classList.remove("hidden");
    sidebar2.classList.remove("hidden");
    viewersContainer.classList.add("split-mode");
    splitBtn.classList.add("active");
    
    // If viewer 2 is empty, set target slot to 2 for next book selection
    if (!book2 && !pdf2) {
      targetSlot = 2;
    }
    
    if (views.reader.style.display === "none") switchView("reader");
    setTimeout(() => {
      if (rendition1) rendition1.resize();
      if (rendition2) rendition2.resize();
      if (viewerType1 === 'pdf') renderPdfPage(1);
      if (viewerType2 === 'pdf') renderPdfPage(2);
    }, 100);
  } else {
    viewerWrapper2.classList.add("hidden");
    sidebar2.classList.add("hidden");
    viewersContainer.classList.remove("split-mode");
    splitBtn.classList.remove("active");
    setTimeout(() => {
      if (rendition1) rendition1.resize();
      if (viewerType1 === 'pdf') renderPdfPage(1);
    }, 100);
    
    focusedSlot = 1;
    updateFocusUI();
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
  const pageNum = slot === 1 ? pdfPage1 : pdfPage2;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  
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
    library = await window.electronAPI.getLibrary();
    if (!Array.isArray(library)) library = [];
  } catch (err) {
    console.error("Failed to load library:", err);
    library = [];
  }
  renderLibrary();
  renderRecentlyRead();
  updateFilterTags();
}

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
  
  // Apply filter
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
    const coverStyle = book.cover 
      ? `background-image: url('${book.cover}');`
      : `background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);`;
    const progress = book.readingProgress?.percentage || 0;
    
    return `
      <div class="recent-book-card" data-path="${book.path}">
        <div class="recent-book-cover" style="${coverStyle}">
          ${progress > 0 ? `<div class="recent-progress-ring" style="--progress: ${progress}">
            <span>${progress}%</span>
          </div>` : ''}
        </div>
        <div class="recent-book-title">${book.title || 'Unknown'}</div>
      </div>
    `;
  }).join('');
  
  recentlyReadScroll.querySelectorAll(".recent-book-card").forEach(card => {
    card.addEventListener("click", () => {
      openBookWithTransition(card.dataset.path, targetSlot);
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
    
    card.innerHTML = `
      <div class="book-card-inner">
        <div class="book-cover" style="${coverStyle}">
          <div class="book-shine"></div>
          <span class="file-type-badge ${fileType}">${fileType}</span>
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
          <div class="option-divider"></div>
          <button class="option-edit"><i class="fas fa-edit"></i> Edit Details</button>
          <button class="option-tags"><i class="fas fa-tags"></i> Manage Tags</button>
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
      
      const rotateX = (y - centerY) / 8;
      const rotateY = (centerX - x) / 8;
      
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

    card.querySelector(".option-open-1").addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      openBookWithTransition(book.path, 1);
    });
    
    card.querySelector(".option-open-2").addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      if (viewerWrapper2.classList.contains("hidden")) splitBtn.click();
      openBookWithTransition(book.path, 2);
    });
    
    card.querySelector(".option-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      openEditBookModal(book.path);
    });
    
    card.querySelector(".option-tags").addEventListener("click", (e) => {
      e.stopPropagation();
      optionsMenu.classList.remove("show");
      openTagModal(book.path);
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

    card.addEventListener("click", (e) => {
      if (e.target.closest(".book-options-btn") || 
          e.target.closest(".book-options-menu") ||
          e.target.closest(".book-tag-btn")) return;
      openBookWithTransition(book.path, targetSlot);
      targetSlot = 1; // Reset after use
    });

    libraryGrid.appendChild(card);
  });
}

function openBookWithTransition(path, slot) {
  const readerPage = document.getElementById("reader-page");
  readerPage.classList.add("page-entering");
  
  openBook(path, slot);
  updateLastRead(path);
  
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

// -------------------------------------------------------
// READER LOGIC
// -------------------------------------------------------
async function openBook(path, slot) {
  try {
    console.log(`Opening book in slot ${slot}: ${path}`);
    
    // Track which book is in which slot
    if (slot === 1) {
      currentBookPath1 = path;
    } else {
      currentBookPath2 = path;
    }
    
    const isPDF = path.toLowerCase().endsWith('.pdf');
    const data = await window.electronAPI.readBook(path);
    
    if (!data) throw new Error("Could not read file (empty response)");

    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

    if (isPDF) {
      await openPDF(arrayBuffer, slot, path);
    } else {
      await openEPUB(arrayBuffer, slot, path);
    }

    switchView("reader");
    applyReaderSettings();
  } catch (err) {
    console.error("Error opening book:", err);
    alert("Failed to open book: " + err.message);
  }
}

async function openEPUB(arrayBuffer, slot, bookPath) {
  // Refresh library to get latest saved positions
  await loadLibrary();
  
  if (slot === 1) {
    if (book1) book1.destroy();
    if (pdf1) { pdf1 = null; pdfCanvas1.style.display = 'none'; }
    viewerType1 = 'epub';
    
    viewer1El.style.display = 'block';
    viewer1El.innerHTML = "";
    document.getElementById("chapters").innerHTML = "";
    document.getElementById("pdf-pages-1").style.display = "none";
    document.getElementById("pdf-pages-1").innerHTML = "";
    
    book1 = ePub(arrayBuffer);
    rendition1 = book1.renderTo("viewer", { 
      width: "100%", 
      height: "100%", 
      flow: "paginated", 
      manager: "default",
      spread: "none"
    });
    
    // Apply custom styles for better footnote/link rendering
    rendition1.themes.default({
      'a': {
        'color': 'inherit !important',
        'text-decoration': 'none !important'
      },
      'a sup, a sub, sup a, sub a': {
        'color': '#5ba4e6 !important',
        'text-decoration': 'none !important'
      },
      'a[href*="note"], a[href*="fn"], a[href*="endnote"], a[epub\\:type="noteref"], a.noteref, a.footnote': {
        'color': '#5ba4e6 !important',
        'text-decoration': 'none !important',
        'font-size': '0.85em',
        'vertical-align': 'super'
      },
      'sup, sub': {
        'font-size': '0.75em'
      },
      'sup a, sub a, a sup, a sub': {
        'color': '#5ba4e6 !important'
      }
    });
    
    // Display from beginning first
    await rendition1.display();
    
    loadTOC(book1, rendition1, "chapters");
    setupRenditionFocus(rendition1, 1);
    setupHighlightSelection(rendition1, 1);
    
    // Restore saved position after initial render
    const savedCfi = getSavedPosition(bookPath);
    if (savedCfi) {
      // Small delay to let the initial render complete
      setTimeout(() => {
        rendition1.display(savedCfi).catch(e => {
          console.warn("Could not restore position:", e);
        });
      }, 300);
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
    if (book2) book2.destroy();
    if (pdf2) { pdf2 = null; pdfCanvas2.style.display = 'none'; }
    viewerType2 = 'epub';
    
    viewer2El.style.display = 'block';
    viewer2El.innerHTML = "";
    document.getElementById("chapters-2").innerHTML = "";
    document.getElementById("pdf-pages-2").style.display = "none";
    document.getElementById("pdf-pages-2").innerHTML = "";
    
    book2 = ePub(arrayBuffer);
    rendition2 = book2.renderTo("viewer-2", { 
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none"
    });
    
    // Apply custom styles for better footnote/link rendering
    rendition2.themes.default({
      'a': {
        'color': 'inherit !important',
        'text-decoration': 'none !important'
      },
      'a sup, a sub, sup a, sub a': {
        'color': '#5ba4e6 !important',
        'text-decoration': 'none !important'
      },
      'a[href*="note"], a[href*="fn"], a[href*="endnote"], a[epub\\:type="noteref"], a.noteref, a.footnote': {
        'color': '#5ba4e6 !important',
        'text-decoration': 'none !important',
        'font-size': '0.85em',
        'vertical-align': 'super'
      },
      'sup, sub': {
        'font-size': '0.75em'
      },
      'sup a, sub a, a sup, a sub': {
        'color': '#5ba4e6 !important'
      }
    });
    
    // Display from beginning first
    await rendition2.display();
    
    loadTOC(book2, rendition2, "chapters-2");
    setupRenditionFocus(rendition2, 2);
    
    // Restore saved position after initial render
    const savedCfi2 = getSavedPosition(bookPath);
    if (savedCfi2) {
      // Small delay to let the initial render complete
      setTimeout(() => {
        rendition2.display(savedCfi2).catch(e => {
          console.warn("Could not restore position:", e);
        });
      }, 300);
    }
    
    // Generate locations in background for progress tracking (non-blocking)
    book2.locations.generate(2048).then(() => {
      setupProgressTracking(rendition2, book2, 2);
    });

    rendition2.on("keyup", (e) => {
      if (e.key === "ArrowLeft") rendition2.prev();
      if (e.key === "ArrowRight") rendition2.next();
    });
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
  
  if (slot === 1) {
    if (book1) { book1.destroy(); book1 = null; rendition1 = null; }
    pdf1 = pdf;
    pdfPage1 = Math.min(savedPage, pdf.numPages);
    pdfTotalPages1 = pdf.numPages;
    viewerType1 = 'pdf';
    
    viewer1El.style.display = 'none';
    pdfCanvas1.style.display = 'block';
    document.getElementById("chapters").innerHTML = "";
    document.getElementById("chapters").style.display = "none";
    
    loadPdfPageList(1);
    await renderPdfPage(1);
    
    // Update TTS availability (disabled for PDF)
    updateTTSAvailability();
    
  } else {
    if (book2) { book2.destroy(); book2 = null; rendition2 = null; }
    pdf2 = pdf;
    pdfPage2 = Math.min(savedPage, pdf.numPages);
    pdfTotalPages2 = pdf.numPages;
    viewerType2 = 'pdf';
    
    viewer2El.style.display = 'none';
    pdfCanvas2.style.display = 'block';
    document.getElementById("chapters-2").innerHTML = "";
    document.getElementById("chapters-2").style.display = "none";
    
    loadPdfPageList(2);
    await renderPdfPage(2);
  }
}

async function renderPdfPage(slot) {
  const pdf = slot === 1 ? pdf1 : pdf2;
  const pageNum = slot === 1 ? pdfPage1 : pdfPage2;
  const totalPages = slot === 1 ? pdfTotalPages1 : pdfTotalPages2;
  const canvas = slot === 1 ? pdfCanvas1 : pdfCanvas2;
  
  if (!pdf || !canvas) return;
  
  const wrapper = canvas.parentElement;
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
    const scale = Math.min(scaleX, scaleY, 1.5);
    
    const scaledViewport = page1.getViewport({ scale });
    const pageWidth = scaledViewport.width;
    const pageHeight = scaledViewport.height;
    const gap = 10;
    
    // Set canvas size for two pages
    canvas.width = pageWidth * 2 + gap;
    canvas.height = pageHeight;
    
    const context = canvas.getContext('2d');
    context.fillStyle = '#f0f0f0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Render left page
    await page1.render({ 
      canvasContext: context, 
      viewport: scaledViewport 
    }).promise;
    
    // Render right page if exists
    const rightPageNum = pageNum + 1;
    if (rightPageNum <= totalPages) {
      const page2 = await pdf.getPage(rightPageNum);
      const viewport2 = page2.getViewport({ scale });
      
      // Offset for right page
      context.save();
      context.translate(pageWidth + gap, 0);
      await page2.render({ 
        canvasContext: context, 
        viewport: viewport2 
      }).promise;
      context.restore();
    }
  } else {
    // Single page view (split mode or single page PDF)
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const scaleX = wrapperWidth / viewport.width;
    const scaleY = wrapperHeight / viewport.height;
    const scale = Math.min(scaleX, scaleY, 2);
    
    const scaledViewport = page.getViewport({ scale });
    
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
  }
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
      if (slot === 1) {
        pdfPage1 = i;
        renderPdfPage(1);
      } else {
        pdfPage2 = i;
        renderPdfPage(2);
      }
    });
    container.appendChild(item);
  }
}

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
        
        li.querySelector(".chapter-title").onclick = () => renditionInstance.display(item.href);
        li.querySelector(".chapter-audio-btn").onclick = (e) => {
          e.stopPropagation();
          playChapterAudio(audioPaths);
        };
      } else {
        li.innerHTML = `<span class="chapter-title">${item.label}</span>`;
        li.onclick = () => renditionInstance.display(item.href);
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
  const contents = renditionInstance.getContents()[0];
  if (!contents) return "";
  return contents.document.body.innerText;
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

async function playChapterTTS(text, key, voice) {
  const chunks = splitTextIntoChunks(text);

  for (const chunk of chunks) {
    if (!isPlaying) break;
    const base64Audio = await window.electronAPI.requestTTS(chunk, key, voice);
    if (!base64Audio) continue;

    await new Promise((resolve) => {
      currentAudio = new Audio("data:audio/mpeg;base64," + base64Audio);
      currentAudio.onended = () => {
        currentAudio = null;
        resolve();
      };
      currentAudio.play();
    });
  }
}

speakBtn?.addEventListener("click", async () => {
  // Close the popup
  voicePopup?.classList.remove("open");
  voiceMenuBtn?.classList.remove("active");
  
  if (viewerType1 !== 'epub' || !rendition1) {
    return alert("Text-to-Speech is only available for EPUB files.");
  }

  const key = document.getElementById("apiKey").value.trim();
  const voice = document.getElementById("voiceSelect").value;

  if (!key) return alert("Please go to Settings to enter your OpenAI API Key.");

  if (isPlaying && currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    isPlaying = false;
    return;
  }

  const text = await getCurrentChapterText(rendition1);
  if (!text) return alert("No text found in current chapter.");

  isPlaying = true;
  try {
    await playChapterTTS(text, key, voice);
  } catch (err) {
    console.error(err);
    alert("TTS Error: " + err.message);
  } finally {
    isPlaying = false;
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
const recordCurrentChapterOnly = document.getElementById("recordSingleChapter");

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
  
  // Get current chapter name
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
  recordCurrentChapterOnly.checked = false;
  
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
  const currentOnly = recordCurrentChapterOnly.checked;
  
  isRecording = true;
  cancelRecording = false;
  
  // Update UI
  recordProgress.style.display = "block";
  startRecordBtn.disabled = true;
  startRecordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
  startRecordBtn.classList.add("recording");
  
  try {
    if (currentOnly) {
      // Record current chapter only
      await recordCurrentChapter(folderPath, apiKey, voice);
    } else {
      // Record all chapters
      await recordAllChapters(folderPath, apiKey, voice);
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
      await new Promise(r => setTimeout(r, 500)); // Wait for render
      
      const text = await getChapterText(book1, chapter.href);
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
    const item = spine.get(href);
    if (!item) return "";
    
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
      <button id="audio-play-pause" title="Play/Pause">
        <i class="fas fa-pause"></i>
      </button>
      <div class="audio-progress-info">
        <span id="audio-part-info">Part 1 of 1</span>
      </div>
      <button id="audio-stop" title="Stop">
        <i class="fas fa-stop"></i>
      </button>
    `;
    document.getElementById("reader-page").appendChild(player);
    
    document.getElementById("audio-play-pause").addEventListener("click", toggleChapterAudioPlayback);
    document.getElementById("audio-stop").addEventListener("click", stopChapterAudio);
  }
  player.classList.add("visible");
  updateAudioPlayerUI();
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
  if (viewerType1 === 'pdf') {
    alert("Search is currently available for EPUB files only.");
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
  if (!query || !book1) return;
  
  searchResultsEl.innerHTML = '<p class="search-placeholder"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';
  searchNav.style.display = "none";
  
  // Get the table of contents for chapter name lookup
  const toc = book1.navigation?.toc || [];
  
  function getChapterNameFromHref(href) {
    // Normalize href for comparison - get just the filename
    const hrefFileName = href.split('/').pop().split('#')[0].toLowerCase();
    
    // Try to find matching chapter in TOC
    for (const chapter of toc) {
      const tocFileName = chapter.href.split('/').pop().split('#')[0].toLowerCase();
      
      // Check various matching conditions
      if (hrefFileName === tocFileName || 
          hrefFileName.includes(tocFileName) || 
          tocFileName.includes(hrefFileName)) {
        return chapter.label.trim();
      }
    }
    
    // Also check nested TOC items (sub-chapters)
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
    
    // If no match, try to make the href more readable
    let readable = hrefFileName
      .replace(/\.x?html?$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/chap(\d+)/i, 'Chapter $1')
      .replace(/ch(\d+)/i, 'Chapter $1')
      .replace(/part(\d+)/i, 'Part $1')
      .replace(/section(\d+)/i, 'Section $1')
      .replace(/index\s*split\s*/i, 'Section ')
      .trim();
    
    // Capitalize first letter of each word
    readable = readable.replace(/\b\w/g, c => c.toUpperCase());
    
    return readable || 'Unknown Section';
  }
  
  try {
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
          
          // Highlight the match in the excerpt
          excerpt = excerpt.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
          
          acc.push({
            cfi: item.cfiFromElement(doc.body),
            href: item.href,
            excerpt: excerpt,
            chapter: chapterName
          });
          
          if (acc.length >= 100) break; // Limit results
        }
      }
      
      item.unload();
      return acc;
    }, Promise.resolve([]));
    
    searchResults = results;
    currentSearchIndex = 0;
    
    if (results.length === 0) {
      searchResultsEl.innerHTML = '<p class="search-placeholder">No results found for "' + query + '"</p>';
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
  if (!result || !rendition1) return;
  
  rendition1.display(result.href);
  searchModal.style.display = "none";
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
  const highlights = book?.highlights || [];
  
  if (highlights.length === 0) {
    highlightsList.innerHTML = '<p class="highlights-placeholder">No highlights yet. Select text while reading to highlight it!</p>';
    return;
  }
  
  highlightsList.innerHTML = highlights.map(hl => `
    <div class="highlight-item" data-id="${hl.id}" style="--highlight-color: ${hl.color}">
      <div class="highlight-text">${hl.text}</div>
      ${hl.note ? `<div class="highlight-note">${hl.note}</div>` : ''}
      <div class="highlight-meta">
        <span class="highlight-chapter">${hl.chapter || 'Unknown chapter'}</span>
        <div class="highlight-actions">
          <button class="edit-highlight" data-id="${hl.id}" title="Edit Note"><i class="fas fa-edit"></i></button>
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
  const highlight = book?.highlights?.find(hl => hl.id === id);
  if (!highlight?.cfi || !rendition1) return;
  
  rendition1.display(highlight.cfi);
  highlightsModal.style.display = "none";
}

async function deleteHighlight(id) {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book?.highlights) return;
  
  const highlight = book.highlights.find(hl => hl.id === id);
  if (highlight && rendition1) {
    // Remove from rendition
    rendition1.annotations.remove(highlight.cfi, "highlight");
  }
  
  book.highlights = book.highlights.filter(hl => hl.id !== id);
  await window.electronAPI.addToLibrary(book);
  renderHighlights();
}

function editHighlightNote(id) {
  const book = library.find(b => b.path === currentBookPath1);
  const highlight = book?.highlights?.find(hl => hl.id === id);
  if (!highlight) return;
  
  pendingHighlight = { ...highlight, editMode: true };
  document.getElementById("notePreviewText").textContent = highlight.text;
  document.getElementById("noteTextarea").value = highlight.note || '';
  
  // Set color
  document.querySelectorAll(".note-color").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === highlight.color);
  });
  selectedHighlightColor = highlight.color;
  
  highlightsModal.style.display = "none";
  noteModal.style.display = "flex";
}

// Text Selection Handler for Highlights
function setupHighlightSelection(rendition, slot) {
  if (slot !== 1) return; // Only handle slot 1 for now
  
  rendition.on("selected", (cfiRange, contents) => {
    if (viewerType1 !== 'epub') return;
    
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
    const iframeRect = iframe.getBoundingClientRect();
    
    // Store pending highlight info
    pendingHighlight = {
      cfi: cfiRange,
      text: text,
      chapter: getCurrentChapterName()
    };
    
    // Position and show tooltip
    const tooltipX = iframeRect.left + rect.left + (rect.width / 2);
    const tooltipY = iframeRect.top + rect.top - 10;
    
    showHighlightTooltip(tooltipX, tooltipY);
  });
  
  // Hide tooltip when clicking elsewhere
  rendition.on("click", () => {
    setTimeout(() => {
      if (!document.querySelector(".highlight-tooltip:hover")) {
        hideHighlightTooltip();
      }
    }, 100);
  });
}

function showHighlightTooltip(x, y) {
  highlightTooltip.style.display = "flex";
  highlightTooltip.style.left = `${x}px`;
  highlightTooltip.style.top = `${y}px`;
  highlightTooltip.style.transform = "translate(-50%, -100%)";
}

function hideHighlightTooltip() {
  highlightTooltip.style.display = "none";
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

// Highlight color buttons
highlightTooltip?.querySelectorAll(".highlight-color").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!pendingHighlight) return;
    
    const color = btn.dataset.color;
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

// Add Note button
document.getElementById("addNoteBtn")?.addEventListener("click", () => {
  if (!pendingHighlight) return;
  
  document.getElementById("notePreviewText").textContent = pendingHighlight.text;
  document.getElementById("noteTextarea").value = '';
  
  // Reset color selection
  document.querySelectorAll(".note-color").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.color === "#ffeb3b");
  });
  selectedHighlightColor = "#ffeb3b";
  
  hideHighlightTooltip();
  noteModal.style.display = "flex";
});

// Copy text button
document.getElementById("copyTextBtn")?.addEventListener("click", async () => {
  if (!pendingHighlight) return;
  
  try {
    await navigator.clipboard.writeText(pendingHighlight.text);
    hideHighlightTooltip();
    // Could show a toast notification here
  } catch (err) {
    console.error("Failed to copy:", err);
  }
});

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
  if (!pendingHighlight) return;
  
  const note = document.getElementById("noteTextarea").value.trim();
  
  if (pendingHighlight.editMode) {
    // Update existing highlight
    await updateHighlightNote(pendingHighlight.id, note, selectedHighlightColor);
  } else {
    // Create new highlight with note
    await createHighlight(pendingHighlight.cfi, pendingHighlight.text, selectedHighlightColor, note, pendingHighlight.chapter);
  }
  
  noteModal.style.display = "none";
  pendingHighlight = null;
  
  // Clear selection
  if (rendition1) {
    const contents = rendition1.getContents()[0];
    if (contents) {
      contents.window.getSelection().removeAllRanges();
    }
  }
});

document.getElementById("cancel-note-btn")?.addEventListener("click", () => {
  noteModal.style.display = "none";
  pendingHighlight = null;
});

async function createHighlight(cfi, text, color, note, chapter) {
  if (!currentBookPath1) return;
  
  const book = library.find(b => b.path === currentBookPath1);
  if (!book) return;
  
  if (!book.highlights) book.highlights = [];
  
  const highlight = {
    id: Date.now(),
    cfi: cfi,
    text: text,
    color: color,
    note: note,
    chapter: chapter,
    createdAt: Date.now()
  };
  
  book.highlights.push(highlight);
  await window.electronAPI.addToLibrary(book);
  
  // Apply highlight to rendition
  applyHighlightToRendition(highlight);
}

async function updateHighlightNote(id, note, color) {
  const book = library.find(b => b.path === currentBookPath1);
  if (!book?.highlights) return;
  
  const highlight = book.highlights.find(hl => hl.id === id);
  if (!highlight) return;
  
  // Remove old highlight from rendition
  if (rendition1) {
    rendition1.annotations.remove(highlight.cfi, "highlight");
  }
  
  highlight.note = note;
  highlight.color = color;
  
  await window.electronAPI.addToLibrary(book);
  
  // Re-apply with new color
  applyHighlightToRendition(highlight);
}

function applyHighlightToRendition(highlight) {
  if (!rendition1) return;
  
  try {
    rendition1.annotations.highlight(highlight.cfi, {}, (e) => {
      // Click handler for highlight
      console.log("Highlight clicked:", highlight.id);
    }, "hl-" + highlight.id, {
      "fill": highlight.color,
      "fill-opacity": "0.4"
    });
  } catch (err) {
    console.warn("Could not apply highlight:", err);
  }
}

function loadHighlightsForBook(bookPath) {
  const book = library.find(b => b.path === bookPath);
  if (!book?.highlights || !rendition1) return;
  
  // Wait for rendition to be ready
  setTimeout(() => {
    book.highlights.forEach(highlight => {
      applyHighlightToRendition(highlight);
    });
  }, 500);
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
closeModalBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    settingsModal.style.display = "none";
    tagModal.style.display = "none";
    editBookModal.style.display = "none";
    searchModal.style.display = "none";
    bookmarksModal.style.display = "none";
    highlightsModal.style.display = "none";
    noteModal.style.display = "none";
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
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + F for search
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    if (views.reader.style.display !== "none" && viewerType1 === 'epub') {
      e.preventDefault();
      searchBtn?.click();
    }
  }
  
  // Ctrl/Cmd + B for bookmark
  if ((e.ctrlKey || e.metaKey) && e.key === "b") {
    if (views.reader.style.display !== "none") {
      e.preventDefault();
      bookmarkBtn?.click();
    }
  }
  
  // Escape to close modals
  if (e.key === "Escape") {
    hideHighlightTooltip();
    searchModal.style.display = "none";
    bookmarksModal.style.display = "none";
    highlightsModal.style.display = "none";
    noteModal.style.display = "none";
  }
});

// Hide highlight tooltip when clicking elsewhere
document.addEventListener("click", (e) => {
  if (!e.target.closest(".highlight-tooltip") && !e.target.closest("#viewer")) {
    hideHighlightTooltip();
  }
});

// Handle window resize for PDF
window.addEventListener('resize', () => {
  if (viewerType1 === 'pdf') renderPdfPage(1);
  if (viewerType2 === 'pdf') renderPdfPage(2);
  hideHighlightTooltip();
});
