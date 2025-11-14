const boardEl = document.getElementById("board");
const boardSizeSelect = document.getElementById("boardSize");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");
const imageLoader = document.getElementById("imageLoader");
const moveCounterEl = document.getElementById("moveCounter");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("statusMessage");

const DEFAULT_IMAGE = "./assets/kim-photo.jpg";

class SlidingPuzzle {
  constructor(boardEl, { moveCounterEl, timerEl, statusEl }) {
    this.boardEl = boardEl;
    this.moveCounterEl = moveCounterEl;
    this.timerEl = timerEl;
    this.statusEl = statusEl;
    this.gridSize = 4;
    this.tiles = [];
    this.moves = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.imageUrl = null;

    this.boardEl.addEventListener("click", (event) => {
      const tileBtn = event.target.closest(".tile");
      if (!tileBtn || tileBtn.classList.contains("blank")) return;
      const tileIndex = Number(tileBtn.dataset.index);
      this.moveTile(tileIndex);
    });

    document.addEventListener("keydown", (event) => {
      const handled = this.handleArrowKey(event.key);
      if (handled) {
        event.preventDefault();
      }
    });

    this.reset();
    this.tryLoadDefaultImage();
  }

  async tryLoadDefaultImage() {
    try {
      await this.updateImage(DEFAULT_IMAGE);
    } catch (error) {
      console.warn("기본 이미지를 불러오지 못했습니다.", error);
      this.setStatus("assets 폴더에 사용할 사진을 넣고 파일을 선택하세요.");
    }
  }

  generateSolvedTiles() {
    const total = this.gridSize ** 2;
    return Array.from({ length: total }, (_, index) =>
      index === total - 1 ? null : index + 1
    );
  }

  reset() {
    this.tiles = this.generateSolvedTiles();
    this.moves = 0;
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.updateStats();
    this.setStatus("");
    this.render();
  }

