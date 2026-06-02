const boardEl = document.querySelector("#board");
const goalsEl = document.querySelector("#goals");
const levelEl = document.querySelector("#level");
const movesEl = document.querySelector("#moves");
const betEl = document.querySelector("#bet");
const scoreEl = document.querySelector("#score");
const balanceEl = document.querySelector("#balance");
const prizeEl = document.querySelector("#prize");
const messageEl = document.querySelector("#message");
const newLevelBtn = document.querySelector("#newLevel");
const cascadeBannerEl = document.querySelector("#cascadeBanner");
const jackpotOverlayEl = document.querySelector("#jackpotOverlay");
const jackpotFormulaEl = document.querySelector("#jackpotFormula");
const jackpotTotalEl = document.querySelector("#jackpotTotal");

const size = 8;
const betPerMove = 10;
const startMoves = 25;
const candyScore = 1;
const colors = [
  { name: "Red", value: "#ff4f78", shape: "shape-1" },
  { name: "Orange", value: "#ff9b36", shape: "shape-2" },
  { name: "Yellow", value: "#ffd93d", shape: "shape-3" },
  { name: "Green", value: "#48d46f", shape: "shape-4" },
  { name: "Blue", value: "#4aa8ff", shape: "shape-5" },
  { name: "Purple", value: "#a263ff", shape: "shape-6" },
];

let board = [];
let goals = [];
let level = 1;
let moves = startMoves;
let score = 0;
let balance = 1000;
let selectedIndex = null;
let hintPair = [];
let hintTimer = null;
let audioContext = null;
let musicNodes = null;
let locked = false;
let levelOver = false;

function createCandy(color = randomColor(), special = null) {
  return { color, special };
}

function randomColor() {
  return Math.floor(Math.random() * colors.length);
}

function indexOf(row, col) {
  return row * size + col;
}

function rowOf(index) {
  return Math.floor(index / size);
}

function colOf(index) {
  return index % size;
}

function colorAt(index) {
  const candy = board[index];
  if (!candy || candy.special === "bomb") return null;
  return candy.color;
}

function isNeighbor(a, b) {
  return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1;
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("en-US");
}

function setMessage(text) {
  messageEl.textContent = text;
}

function showCascade(chain, removedCount) {
  if (chain <= 1) return;
  cascadeBannerEl.textContent = chain >= 4 ? `MEGA CASCADE x${chain}` : `CASCADE x${chain}`;
  cascadeBannerEl.classList.remove("show");
  void cascadeBannerEl.offsetWidth;
  cascadeBannerEl.classList.add("show");
  playCascadeSound(chain, removedCount);
}

function resetCascadeEffects() {
  boardEl.classList.remove("drop-in");
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().then(() => startMusic());
  }
  startMusic();
}

function playTone(frequency, duration = 0.08, type = "sine", gainValue = 0.045, delay = 0) {
  if (!audioContext) return;
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(name) {
  if (!audioContext) return;
  if (name === "select") playTone(520, 0.05, "triangle", 0.045);
  if (name === "swap") {
    playTone(420, 0.06, "triangle", 0.052);
    playTone(620, 0.06, "triangle", 0.052, 0.055);
  }
  if (name === "match") {
    playTone(660, 0.08, "sine", 0.07);
    playTone(880, 0.08, "sine", 0.07, 0.07);
    playTone(1180, 0.1, "sine", 0.065, 0.14);
  }
  if (name === "special") {
    playTone(420, 0.07, "square", 0.08);
    playTone(740, 0.09, "triangle", 0.095, 0.05);
    playTone(1110, 0.1, "triangle", 0.1, 0.12);
    playTone(1660, 0.16, "sine", 0.09, 0.2);
  }
  if (name === "bomb") {
    playTone(160, 0.16, "sawtooth", 0.09);
    playTone(520, 0.1, "square", 0.1, 0.08);
    playTone(880, 0.12, "triangle", 0.11, 0.18);
    playTone(1320, 0.2, "sine", 0.1, 0.3);
  }
  if (name === "invalid") {
    playTone(180, 0.11, "sawtooth", 0.045);
    playTone(130, 0.12, "sawtooth", 0.04, 0.09);
  }
  if (name === "win") {
    playTone(660, 0.1, "triangle", 0.08);
    playTone(880, 0.1, "triangle", 0.08, 0.1);
    playTone(1320, 0.18, "triangle", 0.08, 0.2);
  }
  if (name === "jackpot") {
    playTone(392, 0.08, "square", 0.09);
    playTone(523, 0.08, "square", 0.09, 0.08);
    playTone(659, 0.09, "square", 0.09, 0.16);
    playTone(988, 0.16, "triangle", 0.1, 0.26);
    playTone(1318, 0.28, "sine", 0.1, 0.42);
  }
  if (name === "lose") playTone(150, 0.34, "sawtooth", 0.055);
}

function playCascadeSound(chain, removedCount) {
  const base = Math.min(1200, 520 + chain * 110 + removedCount * 5);
  playTone(base, 0.08, "triangle", 0.085);
  playTone(base * 1.25, 0.1, "sine", 0.08, 0.08);
  if (chain >= 3) playTone(base * 1.6, 0.16, "square", 0.07, 0.18);
}

function startMusic() {
  if (!audioContext || musicNodes) return;

  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.075, audioContext.currentTime);
  master.connect(audioContext.destination);

  musicNodes = {
    master,
    step: 0,
    timer: window.setInterval(() => playMusicStep(), 155),
  };
  playMusicStep();
}

