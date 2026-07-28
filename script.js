let currentPageIndex = 0;
let bookData = [];
let isDarkMode = false;

document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      bookData = data;
      buildIndex();
      showPage(currentPageIndex);
      setupControls();
      setupDarkMode();
      setupSearch();
      setupMobileIndexToggle();
    })
    .catch((err) => console.error("خطأ في تحميل البيانات:", err));
});

/* ---------- الفهرس الجانبي ---------- */
function buildIndex(filteredData = null) {
  const indexLinks = document.getElementById("indexLinks");
  const indexCount = document.getElementById("indexCount");
  indexLinks.innerHTML = "";
  const dataToShow = filteredData || bookData;
  indexCount.textContent = `${dataToShow.length} صفحة`;

  let lastChapter = null;

  dataToShow.forEach((page) => {
    const originalIndex = bookData.findIndex(
      (p) => p.pageNumber === page.pageNumber,
    );

    if (page.chapter !== lastChapter) {
      const chapterLabel = document.createElement("div");
      chapterLabel.className = "index-chapter-label";
      chapterLabel.textContent = page.chapter;
      indexLinks.appendChild(chapterLabel);
      lastChapter = page.chapter;
    }

    const item = document.createElement("div");
    item.className = "index-item";
    item.dataset.pageIndex = originalIndex;
    if (originalIndex === currentPageIndex) item.classList.add("active");

    item.innerHTML = `
      <span class="index-item-num">${String(page.pageNumber).padStart(2, "0")}</span>
      <span class="index-item-text">
        <span class="index-item-title">${escapeHTML(page.title)}</span>
        ${page.englishTitle ? "" : ""}
      </span>
    `;
    item.addEventListener("click", () => {
      currentPageIndex = originalIndex;
      showPage(currentPageIndex);
      closeMobileSidebar(); // غلق الورقة المنبثقة فوراً
    });
    indexLinks.appendChild(item);
  });
}

function refreshActiveIndexItem() {
  document.querySelectorAll(".index-item").forEach((el) => {
    el.classList.toggle(
      "active",
      Number(el.dataset.pageIndex) === currentPageIndex,
    );
  });
}

/* ---------- بناء وحقن المحتوى ---------- */
function showPage(index) {
  const page = bookData[index];
  if (!page) return;

  document.getElementById("pageChapter").textContent = page.chapter;
  document.getElementById("pageCode").textContent = page.code
    ? page.code.toUpperCase()
    : "";
  document.getElementById("pageTitle").textContent = page.title;
  document.getElementById("pageEnglishTitle").textContent =
    page.englishTitle || "";

  const introEl = document.getElementById("pageIntro");
  if (page.intro) {
    introEl.textContent = page.intro;
    introEl.style.display = "block";
  } else {
    introEl.style.display = "none";
  }

  let bodyHTML = "";
  if (page.layout === "cards" && page.items) {
    bodyHTML += renderCardsLayout(page.items);
  } else if (page.layout === "boxes" && page.items) {
    bodyHTML += renderBoxesLayout(page.items);
  } else if (page.layout === "table" && page.table) {
    bodyHTML += renderTableLayout(page.table);
  }

  if (page.media && page.media.length) {
    bodyHTML += renderMediaBlocks(page.media);
  }

  if (page.note) {
    bodyHTML += `
      <div class="book-note">
        <div class="note-head">
          <span class="note-icon">👶</span>
          <strong>ملاحظة استثنائية:</strong>
        </div>
        <p>${escapeHTML(page.note)}</p>
      </div>
    `;
  }

  document.getElementById("pageBody").innerHTML = bodyHTML;
  document.getElementById("pageNumbering").textContent =
    `صفحة ${page.pageNumber + 1} من ${bookData.length}`;

  const progress = ((index + 1) / bookData.length) * 100;
  document.getElementById("progressBar").style.width = `${progress}%`;

  refreshActiveIndexItem();

  document.getElementById("prevBtn").disabled = index === 0;
  document.getElementById("nextBtn").disabled = index === bookData.length - 1;

  document.getElementById("contentPage").scrollTop = 0;
}

