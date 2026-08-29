/**
 * Momentum Habit Tracker - Core Application Logic
 * Implements reactive state, persistent storage, and interactive views
 */

// Initial Seed State matching the Stitch Mockups
const DEFAULT_STATE = {
  profile: {
    name: 'Alex Mercer',
    email: 'alex.mercer@momentum.app',
    theme: 'light', // 'light' | 'dark' | 'system'
    notifications: {
      dailySummary: true,
      habitReminders: true,
      streakWarnings: false
    }
  },
  categories: [
    { id: 'health', name: 'Health', icon: 'fitness_center', color: 'secondary' },
    { id: 'work', name: 'Work', icon: 'work', color: 'primary' },
    { id: 'personal', name: 'Personal', icon: 'person', color: 'tertiary' },
    { id: 'learning', name: 'Learning', icon: 'menu_book', color: 'secondary' }
  ],
  habits: [
    {
      id: 'h1',
      name: 'Morning Meditation',
      category: 'health',
      frequency: 'daily',
      streak: 14,
      bestStreak: 32,
      completedToday: true,
      time: '07:00 AM',
      targetVal: 15,
      targetUnit: 'mins',
      archived: false,
      history: [1, 1, 1, 1, 1, 1, 1] // Fri, Sat, Sun, Mon, Tue, Wed, Thu
    },
    {
      id: 'h2',
      name: 'Deep Work Session',
      category: 'work',
      frequency: 'weekdays',
      streak: 5,
      bestStreak: 12,
      completedToday: false,
      time: '09:30 AM',
      targetVal: 90,
      targetUnit: 'mins',
      archived: false,
      history: [1, 0, 0, 1, 1, 1, 0]
    },
    {
      id: 'h3',
      name: 'Read 20 Pages',
      category: 'personal',
      frequency: 'daily',
      streak: 3,
      bestStreak: 45,
      completedToday: true,
      time: '08:00 PM',
      targetVal: 20,
      targetUnit: 'pages',
      archived: false,
      history: [0, 1, 1, 1, 1, 0, 1]
    },
    {
      id: 'h4',
      name: 'Gym Workout',
      category: 'health',
      frequency: '3x / Week',
      streak: 0,
      bestStreak: 8,
      completedToday: false,
      time: '05:30 PM',
      targetVal: 60,
      targetUnit: 'mins',
      archived: false,
      history: [1, 0, 1, 0, 1, 0, 0]
    },
    {
      id: 'h5',
      name: 'Drink 2L Water',
      category: 'health',
      frequency: 'daily',
      streak: 42,
      bestStreak: 42,
      completedToday: true,
      time: 'All Day',
      targetVal: 2,
      targetUnit: 'L',
      archived: false,
      history: [1, 1, 1, 1, 1, 1, 1]
    },
    {
      id: 'h6',
      name: 'Journaling & Review',
      category: 'personal',
      frequency: 'daily',
      streak: 9,
      bestStreak: 20,
      completedToday: false,
      time: '09:00 PM',
      targetVal: 10,
      targetUnit: 'mins',
      archived: false,
      history: [1, 1, 1, 1, 1, 1, 0]
    }
  ],
  targets: [
    {
      id: 't1',
      title: 'Marathon Training',
      category: 'health',
      current: 340,
      target: 500,
      unit: 'km',
      deadline: '2026-11-15',
      accent: 'primary'
    },
    {
      id: 't2',
      title: 'Q4 Revenue Target',
      category: 'work',
      current: 85,
      target: 120,
      unit: 'k $',
      deadline: '2026-10-18',
      accent: 'tertiary'
    },
    {
      id: 't3',
      title: 'Read 50 Books',
      category: 'personal',
      current: 42,
      target: 50,
      unit: 'books',
      deadline: '2026-10-01',
      accent: 'error'
    },
    {
      id: 't4',
      title: 'TypeScript Mastery',
      category: 'learning',
      current: 18,
      target: 20,
      unit: 'modules',
      deadline: '2026-12-31',
      accent: 'secondary'
    }
  ]
};

