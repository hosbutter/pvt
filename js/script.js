const leftSb = document.getElementById("sidebar-left");
const rightSb = document.getElementById("sidebar-right");
const overlay = document.getElementById("overlay");
const leftBtn = document.getElementById("left-toggle");
const rightBtn = document.getElementById("right-toggle");
const navBar = document.getElementById("nav-bar");
const contentArea = document.getElementById("content");
const treeLinks = document.querySelectorAll(".tree-links");
const pathElement = document.getElementById("current-path");
const loadingBarContainer = document.getElementById("loading-bar-container");
const loadingBar = document.getElementById("loading-bar");

// --- Slider Globals ---
let currentIdx = 0;
let autoSlideTimer = null;

function closeAll() {
  [leftSb, rightSb, overlay].forEach((el) => el.classList.remove("active"));
  [leftBtn, rightBtn].forEach((el) => el.classList.remove("active-btn"));
}

// --- Navigation Logic ---
leftBtn.onclick = () => {
  const isOpen = leftSb.classList.contains("active");
  closeAll();
  if (!isOpen) {
    leftSb.classList.add("active");
    overlay.classList.add("active");
  }
};

rightBtn.onclick = () => {
  const isOpen = rightSb.classList.contains("active");
  closeAll();
  if (!isOpen) {
    rightSb.classList.add("active");
    overlay.classList.add("active");
  }
};

overlay.onclick = closeAll;

// --- Rotation Slider Engine ---
function rotate(step) {
  const rail = document.getElementById("sliderRail");
  const cards = document.querySelectorAll(".game-card");
  if (!rail || cards.length === 0) return;

  cards[currentIdx].classList.remove("active");
  currentIdx = (currentIdx + step + cards.length) % cards.length;
  cards[currentIdx].classList.add("active");

  const shift = currentIdx * -300;
  rail.style.transform = `translateX(${shift}px)`;
}

function initAutoRotation() {
  if (autoSlideTimer) clearInterval(autoSlideTimer);
  const rail = document.getElementById("sliderRail");
  if (!rail) return;

  autoSlideTimer = setInterval(() => rotate(1), 5000);

  const windowEl = document.querySelector(".slider-window");
  if (windowEl) {
    windowEl.onmouseenter = () => clearInterval(autoSlideTimer);
    windowEl.onmouseleave = () => initAutoRotation();
  }
}

// --- Activity/Commit Graph Logic ---
async function initCommitGraph() {
  const graph = document.getElementById("commit-graph");
  if (!graph) return;

  try {
    const response = await fetch("./commits.json");
    if (!response.ok) throw new Error("JSON not found");
    const data = await response.json();

    let total = 0,
      peak = 0,
      daysPlayed = 0;
    graph.innerHTML = "";

    for (let i = 0; i < 364; i++) {
      const square = document.createElement("div");
      square.classList.add("square");
      const day = data[i];
      const hrs = day ? parseFloat(day.hours) : 0;

      total += hrs;
      if (hrs > peak) peak = hrs;
      if (hrs > 0) daysPlayed++;

      if (hrs === 0) square.classList.add("level-0");
      else if (hrs <= 2) square.classList.add("level-1");
      else if (hrs <= 5) square.classList.add("level-2");
      else if (hrs <= 8) square.classList.add("level-3");
      else square.classList.add("level-4");

      if (day) square.title = `${day.date}: ${hrs}h`;
      graph.appendChild(square);
    }

    const totalEl = document.getElementById("total-hours");
    const peakEl = document.getElementById("peak-hours");
    const avgEl = document.getElementById("avg-hours");

    if (totalEl) totalEl.textContent = `${total.toFixed(1)}h`;
    if (peakEl) peakEl.textContent = `${peak.toFixed(1)}h`;
    if (avgEl) avgEl.textContent = `${(total / (daysPlayed || 1)).toFixed(1)}h`;
  } catch (err) {
    console.warn("Could not load stats data", err);
  }
}