function playMusicStep() {
  if (!audioContext || !musicNodes) return;
  const scale = [262, 330, 392, 523, 392, 330, 440, 587];
  const bass = [98, 98, 131, 98, 147, 147, 131, 110];
  const step = musicNodes.step % 16;
  const now = audioContext.currentTime;

  const lead = audioContext.createOscillator();
  const leadGain = audioContext.createGain();
  lead.type = "square";
  lead.frequency.setValueAtTime(scale[step % scale.length], now);
  leadGain.gain.setValueAtTime(step % 2 === 0 ? 0.12 : 0.08, now);
  leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);
  lead.connect(leadGain);
  leadGain.connect(musicNodes.master);
  lead.start(now);
  lead.stop(now + 0.115);

  if (step % 4 === 0) {
    const bassOsc = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bassOsc.type = "triangle";
    bassOsc.frequency.setValueAtTime(bass[(step / 4) % bass.length], now);
    bassGain.gain.setValueAtTime(0.14, now);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    bassOsc.connect(bassGain);
    bassGain.connect(musicNodes.master);
    bassOsc.start(now);
    bassOsc.stop(now + 0.2);
  }

  musicNodes.step += 1;
}

function queueHint() {
  window.clearTimeout(hintTimer);
  if (locked || levelOver) return;
  hintTimer = window.setTimeout(() => {
    if (locked || levelOver || selectedIndex !== null) return;
    hintPair = findPossibleMove();
    if (hintPair.length) renderBoard();
  }, 1000);
}

function clearHint() {
  window.clearTimeout(hintTimer);
  hintPair = [];
}

function generateGoals() {
  const shuffled = [...colors.keys()].sort(() => Math.random() - 0.5);
  goals = shuffled.slice(0, 3).map((colorIndex, order) => ({
    colorIndex,
    target: 5 + Math.min(level, 5) + order * 2 + Math.floor(Math.random() * 3),
    current: 0,
  }));
}

function makeCleanBoard() {
  board = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      let color = randomColor();
      while (
        (col >= 2 && colorAt(indexOf(row, col - 1)) === color && colorAt(indexOf(row, col - 2)) === color) ||
        (row >= 2 && colorAt(indexOf(row - 1, col)) === color && colorAt(indexOf(row - 2, col)) === color)
      ) {
        color = randomColor();
      }
      board.push(createCandy(color));
    }
  }
}

function renderAll() {
  renderStats();
  renderGoals();
  renderBoard();
  queueHint();
}

function renderStats() {
  levelEl.textContent = level;
  movesEl.textContent = moves;
  betEl.textContent = betPerMove;
  scoreEl.textContent = formatNumber(score);
  balanceEl.textContent = formatNumber(balance);
  prizeEl.textContent = formatNumber(score * moves);
}

function renderGoals() {
  goalsEl.innerHTML = "";
  goals.forEach((goal) => {
    const color = colors[goal.colorIndex];
    const done = goal.current >= goal.target;
    const card = document.createElement("article");
    card.className = `goal${done ? " done" : ""}`;
    card.innerHTML = `
      <div class="goal-candy" style="--c:${color.value}"></div>
      <div>
        <span>${color.name}</span>
        <strong>${Math.min(goal.current, goal.target)} / ${goal.target}</strong>
        <small>${done ? "DONE" : "TARGET"}</small>
      </div>
    `;
    goalsEl.append(card);
  });
}