// Application State Store
class Store {
  constructor() {
    this.key = 'momentum_habit_tracker_state_v2';
    this.data = this.load();
    this.activeView = 'dashboard';
    this.habitFilterCategory = 'all';
    this.habitFilterStatus = 'active';
    this.habitSort = 'streak-desc';
    this.habitSearch = '';
  }

  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved state:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
    this.notify();
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
  }

  notify() {
    renderApp();
  }

  // Habits operations
  toggleHabit(id) {
    const habit = this.data.habits.find(h => h.id === id);
    if (!habit) return;
    habit.completedToday = !habit.completedToday;
    if (habit.completedToday) {
      habit.streak += 1;
      if (habit.streak > habit.bestStreak) {
        habit.bestStreak = habit.streak;
      }
      if (habit.history && habit.history.length > 0) {
        habit.history[habit.history.length - 1] = 1;
      }
      triggerCelebration();
    } else {
      habit.streak = Math.max(0, habit.streak - 1);
      if (habit.history && habit.history.length > 0) {
        habit.history[habit.history.length - 1] = 0;
      }
    }
    this.save();
  }

  addHabit(habitData) {
    const newHabit = {
      id: 'h_' + Date.now(),
      name: habitData.name,
      category: habitData.category || 'health',
      frequency: habitData.frequency || 'daily',
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      time: habitData.time || 'Anytime',
      targetVal: Number(habitData.targetVal) || 1,
      targetUnit: habitData.targetUnit || 'times',
      archived: false,
      history: [0, 0, 0, 0, 0, 0, 0]
    };
    this.data.habits.unshift(newHabit);
    this.save();
  }

  updateHabit(id, updatedData) {
    const index = this.data.habits.findIndex(h => h.id === id);
    if (index !== -1) {
      this.data.habits[index] = { ...this.data.habits[index], ...updatedData };
      this.save();
    }
  }

  toggleArchiveHabit(id) {
    const habit = this.data.habits.find(h => h.id === id);
    if (habit) {
      habit.archived = !habit.archived;
      this.save();
    }
  }

  deleteHabit(id) {
    this.data.habits = this.data.habits.filter(h => h.id !== id);
    this.save();
  }

  // Targets operations
  addTarget(targetData) {
    const newTarget = {
      id: 't_' + Date.now(),
      title: targetData.title,
      category: targetData.category || 'personal',
      current: Number(targetData.current) || 0,
      target: Number(targetData.target) || 100,
      unit: targetData.unit || 'units',
      deadline: targetData.deadline || '2026-12-31',
      accent: targetData.accent || 'primary'
    };
    this.data.targets.unshift(newTarget);
    this.save();
  }

  updateTarget(id, updatedData) {
    const index = this.data.targets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.data.targets[index] = { ...this.data.targets[index], ...updatedData };
      this.save();
    }
  }

  logTargetProgress(id, amount) {
    const target = this.data.targets.find(t => t.id === id);
    if (target) {
      target.current = Math.max(0, target.current + Number(amount));
      this.save();
      triggerCelebration();
    }
  }

  deleteTarget(id) {
    this.data.targets = this.data.targets.filter(t => t.id !== id);
    this.save();
  }

  // Category operations
  addCategory(categoryData) {
    const newCat = {
      id: categoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: categoryData.name,
      icon: categoryData.icon || 'star',
      color: categoryData.color || 'primary'
    };
    this.data.categories.push(newCat);
    this.save();
  }

  deleteCategory(catId) {
    this.data.categories = this.data.categories.filter(c => c.id !== catId);
    this.save();
  }

  // Profile and Theme
  updateProfile(profileData) {
    this.data.profile = { ...this.data.profile, ...profileData };
    this.save();
  }

  setTheme(theme) {
    this.data.profile.theme = theme;
    this.applyTheme(theme);
    this.save();
  }

  applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

const store = new Store();

// Helper Functions
function getCategoryBadge(catId) {
  const cat = store.data.categories.find(c => c.id === catId) || { name: catId, color: 'primary' };
  let bg = 'bg-primary-container/20 text-primary';
  let dotBg = 'bg-primary';

  if (cat.color === 'secondary' || cat.id === 'health') {
    bg = 'bg-secondary-container text-on-secondary-container';
    dotBg = 'bg-secondary';
  } else if (cat.color === 'tertiary' || cat.id === 'personal') {
    bg = 'bg-tertiary-fixed text-on-tertiary-fixed';
    dotBg = 'bg-tertiary';
  } else if (cat.id === 'work') {
    bg = 'bg-primary-fixed text-on-primary-fixed-variant';
    dotBg = 'bg-primary';
  }

  return { cat, bg, dotBg };
}

function calculateTargetStatus(target) {
  const percent = Math.min(100, Math.round((target.current / (target.target || 1)) * 100));
  const today = new Date();
  const deadlineDate = new Date(target.deadline);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let statusText = '';
  let statusColor = 'primary';
  let badgeIcon = 'schedule';
  let isOverdue = false;

  if (diffDays < 0) {
    statusText = `${Math.abs(diffDays)} days overdue`;
    statusColor = 'error';
    badgeIcon = 'error';
    isOverdue = true;
  } else if (diffDays === 0) {
    statusText = 'Due today!';
    statusColor = 'tertiary';
    badgeIcon = 'warning';
  } else if (diffDays <= 14) {
    statusText = `${diffDays} days left`;
    statusColor = 'tertiary';
    badgeIcon = 'warning';
  } else {
    statusText = `${diffDays} days left`;
    statusColor = 'primary';
    badgeIcon = 'schedule';
  }

  if (percent >= 100) {
    statusText = 'Goal Completed!';
    statusColor = 'secondary';
    badgeIcon = 'check_circle';
  }

  return { percent, diffDays, statusText, statusColor, badgeIcon, isOverdue };
}

function getFormattedDate() {
  const now = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  return now.toLocaleDateString('en-US', options);
}

