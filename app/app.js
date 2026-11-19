// Leonida Legend — an offline GTA VI trophy guide and tracker.
// Loads app/data/trophies.json (the official 55, each with an own-words guide
// and its sources), renders the checklist, the roadmap, the filters and the
// spoiler shield, and saves progress in the browser. No network at run time:
// the only fetch is the local data file, and every link opens only when the
// reader follows it.

const STORAGE_KEY = 'gta6-trophy-guide-v1';

const ROADMAP_STAGES = [
  { stage: 1, title: 'Play the story', blurb: 'Chapters 1–4, the final mission and the six named missions.' },
  { stage: 2, title: 'Strangers & side stories', blurb: 'Five stranger finals, Bret’s hunt, and 8 stranger strands.' },
  { stage: 3, title: 'Activities & skills', blurb: 'Stunts, races, shooting range, fishing, arcade, challenges.' },
  { stage: 4, title: 'Collectibles & discovery', blurb: 'Cards, WAiNK scans, 100 vehicles, all of Leonida.' },
  { stage: 5, title: 'Robberies & money', blurb: 'Shops, banks, armored truck, gangs, laundering, spending.' },
  { stage: 6, title: 'Clean-up & the platinum', blurb: '100% completion, world moments, then Vice Got a Price!' },
];

const KIND_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Story' },
  { key: 'missable', label: 'Missable' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'activities', label: 'Activities' },
  { key: 'robbery', label: 'Robbery' },
  { key: 'world', label: 'World' },
  { key: 'money', label: 'Money' },
  { key: 'online', label: 'Online' },
];

const trophyData = await loadTrophyData();
const trophies = trophyData.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

const saved = loadProgress();
const state = {
  earned: new Set(saved.earned),
  spoilerShield: saved.spoilerShield === true,
  kind: 'all',
  grade: 'all',
  query: '',
  selectedId: null,
  selectedStage: null,
};

const els = {
  progressBig: document.getElementById('progressBig'),
  progressPct: document.getElementById('progressPct'),
  progressFill: document.getElementById('progressFill'),
  progressSub: document.getElementById('progressSub'),
  gradeChips: document.getElementById('gradeChips'),
  stages: document.getElementById('stages'),
  search: document.getElementById('search'),
  kindChips: document.getElementById('kindChips'),
  gradeFilter: document.getElementById('gradeFilter'),
  spoilerBtn: document.getElementById('spoilerBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  resetBtn: document.getElementById('resetBtn'),
  onlineNote: document.getElementById('onlineNote'),
  listCount: document.getElementById('listCount'),
  trophyList: document.getElementById('trophyList'),
  detailCol: document.getElementById('detailCol'),
  missableJump: document.getElementById('missableJump'),
};

async function loadTrophyData() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('trophy data did not load');
  return response.json();
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { earned: [], spoilerShield: false };
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed.earned) ? parsed.earned : [];
    return {
      earned: ids.filter((id) => byIdHas(id)),
      spoilerShield: parsed.spoilerShield === true,
    };
  } catch {
    return { earned: [], spoilerShield: false };
  }
}

function byIdHas(id) {
  return typeof id === 'number' && trophies.some((t) => t.id === id);
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    game: 'Grand Theft Auto VI',
    earned: [...state.earned].sort((a, b) => a - b),
    spoilerShield: state.spoilerShield,
  }));
}

function isMasked(trophy) {
  return state.spoilerShield && trophy.hidden && !state.earned.has(trophy.id);
}

function stageTrophies(stage) {
  return trophies.filter((t) => t.stage === stage);
}