/* ---------- هياكل القوالب ---------- */
function renderCardsLayout(items) {
  const cardsHTML = items
    .map(
      (item) => `
    <li class="step-item">
      <div class="step-badge">
        <span class="step-letter">${escapeHTML(item.letter)}</span>
        <span class="step-word">${escapeHTML(item.word)}</span>
      </div>
      <div class="step-content">
        <strong class="step-title">${escapeHTML(item.title)}</strong>
        <p>${escapeHTML(item.desc)}</p>
        ${item.image ? renderImageBlock(item.image) : ""}
      </div>
    </li>
  `,
    )
    .join("");
  return `<ul class="step-list">${cardsHTML}</ul>`;
}

function parseFormattedText(str) {
  if (!str) return "";
  let safe = escapeHTML(str);
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  return safe;
}

function renderBoxesLayout(items) {
  const boxesHTML = items
    .map(
      (item) => `
    <li class="plain-item">
      <strong>${parseFormattedText(item.title)}</strong>
      <p>${parseFormattedText(item.desc)}</p>
    </li>
  `,
    )
    .join("");
  return `<ul class="plain-list">${boxesHTML}</ul>`;
}

function renderTableLayout(tableData) {
  const head = tableData.headers
    .map((c) => `<th>${escapeHTML(c)}</th>`)
    .join("");
  const rows = tableData.rows
    .map(
      (row) => `
    <tr>${row
      .map(
        (cell, i) =>
          `<td data-label="${escapeHTML(tableData.headers[i] || "")}">${escapeHTML(cell)}</td>`,
      )
      .join("")}</tr>
  `,
    )
    .join("");

  return `
    <div class="section-block">
      <div class="table-wrap">
        <table class="book-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---------- الوسائط: صور وفيديوهات ---------- */
function renderMediaBlocks(mediaItems) {
  return mediaItems
    .map((media) => {
      if (media.type === "image") return renderImageBlock(media);
      if (media.type === "video") return renderVideoBlock(media);
      return "";
    })
    .join("");
}

function renderImageBlock(media) {
  const safeSrc = escapeHTML(media.src || "");
  const safeCaption = media.caption ? escapeHTML(media.caption) : "";
  const safeCredit = media.credit ? escapeHTML(media.credit) : "";

  return `
    <figure class="media-block">
      <img
        src="${safeSrc}"
        alt="${safeCaption || "صورة توضيحية"}"
        loading="lazy"
        onerror="this.closest('.media-block').classList.add('media-error')"
      />
      ${
        safeCaption || safeCredit
          ? `<figcaption>
              ${safeCaption ? `<span class="media-caption">${safeCaption}</span>` : ""}
              ${safeCredit ? `<span class="media-credit">${safeCredit}</span>` : ""}
            </figcaption>`
          : ""
      }
    </figure>`;
}

function renderVideoBlock(media) {
  const safeId = escapeHTML(media.youtubeId || "");
  const safeCaption = media.caption ? escapeHTML(media.caption) : "";

  return `
    <figure class="media-block media-video">
      <div class="video-frame">
        <iframe
          src="https://www.youtube.com/embed/${safeId}"
          title="${safeCaption || "فيديو توضيحي"}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      ${safeCaption ? `<figcaption><span class="media-caption">${safeCaption}</span></figcaption>` : ""}
    </figure>`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------- نظام التحكم المتقدم ---------- */
function setupControls() {
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentPageIndex < bookData.length - 1) showPage(++currentPageIndex);
  });
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPageIndex > 0) showPage(--currentPageIndex);
  });
}

function setupDarkMode() {
  const btn = document.getElementById("darkModeBtn");
  btn.addEventListener("click", () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle("dark", isDarkMode);
    btn.textContent = isDarkMode ? "☀️" : "🌙";
  });
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase().trim();
    if (!term) {
      buildIndex();
      return;
    }
    const filtered = bookData.filter(
      (page) =>
        page.title.toLowerCase().includes(term) ||
        page.chapter.toLowerCase().includes(term) ||
        (page.englishTitle || "").toLowerCase().includes(term),
    );
    buildIndex(filtered);
  });
}

/* ---------- منطق تشغيل الفهرس التفاعلي السفلي للموبايل ---------- */
function setupMobileIndexToggle() {
  const toggleBtn = document.getElementById("toggleIndexBtn");
  const sidebar = document.getElementById("indexSidebar");
  const overlay = document.getElementById("indexOverlay");

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.add("show");
    overlay.classList.add("show");
  });

  overlay.addEventListener("click", closeMobileSidebar);
}

function closeMobileSidebar() {
  const sidebar = document.getElementById("indexSidebar");
  const overlay = document.getElementById("indexOverlay");
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
}
