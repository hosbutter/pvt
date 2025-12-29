// Core element references (must match index.html)
const sidebarLeftContainer = document.getElementById("sidebarLeftContainer");
const sidebarRightContainer = document.getElementById("sidebarRightContainer");
const pageOverlay = document.getElementById("pageOverlay");
const sidebarLeftToggleBtn = document.getElementById("sidebarLeftToggleBtn");
const sidebarRightToggleBtn = document.getElementById("sidebarRightToggleBtn");
const topNavBar = document.getElementById("topNavBar");
const mainContent = document.getElementById("mainContent");
const sidebarRightCurrentPath = document.getElementById("sidebarRightCurrentPath");
const topLoadingBarContainer = document.getElementById("topLoadingBarContainer");
const topLoadingBar = document.getElementById("topLoadingBar");

let currentIdx = 0;
let autoSlideTimer = null;
const terminalState = { neon: false, ghost: false, invert: false };

// Small helper for safe query selectors within injected content
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function closeAll() {
  [sidebarLeftContainer, sidebarRightContainer, pageOverlay].forEach(el => el && el.classList.remove("active"));
  [sidebarLeftToggleBtn, sidebarRightToggleBtn].forEach(el => el && el.classList.remove("activeBtn"));
}

if (sidebarLeftToggleBtn) {
  sidebarLeftToggleBtn.addEventListener("click", () => {
    const open = sidebarLeftContainer.classList.contains("active");
    closeAll();
    if (!open) { sidebarLeftContainer.classList.add("active"); pageOverlay.classList.add("active"); }
  });
}
if (sidebarRightToggleBtn) {
  sidebarRightToggleBtn.addEventListener("click", () => {
    const open = sidebarRightContainer.classList.contains("active");
    closeAll();
    if (!open) { sidebarRightContainer.classList.add("active"); pageOverlay.classList.add("active"); }
  });
}
if (pageOverlay) pageOverlay.addEventListener("click", closeAll);

// ROTATION (slider) functions
function rotate(step) {
  const rail = document.getElementById("rotationRail");
  const cards = qa(".rotationCards", rail || document);
  if (!rail || cards.length === 0) return;
  cards[currentIdx].classList.remove("active");
  currentIdx = (currentIdx + step + cards.length) % cards.length;
  cards[currentIdx].classList.add("active");
  rail.style.transform = `translateX(${currentIdx * -300}px)`;
}
function initAutoRotation() {
  if (autoSlideTimer) clearInterval(autoSlideTimer);
  const rail = document.getElementById("rotationRail");
  if (!rail) return;
  autoSlideTimer = setInterval(() => rotate(1), 5000);
  const windowEl = document.getElementById("rotationWindow") || q(".rotationWindow");
  if (windowEl) {
    windowEl.onmouseenter = () => clearInterval(autoSlideTimer);
    windowEl.onmouseleave = () => initAutoRotation();
  }
}

// Session activity (heatmap)
async function initSessionActivity() {
  const grid = document.getElementById("sessionActivityGrid");
  if (!grid) return;
  try {
    const response = await fetch("./commits.json");
    if (!response.ok) throw new Error("JSON not found");
    const data = await response.json();
    grid.innerHTML = "";
    let total = 0, peak = 0, daysPlayed = 0;
    for (let i = 0; i < 364; i++) {
      const square = document.createElement("div");
      square.classList.add("square");
      const day = data[i];
      const hrs = day ? parseFloat(day.hours) : 0;
      total += hrs;
      if (hrs > peak) peak = hrs;
      if (hrs > 0) daysPlayed++;
      if (hrs === 0) square.classList.add("level0");
      else if (hrs <= 2) square.classList.add("level1");
      else if (hrs <= 5) square.classList.add("level2");
      else if (hrs <= 8) square.classList.add("level3");
      else square.classList.add("level4");
      if (day) square.title = `${day.date}: ${hrs}h`;
      grid.appendChild(square);
    }
    const totalEl = document.getElementById("totalHours");
    const peakEl = document.getElementById("peakHours");
    const avgEl = document.getElementById("avgHours");
    if (totalEl) totalEl.textContent = `${total.toFixed(1)}h`;
    if (peakEl) peakEl.textContent = `${peak.toFixed(1)}h`;
    if (avgEl) avgEl.textContent = `${(total / (daysPlayed || 1)).toFixed(1)}h`;
  } catch (err) {
    console.warn("Could not load stats data", err);
  }
}