  async updateImage(src) {
    if (!src) return;
    await this.preloadImage(src);
    this.imageUrl = src;
    this.render();
    this.setStatus("새 사진이 적용되었습니다. 섞기를 눌러 시작하세요!");
  }

  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = reject;
      img.src = src;
    });
  }

  shuffle() {
    const shuffled = this.generateSolvedTiles();
    do {
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } while (!this.isSolvable(shuffled) || this.isSolved(shuffled));

    this.tiles = shuffled;
    this.moves = 0;
    this.elapsedSeconds = 0;
    this.startTimer();
    this.updateStats();
    this.setStatus("퍼즐이 섞였습니다. 행운을 빕니다!");
    this.render();
  }

  setGridSize(size) {
    if (size === this.gridSize) return;
    this.gridSize = size;
    this.reset();
    this.setStatus(`${size} × ${size} 퍼즐로 전환했습니다.`);
  }

  moveTile(tileIndex) {
    const blankIndex = this.tiles.indexOf(null);
    if (!this.isAdjacent(tileIndex, blankIndex)) return;

    [this.tiles[tileIndex], this.tiles[blankIndex]] = [
      this.tiles[blankIndex],
      this.tiles[tileIndex],
    ];
    if (!this.timerInterval) {
      this.startTimer();
    }
    this.moves += 1;
    this.render();
    this.updateStats();

    if (this.isSolved(this.tiles)) {
      this.stopTimer();
      this.setStatus(
        `축하합니다! ${this.moves}번 이동, ${this.formatTime(
          this.elapsedSeconds
        )}만에 완성했습니다.`
      );
    }
  }

  isAdjacent(indexA, indexB) {
    const rowA = Math.floor(indexA / this.gridSize);
    const colA = indexA % this.gridSize;
    const rowB = Math.floor(indexB / this.gridSize);
    const colB = indexB % this.gridSize;
    const distance = Math.abs(rowA - rowB) + Math.abs(colA - colB);
    return distance === 1;
  }

  isSolved(tiles) {
    return tiles.every((value, idx) => {
      if (idx === tiles.length - 1) {
        return value === null;
      }
      return value === idx + 1;
    });
  }

  isSolvable(tiles) {
    const flattened = tiles.filter((tile) => tile !== null);
    let inversions = 0;
    for (let i = 0; i < flattened.length; i += 1) {
      for (let j = i + 1; j < flattened.length; j += 1) {
        if (flattened[i] > flattened[j]) {
          inversions += 1;
        }
      }
    }

    if (this.gridSize % 2 !== 0) {
      return inversions % 2 === 0;
    }

    const blankIndex = tiles.indexOf(null);
    const blankRowFromBottom =
      this.gridSize - Math.floor(blankIndex / this.gridSize);
    if (blankRowFromBottom % 2 === 0) {
      return inversions % 2 !== 0;
    }
    return inversions % 2 === 0;
  }

  render() {
    this.boardEl.style.setProperty("--grid-size", this.gridSize);
    this.boardEl.innerHTML = "";

    this.tiles.forEach((value, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.dataset.index = index;

      if (value === null) {
        tile.classList.add("blank");
        tile.setAttribute("tabindex", "-1");
        tile.setAttribute("aria-hidden", "true");
      } else {
        tile.textContent = value;
        tile.setAttribute("aria-label", `${value}번 조각`);
        if (this.imageUrl) {
          tile.style.backgroundImage = `url('${this.imageUrl}')`;
          tile.style.backgroundPosition = this.calculateBackgroundPosition(
            value
          );
        } else {
          tile.style.backgroundImage = "none";
        }
      }

      this.boardEl.appendChild(tile);
    });
  }

  calculateBackgroundPosition(value) {
    if (this.gridSize === 1) return "50% 50%";
    const row = Math.floor((value - 1) / this.gridSize);
    const col = (value - 1) % this.gridSize;
    const posX =
      this.gridSize === 1 ? 50 : (col / (this.gridSize - 1)) * 100;
    const posY =
      this.gridSize === 1 ? 50 : (row / (this.gridSize - 1)) * 100;
    return `${posX}% ${posY}%`;
  }

  updateStats() {
    this.moveCounterEl.textContent = this.moves;
    this.timerEl.textContent = this.formatTime(this.elapsedSeconds);
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
      this.timerEl.textContent = this.formatTime(this.elapsedSeconds);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  handleArrowKey(key) {
    const blankIndex = this.tiles.indexOf(null);
    const row = Math.floor(blankIndex / this.gridSize);
    const col = blankIndex % this.gridSize;
    let targetIndex = null;

    switch (key) {
      case "ArrowUp":
        if (row < this.gridSize - 1) {
          targetIndex = blankIndex + this.gridSize;
        }
        break;
      case "ArrowDown":
        if (row > 0) {
          targetIndex = blankIndex - this.gridSize;
        }
        break;
      case "ArrowLeft":
        if (col < this.gridSize - 1) {
          targetIndex = blankIndex + 1;
        }
        break;
      case "ArrowRight":
        if (col > 0) {
          targetIndex = blankIndex - 1;
        }
        break;
      default:
        return false;
    }

    if (targetIndex !== null) {
      this.moveTile(targetIndex);
      return true;
    }
    return false;
  }

  setStatus(message) {
    this.statusEl.textContent = message;
  }
}

const puzzle = new SlidingPuzzle(boardEl, {
  moveCounterEl,
  timerEl,
  statusEl,
});

shuffleBtn.addEventListener("click", () => puzzle.shuffle());
resetBtn.addEventListener("click", () => puzzle.reset());

boardSizeSelect.addEventListener("change", (event) => {
  puzzle.setGridSize(Number(event.target.value));
});

imageLoader.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const src = e.target?.result;
    if (typeof src === "string") {
      try {
        await puzzle.updateImage(src);
      } catch (error) {
        console.error("이미지를 적용할 수 없습니다.", error);
        puzzle.setStatus("이미지 적용에 실패했습니다. 다른 파일을 선택하세요.");
      }
    }
  };
  reader.readAsDataURL(file);
});
