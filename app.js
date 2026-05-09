const STORAGE_KEY = 'habitTracker.v1';
const HABIT_COLORS = [
  'var(--c-german)', 'var(--c-ai)', 'var(--c-exercise)', 'var(--c-mind)',
  'var(--c-extra-1)', 'var(--c-extra-2)', 'var(--c-extra-3)', 'var(--c-extra-4)'
];

const DEFAULT_STATE = {
  habits: [
    { id: 'german',   name: 'ドイツ語',         emoji: '🇩🇪', color: 'var(--c-german)' },
    { id: 'ai',       name: 'AIプログラミング', emoji: '🤖', color: 'var(--c-ai)' },
    { id: 'exercise', name: '運動（体づくり）', emoji: '💪', color: 'var(--c-exercise)' },
    { id: 'mind',     name: '心（演じる、自分）', emoji: '🎭', color: 'var(--c-mind)' }
  ],
  records: {},
  settings: { retirementDate: null }
};

let state = loadState();
let editingHabitId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.habits) && parsed.records) {
        if (!parsed.settings) parsed.settings = { retirementDate: null };
        return parsed;
      }
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayKey() { return dateKey(new Date()); }

function isHabitDone(habitId, dKey) {
  return !!(state.records[dKey] && state.records[dKey][habitId]);
}

function toggleHabit(habitId) {
  const k = todayKey();
  if (!state.records[k]) state.records[k] = {};
  state.records[k][habitId] = !state.records[k][habitId];
  if (!state.records[k][habitId]) delete state.records[k][habitId];
  if (Object.keys(state.records[k]).length === 0) delete state.records[k];
  saveState();
  render();
}