// Library filters & sorting
function initLibraryFilters() {
  const table = document.getElementById("libraryTable");
  if (!table) return;
  const tbody = q("tbody", table);
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const sortBtns = qa(".sortBtn", table.closest(".pageTabContents") || document);
  const sortTable = (type, btn) => {
    sortBtns.forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    const sorted = rows.sort((a,b) => (parseFloat(b.getAttribute(`data-${type}`))||0) - (parseFloat(a.getAttribute(`data-${type}`))||0));
    sorted.forEach(r => tbody.appendChild(r));
  };
  sortBtns.forEach(btn => btn.addEventListener("click", () => sortTable(btn.getAttribute("data-sort"), btn)));
  const defaultBtn = document.querySelector('.sortBtn[data-sort="time"]');
  if (defaultBtn) sortTable("time", defaultBtn);
}

// Tabs inside a loaded page
function initInternalTabs() {
  const tabs = qa(".topNavTabBtns");
  const contents = qa(".pageTabContents");
  const pageName = window.location.hash.substring(1) || "gaming";
  const storageKey = `activeTab_${pageName}`;
  const savedTabId = localStorage.getItem(storageKey);
  if (savedTabId) {
    const targetTab = document.querySelector(`[data-target="${savedTabId}"]`);
    const targetContent = document.getElementById(savedTabId);
    if (targetTab && targetContent) {
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));
      targetTab.classList.add("active");
      targetContent.classList.add("active");
      if (sidebarRightCurrentPath) sidebarRightCurrentPath.textContent = `/root/${pageName}/${savedTabId}`;
    }
  }
  tabs.forEach(tab => tab.addEventListener("click", () => {
    const target = tab.getAttribute("data-target");
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(target)?.classList.add("active");
    localStorage.setItem(storageKey, target);
    if (sidebarRightCurrentPath) sidebarRightCurrentPath.textContent = `/root/${pageName}/${target}`;
    initAutoRotation();
    initSessionActivity();
    initLibraryFilters();
  }));
}

// Terminal
function initTerminal() {
  const input = document.getElementById("sidebarRightTerminalInput");
  const output = document.getElementById("sidebarRightTerminalOutput");
  if (!input || !output) return;
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      const cmd = input.value.toLowerCase().trim();
      if (!cmd) return;
      const line = document.createElement("div");
      line.innerHTML = `<span style="color:var(--accent)">></span> ${cmd}`;
      output.appendChild(line);
      executeCommand(cmd, output);
      input.value = "";
      output.scrollTop = output.scrollHeight;
    }
  };
}

function executeCommand(cmd, output) {
  const resp = document.createElement("div");
  resp.style.color = "#00f5ff";
  resp.style.fontSize = "0.75rem";
  resp.style.marginBottom = "8px";
  switch (cmd) {
    case "help": resp.textContent = "Available: neon, ghost, invert, shake, clear, reset"; break;
    case "neon":
      terminalState.neon = !terminalState.neon;
      qa(".favoritesCards, .wishlistCards, .statsCards, .mediaItems").forEach(c => {
        c.style.boxShadow = terminalState.neon ? "0 0 20px #ff3399" : "";
        c.style.borderColor = terminalState.neon ? "#ff3399" : "";
      });
      resp.textContent = terminalState.neon ? "Neon: ON" : "Neon: OFF";
      break;
    case "ghost":
      terminalState.ghost = !terminalState.ghost;
      document.body.style.opacity = terminalState.ghost ? "0.5" : "1";
      resp.textContent = terminalState.ghost ? "Stealth: ON" : "Stealth: OFF";
      break;
    case "invert":
      terminalState.invert = !terminalState.invert;
      document.documentElement.style.filter = terminalState.invert ? "invert(1)" : "none";
      resp.textContent = terminalState.invert ? "Colors inverted" : "Colors normal";
      break;
    case "shake":
      document.body.style.animation = "none";
      setTimeout(()=>{ document.body.style.animation = "shake .5s ease"; }, 10);
      resp.textContent = "Shaken.";
      break;
    case "clear":
      output.innerHTML = "";
      return;
    case "reset":
      terminalState.neon = terminalState.ghost = terminalState.invert = false;
      document.body.style.opacity = "1";
      document.documentElement.style.filter = "none";
      document.body.style.animation = "none";
      qa(".favoritesCards, .wishlistCards, .statsCards, .mediaItems").forEach(c => { c.style.boxShadow = ""; c.style.borderColor = ""; });
      resp.textContent = "Reset.";
      break;
    default:
      resp.style.color = "#ff4444";
      resp.textContent = `Unknown: ${cmd}`;
  }
  output.appendChild(resp);
}