function initLibraryFilters() {
  const table = document.getElementById("game-library-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const platformFilter = document.getElementById("platform-filter");
  const sortBtns = document.querySelectorAll(".sort-btn");

  // --- Filtering Logic ---
  if (platformFilter) {
    platformFilter.onchange = (e) => {
      const val = e.target.value;
      rows.forEach((row) => {
        const platform = row.getAttribute("data-platform");
        row.style.display = val === "all" || platform === val ? "" : "none";
      });
    };
  }

  // --- Sorting Function ---
  const sortTable = (type, btn) => {
    // UI Update
    sortBtns.forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const sortedRows = rows.sort((a, b) => {
      const valA = parseFloat(a.getAttribute(`data-${type}`)) || 0;
      const valB = parseFloat(b.getAttribute(`data-${type}`)) || 0;
      return valB - valA; // Descending
    });

    sortedRows.forEach((row) => tbody.appendChild(row));
  };

  // Bind Clicks
  sortBtns.forEach((btn) => {
    btn.onclick = () => sortTable(btn.getAttribute("data-sort"), btn);
  });

  // --- AUTO-SELECT ON LOAD ---
  // Find the button with data-sort="time" and trigger it
  const defaultSortBtn = document.querySelector('.sort-btn[data-sort="time"]');
  if (defaultSortBtn) {
    sortTable("time", defaultSortBtn);
  }
}

// --- Tab Logic (with LocalStorage) ---
function initInternalTabs() {
  const tabs = document.querySelectorAll(".tab-btns");
  const contents = document.querySelectorAll(".tab-contents");

  // Get current page name from hash (e.g., #ishini) to create a unique key
  const pageName = window.location.hash.substring(1) || "ishini";
  const storageKey = `activeTab_${pageName}`;

  // 1. RECOVERY LOGIC: Check if we have a saved tab for this specific page
  const savedTabId = localStorage.getItem(storageKey);

  if (savedTabId) {
    const targetTab = document.querySelector(`[data-target="${savedTabId}"]`);
    const targetContent = document.getElementById(savedTabId);

    if (targetTab && targetContent) {
      // Clear defaults
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      // Apply saved state
      targetTab.classList.add("active");
      targetContent.classList.add("active");

      // Update breadcrumb path if it exists
      if (pathElement)
        pathElement.textContent = `/root/${pageName}/${savedTabId}`;
    }
  }

  // 2. CLICK LOGIC: Save the selection when the user clicks
  tabs.forEach((tab) => {
    tab.onclick = () => {
      const target = tab.getAttribute("data-target");

      // UI Swapping
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(target)?.classList.add("active");

      // SAVE TO STORAGE
      localStorage.setItem(storageKey, target);

      // Update Path & Refresh specific page elements
      if (pathElement) pathElement.textContent = `/root/${pageName}/${target}`;

      // Re-run scripts that might be inside a newly visible tab
      initAutoRotation();
      initCommitGraph();
      initLibraryFilters();
    };
  });
}

// --- Page Loading Logic ---
async function loadPage(pageName, linkElement) {
  try {
    loadingBarContainer.style.display = "block";
    loadingBar.style.width = "40%";

    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error();
    const rawHTML = await response.text();
    const doc = new DOMParser().parseFromString(rawHTML, "text/html");

    if (leftSb)
      leftSb.innerHTML = doc.getElementById("new-left")?.innerHTML || "";
    if (navBar)
      navBar.innerHTML = doc.getElementById("new-nav")?.innerHTML || "";
    if (contentArea)
      contentArea.innerHTML =
        doc.getElementById("new-content")?.innerHTML || "";

    window.location.hash = pageName;

    initPageSpecificScripts();
    currentIdx = 0;

    loadingBar.style.width = "100%";
    setTimeout(() => {
      loadingBarContainer.style.display = "none";
      loadingBar.style.width = "0%";
    }, 400);

    treeLinks.forEach((l) => l.classList.remove("active"));
    const activeLink =
      linkElement || document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) activeLink.classList.add("active");

    if (pathElement) pathElement.textContent = `/root/${pageName}`;
    if (window.innerWidth <= 850) closeAll();
  } catch (err) {
    loadingBarContainer.style.display = "none";
    if (contentArea)
      contentArea.innerHTML = `<h2>Error</h2><p>Page could not be loaded.</p>`;
  }
}