function renderBoard(invalidIndex = null) {
  boardEl.innerHTML = "";
  board.forEach((candy, index) => {
    const isBomb = candy?.special === "bomb";
    const color = isBomb ? { name: "Color Bomb", value: "#2a1b33", shape: "shape-1" } : colors[candy.color];
    const tile = document.createElement("button");
    const specialClass = candy.special ? ` special-${candy.special}` : "";
    tile.className = "tile";
    if (selectedIndex === index) tile.classList.add("selected");
    if (hintPair.includes(index)) tile.classList.add("hint");
    if (invalidIndex === index) tile.classList.add("invalid");
    tile.dataset.index = index;
    tile.setAttribute("aria-label", `${color.name} candy`);
    tile.innerHTML = `<div class="candy ${color.shape}${specialClass}" style="--c:${color.value}"></div>`;
    tile.addEventListener("click", () => chooseTile(index));
    boardEl.append(tile);
  });
}

function chooseTile(index) {
  if (locked || levelOver) return;
  unlockAudio();
  clearHint();
  if (selectedIndex === null) {
    selectedIndex = index;
    playSound("select");
    renderBoard();
    return;
  }
  if (selectedIndex === index) {
    selectedIndex = null;
    renderBoard();
    queueHint();
    return;
  }
  if (!isNeighbor(selectedIndex, index)) {
    selectedIndex = index;
    playSound("select");
    renderBoard();
    return;
  }
  tryMove(selectedIndex, index);
}

async function tryMove(first, second) {
  if (balance < betPerMove) {
    setMessage("Not enough balance.");
    return;
  }

  const firstCandy = board[first];
  const secondCandy = board[second];
  const bombMove = firstCandy.special === "bomb" || secondCandy.special === "bomb";

  if (bombMove) {
    const target = firstCandy.special === "bomb" ? secondCandy : firstCandy;
    if (target.special === "bomb") {
      await applyValidMove(() => resolveColorBomb(null));
    } else {
      await applyValidMove(() => resolveColorBomb(target.color));
    }
    return;
  }

  swap(first, second);
  selectedIndex = null;
  renderBoard();
  playSound("swap");

  const matchInfo = findMatchInfo();
  if (!matchInfo.matches.size) {
    await wait(180);
    swap(first, second);
    renderBoard(second);
    playSound("invalid");
    setMessage("No match. The swap bounces back and does not cost BET.");
    hintPair = findPossibleMove();
    if (!hintPair.length) {
      hintPair = [];
      setMessage("No possible moves. Board shuffled.");
      makeCleanBoard();
    }
    renderBoard(second);
    queueHint();
    return;
  }

  await applyValidMove(() => resolveBoard(matchInfo, [first, second]));
}

async function applyValidMove(action) {
  balance -= betPerMove;
  moves -= 1;
  setMessage(`Valid move. BET -${betPerMove}.`);
  await action();
  checkLevelState();
}

async function resolveColorBomb(targetColor) {
  locked = true;
  selectedIndex = null;
  const matches = new Set();
  board.forEach((candy, index) => {
    if (!candy) return;
    if (candy.special === "bomb" || targetColor === null || candy.color === targetColor) matches.add(index);
  });
  markColorBombEffect(targetColor);
  markPops(matches);
  playSound("bomb");
  await wait(420);
  collectMatches(matches, 1);
  removeMatches(matches);
  collapseBoard();
  fillBoard();
  renderAll();
  await wait(160);
  await resolveBoard(findMatchInfo(), []);
}

async function resolveBoard(initialInfo = null, moved = []) {
  locked = true;
  let info = initialInfo || findMatchInfo();
  let chain = 1;

  while (info.matches.size) {
    const created = chain === 1 ? chooseCreatedSpecial(info, moved) : null;
    const removal = expandSpecials(info.matches, created?.index ?? null);
    const specialTriggered = markSpecialEffects(info.matches, created?.index ?? null);
    markPops(removal);
    playSound(specialTriggered || created ? "special" : "match");
    await wait(specialTriggered ? 360 : 240);
    collectMatches(removal, chain);
    showCascade(chain, removal.size);
    removeMatches(removal);
    if (created) {
      board[created.index] = createCandy(created.color, created.special);
      setMessage(created.message);
    }
    collapseBoard();
    fillBoard();
    boardEl.classList.remove("bomb-burst");
    renderAll();
    await wait(chain > 1 ? 110 : 150);
    resetCascadeEffects();
    info = findMatchInfo();
    chain += 1;
  }

  locked = false;
  queueHint();
}