function streakForHabit(habitId) {
  let count = 0;
  const d = new Date();
  if (!isHabitDone(habitId, dateKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (isHabitDone(habitId, dateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function overallStreak() {
  let count = 0;
  const d = new Date();
  const hasAny = (k) => state.records[k] && Object.values(state.records[k]).some(Boolean);
  if (!hasAny(dateKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (hasAny(dateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function daysUntilRetirement() {
  if (!state.settings || !state.settings.retirementDate) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(state.settings.retirementDate + 'T00:00:00');
  return Math.ceil((target - today) / (1000*60*60*24));
}

function formatDateJP(d) {
  const days = ['日','月','火','水','木','金','土'];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 5)  return '夜更かしさん 🌙';
  if (h < 11) return 'おはよう ☀️';
  if (h < 17) return 'こんにちは 🌤';
  if (h < 21) return 'こんばんは 🌆';
  return 'おつかれさま 🌙';
}

function encourageMessage() {
  const total = state.habits.length;
  const todayDone = state.records[todayKey()]
    ? Object.values(state.records[todayKey()]).filter(Boolean).length
    : 0;
  if (total === 0) return '最初の習慣を追加しよう ✨';
  if (todayDone === 0) return '今日も少しずつ進もう 🌱';
  if (todayDone < total) return `あと ${total - todayDone} つ。いい調子です 🌟`;
  return '今日は完璧！素晴らしい一日 🎉';
}

function pickColor() {
  return HABIT_COLORS[state.habits.length % HABIT_COLORS.length];
}

function addHabit(name, emoji) {
  const id = 'h_' + Date.now().toString(36);
  state.habits.push({ id, name, emoji, color: pickColor() });
  saveState();
  render();
}

function updateHabit(id, name, emoji) {
  const h = state.habits.find(h => h.id === id);
  if (!h) return;
  h.name = name;
  h.emoji = emoji;
  saveState();
  render();
}

function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  for (const k of Object.keys(state.records)) {
    if (state.records[k][id]) delete state.records[k][id];
    if (Object.keys(state.records[k]).length === 0) delete state.records[k];
  }
  saveState();
  render();
}

function render() {
  document.getElementById('greeting').textContent = greetingByHour();
  document.getElementById('dateLabel').textContent = formatDateJP(new Date());
  document.getElementById('streakValue').textContent = `${overallStreak()}日`;
  const days = daysUntilRetirement();
  document.getElementById('retireValue').textContent = days === null ? '設定 ▸' : `${days.toLocaleString()}日`;
  document.getElementById('encourage').textContent = encourageMessage();
  renderHabits();
  renderHistory();
  renderHeatmap();
}

function renderHabits() {
  const list = document.getElementById('habitList');
  const todayK = todayKey();
  list.innerHTML = '';
  for (const h of state.habits) {
    const done = isHabitDone(h.id, todayK);
    const streak = streakForHabit(h.id);
    const li = document.createElement('li');
    li.className = 'habit' + (done ? ' done' : '');
    li.style.setProperty('--habit-color', h.color);
    li.style.setProperty('--habit-bg', `color-mix(in srgb, ${h.color} 18%, transparent)`);
    li.innerHTML = `
      <div class="habit-emoji">${h.emoji}</div>
      <div class="habit-body">
        <div class="habit-name"></div>
        <div class="habit-streak">${streak > 0 ? `<span class="num">🔥 ${streak}日</span> 連続` : '今日からスタート'}</div>
      </div>
      <div class="habit-check"></div>
    `;
    li.querySelector('.habit-name').textContent = h.name;
    attachHabitGestures(li, h.id);
    list.appendChild(li);
  }
}

function renderHistory() {
  const wrap = document.getElementById('history');
  const days = ['日','月','火','水','木','金','土'];
  const total = state.habits.length || 1;
  let html = '<div class="history-row">';
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const rec = state.records[k] || {};
    const isToday = i === 0;
    let dots = '';
    for (const h of state.habits) {
      dots += `<span class="history-dot${rec[h.id] ? ' on' : ''}" style="--accent:${h.color}; background:${rec[h.id] ? h.color : ''}"></span>`;
    }
    if (state.habits.length === 0) dots = '<span class="history-dot"></span>';
    html += `
      <div class="history-day${isToday ? ' today' : ''}">
        <div>${days[d.getDay()]}</div>
        <div class="history-dots">${dots}</div>
        <div>${d.getDate()}</div>
      </div>
    `;
  }
  html += '</div>';
  wrap.innerHTML = html;
}

function attachHabitGestures(el, id) {
  let pressTimer = null;
  let longPressFired = false;
  const LONG_PRESS_MS = 500;

  const start = (e) => {
    longPressFired = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressFired = true;
      pressTimer = null;
      if (navigator.vibrate) navigator.vibrate(8);
      openEditDialog(id);
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  };

  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', () => {
    if (longPressFired) { longPressFired = false; return; }
    toggleHabit(id);
  });
}

function renderHeatmap() {
  const container = document.getElementById('heatmap');
  if (!container) return;
  const WEEKS = 16;
  const today = new Date();
  today.setHours(0,0,0,0);
  const dow = today.getDay();
  const startSunday = new Date(today);
  startSunday.setDate(today.getDate() - dow - (WEEKS - 1) * 7);

  const totalHabits = state.habits.length || 1;
  let activeLast30 = 0;
  let longestStreak = 0;
  let currentRun = 0;

  let grid = '';
  for (let row = 0; row < 7; row++) {
    let rowHtml = '';
    for (let col = 0; col < WEEKS; col++) {
      const d = new Date(startSunday);
      d.setDate(startSunday.getDate() + col * 7 + row);
      const k = dateKey(d);
      const rec = state.records[k] || {};
      const done = state.habits.filter(h => rec[h.id]).length;
      const ratio = done / totalHabits;
      const isFuture = d > today;
      let cls = 'heat-cell';
      if (isFuture) cls += ' future';
      else if (done === 0) cls += ' lvl-0';
      else if (ratio < 0.34) cls += ' lvl-1';
      else if (ratio < 0.67) cls += ' lvl-2';
      else if (ratio < 1) cls += ' lvl-3';
      else cls += ' lvl-4';
      const tip = `${k} ${done}/${totalHabits}`;
      rowHtml += `<div class="${cls}" title="${tip}"></div>`;
    }
    grid += `<div class="heat-row">${rowHtml}</div>`;
  }

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const has = state.records[k] && Object.values(state.records[k]).some(Boolean);
    if (i < 30 && has) activeLast30++;
    if (has) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 0;
    }
  }

  container.innerHTML = `
    <div class="heat-grid">${grid}</div>
    <div class="heat-axis"><span>4ヶ月前</span><span>今日</span></div>
    <div class="heat-stats">
      <div><span class="label">過去30日</span><span class="value">${activeLast30}<span class="unit">日</span></span></div>
      <div><span class="label">最長連続</span><span class="value">${longestStreak}<span class="unit">日</span></span></div>
    </div>
  `;
}

function openEditDialog(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  editingHabitId = id;
  document.getElementById('editEmoji').value = h.emoji;
  document.getElementById('editName').value = h.name;
  document.getElementById('editDialog').showModal();
}

document.getElementById('retireCard').addEventListener('click', () => {
  document.getElementById('retireDate').value = state.settings.retirementDate || '';
  document.getElementById('retireDialog').showModal();
});

document.getElementById('cancelRetire').addEventListener('click', () => {
  document.getElementById('retireDialog').close();
});

document.getElementById('retireForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = document.getElementById('retireDate').value;
  state.settings.retirementDate = v || null;
  saveState();
  render();
  document.getElementById('retireDialog').close();
});

document.getElementById('addBtn').addEventListener('click', () => {
  document.getElementById('newEmoji').value = '';
  document.getElementById('newName').value = '';
  document.getElementById('addDialog').showModal();
});

document.getElementById('cancelAdd').addEventListener('click', () => {
  document.getElementById('addDialog').close();
});

document.getElementById('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const emoji = document.getElementById('newEmoji').value.trim() || '✨';
  const name = document.getElementById('newName').value.trim();
  if (!name) return;
  addHabit(name, emoji);
  document.getElementById('addDialog').close();
});

document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editDialog').close();
});

document.getElementById('editForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!editingHabitId) return;
  const emoji = document.getElementById('editEmoji').value.trim() || '✨';
  const name = document.getElementById('editName').value.trim();
  if (!name) return;
  updateHabit(editingHabitId, name, emoji);
  document.getElementById('editDialog').close();
  editingHabitId = null;
});

document.getElementById('deleteHabit').addEventListener('click', () => {
  if (!editingHabitId) return;
  if (confirm('この習慣を削除しますか？（記録も消えます）')) {
    deleteHabit(editingHabitId);
    document.getElementById('editDialog').close();
    editingHabitId = null;
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();
});

render();