function renderProgress() {
  const total = trophies.length;
  const earned = state.earned.size;
  const pct = Math.round((earned / total) * 100);
  els.progressBig.textContent = `${earned} / ${total}`;
  els.progressPct.textContent = `${pct}%`;
  els.progressFill.style.width = `${pct}%`;
  const platinum = state.earned.has(1) ? 'Platinum earned!' : 'Platinum: Vice Got a Price!';
  els.progressSub.textContent = `${earned} of ${total} earned · ${platinum}`;
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  els.gradeChips.replaceChildren(...grades.map((grade) => {
    const ofGrade = trophies.filter((t) => t.grade === grade);
    const got = ofGrade.filter((t) => state.earned.has(t.id)).length;
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${grade[0].toUpperCase()} ${got}/${ofGrade.length}`;
    li.append(label);
    return li;
  }));
}

function renderRoadmap() {
  els.stages.replaceChildren(...ROADMAP_STAGES.map((stage) => {
    const items = stageTrophies(stage.stage);
    const got = items.filter((t) => state.earned.has(t.id)).length;
    const li = document.createElement('li');
    if (state.selectedStage === stage.stage) li.classList.add('active');
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => selectStage(stage.stage));
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `STAGE ${stage.stage}`;
    const title = document.createElement('h3');
    title.textContent = stage.title;
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${got}/${items.length} earned`;
    button.append(num, title, blurb, count);
    li.append(button);
    return li;
  }));
}

function renderKindChips() {
  els.kindChips.replaceChildren(...KIND_CHIPS.map((chip) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = chip.label;
    button.setAttribute('aria-pressed', String(state.kind === chip.key));
    button.addEventListener('click', () => {
      state.kind = chip.key;
      state.selectedStage = null;
      renderAll();
    });
    return button;
  }));
}

function trophyMatchesKind(trophy) {
  if (state.kind === 'all') return true;
  if (state.kind === 'missable') return trophy.missable === true;
  if (state.kind === 'online') return false;
  if (state.kind === 'story') return trophy.kinds.includes('story') || trophy.kinds.includes('side');
  return trophy.kinds.includes(state.kind);
}