function triggerCelebration() {
  // Simple cheerful confetti burst
  const colors = ['#3525cd', '#006c49', '#6cf8bb', '#4f46e5', '#ffd4a4'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.left = `${Math.random() * 80 + 10}vw`;
    p.style.top = `${Math.random() * 40 + 20}vh`;
    p.style.width = `${Math.random() * 8 + 6}px`;
    p.style.height = `${Math.random() * 8 + 6}px`;
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

// Render Header Metrics
function renderHeader() {
  const activeHabits = store.data.habits.filter(h => !h.archived);
  const total = activeHabits.length;
  const completed = activeHabits.filter(h => h.completedToday).length;
  const dailyPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalStreaks = activeHabits.reduce((acc, h) => acc + (h.streak > 0 ? 1 : 0), 0);
  
  // Count approaching or overdue deadlines
  let urgentDeadlines = 0;
  store.data.targets.forEach(t => {
    const { diffDays, percent } = calculateTargetStatus(t);
    if (percent < 100 && diffDays <= 14) urgentDeadlines++;
  });

  const dailyCompEl = document.getElementById('header-daily-completion');
  const activeStreaksEl = document.getElementById('header-active-streaks');
  const deadlinesEl = document.getElementById('header-deadlines');
  const userInitialsEl = document.getElementById('header-user-initials');

  if (dailyCompEl) dailyCompEl.textContent = `${dailyPercent}%`;
  if (activeStreaksEl) activeStreaksEl.textContent = `${totalStreaks}`;
  if (deadlinesEl) deadlinesEl.textContent = `${urgentDeadlines}`;
  if (userInitialsEl) {
    const initials = store.data.profile.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
    userInitialsEl.textContent = initials;
  }
}

// Render View 1: Dashboard Overview
function renderDashboard() {
  const activeHabits = store.data.habits.filter(h => !h.archived);
  const completedCount = activeHabits.filter(h => h.completedToday).length;
  const totalCount = activeHabits.length;

  const dateSubheader = document.getElementById('dashboard-date-subheader');
  if (dateSubheader) {
    dateSubheader.textContent = `${getFormattedDate()} — ${completedCount} of ${totalCount} habits completed`;
  }

  // Habit List (Today's Focus)
  const habitListEl = document.getElementById('dashboard-habit-list');
  if (habitListEl) {
    if (activeHabits.length === 0) {
      habitListEl.innerHTML = `
        <div class="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant border border-outline-variant/30">
          <span class="material-symbols-outlined text-4xl text-outline mb-2">check_circle_outline</span>
          <p class="font-headline-md text-on-surface">No active habits yet</p>
          <p class="text-body-md mt-1">Create your first habit to begin building momentum!</p>
          <button onclick="openNewHabitModal()" class="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md inline-flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add</span> Add Habit
          </button>
        </div>
      `;
    } else {
      habitListEl.innerHTML = activeHabits.map(habit => {
        const { cat, dotBg } = getCategoryBadge(habit.category);
        const isDone = habit.completedToday;
        return `
          <div class="bg-surface-container-lowest shadow-[0_4px_6px_-2px_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.02)] rounded-xl p-stack-md flex items-center justify-between group transition-all duration-300 hover:shadow-[0_8px_12px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer kinetic-card border border-outline-variant/20 dark:border-outline-variant/10" 
               onclick="store.toggleHabit('${habit.id}')" data-id="${habit.id}">
            <div class="flex items-center gap-4">
              <button class="w-6 h-6 rounded border flex items-center justify-center transition-all habit-toggle ${
                isDone 
                  ? 'bg-secondary border-secondary text-on-secondary shadow-sm' 
                  : 'border-outline text-transparent hover:border-primary'
              }" aria-label="Toggle habit">
                <span class="material-symbols-outlined text-[16px]">${isDone ? 'check' : 'check'}</span>
              </button>
              <div>
                <h3 class="text-body-md font-medium text-on-surface transition-all ${isDone ? 'line-through opacity-50' : ''}">
                  ${habit.name}
                </h3>
                <span class="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                  <span class="w-2 h-2 rounded-full ${dotBg}"></span> ${cat.name}
                  ${habit.time ? `<span class="text-outline mx-1">•</span> <span class="text-outline text-xs">${habit.time}</span>` : ''}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-end">
                <span class="text-label-sm font-label-sm text-on-surface-variant">
                  ${habit.targetVal ? 'Target' : 'Streak'}
                </span>
                <span class="text-label-md font-semibold ${isDone ? 'text-secondary' : 'text-on-surface'}">
                  ${habit.targetVal ? `${habit.targetVal} ${habit.targetUnit}` : `${habit.streak} days`}
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Active Targets Preview on Dashboard
  const activeTargetsEl = document.getElementById('dashboard-active-targets');
  if (activeTargetsEl) {
    const targets = store.data.targets.slice(0, 3);
    if (targets.length === 0) {
      activeTargetsEl.innerHTML = `<p class="text-sm text-on-surface-variant">No active targets. Create one in Targets view!</p>`;
    } else {
      activeTargetsEl.innerHTML = targets.map(t => {
        const { percent } = calculateTargetStatus(t);
        let barColor = 'bg-primary';
        if (t.accent === 'secondary' || t.category === 'health') barColor = 'bg-secondary';
        else if (t.accent === 'tertiary' || t.category === 'work') barColor = 'bg-tertiary-container';
        else if (t.accent === 'error') barColor = 'bg-error';

        return `
          <div class="flex flex-col gap-1.5 cursor-pointer hover:opacity-90 transition-opacity" onclick="navigateTo('targets')">
            <div class="flex justify-between text-body-sm font-medium">
              <span class="text-on-surface truncate pr-2">${t.title}</span>
              <span class="text-on-surface-variant shrink-0">${t.current} / ${t.target} ${t.unit}</span>
            </div>
            <div class="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div class="h-full ${barColor} rounded-full transition-all duration-700 ease-out" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Weekly Momentum Heatmap Grid on Dashboard
  renderDashboardHeatmap();
}

function renderDashboardHeatmap() {
  const heatmapContainer = document.getElementById('dashboard-heatmap-grid');
  if (!heatmapContainer) return;

  const days = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const activeHabits = store.data.habits.filter(h => !h.archived).slice(0, 5);

  if (activeHabits.length === 0) {
    heatmapContainer.innerHTML = `<div class="p-6 text-center text-on-surface-variant">No habit activity recorded yet.</div>`;
    return;
  }

  let html = `
    <div class="min-w-[600px] grid grid-cols-[160px_repeat(7,1fr)] gap-2 items-center">
      <div class="grid grid-rows-[30px_repeat(${activeHabits.length},42px)] gap-2 text-label-sm font-medium text-on-surface-variant text-right pr-4">
        <div></div>
        ${activeHabits.map(h => `<div class="truncate text-on-surface font-normal">${h.name}</div>`).join('')}
      </div>
  `;

  days.forEach((day, dayIndex) => {
    const isToday = dayIndex === 6; // Thursday is current day in mockup
    html += `
      <div class="grid grid-rows-[30px_repeat(${activeHabits.length},42px)] gap-2">
        <div class="text-center text-label-sm ${isToday ? 'font-bold text-primary' : 'text-on-surface-variant'}">${day}</div>
        ${activeHabits.map(h => {
          const val = h.history && h.history[dayIndex] !== undefined ? h.history[dayIndex] : 0;
          let cellStyle = 'bg-surface-container-high';
          if (val === 1) {
            if (h.category === 'health') cellStyle = 'bg-secondary text-white';
            else if (h.category === 'work') cellStyle = 'bg-primary text-white';
            else cellStyle = 'bg-tertiary-fixed-dim text-on-tertiary-fixed';
          }
          const ringClass = isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest' : '';
          return `<div class="${cellStyle} ${ringClass} rounded-lg h-full flex items-center justify-center transition-transform hover:scale-105" title="${h.name} - ${day}: ${val ? 'Done' : 'Missed'}"></div>`;
        }).join('')}
      </div>
    `;
  });

  html += `</div>`;
  heatmapContainer.innerHTML = html;
}

// Render View 2: Habits Manager
function renderHabitsManager() {
  const container = document.getElementById('habit-manager-list');
  if (!container) return;

  let habits = [...store.data.habits];

  // Filter Category
  if (store.habitFilterCategory !== 'all') {
    habits = habits.filter(h => h.category === store.habitFilterCategory);
  }

  // Filter Status
  if (store.habitFilterStatus === 'active') {
    habits = habits.filter(h => !h.archived);
  } else if (store.habitFilterStatus === 'archived') {
    habits = habits.filter(h => h.archived);
  }

  // Search Filter
  if (store.habitSearch.trim() !== '') {
    const q = store.habitSearch.toLowerCase();
    habits = habits.filter(h => h.name.toLowerCase().includes(q) || h.category.toLowerCase().includes(q));
  }

  // Sort
  if (store.habitSort === 'streak-desc') {
    habits.sort((a, b) => b.streak - a.streak);
  } else if (store.habitSort === 'streak-asc') {
    habits.sort((a, b) => a.streak - b.streak);
  } else if (store.habitSort === 'alpha-asc') {
    habits.sort((a, b) => a.name.localeCompare(b.name));
  } else if (store.habitSort === 'alpha-desc') {
    habits.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-xl">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
        <p class="font-headline-md text-on-surface">No habits match your filters</p>
        <p class="text-body-md mt-1">Try adjusting category or search parameters</p>
      </div>
    `;
    return;
  }

  container.innerHTML = habits.map((habit, index) => {
    const { cat, dotBg, bg } = getCategoryBadge(habit.category);
    const borderTop = index > 0 ? 'border-t border-outline-variant/30 dark:border-outline-variant/10' : '';
    const isArchived = habit.archived;

    return `
      <div class="grid grid-cols-12 gap-stack-md p-stack-md items-center hover:bg-surface-container-low transition-colors group ${borderTop} ${isArchived ? 'opacity-60 bg-surface-container-low/40' : ''}">
        <div class="col-span-5 md:col-span-4 flex items-center gap-stack-sm pl-unit">
          <div class="w-2.5 h-2.5 rounded-full ${dotBg}"></div>
          <span class="font-headline-md text-base md:text-lg font-semibold text-on-surface truncate ${isArchived ? 'line-through' : ''}">
            ${habit.name}
          </span>
        </div>
        <div class="col-span-3 md:col-span-2 hidden md:block">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full ${bg} font-label-sm text-xs font-medium">
            ${cat.name}
          </span>
        </div>
        <div class="col-span-3 md:col-span-2 text-center md:text-left font-body-md text-sm text-on-surface-variant capitalize">
          ${habit.frequency}
        </div>
        <div class="col-span-4 md:col-span-3 flex justify-between items-center">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined ${habit.streak > 0 ? 'text-tertiary-container' : 'text-outline'} text-[18px]">local_fire_department</span>
            <span class="font-headline-md text-base font-bold text-on-surface">${habit.streak}</span>
          </div>
          <span class="font-body-md text-sm text-outline hidden md:inline font-mono">Best: ${habit.bestStreak}</span>
        </div>
        <div class="col-span-3 md:col-span-1 flex justify-end gap-1 pr-unit opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button onclick="openEditHabitModal('${habit.id}')" class="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors" title="Edit Habit">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onclick="store.toggleArchiveHabit('${habit.id}')" class="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-tertiary transition-colors" title="${isArchived ? 'Unarchive' : 'Archive'}">
            <span class="material-symbols-outlined text-[18px]">${isArchived ? 'unarchive' : 'archive'}</span>
          </button>
          <button onclick="confirmDeleteHabit('${habit.id}')" class="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors" title="Delete Habit">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render View 3: Targets & Deadlines
function renderTargets() {
  const container = document.getElementById('targets-bento-grid');
  if (!container) return;

  const targets = store.data.targets;

  if (targets.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">flag</span>
        <p class="font-headline-md text-on-surface">No targets created yet</p>
        <p class="text-body-md text-on-surface-variant mt-1">Set milestones and deadlines to track your long-term ambitions.</p>
        <button onclick="openNewTargetModal()" class="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md inline-flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">add</span> New Target
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = targets.map(target => {
    const { percent, statusText, statusColor, badgeIcon, isOverdue } = calculateTargetStatus(target);
    const { cat } = getCategoryBadge(target.category);

    let accentBg = 'bg-primary/5';
    let textAccent = 'text-primary';
    let barColor = 'bg-primary';
    let badgeBg = 'bg-surface-container-high text-on-surface';

    if (statusColor === 'tertiary' || target.accent === 'tertiary') {
      accentBg = 'bg-tertiary-fixed-dim/10';
      textAccent = 'text-tertiary-container';
      barColor = 'bg-tertiary-container';
      badgeBg = 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant';
    } else if (statusColor === 'error' || isOverdue) {
      accentBg = 'bg-error/5';
      textAccent = 'text-error';
      barColor = 'bg-error';
      badgeBg = 'bg-error-container text-on-error-container';
    } else if (statusColor === 'secondary' || percent >= 100) {
      accentBg = 'bg-secondary/5';
      textAccent = 'text-secondary';
      barColor = 'bg-secondary';
      badgeBg = 'bg-secondary-container text-on-secondary-container';
    }

    const formattedDeadline = new Date(target.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="group bg-surface-container-lowest rounded-xl p-stack-md flex flex-col justify-between shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08),0_4px_6px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden kinetic-card border border-outline-variant/20 dark:border-outline-variant/10">
        <div class="absolute -right-16 -top-16 w-48 h-48 ${accentBg} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
        
        <div class="flex justify-between items-start mb-stack-md relative z-10">
          <div class="flex flex-col">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-label-sm font-label-sm mb-1.5 w-fit">
              ${cat.name}
            </span>
            <h3 class="text-headline-md text-lg md:text-xl font-bold text-on-surface truncate">${target.title}</h3>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="openEditTargetModal('${target.id}')" class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors" title="Edit Target">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="confirmDeleteTarget('${target.id}')" class="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors" title="Delete Target">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-unit mb-stack-md relative z-10">
          <div class="flex justify-between items-end mb-1">
            <div class="flex items-baseline gap-1">
              <span class="text-headline-lg text-2xl font-bold ${textAccent}">${target.current}</span>
              <span class="text-label-md font-medium text-on-surface-variant">/ ${target.target} ${target.unit}</span>
            </div>
            <span class="text-label-sm font-bold ${textAccent}">${percent}%</span>
          </div>
          <!-- Progress Bar -->
          <div class="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
            <div class="h-full ${barColor} rounded-full progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div class="flex justify-between items-center relative z-10 pt-stack-sm border-t border-outline-variant/30 dark:border-outline-variant/10 mt-auto">
          <div class="flex items-center gap-1.5 text-on-surface-variant text-sm">
            <span class="material-symbols-outlined text-[16px]">calendar_today</span>
            <span class="font-label-md">${formattedDeadline}</span>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeBg}">
            <span class="material-symbols-outlined text-[16px]">${badgeIcon}</span>
            <span class="text-label-sm font-medium">${statusText}</span>
          </div>
        </div>

        <!-- Quick Log Action Button -->
        <div class="mt-3 pt-2 flex justify-end relative z-10">
          <button onclick="openLogProgressModal('${target.id}')" class="w-full py-2 bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm">
            <span class="material-symbols-outlined text-[16px]">add_circle</span> Log Progress
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Update Ambitions Aggregate stats
  const activeCount = targets.length;
  const completedCount = targets.filter(t => t.current >= t.target).length;
  const ambitionsActiveEl = document.getElementById('ambitions-active-count');
  const ambitionsCompletedEl = document.getElementById('ambitions-completed-count');
  if (ambitionsActiveEl) ambitionsActiveEl.textContent = activeCount;
  if (ambitionsCompletedEl) ambitionsCompletedEl.textContent = completedCount;
}

// Render View 4: Analytics
function renderAnalytics() {
  const activeHabits = store.data.habits.filter(h => !h.archived);
  const total = activeHabits.length;
  const completed = activeHabits.filter(h => h.completedToday).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const rateEl = document.getElementById('analytics-completion-rate');
  if (rateEl) rateEl.textContent = `${rate}%`;

  const longestStreak = activeHabits.reduce((max, h) => Math.max(max, h.bestStreak), 0);
  const longestStreakEl = document.getElementById('analytics-longest-streak');
  if (longestStreakEl) longestStreakEl.textContent = `${longestStreak} days`;

  const totalLogs = activeHabits.reduce((acc, h) => acc + h.history.reduce((a, b) => a + b, 0), 0);
  const totalLogsEl = document.getElementById('analytics-total-logs');
  if (totalLogsEl) totalLogsEl.textContent = `${totalLogs}`;

  // Leaderboard of top habits
  const leaderboardEl = document.getElementById('analytics-streak-leaderboard');
  if (leaderboardEl) {
    const sorted = [...activeHabits].sort((a, b) => b.streak - a.streak).slice(0, 5);
    leaderboardEl.innerHTML = sorted.map((h, i) => {
      const { cat, dotBg } = getCategoryBadge(h.category);
      return `
        <div class="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-high transition-colors bg-surface-container-lowest border border-outline-variant/20">
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-primary font-mono">${i + 1}</span>
            <div>
              <p class="font-semibold text-on-surface text-sm">${h.name}</p>
              <p class="text-xs text-on-surface-variant flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full ${dotBg}"></span> ${cat.name}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="font-bold text-primary text-sm flex items-center gap-1 justify-end">
              <span class="material-symbols-outlined text-sm text-tertiary-container">local_fire_department</span> ${h.streak} days
            </span>
            <span class="text-xs text-outline font-mono">Best: ${h.bestStreak}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Render View 5: Settings & Account
function renderSettings() {
  const profileNameInput = document.getElementById('settings-profile-name');
  const profileEmail = document.getElementById('settings-profile-email');
  const profileDisplayName = document.getElementById('settings-display-name-text');

  if (profileNameInput) profileNameInput.value = store.data.profile.name;
  if (profileEmail) profileEmail.textContent = store.data.profile.email;
  if (profileDisplayName) profileDisplayName.textContent = store.data.profile.name;

  // Categories list
  const catContainer = document.getElementById('settings-categories-grid');
  if (catContainer) {
    catContainer.innerHTML = store.data.categories.map(cat => {
      const count = store.data.habits.filter(h => h.category === cat.id).length;
      return `
        <div class="bg-surface p-stack-sm rounded-xl flex flex-col gap-stack-sm shadow-sm hover:-translate-y-0.5 transition-transform group border border-outline-variant/30 dark:border-outline-variant/10">
          <div class="flex items-center justify-between">
            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[18px]">${cat.icon || 'folder'}</span>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="confirmDeleteCategory('${cat.id}')" class="p-1 text-on-surface-variant hover:text-error transition-colors" title="Delete Category">
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
          <div>
            <span class="text-headline-md text-base font-bold text-on-surface block">${cat.name}</span>
            <span class="text-label-sm font-label-sm text-on-surface-variant">${count} Habits</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Notification switches
  const notifs = store.data.profile.notifications;
  updateToggleUI('toggle-notif-daily', notifs.dailySummary);
  updateToggleUI('toggle-notif-reminders', notifs.habitReminders);
  updateToggleUI('toggle-notif-warnings', notifs.streakWarnings);

  // Theme radios
  updateThemeRadiosUI(store.data.profile.theme);
}

function updateToggleUI(elementId, isActive) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const thumb = el.querySelector('.toggle-thumb');
  if (isActive) {
    el.className = 'relative w-12 h-6 bg-primary rounded-full cursor-pointer shadow-inner transition-colors';
    if (thumb) thumb.className = 'toggle-thumb absolute right-1 top-1 w-4 h-4 bg-on-primary rounded-full shadow-sm transition-transform';
  } else {
    el.className = 'relative w-12 h-6 bg-outline-variant rounded-full cursor-pointer shadow-inner transition-colors';
    if (thumb) thumb.className = 'toggle-thumb absolute left-1 top-1 w-4 h-4 bg-surface rounded-full shadow-sm transition-transform';
  }
}

function updateThemeRadiosUI(currentTheme) {
  ['light', 'dark', 'system'].forEach(theme => {
    const radio = document.getElementById(`theme-radio-${theme}`);
    if (radio) {
      if (currentTheme === theme) {
        radio.innerHTML = `<div class="w-3 h-3 rounded-full bg-primary"></div>`;
        radio.className = 'w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center';
      } else {
        radio.innerHTML = '';
        radio.className = 'w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center';
      }
    }
  });
}

// Master Render Function
function renderApp() {
  renderHeader();
  if (store.activeView === 'dashboard') renderDashboard();
  else if (store.activeView === 'habits') renderHabitsManager();
  else if (store.activeView === 'targets') renderTargets();
  else if (store.activeView === 'analytics') renderAnalytics();
  else if (store.activeView === 'settings') renderSettings();
}

// View Navigation Controller
function navigateTo(viewId) {
  store.activeView = viewId;
  
  // Update view panel visibility
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const targetPanel = document.getElementById(`view-${viewId}`);
  if (targetPanel) {
    targetPanel.classList.remove('hidden');
  }

  // Update active sidebar nav link
  document.querySelectorAll('nav a[data-path]').forEach(link => {
    if (link.getAttribute('data-path') === viewId) {
      link.className = 'flex items-center px-stack-md py-stack-md rounded-xl transition-all group bg-primary-container text-on-primary-container font-semibold shadow-sm';
      link.setAttribute('aria-current', 'page');
    } else {
      link.className = 'flex items-center px-stack-md py-stack-md rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all group font-normal';
      link.removeAttribute('aria-current');
    }
  });

  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Modal Controllers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  void modal.offsetWidth; // Trigger reflow
  modal.classList.remove('opacity-0', 'pointer-events-none');
  const content = modal.querySelector('.modal-content-box');
  if (content) {
    content.classList.remove('scale-95');
    content.classList.add('scale-100');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  const content = modal.querySelector('.modal-content-box');
  if (content) {
    content.classList.add('scale-95');
    content.classList.remove('scale-100');
  }
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 250);
}

// New Habit Modal
function openNewHabitModal() {
  const catSelect = document.getElementById('modal-habit-category');
  if (catSelect) {
    catSelect.innerHTML = store.data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  const form = document.getElementById('new-habit-form');
  if (form) form.reset();
  openModal('modal-new-habit');
}

// Edit Habit Modal
let currentEditingHabitId = null;
function openEditHabitModal(habitId) {
  const habit = store.data.habits.find(h => h.id === habitId);
  if (!habit) return;
  currentEditingHabitId = habitId;

  const catSelect = document.getElementById('edit-habit-category');
  if (catSelect) {
    catSelect.innerHTML = store.data.categories.map(c => `<option value="${c.id}" ${c.id === habit.category ? 'selected' : ''}>${c.name}</option>`).join('');
  }

  document.getElementById('edit-habit-name').value = habit.name;
  document.getElementById('edit-habit-freq').value = habit.frequency;
  document.getElementById('edit-habit-val').value = habit.targetVal || '';
  document.getElementById('edit-habit-unit').value = habit.targetUnit || '';
  document.getElementById('edit-habit-time').value = habit.time || '';

  openModal('modal-edit-habit');
}

function confirmDeleteHabit(habitId) {
  if (confirm('Are you sure you want to delete this habit? All progress history will be removed.')) {
    store.deleteHabit(habitId);
  }
}

// New Target Modal
function openNewTargetModal() {
  const catSelect = document.getElementById('modal-target-category');
  if (catSelect) {
    catSelect.innerHTML = store.data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  const form = document.getElementById('new-target-form');
  if (form) form.reset();
  openModal('modal-new-target');
}

// Edit Target Modal
let currentEditingTargetId = null;
function openEditTargetModal(targetId) {
  const target = store.data.targets.find(t => t.id === targetId);
  if (!target) return;
  currentEditingTargetId = targetId;

  const catSelect = document.getElementById('edit-target-category');
  if (catSelect) {
    catSelect.innerHTML = store.data.categories.map(c => `<option value="${c.id}" ${c.id === target.category ? 'selected' : ''}>${c.name}</option>`).join('');
  }

  document.getElementById('edit-target-title').value = target.title;
  document.getElementById('edit-target-current').value = target.current;
  document.getElementById('edit-target-target').value = target.target;
  document.getElementById('edit-target-unit').value = target.unit;
  document.getElementById('edit-target-deadline').value = target.deadline;
  document.getElementById('edit-target-accent').value = target.accent || 'primary';

  openModal('modal-edit-target');
}

function confirmDeleteTarget(targetId) {
  if (confirm('Are you sure you want to delete this target?')) {
    store.deleteTarget(targetId);
  }
}

// Log Target Progress Modal
let currentLoggingTargetId = null;
function openLogProgressModal(targetId) {
  const target = store.data.targets.find(t => t.id === targetId);
  if (!target) return;
  currentLoggingTargetId = targetId;

  document.getElementById('log-progress-title').textContent = target.title;
  document.getElementById('log-progress-unit-label').textContent = target.unit;
  document.getElementById('log-progress-input').value = '1';

  openModal('modal-log-progress');
}

// Category Management Modals
function openNewCategoryModal() {
  openModal('modal-new-category');
}

function confirmDeleteCategory(catId) {
  if (confirm('Delete this category? Associated habits will keep their records.')) {
    store.deleteCategory(catId);
  }
}

// Data Export & Import Handlers
function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `momentum_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.habits && Array.isArray(parsed.habits)) {
        store.data = parsed;
        store.save();
        alert('Data successfully restored!');
      } else {
        alert('Invalid data format in JSON backup.');
      }
    } catch (err) {
      alert('Error parsing JSON backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetAllDataConfirm() {
  if (confirm('WARNING: Are you sure you want to permanently reset all habits, targets, and history to original defaults? This cannot be undone.')) {
    store.reset();
    alert('All progress has been reset to defaults.');
  }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  store.applyTheme(store.data.profile.theme);

  // Setup Navigation listeners
  document.querySelectorAll('nav a[data-path]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const path = link.getAttribute('data-path');
      navigateTo(path);
    });
  });

  // Setup Header theme toggle button
  const headerThemeToggle = document.getElementById('header-theme-toggle');
  if (headerThemeToggle) {
    headerThemeToggle.addEventListener('click', () => {
      const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      store.setTheme(newTheme);
    });
  }

  // Setup New Habit Form Submit
  const newHabitForm = document.getElementById('new-habit-form');
  if (newHabitForm) {
    newHabitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-habit-name').value.trim();
      const category = document.getElementById('modal-habit-category').value;
      const frequency = document.getElementById('modal-habit-frequency').value;
      const targetVal = document.getElementById('modal-habit-target-val').value;
      const targetUnit = document.getElementById('modal-habit-target-unit').value;
      const time = document.getElementById('modal-habit-time').value.trim() || 'Anytime';

      if (name) {
        store.addHabit({ name, category, frequency, targetVal, targetUnit, time });
        closeModal('modal-new-habit');
        triggerCelebration();
      }
    });
  }

  // Setup Edit Habit Form Submit
  const editHabitForm = document.getElementById('edit-habit-form');
  if (editHabitForm) {
    editHabitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentEditingHabitId) return;

      const name = document.getElementById('edit-habit-name').value.trim();
      const category = document.getElementById('edit-habit-category').value;
      const frequency = document.getElementById('edit-habit-freq').value;
      const targetVal = document.getElementById('edit-habit-val').value;
      const targetUnit = document.getElementById('edit-habit-unit').value;
      const time = document.getElementById('edit-habit-time').value.trim();

      store.updateHabit(currentEditingHabitId, { name, category, frequency, targetVal, targetUnit, time });
      closeModal('modal-edit-habit');
    });
  }

  // Setup New Target Form Submit
  const newTargetForm = document.getElementById('new-target-form');
  if (newTargetForm) {
    newTargetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('modal-target-title').value.trim();
      const category = document.getElementById('modal-target-category').value;
      const current = document.getElementById('modal-target-start').value;
      const target = document.getElementById('modal-target-goal').value;
      const unit = document.getElementById('modal-target-unit').value.trim();
      const deadline = document.getElementById('modal-target-deadline').value;
      const accent = document.getElementById('modal-target-accent').value;

      if (title && target) {
        store.addTarget({ title, category, current, target, unit, deadline, accent });
        closeModal('modal-new-target');
        triggerCelebration();
      }
    });
  }

  // Setup Edit Target Form Submit
  const editTargetForm = document.getElementById('edit-target-form');
  if (editTargetForm) {
    editTargetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentEditingTargetId) return;

      const title = document.getElementById('edit-target-title').value.trim();
      const category = document.getElementById('edit-target-category').value;
      const current = Number(document.getElementById('edit-target-current').value);
      const target = Number(document.getElementById('edit-target-target').value);
      const unit = document.getElementById('edit-target-unit').value.trim();
      const deadline = document.getElementById('edit-target-deadline').value;
      const accent = document.getElementById('edit-target-accent').value;

      store.updateTarget(currentEditingTargetId, { title, category, current, target, unit, deadline, accent });
      closeModal('modal-edit-target');
    });
  }

  // Setup Log Target Progress Form Submit
  const logProgressForm = document.getElementById('log-progress-form');
  if (logProgressForm) {
    logProgressForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentLoggingTargetId) return;
      const amount = document.getElementById('log-progress-input').value;
      store.logTargetProgress(currentLoggingTargetId, amount);
      closeModal('modal-log-progress');
    });
  }

  // Setup New Category Form Submit
  const newCatForm = document.getElementById('new-category-form');
  if (newCatForm) {
    newCatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-cat-name').value.trim();
      const icon = document.getElementById('modal-cat-icon').value.trim() || 'star';
      const color = document.getElementById('modal-cat-color').value;

      if (name) {
        store.addCategory({ name, icon, color });
        closeModal('modal-new-category');
      }
    });
  }

  // Setup Profile Name Input Change
  const profileNameInput = document.getElementById('settings-profile-name');
  if (profileNameInput) {
    profileNameInput.addEventListener('change', (e) => {
      store.updateProfile({ name: e.target.value.trim() });
    });
  }

  // Habit Filters listeners
  const filterCat = document.getElementById('habits-filter-category');
  if (filterCat) {
    filterCat.addEventListener('change', (e) => {
      store.habitFilterCategory = e.target.value;
      renderHabitsManager();
    });
  }

  const filterStatus = document.getElementById('habits-filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      store.habitFilterStatus = e.target.value;
      renderHabitsManager();
    });
  }

  const sortHabits = document.getElementById('habits-sort-select');
  if (sortHabits) {
    sortHabits.addEventListener('change', (e) => {
      store.habitSort = e.target.value;
      renderHabitsManager();
    });
  }

  const searchHabits = document.getElementById('habits-search-input');
  if (searchHabits) {
    searchHabits.addEventListener('input', (e) => {
      store.habitSearch = e.target.value;
      renderHabitsManager();
    });
  }

  // Initial render
  navigateTo('dashboard');
});
