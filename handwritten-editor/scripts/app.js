const STORAGE_KEY = "handLetterDraft";

const paperOptions = [
  {
    id: "cotton",
    label: "코튼 화이트",
    background: "var(--paper-cotton)",
    texture: "repeating-linear-gradient(transparent 0 28px, rgba(47,27,12,0.08) 29px)",
  },
  {
    id: "craft",
    label: "크래프트",
    background: "var(--paper-craft)",
    texture:
      "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(47,27,12,0.04)), repeating-linear-gradient(transparent 0 24px, rgba(47,27,12,0.1) 25px)",
  },
  {
    id: "vintage",
    label: "빈티지",
    background: "var(--paper-vintage)",
    texture:
      "linear-gradient(180deg, rgba(235,209,154,0.2), rgba(255,255,255,0.6)), repeating-linear-gradient(transparent 0 36px, rgba(47,27,12,0.06) 37px)",
  },
];

const inkOptions = [
  { id: "navy", label: "밤하늘", value: "#1d2a44" },
  { id: "burgundy", label: "버건디", value: "#6d1a28" },
  { id: "forest", label: "포레스트", value: "#0f3b2e" },
  { id: "cocoa", label: "카카오", value: "#3b2418" },
];

const fontOptions = [
  { id: "nanum", label: "나눔 손글씨", stack: '"Nanum Pen Script", cursive' },
  { id: "apple", label: "홈메이드", stack: '"Homemade Apple", cursive' },
  { id: "serif", label: "따뜻한 명조", stack: '"Song Myung", serif' },
];

const stickerOptions = ["♡", "✉️", "🌿", "✨", "🐻", "💌", "🍀"];

const state = {
  paper: paperOptions[0].id,
  ink: inkOptions[0].id,
  font: fontOptions[0].id,
  lineHeight: 1.4,
  content: "",
  stickers: [],
};

const refs = {
  letterInput: document.getElementById("letter-input"),
  paper: document.getElementById("paper"),
  paperLabel: document.getElementById("paper-label"),
  paperSwatches: document.getElementById("paper-swatches"),
  inkSwatches: document.getElementById("ink-swatches"),
  fontSelect: document.getElementById("font-select"),
  lineHeight: document.getElementById("line-height"),
  stickerList: document.getElementById("sticker-list"),
  previewDialog: document.getElementById("preview-dialog"),
  previewArea: document.getElementById("preview-area"),
  btnPreview: document.getElementById("btn-preview"),
  btnExport: document.getElementById("btn-export"),
  btnClosePreview: document.getElementById("btn-close-preview"),
};

init();

function init() {
  hydrateFromStorage();
  renderPaperSwatches();
  renderInkSwatches();
  renderFontSelect();
  renderStickers();
  attachEvents();
  applyState();
}

function renderPaperSwatches() {
  refs.paperSwatches.innerHTML = "";
  paperOptions.forEach((paper) => {
    const swatch = document.createElement("button");
    swatch.className = "swatch";
    swatch.style.background = paper.background;
    swatch.title = paper.label;
    if (state.paper === paper.id) swatch.classList.add("is-selected");
    swatch.addEventListener("click", () => {
      state.paper = paper.id;
      applyState();
      persist();
      renderPaperSwatches();
    });
    refs.paperSwatches.appendChild(swatch);
  });
}

function renderInkSwatches() {
  refs.inkSwatches.innerHTML = "";
  inkOptions.forEach((ink) => {
    const swatch = document.createElement("button");
    swatch.className = "swatch";
    swatch.style.background = ink.value;
    if (state.ink === ink.id) swatch.classList.add("is-selected");
    swatch.addEventListener("click", () => {
      state.ink = ink.id;
      applyState();
      persist();
      renderInkSwatches();
    });
    refs.inkSwatches.appendChild(swatch);
  });
}

function renderFontSelect() {
  refs.fontSelect.innerHTML = "";
  fontOptions.forEach((font) => {
    const option = document.createElement("option");
    option.value = font.id;
    option.textContent = font.label;
    option.style.fontFamily = font.stack;
    refs.fontSelect.appendChild(option);
  });
  refs.fontSelect.value = state.font;
}

function renderStickers() {
  refs.stickerList.innerHTML = "";
  stickerOptions.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.className = "sticker-chip";
    btn.textContent = symbol;
    btn.addEventListener("click", () => {
      refs.letterInput.setRangeText(symbol, refs.letterInput.selectionStart, refs.letterInput.selectionEnd, "end");
      refs.letterInput.dispatchEvent(new Event("input"));
    });
    refs.stickerList.appendChild(btn);
  });
}

function attachEvents() {
  refs.letterInput.addEventListener("input", () => {
    state.content = refs.letterInput.value;
    persist();
  });

  refs.fontSelect.addEventListener("change", (event) => {
    state.font = event.target.value;
    applyState();
    persist();
  });

  refs.lineHeight.addEventListener("input", (event) => {
    state.lineHeight = parseFloat(event.target.value);
    applyState();
    persist();
  });

  refs.btnPreview.addEventListener("click", () => {
    refs.previewArea.innerText = state.content || "아직 작성된 내용이 없어요.";
    refs.previewArea.style.fontFamily = currentFont().stack;
    refs.previewArea.style.color = currentInk().value;
    refs.previewArea.style.lineHeight = state.lineHeight;
    refs.previewDialog.showModal();
  });

  refs.btnClosePreview.addEventListener("click", () => {
    refs.previewDialog.close();
  });

  refs.btnExport.addEventListener("click", handleExport);
}

function applyState() {
  refs.letterInput.value = state.content;
  refs.letterInput.style.fontFamily = currentFont().stack;
  refs.letterInput.style.color = currentInk().value;
  refs.letterInput.style.lineHeight = state.lineHeight;
  refs.lineHeight.value = state.lineHeight;
  refs.paperLabel.textContent = currentPaper().label;
  refs.paper.style.background = currentPaper().background;
  refs.paper.style.backgroundImage = currentPaper().texture;
}

function currentPaper() {
  return paperOptions.find((p) => p.id === state.paper) ?? paperOptions[0];
}

function currentInk() {
  return inkOptions.find((ink) => ink.id === state.ink) ?? inkOptions[0];
}

function currentFont() {
  return fontOptions.find((font) => font.id === state.font) ?? fontOptions[0];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydrateFromStorage() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return;
    const parsed = JSON.parse(cached);
    Object.assign(state, parsed);
  } catch (error) {
    console.warn("Draft load failed", error);
  }
}

function handleExport() {
  alert("실제 PNG 변환은 html2canvas 등으로 연결 예정입니다. 현재는 초안 상태예요!");
}