// After injecting fragments we must rebind fragment-specific event handlers
function bindFragmentBehavior() {
  // rebind sidebarRightTreeLinks
  qa(".sidebarRightTreeLinks", sidebarRightContainer).forEach(link => {
    link.removeEventListener("click", sidebarLinkHandler);
    link.addEventListener("click", sidebarLinkHandler);
  });

  // other per-fragment inits:
  initInternalTabs();
  initAutoRotation();
  initSessionActivity();
  initLibraryFilters();
  initTerminal();
}

// handler for sidebar links (data-section)
function sidebarLinkHandler(e) {
  e.preventDefault();
  const section = this.getAttribute("data-section");
  loadPage(section, this);
}

// load page fragment and inject
async function loadPage(pageName = "gaming", linkElement = null) {
  try {
    if (topLoadingBarContainer) topLoadingBarContainer.style.display = "block";
    if (topLoadingBar) topLoadingBar.style.width = "40%";
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error(`Page ${pageName} not found`);
    const raw = await response.text();
    const doc = new DOMParser().parseFromString(raw, "text/html");

    // fragment injection (IDs in page fragment)
    const leftFrag = doc.getElementById("fragmentNewLeft");
    const navFrag = doc.getElementById("fragmentNewNav");
    const contentFrag = doc.getElementById("fragmentNewContent");

    if (sidebarLeftContainer) sidebarLeftContainer.innerHTML = leftFrag?.innerHTML || "";
    if (topNavBar) topNavBar.innerHTML = navFrag?.innerHTML || "";
    if (mainContent) mainContent.innerHTML = contentFrag?.innerHTML || "";

    // update active link state in the right sidebar (if any)
    if (sidebarRightContainer) {
      // re-query the right-tree links inside the injected nav if present
      const injectedLinks = qa(".sidebarRightTreeLinks", sidebarRightContainer);
      injectedLinks.forEach(l => l.classList.remove("active"));
      if (linkElement) linkElement.classList.add("active");
    }

    // rebind event handlers for elements in injected fragments
    bindFragmentBehavior();

    if (sidebarRightCurrentPath) sidebarRightCurrentPath.textContent = `/root/${pageName}`;
    if (window.innerWidth <= 850) closeAll();

    if (topLoadingBar) topLoadingBar.style.width = "100%";
    setTimeout(() => { if (topLoadingBarContainer) topLoadingBarContainer.style.display = "none"; if (topLoadingBar) topLoadingBar.style.width = "0%"; }, 300);
  } catch (err) {
    console.error("loadPage error:", err);
    if (topLoadingBarContainer) topLoadingBarContainer.style.display = "none";
    if (mainContent) mainContent.innerHTML = `<h2>Error</h2><p>Page ${pageName} could not be loaded.</p>`;
  }
}

// initial wiring: attach static handlers, then load default page
function initialWireUp() {
  // top-level sidebar tree links (present in index.html initially)
  qa(".sidebarRightTreeLinks", sidebarRightContainer).forEach(l => {
    l.addEventListener("click", sidebarLinkHandler);
  });

  // ensure toggles/overlay already wired above during definition
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.substring(1);
    if (hash) loadPage(hash, null);
  });

  // default load
  const initial = window.location.hash.substring(1) || "gaming";
  loadPage(initial, null);
}

document.addEventListener("DOMContentLoaded", initialWireUp);