function findMatchInfo() {
  const matches = new Set();
  const runs = [];

  for (let row = 0; row < size; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= size; col += 1) {
      const current = col < size ? colorAt(indexOf(row, col)) : null;
      const previous = colorAt(indexOf(row, col - 1));
      if (current !== previous) {
        const runLength = col - runStart;
        if (previous !== null && runLength >= 3) {
          const indices = [];
          for (let matchCol = runStart; matchCol < col; matchCol += 1) {
            const index = indexOf(row, matchCol);
            matches.add(index);
            indices.push(index);
          }
          runs.push({ indices, color: previous, orientation: "h", length: runLength });
        }
        runStart = col;
      }
    }
  }

  for (let col = 0; col < size; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= size; row += 1) {
      const current = row < size ? colorAt(indexOf(row, col)) : null;
      const previous = colorAt(indexOf(row - 1, col));
      if (current !== previous) {
        const runLength = row - runStart;
        if (previous !== null && runLength >= 3) {
          const indices = [];
          for (let matchRow = runStart; matchRow < row; matchRow += 1) {
            const index = indexOf(matchRow, col);
            matches.add(index);
            indices.push(index);
          }
          runs.push({ indices, color: previous, orientation: "v", length: runLength });
        }
        runStart = row;
      }
    }
  }

  return { matches, runs };
}

function chooseCreatedSpecial(info, moved) {
  const movedInMatch = moved.find((index) => info.matches.has(index));

  for (const index of info.matches) {
    const atIndex = info.runs.filter((run) => run.indices.includes(index));
    const hasHorizontal = atIndex.some((run) => run.orientation === "h");
    const hasVertical = atIndex.some((run) => run.orientation === "v");
    if (hasHorizontal && hasVertical) {
      const chosen = movedInMatch && info.matches.has(movedInMatch) ? movedInMatch : index;
      return {
        index: chosen,
        color: colorAt(chosen),
        special: "wrap",
        message: "Wrapped candy created!",
      };
    }
  }

  const fiveRun = info.runs.find((run) => run.length >= 5);
  if (fiveRun) {
    return {
      index: chooseSpecialIndex(fiveRun.indices, moved),
      color: fiveRun.color,
      special: "bomb",
      message: "Color bomb created!",
    };
  }

  const fourRun = info.runs.find((run) => run.length === 4);
  if (fourRun) {
    return {
      index: chooseSpecialIndex(fourRun.indices, moved),
      color: fourRun.color,
      special: fourRun.orientation === "h" ? "h" : "v",
      message: fourRun.orientation === "h" ? "Horizontal striped candy created!" : "Vertical striped candy created!",
    };
  }

  return null;
}

function chooseSpecialIndex(indices, moved) {
  return moved.find((index) => indices.includes(index)) ?? indices[Math.floor(indices.length / 2)];
}

function expandSpecials(matches, preserveIndex = null) {
  const removal = new Set(matches);
  let changed = true;

  while (changed) {
    changed = false;
    for (const index of [...removal]) {
      if (index === preserveIndex) continue;
      const candy = board[index];
      if (!candy || !candy.special || candy._expanded) continue;
      candy._expanded = true;
      const before = removal.size;

      if (candy.special === "h") {
        const row = rowOf(index);
        for (let col = 0; col < size; col += 1) removal.add(indexOf(row, col));
      }
      if (candy.special === "v") {
        const col = colOf(index);
        for (let row = 0; row < size; row += 1) removal.add(indexOf(row, col));
      }
      if (candy.special === "wrap") {
        for (let row = rowOf(index) - 1; row <= rowOf(index) + 1; row += 1) {
          for (let col = colOf(index) - 1; col <= colOf(index) + 1; col += 1) {
            if (row >= 0 && row < size && col >= 0 && col < size) removal.add(indexOf(row, col));
          }
        }
      }
      if (candy.special === "bomb") {
        const color = colorAt(index);
        board.forEach((other, otherIndex) => {
          if (other?.color === color || other?.special === "bomb") removal.add(otherIndex);
        });
      }

      if (removal.size > before) changed = true;
    }
  }

  board.forEach((candy) => {
    if (candy) delete candy._expanded;
  });
  if (preserveIndex !== null) removal.delete(preserveIndex);
  return removal;
}

function findPossibleMove() {
  for (let index = 0; index < board.length; index += 1) {
    const candidates = [];
    const row = rowOf(index);
    const col = colOf(index);
    if (col < size - 1) candidates.push(index + 1);
    if (row < size - 1) candidates.push(index + size);

    for (const other of candidates) {
      if (board[index].special === "bomb" || board[other].special === "bomb") return [index, other];
      swap(index, other);
      const works = findMatchInfo().matches.size > 0;
      swap(index, other);
      if (works) return [index, other];
    }
  }
  return [];
}

function markPops(matches) {
  matches.forEach((index) => {
    boardEl.children[index]?.classList.add("pop");
  });
}

