// ==========================================================================
// AI & Humanities Compendium - Clean Academic Directory Logic
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  const flatData = window.READINGS_DATA || [];
  const coursesData = window.HKU_COURSES_DATA || {};
  
  // State
  let bookmarks = JSON.parse(localStorage.getItem("ai_bookmarks") || "[]");
  let readItems = JSON.parse(localStorage.getItem("ai_read_items") || "[]");
  let currentNav = "all";       // 'all', 'must-read', 'bookmarks', 'completed', 'domain', 'course'
  let selectedDomain = "all";
  let selectedCourseCode = "all";
  let selectedFormat = "all";
  let searchQuery = "";
  let currentSort = "schedule"; // Default to Schedule sort mode

  // Elements
  const container = document.getElementById("resources-container");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const formatPills = document.getElementById("format-pills");
  const mainNavMenu = document.getElementById("main-nav-menu");
  const courseSelect = document.getElementById("course-select");
  const domainMenu = document.getElementById("domain-menu");
  const sortSelect = document.getElementById("sort-select");
  const visibleCount = document.getElementById("visible-count");
  const totalCount = document.getElementById("total-count");
  const activeCategoryTag = document.getElementById("active-category-tag");
  const bookmarkCount = document.getElementById("bookmark-count");
  const completedCount = document.getElementById("completed-count");
  const statTotal = document.getElementById("stat-total");
  const statRead = document.getElementById("stat-read");
  const btnCompleted = document.getElementById("btn-completed");
  const btnBookmarks = document.getElementById("btn-bookmarks");
  const btnExport = document.getElementById("btn-export");
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  const courseBanner = document.getElementById("course-header-banner");
  const bannerCode = document.getElementById("banner-code");
  const bannerTitle = document.getElementById("banner-title");
  const bannerDomain = document.getElementById("banner-domain");
  const bannerClearBtn = document.getElementById("banner-clear-btn");
  const toast = document.getElementById("toast");

  // Single-Word Badge Class Mapping
  const formatBadges = {
    "Book": "type-book",
    "Paper": "type-paper",
    "Article": "type-article",
    "Report": "type-report",
    "Video": "type-video",
    "Classic": "type-classic"
  };

  const classicAuthors = ["bostrom", "tegmark", "russell", "amodei", "chalmers", "danaher", "kaplan", "coeckelbergh", "ord", "hansson", "anthropic"];

  // Populate Dropdown (Only courses that have resources) & Domain Menu
  function initFilters() {
    // 1. Course Dropdown
    courseSelect.innerHTML = `<option value="all">-- Select an HKU CC AI Course --</option>`;
    const sortedCourseKeys = Object.keys(coursesData).sort();
    
    sortedCourseKeys.forEach(code => {
      const c = coursesData[code];
      if (c.items && c.items.length > 0) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code}: ${c.course_title} (${c.items.length})`;
        courseSelect.appendChild(opt);
      }
    });

    // 2. Domain Sidebar Menu (Clean Concisely Trimmed Names)
    const domainCounts = {};
    flatData.forEach(item => {
      domainCounts[item.category] = (domainCounts[item.category] || 0) + 1;
    });

    domainMenu.innerHTML = "";
    Object.keys(domainCounts).sort().forEach(domain => {
      const li = document.createElement("li");
      li.className = "nav-item";
      li.dataset.domain = domain;
      li.innerHTML = `
        <span>${domain}</span>
        <span class="cat-count">${domainCounts[domain]}</span>
      `;
      domainMenu.appendChild(li);
    });

    // Default select dropdown to Schedule
    sortSelect.value = "schedule";
  }

  // Filter & Sort Logic
  function getFilteredData() {
    return flatData.filter(item => {
      // 1. Course Filter (Strict check)
      if (selectedCourseCode !== "all") {
        if (item.course_code !== selectedCourseCode) return false;
      }

      // 2. Main Navigation Views
      if (currentNav === "must-read") {
        const aut = (item.author || "").toLowerCase();
        if (!classicAuthors.some(a => aut.includes(a))) return false;
      } else if (currentNav === "bookmarks") {
        if (!bookmarks.includes(item.id)) return false;
      } else if (currentNav === "completed") {
        if (!readItems.includes(item.id)) return false;
      } else if (currentNav === "domain" && selectedDomain !== "all") {
        if (item.category !== selectedDomain) return false;
      }

      // 3. Format Filter (Active across all views)
      if (selectedFormat !== "all" && item.type !== selectedFormat) {
        return false;
      }

      // 4. Search Filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const haystack = `${item.title} ${item.author} ${item.source} ${item.subtopic} ${item.year} ${item.course_code} ${item.course_title}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (currentSort === "schedule") {
        // Strict integer syllabus_order sorting across ALL views
        const orderA = Number(a.syllabus_order) || 0;
        const orderB = Number(b.syllabus_order) || 0;
        
        if (a.course_code === b.course_code) {
          return orderA - orderB;
        }
        return a.course_code.localeCompare(b.course_code) || (orderA - orderB);
      } else if (currentSort === "year-desc") {
        return (b.year.match(/\d{4}/)?.[0] || 0) - (a.year.match(/\d{4}/)?.[0] || 0);
      } else if (currentSort === "year-asc") {
        return (a.year.match(/\d{4}/)?.[0] || 0) - (b.year.match(/\d{4}/)?.[0] || 0);
      } else if (currentSort === "type-asc") {
        return a.type.localeCompare(b.type);
      } else if (currentSort === "author-asc") {
        return a.author.localeCompare(b.author);
      } else if (currentSort === "title-asc") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }

  // Render Function
  function render() {
    const filteredItems = getFilteredData();
    
    // Update Stats & Counter Badges
    visibleCount.textContent = filteredItems.length;
    totalCount.textContent = flatData.length;
    statTotal.textContent = flatData.length;
    statRead.textContent = readItems.length;
    completedCount.textContent = readItems.length;
    bookmarkCount.textContent = bookmarks.length;

    // Course Banner Display
    if (selectedCourseCode !== "all" && coursesData[selectedCourseCode]) {
      const c = coursesData[selectedCourseCode];
      courseBanner.style.display = "flex";
      bannerCode.textContent = c.code;
      bannerTitle.textContent = c.course_title;
      bannerDomain.textContent = `Humanities Category: ${c.category}`;
      activeCategoryTag.style.display = "inline-block";
      activeCategoryTag.textContent = c.code;
    } else {
      courseBanner.style.display = "none";
      if (currentNav === "domain" && selectedDomain !== "all") {
        activeCategoryTag.style.display = "inline-block";
        activeCategoryTag.textContent = selectedDomain;
      } else if (currentNav === "must-read") {
        activeCategoryTag.style.display = "inline-block";
        activeCategoryTag.textContent = "Must-Read Classics";
      } else if (currentNav === "bookmarks") {
        activeCategoryTag.style.display = "inline-block";
        activeCategoryTag.textContent = "Saved Readings";
      } else if (currentNav === "completed") {
        activeCategoryTag.style.display = "inline-block";
        activeCategoryTag.textContent = "Completed Readings";
      } else {
        activeCategoryTag.style.display = "none";
      }
    }

    if (filteredItems.length === 0) {
      container.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    // Render Resource Items
    container.innerHTML = `<div class="resources-container">` + 
      filteredItems.map(item => renderSingleItemHtml(item)).join("") + 
      `</div>`;
  }

  // Render Single Resource Item
  function renderSingleItemHtml(item) {
    const isBookmarked = bookmarks.includes(item.id);
    const isRead = readItems.includes(item.id);
    const badgeClass = formatBadges[item.type] || "type-book";
    
    // Direct Link vs Google All Search Fallback
    let linkUrl = item.url;
    let linkLabel = "Access Direct Link";
    
    if (!linkUrl || linkUrl.trim() === "") {
      if (item.type === "Video") {
        linkUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.author + " " + item.title)}`;
        linkLabel = "YouTube";
      } else if (item.type === "Paper") {
        linkUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(item.title)}`;
        linkLabel = "Google Scholar";
      } else {
        linkUrl = `https://www.google.com/search?q=${encodeURIComponent(item.author + " " + item.title)}`;
        linkLabel = "Google Search";
      }
    }

    return `
      <article class="resource-item" data-id="${item.id}">
        <div class="item-main">
          <div class="item-header-meta">
            <span class="type-badge-inline ${badgeClass}">${item.type}</span>
            ${item.year !== 'N/A' ? `<span class="item-year">${item.year}</span>` : ''}
            <span class="item-course-tag">${item.course_code}</span>
            ${item.subtopic ? `<span class="item-subtopic-inline">${escapeHtml(item.subtopic)}</span>` : ''}
          </div>
          
          <h4 class="item-title">${escapeHtml(item.title)}</h4>
          <div class="item-author"><i class="fa-regular fa-user" style="font-size:0.75rem; margin-right:0.25rem; color:#64748b;"></i> ${escapeHtml(item.author)}</div>
          ${item.source ? `<div class="item-source">${escapeHtml(item.source)}</div>` : ''}
        </div>

        <div class="item-actions">
          <button class="icon-btn btn-read ${isRead ? 'is-read' : ''}" title="${isRead ? 'Marked as Completed' : 'Mark as Completed'}" onclick="toggleRead(${item.id})">
            <i class="fa-solid fa-check"></i>
          </button>
          <button class="icon-btn btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" title="${isBookmarked ? 'Remove Bookmark' : 'Save Reading'}" onclick="toggleBookmark(${item.id})">
            <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
          </button>
          <button class="icon-btn" title="Copy Citation (APA)" onclick="copyCitation(${item.id})">
            <i class="fa-regular fa-copy"></i>
          </button>
          <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="link-btn-academic">
            <span>${linkLabel}</span> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem;"></i>
          </a>
        </div>
      </article>
    `;
  }

  // Global Actions
  window.toggleBookmark = function(id) {
    if (bookmarks.includes(id)) {
      bookmarks = bookmarks.filter(b => b !== id);
      showToast("Removed from saved list");
    } else {
      bookmarks.push(id);
      showToast("Saved to reading list");
    }
    localStorage.setItem("ai_bookmarks", JSON.stringify(bookmarks));
    render();
  };

  window.toggleRead = function(id) {
    if (readItems.includes(id)) {
      readItems = readItems.filter(r => r !== id);
      showToast("Marked as incomplete");
    } else {
      readItems.push(id);
      showToast("Marked as completed! 🎉");
    }
    localStorage.setItem("ai_read_items", JSON.stringify(readItems));
    render();
  };

  window.copyCitation = function(id) {
    const item = flatData.find(i => i.id === id);
    if (!item) return;
    const citation = `${item.author} (${item.year}). ${item.title}. ${item.source ? item.source + '. ' : ''}${item.url || ''}`;
    navigator.clipboard.writeText(citation);
    showToast("APA Citation copied!");
  };

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Event Listeners
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    searchClear.style.display = searchQuery ? "block" : "none";
    render();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClear.style.display = "none";
    render();
  });

  // Course Dropdown Select
  courseSelect.addEventListener("change", (e) => {
    selectedCourseCode = e.target.value;
    if (selectedCourseCode !== "all") {
      currentNav = "course";
    } else {
      currentNav = "all";
      document.querySelector('.nav-item[data-view="all"]')?.classList.add("active");
    }
    currentSort = "schedule";
    sortSelect.value = "schedule";
    render();
  });

  bannerClearBtn.addEventListener("click", () => {
    selectedCourseCode = "all";
    courseSelect.value = "all";
    currentNav = "all";
    currentSort = "schedule";
    sortSelect.value = "schedule";
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector('.nav-item[data-view="all"]')?.classList.add("active");
    render();
  });

  // Main Nav Views (All / Must-Read)
  mainNavMenu.addEventListener("click", (e) => {
    const navItem = e.target.closest(".nav-item");
    if (!navItem) return;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    navItem.classList.add("active");
    currentNav = navItem.dataset.view;
    selectedDomain = "all";
    selectedCourseCode = "all";
    courseSelect.value = "all";
    currentSort = "schedule";
    sortSelect.value = "schedule";
    render();
  });

  // Domain Sidebar Menu
  domainMenu.addEventListener("click", (e) => {
    const navItem = e.target.closest(".nav-item");
    if (!navItem) return;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    navItem.classList.add("active");
    currentNav = "domain";
    selectedDomain = navItem.dataset.domain;
    selectedCourseCode = "all";
    courseSelect.value = "all";
    currentSort = "schedule";
    sortSelect.value = "schedule";
    render();
  });

  // Format Pills Filter
  formatPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    selectedFormat = pill.dataset.type;
    render();
  });

  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    render();
  });

  // Completed Button
  btnCompleted.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(p => p.classList.remove("active"));
    currentNav = "completed";
    selectedCourseCode = "all";
    courseSelect.value = "all";
    currentSort = "schedule";
    sortSelect.value = "schedule";
    render();
  });

  // Bookmarks Button
  btnBookmarks.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(p => p.classList.remove("active"));
    currentNav = "bookmarks";
    selectedCourseCode = "all";
    courseSelect.value = "all";
    currentSort = "schedule";
    sortSelect.value = "schedule";
    render();
  });

  resetFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClear.style.display = "none";
    currentNav = "all";
    selectedDomain = "all";
    selectedCourseCode = "all";
    selectedFormat = "all";
    courseSelect.value = "all";
    currentSort = "schedule";
    sortSelect.value = "schedule";
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector('.nav-item[data-view="all"]')?.classList.add("active");
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    document.querySelector('.pill[data-type="all"]')?.classList.add("active");
    render();
  });

  btnExport.addEventListener("click", () => {
    const listToExport = getFilteredData();
    if (listToExport.length === 0) {
      showToast("No items to export!");
      return;
    }

    let md = `# AI & Humanities Curated Reading List\n\n`;
    md += `*Exported on ${new Date().toLocaleDateString()} | Total Items: ${listToExport.length}*\n\n---\n\n`;

    listToExport.forEach(item => {
      md += `### ${item.title}\n`;
      md += `- **Author**: ${item.author}\n`;
      md += `- **Year**: ${item.year}\n`;
      md += `- **Format**: ${item.type}\n`;
      md += `- **Course**: ${item.course_code} (${item.course_title})\n`;
      if (item.subtopic) md += `- **Subtopic**: ${item.subtopic}\n`;
      if (item.source) md += `- **Source**: ${item.source}\n`;
      if (item.url) md += `- **Link**: ${item.url}\n`;
      md += `\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HKU_AI_Humanities_Reading_List_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded Markdown Reading List!");
  });

  initFilters();
  render();
});