// --- Event Listeners ---
treeLinks.forEach((link) => {
  link.onclick = (e) => {
    e.preventDefault();
    loadPage(link.getAttribute("data-page"), link);
  };
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.substring(1);
  if (hash) loadPage(hash, null);
});

window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.substring(1);
  loadPage(hash || "ishini", null);
});

function initTerminal() {
  const input = document.getElementById("terminal-input");
  const output = document.getElementById("terminal-output");
  if (!input || !output) return;

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      const cmd = input.value.toLowerCase().trim();
      if (!cmd) return;

      // Echo User Command
      const line = document.createElement("div");
      line.innerHTML = `<span style="color:var(--accent)">></span> ${cmd}`;
      output.appendChild(line);

      executeCommand(cmd, output);

      input.value = "";
      output.scrollTop = output.scrollHeight;
    }
  };
}

// Global state tracker for terminal effects
const terminalState = {
  neon: false,
  ghost: false,
  invert: false,
};

function executeCommand(cmd, output) {
  const resp = document.createElement("div");
  resp.style.color = "#00f5ff";
  resp.style.fontSize = "0.7rem";
  resp.style.marginBottom = "8px";

  switch (cmd) {
    case "help":
      resp.textContent = "Available: neon, ghost, invert, shake, clear, reset";
      break;

    case "neon":
      terminalState.neon = !terminalState.neon; // Toggle state
      const cards = document.querySelectorAll(
        ".fav-card, .wish-card, .stat-card, .media-item",
      );
      cards.forEach((c) => {
        c.style.boxShadow = terminalState.neon ? "0 0 20px #ff3399" : "";
        c.style.borderColor = terminalState.neon ? "#ff3399" : "";
      });
      resp.textContent = terminalState.neon
        ? "Neon Overdrive: ON"
        : "Neon Overdrive: OFF";
      break;

    case "ghost":
      terminalState.ghost = !terminalState.ghost;
      document.body.style.opacity = terminalState.ghost ? "0.5" : "1";
      resp.textContent = terminalState.ghost
        ? "Stealth Mode: ON"
        : "Stealth Mode: OFF";
      break;

    case "invert":
      terminalState.invert = !terminalState.invert;
      document.documentElement.style.filter = terminalState.invert
        ? "invert(1)"
        : "invert(0)";
      resp.textContent = terminalState.invert
        ? "Colors: INVERTED"
        : "Colors: NORMAL";
      break;

    case "shake":
      // Shake is an action, not a state, but we can trigger it again
      document.body.style.animation = "none";
      setTimeout(() => {
        document.body.style.animation = "shake 0.5s ease";
      }, 10);
      resp.textContent = "Impact triggered.";
      break;

    case "clear":
      output.innerHTML = "";
      return;

    case "reset":
      // Reset all toggle states
      terminalState.neon = false;
      terminalState.ghost = false;
      terminalState.invert = false;

      // Revert Styles
      document.body.style.opacity = "1";
      document.documentElement.style.filter = "none";
      document.body.style.animation = "none";
      const allCards = document.querySelectorAll(
        ".fav-card, .wish-card, .stat-card, .media-item",
      );
      allCards.forEach((c) => {
        c.style.boxShadow = "";
        c.style.borderColor = "";
      });

      resp.textContent = "System restored to default. (｡•̀ᴗ-)✧";
      break;

    default:
      resp.style.color = "#ff4444";
      resp.textContent = `Unknown command: ${cmd}`;
  }
  output.appendChild(resp);
}
// --- Controller for Page-Specific Scripts ---
function initPageSpecificScripts() {
  initInternalTabs();
  initAutoRotation();
  initCommitGraph();
  initLibraryFilters(); // <--- This was missing from the controller!
  initTerminal(); // <--- ADD THIS LINE
}