function markSpecialEffects(matches, preserveIndex = null) {
  let hasSpecial = false;
  matches.forEach((index) => {
    if (index === preserveIndex) return;
    const candy = board[index];
    const tile = boardEl.children[index];
    if (!candy?.special || !tile) return;
    hasSpecial = true;
    tile.classList.add("special-flash");

    if (candy.special === "h") {
      for (let col = 0; col < size; col += 1) {
        boardEl.children[indexOf(rowOf(index), col)]?.classList.add("beam-row");
      }
    }
    if (candy.special === "v") {
      for (let row = 0; row < size; row += 1) {
        boardEl.children[indexOf(row, colOf(index))]?.classList.add("beam-col");
      }
    }
    if (candy.special === "wrap") {
      for (let row = rowOf(index) - 1; row <= rowOf(index) + 1; row += 1) {
        for (let col = colOf(index) - 1; col <= colOf(index) + 1; col += 1) {
          if (row >= 0 && row < size && col >= 0 && col < size) {
            boardEl.children[indexOf(row, col)]?.classList.add("blast-zone");
          }
        }
      }
    }
  });
  return hasSpecial;
}

function markColorBombEffect(targetColor) {
  boardEl.classList.add("bomb-burst");
  board.forEach((candy, index) => {
    if (!candy) return;
    if (candy.special === "bomb" || targetColor === null || candy.color === targetColor) {
      boardEl.children[index]?.classList.add("color-burst");
    }
  });
}

function collectMatches(matches, chain) {
  const removedByColor = Array(colors.length).fill(0);
  matches.forEach((index) => {
    const candy = board[index];
    if (candy && candy.color !== null) removedByColor[candy.color] += 1;
  });

  goals.forEach((goal) => {
    goal.current += removedByColor[goal.colorIndex];
  });

  score += matches.size * candyScore * chain * chain;
  setMessage(chain > 1 ? `Chain x${chain}! Removed ${matches.size} candies.` : `Removed ${matches.size} candies.`);
}

function removeMatches(matches) {
  matches.forEach((index) => {
    board[index] = null;
  });
}

function collapseBoard() {
  for (let col = 0; col < size; col += 1) {
    const stack = [];
    for (let row = size - 1; row >= 0; row -= 1) {
      const candy = board[indexOf(row, col)];
      if (candy !== null) stack.push(candy);
    }
    for (let row = size - 1; row >= 0; row -= 1) {
      board[indexOf(row, col)] = stack.shift() ?? null;
    }
  }
}

function fillBoard() {
  board = board.map((candy) => (candy === null ? createCandy() : candy));
}

function swap(first, second) {
  [board[first], board[second]] = [board[second], board[first]];
}

function goalsComplete() {
  return goals.every((goal) => goal.current >= goal.target);
}

function showJackpot(prize) {
  jackpotFormulaEl.textContent = `${formatNumber(score)} x ${moves}`;
  jackpotTotalEl.textContent = formatNumber(prize);
  jackpotOverlayEl.setAttribute("aria-hidden", "false");
  jackpotOverlayEl.classList.remove("show");
  void jackpotOverlayEl.offsetWidth;
  jackpotOverlayEl.classList.add("show");
  playSound("jackpot");
  window.setTimeout(() => {
    jackpotOverlayEl.classList.remove("show");
    jackpotOverlayEl.setAttribute("aria-hidden", "true");
  }, 2600);
}

function checkLevelState() {
  renderAll();
  if (goalsComplete()) {
    const prize = score * moves;
    balance += prize;
    levelOver = true;
    showJackpot(prize);
    setMessage(`Level clear! Prize = ${formatNumber(score)} x ${moves} = ${formatNumber(prize)}.`);
    renderStats();
    return;
  }
  if (moves <= 0) {
    levelOver = true;
    playSound("lose");
    setMessage("Out of moves. Mission failed.");
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function startLevel(nextLevel = false) {
  if (nextLevel) level += 1;
  moves = startMoves;
  score = 0;
  selectedIndex = null;
  hintPair = [];
  window.clearTimeout(hintTimer);
  locked = false;
  levelOver = false;
  jackpotOverlayEl.classList.remove("show");
  jackpotOverlayEl.setAttribute("aria-hidden", "true");
  generateGoals();
  makeCleanBoard();
  renderAll();
  setMessage("Match 3 or more. Match 4, 5, T, or L to make specials.");
}

newLevelBtn.addEventListener("click", () => {
  unlockAudio();
  startLevel(levelOver && goalsComplete());
});

document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

startLevel();