function trophyMatchesQuery(trophy) {
  if (!state.query) return true;
  const hay = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.kinds.join(' ')}`.toLowerCase();
  return state.query.toLowerCase().split(/\s+/).every((word) => hay.includes(word));
}

function visibleTrophies() {
  return trophies.filter((trophy) => {
    if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
    if (!trophyMatchesKind(trophy)) return false;
    if (!trophyMatchesQuery(trophy)) return false;
    return true;
  });
}

function gradeBadge(trophy) {
  const span = document.createElement('span');
  span.className = `grade-badge grade-${trophy.grade}`;
  span.textContent = trophy.grade;
  return span;
}

function kindTags(trophy) {
  const wrap = document.createElement('div');
  wrap.className = 'trophy-meta';
  for (const kind of trophy.kinds) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = kind;
    wrap.append(tag);
  }
  if (trophy.stage) {
    const stage = document.createElement('span');
    stage.className = 'tag';
    stage.textContent = `stage ${trophy.stage}`;
    wrap.append(stage);
  }
  if (trophy.count) {
    const count = document.createElement('span');
    count.className = 'tag';
    count.textContent = `× ${trophy.count.toLocaleString('en-US')}`;
    wrap.append(count);
  }
  if (trophy.missable) {
    const flag = document.createElement('span');
    flag.className = 'tag missable';
    flag.textContent = '⚠ possibly missable';
    wrap.append(flag);
  }
  return wrap;
}

function renderChecklist() {
  const visible = visibleTrophies();
  els.onlineNote.hidden = state.kind !== 'online';
  els.listCount.textContent = state.kind === 'online'
    ? '0 trophies — no online trophies on this list'
    : `${visible.length} of ${trophies.length} trophies · ${visible.filter((t) => state.earned.has(t.id)).length} earned in view`;
  els.trophyList.replaceChildren(...visible.map((trophy) => {
    const masked = isMasked(trophy);
    const li = document.createElement('li');
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'trophy-row';
    if (state.earned.has(trophy.id)) row.classList.add('earned');
    if (state.selectedId === trophy.id) row.classList.add('selected');
    row.addEventListener('click', (event) => {
      if (event.target.tagName === 'INPUT') return;
      selectTrophy(trophy.id);
    });
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : trophy.name} earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => toggleEarned(trophy.id, box.checked));
    const middle = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    if (masked) {
      name.textContent = 'Hidden trophy — earn it to reveal';
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = 'SPOILER HIDDEN';
      name.append(tag);
    } else {
      name.textContent = trophy.name;
      if (trophy.hidden) {
        const tag = document.createElement('span');
        tag.className = 'hidden-tag';
        tag.textContent = 'HIDDEN';
        name.append(tag);
      }
    }
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    if (masked) {
      desc.textContent = 'A story trophy. Its name and description stay hidden until you earn it.';
      desc.classList.add('spoiler-mask');
    } else {
      desc.textContent = trophy.description;
    }
    middle.append(name, document.createElement('br'), desc, kindTags(trophy));
    row.append(box, middle, gradeBadge(trophy));
    li.append(row);
    return li;
  }));
}

function sourceList(sources) {
  const ul = document.createElement('ul');
  ul.className = 'source-list';
  for (const source of sources) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.textContent = source.name;
    link.target = '_blank';
    link.rel = 'noopener';
    li.append(link);
    ul.append(li);
  }
  return ul;
}

function renderDetail() {
  const panel = els.detailCol;
  panel.classList.remove('stage-detail');
  panel.replaceChildren();
  if (state.selectedStage) {
    renderStageDetail(panel, state.selectedStage);
    return;
  }
  const trophy = byId.get(state.selectedId);
  if (!trophy) {
    renderWelcomeDetail(panel);
    return;
  }
  const masked = isMasked(trophy);
  const title = document.createElement('h2');
  title.textContent = masked ? 'Hidden trophy' : trophy.name;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = masked
    ? 'A hidden story trophy. Turn the spoiler shield off, or earn it, to see its name and guide.'
    : `Official description: “${trophy.description}”`;
  const badges = document.createElement('div');
  badges.className = 'detail-badges';
  badges.append(gradeBadge(trophy));
  if (trophy.hidden) {
    const hidden = document.createElement('span');
    hidden.className = 'tag';
    hidden.textContent = 'hidden on PlayStation until earned';
    badges.append(hidden);
  }
  if (trophy.chapter) {
    const chapter = document.createElement('span');
    chapter.className = 'tag';
    chapter.textContent = `story · chapter ${trophy.chapter}`;
    badges.append(chapter);
  }
  const stageTag = document.createElement('span');
  stageTag.className = 'tag';
  stageTag.textContent = `roadmap stage ${trophy.stage} — ${ROADMAP_STAGES[trophy.stage - 1].title}`;
  badges.append(stageTag);
  panel.append(title, official, badges);
  if (trophy.missable && trophy.missableNote) {
    const warn = document.createElement('p');
    warn.className = 'missable-box';
    warn.textContent = `⚠ Possibly missable — ${trophy.missableNote}`;
    panel.append(warn);
  }
  if (!masked) {
    const guideHead = document.createElement('h3');
    guideHead.textContent = 'Guide';
    const guide = document.createElement('p');
    guide.className = 'guide-text';
    guide.textContent = trophy.guide;
    const sourcesHead = document.createElement('h3');
    sourcesHead.textContent = 'Sources for this guide';
    panel.append(guideHead, guide, sourcesHead, sourceList(trophy.sources));
  }
  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  const earned = state.earned.has(trophy.id);
  toggle.textContent = earned ? '✓ Earned — unmark' : 'Mark earned';
  if (earned) toggle.classList.add('earned-now');
  toggle.addEventListener('click', () => toggleEarned(trophy.id, !earned));
  actions.append(toggle);
  panel.append(actions);
}

function renderWelcomeDetail(panel) {
  panel.classList.remove('stage-detail');
  const title = document.createElement('h2');
  title.textContent = 'Start here';
  const intro = document.createElement('p');
  intro.textContent = 'Click any trophy to open its guide and sources. Tick the box when you earn it — your progress is saved in this browser. The roadmap above runs in the order the game is best played: story first, strangers next, then activities, collectibles, robberies and money, and 100% completion last.';
  const head = document.createElement('h3');
  head.textContent = 'The list at a glance';
  const facts = document.createElement('p');
  facts.textContent = '55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze. 28 are hidden on PlayStation until earned — the spoiler shield hides those until you earn them. No online trophies, no difficulty trophies, and only one trophy is reported possibly missable.';
  const warn = document.createElement('p');
  warn.className = 'missable-box';
  warn.textContent = '⚠ Before you leave Chapter 1, meditate at Lucia’s balcony spot — guides report it may disappear after the chapter, and there is reported to be no mission replay.';
  panel.append(title, intro, head, facts, warn);
}

function renderStageDetail(panel, stageNumber) {
  panel.classList.add('stage-detail');
  const stage = ROADMAP_STAGES[stageNumber - 1];
  const items = stageTrophies(stageNumber);
  const got = items.filter((t) => state.earned.has(t.id)).length;
  const title = document.createElement('h2');
  title.textContent = `Stage ${stageNumber} — ${stage.title}`;
  const sub = document.createElement('p');
  sub.textContent = `${stage.blurb} ${got}/${items.length} earned in this stage.`;
  const list = document.createElement('ol');
  for (const trophy of items) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'linklike';
    button.textContent = isMasked(trophy) ? 'Hidden trophy' : trophy.name;
    button.addEventListener('click', () => selectTrophy(trophy.id));
    li.append(button);
    const mark = document.createElement('span');
    mark.textContent = state.earned.has(trophy.id) ? ' ✓' : '';
    li.append(mark);
    list.append(li);
  }
  panel.append(title, sub, list);
}

function selectTrophy(id) {
  state.selectedId = id;
  state.selectedStage = null;
  history.replaceState(null, '', `#/trophy/${id}`);
  renderAll();
}

function selectStage(stageNumber) {
  state.selectedStage = stageNumber;
  state.selectedId = null;
  history.replaceState(null, '', `#/stage/${stageNumber}`);
  renderAll();
}

function toggleEarned(id, earned) {
  if (earned) state.earned.add(id);
  else state.earned.delete(id);
  saveProgress();
  renderAll();
}

function setSpoilerShield(on) {
  state.spoilerShield = on;
  els.spoilerBtn.setAttribute('aria-pressed', String(on));
  els.spoilerBtn.textContent = `Spoiler shield: ${on ? 'ON' : 'OFF'}`;
  saveProgress();
  renderAll();
}

function exportProgress() {
  const payload = {
    guide: 'Leonida Legend — GTA VI Trophy Guide & Tracker',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    spoilerShield: state.spoilerShield,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
    const valid = ids.filter((id) => byIdHas(id));
    if (!valid.length && ids.length) throw new Error('no known trophy ids');
    state.earned = new Set(valid);
    if (typeof parsed.spoilerShield === 'boolean') setSpoilerShield(parsed.spoilerShield);
    saveProgress();
    renderAll();
  } catch {
    alert('That file is not a Leonida Legend progress export.');
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderKindChips();
  renderChecklist();
  renderDetail();
}

function readHash() {
  const match = location.hash.match(/^#\/trophy\/(\d+)$/);
  if (match && byIdHas(Number(match[1]))) state.selectedId = Number(match[1]);
  const stageMatch = location.hash.match(/^#\/stage\/(\d+)$/);
  if (stageMatch && ROADMAP_STAGES[Number(stageMatch[1]) - 1]) state.selectedStage = Number(stageMatch[1]);
}

els.search.addEventListener('input', () => {
  state.query = els.search.value.trim();
  renderChecklist();
});
els.gradeFilter.addEventListener('change', () => {
  state.grade = els.gradeFilter.value;
  renderAll();
});
els.spoilerBtn.addEventListener('click', () => setSpoilerShield(!state.spoilerShield));
els.exportBtn.addEventListener('click', exportProgress);
els.importFile.addEventListener('change', (event) => {
  importProgress(event.target.files[0]);
  event.target.value = '';
});
els.resetBtn.addEventListener('click', () => {
  if (confirm('Clear all earned trophies in this browser?')) {
    state.earned.clear();
    saveProgress();
    renderAll();
  }
});
els.missableJump.addEventListener('click', () => selectTrophy(28));

readHash();
setSpoilerShield(state.spoilerShield);
renderAll();
