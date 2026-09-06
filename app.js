/**
 * Momentum Habit Tracker - Core Application Logic
 * Implements Kinetic Precision Design System, State Management, and LocalStorage
 */

// ==========================================================================
// Default State Data
// ==========================================================================
const DEFAULT_STATE = {
  profile: {
    name: "Guest",
    email: "",
    avatar: "",
    theme: "light",
    notifications: {
      dailySummary: true,
      reminders: true,
      streakWarnings: false
    }
  },
  habits: [
    {
      id: "h-1",
      name: "Morning Meditation",
      category: "Health",
      frequency: "Daily",
      streak: 14,
      bestStreak: 32,
      completed: true,
      archived: false,
      schedule: "07:00 AM",
      targetGoal: "15 mins",
      history: [1, 1, 1, 1, 1, 1, 1] // Fri -> Thu
    },
    {
      id: "h-2",
      name: "Deep Work Session",
      category: "Work",
      frequency: "Weekdays",
      streak: 5,
      bestStreak: 12,
      completed: false,
      archived: false,
      schedule: "09:30 AM",
      targetGoal: "90 mins",
      history: [1, 0, 0, 1, 1, 1, 0]
    },
    {
      id: "h-3",
      name: "Read 20 Pages",
      category: "Growth",
      frequency: "Daily",
      streak: 3,
      bestStreak: 45,
      completed: true,
      archived: false,
      schedule: "08:30 PM",
      targetGoal: "20 pages",
      history: [0, 1, 1, 1, 1, 0, 1]
    },
    {
      id: "h-4",
      name: "Gym Workout",
      category: "Health",
      frequency: "3x / Week",
      streak: 0,
      bestStreak: 8,
      completed: false,
      archived: false,
      schedule: "5:30 PM",
      targetGoal: "60 mins",
      history: [1, 0, 1, 0, 1, 0, 0]
    },
    {
      id: "h-5",
      name: "Drink 2L Water",
      category: "Health",
      frequency: "Daily",
      streak: 42,
      bestStreak: 42,
      completed: true,
      archived: false,
      schedule: "All Day",
      targetGoal: "2 Liters",
      history: [1, 1, 1, 1, 1, 1, 1]
    }
  ],
  targets: [
    {
      id: "t-1",
      title: "Marathon Training",
      category: "Fitness",
      current: 340,
      goal: 500,
      unit: "km",
      deadline: "2026-11-15",
      status: "On Track"
    },
    {
      id: "t-2",
      title: "Q4 Revenue Target",
      category: "Business",
      current: 85,
      goal: 120,
      unit: "$k",
      deadline: "2026-10-18",
      status: "Approaching"
    },
    {
      id: "t-3",
      title: "Read 50 Books",
      category: "Personal",
      current: 42,
      goal: 50,
      unit: "books",
      deadline: "2026-10-01",
      status: "Overdue"
    },
    {
      id: "t-4",
      title: "Save $10k Emergency Fund",
      category: "Personal",
      current: 8200,
      goal: 10000,
      unit: "$",
      deadline: "2026-12-31",
      status: "On Track"
    }
  ],
  categories: [
    { id: "c-1", name: "Health", color: "emerald", icon: "favorite", count: 12 },
    { id: "c-2", name: "Work", color: "indigo", icon: "work", count: 8 },
    { id: "c-3", name: "Growth", color: "amber", icon: "psychology", count: 4 },
    { id: "c-4", name: "Personal", color: "purple", icon: "person", count: 6 }
  ]
};

// ==========================================================================
// Application State Management
// ==========================================================================
class MomentumApp {
  constructor() {
    this.STORAGE_KEY = "momentum_habit_tracker_state_v2";
    this.state = this.loadState();
    this.currentView = "dashboard";
    this.modalConfirmCallback = null;
    this.supabase = window.momentumSupabase || null;
    this.user = null;
    this.authMode = "signin";

    this.init();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sanitize legacy mock profile
        if (parsed.profile) {
          if (parsed.profile.name === "Alex Mercer") {
            parsed.profile.name = "Guest";
          }
          if (parsed.profile.email === "alex.mercer@momentum.app") {
            parsed.profile.email = "";
          }
          if (parsed.profile.avatar && parsed.profile.avatar.includes("unsplash.com")) {
            parsed.profile.avatar = "";
          }
        }
        return parsed;
      }
    } catch (e) {
      console.error("Could not load state from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Could not save state to localStorage:", e);
    }
  }

  init() {
    this.applyTheme(this.state.profile.theme);
    this.setupEventListeners();
    this.setupRouter();
    this.initSupabase();
    this.renderAll();
  }

  // ========================================================================
  // Theme Engine
  // ========================================================================
  applyTheme(theme) {
    this.state.profile.theme = theme;
    this.saveState();

    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.body.classList.add("dark");
      document.getElementById("themeIcon").textContent = "light_mode";
    } else {
      document.body.classList.remove("dark");
      document.getElementById("themeIcon").textContent = "dark_mode";
    }

    // Update settings theme selector cards
    document.querySelectorAll(".theme-option-card").forEach(card => {
      card.classList.toggle("selected", card.dataset.theme === theme);
    });
  }

  toggleTheme() {
    const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    this.applyTheme(nextTheme);
    this.showToast(`Switched to ${nextTheme.toUpperCase()} theme`, "info");
  }

  // ========================================================================
  // Routing (SPA Navigation)
  // ========================================================================
  setupRouter() {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase() || "dashboard";
      this.switchView(hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
  }

  switchView(viewName) {
    const validViews = ["dashboard", "habits", "targets", "analytics", "settings"];
    if (!validViews.includes(viewName)) viewName = "dashboard";

    this.currentView = viewName;

    // Update nav links
    document.querySelectorAll(".sidebar-nav .nav-link, .mobile-nav-bar .mobile-nav-item").forEach(link => {
      link.classList.toggle("active", link.dataset.view === viewName);
    });

    // Update view panels
    document.querySelectorAll(".app-view").forEach(panel => {
      panel.classList.toggle("active", panel.id === `view-${viewName}`);
    });

    // Close mobile sidebar if open
    document.getElementById("appSidebar").classList.remove("mobile-open");
    document.getElementById("sidebarBackdrop").classList.remove("open");

    // Scroll top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ========================================================================
  // Calculations & KPIs
  // ========================================================================
  calculateKPIs() {
    const activeHabits = this.state.habits.filter(h => !h.archived);
    const completedCount = activeHabits.filter(h => h.completed).length;
    const totalCount = activeHabits.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const activeStreaksCount = activeHabits.filter(h => h.streak > 0).length;

    // Deadlines: targets that are approaching (<= 14 days) or overdue
    const deadlinesCount = this.state.targets.filter(t => {
      const days = this.getDaysRemaining(t.deadline);
      return days <= 14;
    }).length;

    return {
      completionRate,
      completedCount,
      totalCount,
      activeStreaksCount,
      deadlinesCount
    };
  }

  getDaysRemaining(deadlineStr) {
    const deadline = new Date(deadlineStr);
    const now = new Date();
    // Normalize to midnight
    deadline.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = deadline - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // ========================================================================
  // Render Methods
  // ========================================================================
  renderAll() {
    this.renderHeader();
    this.renderDashboard();
    this.renderHabitsManager();
    this.renderTargets();
    this.renderAnalytics();
    this.renderSettings();
  }

  renderHeader() {
    const kpis = this.calculateKPIs();

    document.getElementById("headerCompletionRate").textContent = `${kpis.completionRate}%`;
    document.getElementById("headerActiveStreaks").textContent = kpis.activeStreaksCount;
    document.getElementById("headerDeadlines").textContent = kpis.deadlinesCount;

    // Sidebar counts
    const activeHabits = this.state.habits.filter(h => !h.archived);
    document.getElementById("sidebarHabitCount").textContent = activeHabits.length;
    document.getElementById("sidebarTargetCount").textContent = this.state.targets.length;

    // Personal streak
    const maxStreak = Math.max(0, ...this.state.habits.map(h => h.streak || 0));
    const sidebarStreakEl = document.getElementById("sidebarStreakVal");
    if (sidebarStreakEl) sidebarStreakEl.textContent = `${maxStreak} Days`;

    // Profile badge
    const headerName = document.getElementById("headerUserName");
    if (headerName) headerName.textContent = this.state.profile.name || "Guest";
    const headerAvatar = document.getElementById("headerAvatar");
    if (headerAvatar) {
      if (this.state.profile.avatar) {
        headerAvatar.innerHTML = `<img src="${this.state.profile.avatar}" alt="${this.state.profile.name || 'User'}">`;
      } else {
        headerAvatar.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">person</span>`;
      }
    }
  }

  renderDashboard() {
    const kpis = this.calculateKPIs();
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const todayStr = new Date().toLocaleDateString('en-US', dateOptions);
    document.getElementById("dashboardDateSubtitle").textContent = 
      `${todayStr} — ${kpis.completedCount} of ${kpis.totalCount} habits completed`;

    // Render Today's Focus Habit Cards
    const container = document.getElementById("dashboardHabitList");
    container.innerHTML = "";

    const activeHabits = this.state.habits.filter(h => !h.archived);

    if (activeHabits.length === 0) {
      container.innerHTML = `
        <div style="padding: 60px 20px; text-align: center; color: var(--on-surface-variant);">
          <span class="material-symbols-outlined" style="font-size: 52px; opacity: 0.35;">task_alt</span>
          <p style="margin-top: 16px; font-size: 16px; font-weight: 600; color: var(--on-surface);">No active habits yet</p>
          <p style="margin-top: 6px; font-size: 14px;">Click "New Habit" above to start building momentum.</p>
        </div>
      `;
    }

    activeHabits.forEach(habit => {
      const card = document.createElement("div");
      card.className = "habit-card";
      card.dataset.id = habit.id;
      card.dataset.completed = habit.completed;

      let categoryDotClass = "dot-health";
      if (habit.category === "Work") categoryDotClass = "dot-work";
      else if (habit.category === "Growth") categoryDotClass = "dot-growth";
      else if (habit.category === "Personal") categoryDotClass = "dot-personal";

      card.innerHTML = `
        <div class="habit-card-left">
          <button class="custom-checkbox" aria-label="Toggle completion">
            <span class="material-symbols-outlined" style="font-size: 16px;">check</span>
          </button>
          <div class="habit-info-group">
            <h3 class="habit-title">${habit.name}</h3>
            <span class="habit-category-tag">
              <span class="category-dot ${categoryDotClass}"></span>
              ${habit.category} • ${habit.targetGoal || habit.frequency}
            </span>
          </div>
        </div>
        <div class="habit-card-right">
          ${habit.streak > 0 ? `
            <div class="habit-metric-box">
              <span class="metric-label">Streak</span>
              <span class="metric-value streak-green">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: -2px;">local_fire_department</span>
                ${habit.streak} days
              </span>
            </div>
          ` : `
            <div class="habit-metric-box">
              <span class="metric-label">Schedule</span>
              <span class="metric-value ${habit.schedule.includes('PM') ? 'schedule-red' : ''}">${habit.schedule}</span>
            </div>
          `}
        </div>
      `;

      card.addEventListener("click", (e) => {
        // Toggle completion
        this.toggleHabitCompletion(habit.id, card);
      });

      container.appendChild(card);
    });

    // Render Streak Spotlight
    const spotlightHabit = [...this.state.habits].sort((a, b) => b.streak - a.streak)[0] || {
      name: "Morning Meditation",
      streak: 14,
      history: [1, 1, 1, 1, 1, 1, 1]
    };

    document.getElementById("spotlightStreakNum").textContent = spotlightHabit.streak;
    document.getElementById("spotlightHabitName").textContent = spotlightHabit.name;

    // Dynamic spotlight week track pills (reflect real history)
    const spotlightTrack = document.getElementById("spotlightWeekTrack");
    if (spotlightTrack && spotlightHabit.history) {
      spotlightTrack.innerHTML = "";
      spotlightHabit.history.forEach((val, idx) => {
        const pill = document.createElement("div");
        pill.className = `track-day-pill${idx === 6 ? " current" : ""}`;
        const dot = document.createElement("span");
        dot.className = `track-dot${idx === 6 ? " pulse" : ""}`;
        dot.style.opacity = val === 1 ? "1" : "0.25";
        pill.appendChild(dot);
        spotlightTrack.appendChild(pill);
      });
    }

    // Dynamic spotlight day labels based on actual current date
    const _spotlightDayLetters = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const spotlightLabelsEl = document.getElementById("spotlightDaysLabels");
    if (spotlightLabelsEl) {
      spotlightLabelsEl.innerHTML = "";
      for (let i = 6; i >= 0; i--) {
        const _sd = new Date();
        _sd.setDate(_sd.getDate() - i);
        const span = document.createElement("span");
        span.textContent = _spotlightDayLetters[_sd.getDay()];
        if (i === 0) span.style.color = "#ffffff";
        spotlightLabelsEl.appendChild(span);
      }
    }

    // Render Active Targets Mini Widget
    const miniTargetsContainer = document.getElementById("dashboardTargetsMini");
    miniTargetsContainer.innerHTML = "";

    this.state.targets.slice(0, 3).forEach(target => {
      const pct = Math.min(100, Math.round((target.current / target.goal) * 100));
      let fillClass = "fill-indigo";
      if (pct >= 80) fillClass = "fill-emerald";
      else if (pct >= 50) fillClass = "fill-amber";

      const item = document.createElement("div");
      item.className = "target-mini-item";
      item.innerHTML = `
        <div class="target-mini-header">
          <span style="color: var(--on-surface);">${target.title}</span>
          <span class="target-fraction">${target.current} / ${target.goal} ${target.unit}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
        </div>
      `;
      miniTargetsContainer.appendChild(item);
    });

    // Render Weekly Heatmap Matrix
    this.renderWeeklyHeatmap();
  }

  renderWeeklyHeatmap() {
    const grid = document.getElementById("weeklyHeatmapGrid");
    grid.innerHTML = "";

    // Build actual 7-day window ending today
    const dayShorts = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayDate = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - i);
      days.push(dayShorts[d.getDay()]);
    }
    const currentDayIndex = 6; // Always the rightmost column = today

    // Top Header Row
    const emptyCorner = document.createElement("div");
    grid.appendChild(emptyCorner);

    days.forEach((day, idx) => {
      const header = document.createElement("div");
      header.className = `heatmap-col-header ${idx === currentDayIndex ? 'active-day' : ''}`;
      header.textContent = day;
      grid.appendChild(header);
    });

    // Rows for each habit
    const activeHabits = this.state.habits.filter(h => !h.archived);

    activeHabits.forEach(habit => {
      // Row label
      const label = document.createElement("div");
      label.className = "heatmap-row-label";
      label.textContent = habit.name;
      grid.appendChild(label);

      // 7 cells
      const history = habit.history || [1, 1, 0, 1, 1, 0, habit.completed ? 1 : 0];

      history.forEach((val, dayIdx) => {
        const cell = document.createElement("div");
        cell.className = "heatmap-cell";

        if (dayIdx === currentDayIndex) {
          cell.classList.add("current-day-cell");
        }

        // Color intensity based on category
        if (val === 1) {
          if (habit.category === "Health") cell.classList.add("cell-green-80");
          else if (habit.category === "Work") cell.classList.add("cell-indigo-80");
          else cell.classList.add("cell-amber-60");
        }

        cell.title = `${habit.name} - ${days[dayIdx]}: ${val === 1 ? 'Completed' : 'Missed'}`;
        
        // Interactive cell click: toggle history day
        cell.addEventListener("click", (e) => {
          e.stopPropagation();
          history[dayIdx] = history[dayIdx] === 1 ? 0 : 1;
          habit.history = history;
          if (dayIdx === currentDayIndex) {
            habit.completed = history[dayIdx] === 1;
          }
          this.saveState();
          this.renderAll();
          this.showToast(`Updated ${habit.name} on ${days[dayIdx]}`, "info");
        });

        grid.appendChild(cell);
      });
    });
  }

  // ========================================================================
  // Habit Actions
  // ========================================================================
  toggleHabitCompletion(habitId, cardElement) {
    const habit = this.state.habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.completed = !habit.completed;

    // Update streak
    if (habit.completed) {
      habit.streak += 1;
      if (habit.streak > habit.bestStreak) {
        habit.bestStreak = habit.streak;
      }
      // Update today in history
      if (habit.history && habit.history.length === 7) {
        habit.history[6] = 1;
      }
    } else {
      habit.streak = Math.max(0, habit.streak - 1);
      if (habit.history && habit.history.length === 7) {
        habit.history[6] = 0;
      }
    }

    this.saveState();
    if (this.supabase && this.user) {
      this.supabase.upsertHabit(this.user.id, habit);
    }

    // Trigger visual animation on card
    if (cardElement) {
      cardElement.classList.add("celebrate-anim");
      setTimeout(() => cardElement.classList.remove("celebrate-anim"), 350);
    }

    this.renderHeader();
    this.renderDashboard();
    this.renderHabitsManager();

    // Check if 100% completed today!
    const kpis = this.calculateKPIs();
    if (habit.completed) {
      if (kpis.completionRate === 100) {
        this.triggerConfetti();
        this.showToast("All daily habits complete! Unstoppable momentum!", "success");
      } else {
        this.showToast(`Completed: ${habit.name}!`, "success");
      }
    }
  }

  // ========================================================================
  // View 2: Habit Manager Rendering & Filtering
  // ========================================================================
  renderHabitsManager() {
    const container = document.getElementById("habitManagerTableBody");
    if (!container) return;
    container.innerHTML = "";

    const categoryFilter = document.getElementById("filterCategorySelect").value;
    const statusFilter = document.getElementById("filterStatusSelect").value;
    const sortFilter = document.getElementById("sortHabitsSelect").value;

    let list = [...this.state.habits];

    // Filter by Category
    if (categoryFilter !== "all") {
      list = list.filter(h => h.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Filter by Status
    if (statusFilter === "active") {
      list = list.filter(h => !h.archived);
    } else if (statusFilter === "completed") {
      list = list.filter(h => !h.archived && h.completed);
    } else if (statusFilter === "archived") {
      list = list.filter(h => h.archived);
    }

    // Sorting
    if (sortFilter === "streak-desc") {
      list.sort((a, b) => b.streak - a.streak);
    } else if (sortFilter === "streak-asc") {
      list.sort((a, b) => a.streak - b.streak);
    } else if (sortFilter === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortFilter === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--on-surface-variant);">
          <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.5;">inbox</span>
          <p style="margin-top: 8px; font-weight: 500;">No habits found matching your filters.</p>
        </div>
      `;
      return;
    }

    list.forEach(habit => {
      const row = document.createElement("div");
      row.className = "table-data-row";

      let categoryBadgeClass = "badge-health";
      if (habit.category === "Work") categoryBadgeClass = "badge-work";
      else if (habit.category === "Growth") categoryBadgeClass = "badge-growth";
      else if (habit.category === "Personal") categoryBadgeClass = "badge-personal";

      row.innerHTML = `
        <div class="table-cell-habit">
          <button class="custom-checkbox habit-table-toggle" data-id="${habit.id}" style="width: 22px; height: 22px;">
            ${habit.completed ? '<span class="material-symbols-outlined" style="font-size: 14px;">check</span>' : ''}
          </button>
          <span style="font-size: 15px; font-weight: 600; color: var(--on-surface); ${habit.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
            ${habit.name}
          </span>
        </div>

        <div>
          <span class="category-badge ${categoryBadgeClass}">${habit.category}</span>
        </div>

        <div style="font-size: 14px; color: var(--on-surface-variant);">
          ${habit.frequency}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-right: 16px;">
          <div style="display: flex; align-items: center; gap: 4px; font-weight: 700; color: var(--on-surface);">
            <span class="material-symbols-outlined" style="font-size: 16px; color: ${habit.streak > 0 ? 'var(--tertiary)' : 'var(--outline)'};">local_fire_department</span>
            ${habit.streak}
          </div>
          <span style="font-size: 13px; color: var(--outline);">${habit.bestStreak}</span>
        </div>

        <div class="table-cell-actions">
          <button class="action-icon-btn edit-habit-btn" data-id="${habit.id}" title="Edit habit">
            <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          </button>
          <button class="action-icon-btn archive-habit-btn" data-id="${habit.id}" title="${habit.archived ? 'Unarchive' : 'Archive'}">
            <span class="material-symbols-outlined" style="font-size: 18px;">${habit.archived ? 'unarchive' : 'archive'}</span>
          </button>
          <button class="action-icon-btn delete-btn delete-habit-btn" data-id="${habit.id}" title="Delete habit">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
          </button>
        </div>
      `;

      // Checkbox click
      row.querySelector(".habit-table-toggle").addEventListener("click", () => {
        this.toggleHabitCompletion(habit.id);
      });

      // Edit click
      row.querySelector(".edit-habit-btn").addEventListener("click", () => {
        this.openHabitModal(habit);
      });

      // Archive click
      row.querySelector(".archive-habit-btn").addEventListener("click", () => {
        habit.archived = !habit.archived;
        if (this.supabase && this.user) {
          this.supabase.upsertHabit(this.user.id, habit);
        }
        this.saveState();
        this.renderAll();
        this.showToast(`${habit.name} ${habit.archived ? 'archived' : 'restored'}`, "info");
      });

      // Delete click
      row.querySelector(".delete-habit-btn").addEventListener("click", () => {
        this.openConfirmModal(
          "Delete Habit",
          `Are you sure you want to permanently delete "${habit.name}" and all of its streak history?`,
          () => {
            this.state.habits = this.state.habits.filter(h => h.id !== habit.id);
            if (this.supabase && this.user) {
              this.supabase.deleteHabit(this.user.id, habit.id);
            }
            this.saveState();
            this.renderAll();
            this.showToast(`Deleted ${habit.name}`, "info");
          }
        );
      });

      container.appendChild(row);
    });
  }

  // ========================================================================
  // View 3: Targets & Deadlines
  // ========================================================================
  renderTargets() {
    const container = document.getElementById("targetsBentoGrid");
    if (!container) return;
    container.innerHTML = "";

    document.getElementById("totalActiveTargetsCount").textContent = this.state.targets.length;
    const completedTargets = this.state.targets.filter(t => t.current >= t.goal).length;
    document.getElementById("totalCompletedTargetsCount").textContent = completedTargets;

    this.state.targets.forEach(target => {
      const pct = Math.min(100, Math.round((target.current / target.goal) * 100));
      const daysLeft = this.getDaysRemaining(target.deadline);

      let statusPillClass = "pill-on-track";
      let statusIcon = "schedule";
      let statusText = `${daysLeft} days left`;
      let ambientClass = "ambient-primary";
      let fillClass = "fill-indigo";

      if (daysLeft < 0) {
        statusPillClass = "pill-overdue";
        statusIcon = "error";
        statusText = `${Math.abs(daysLeft)} days overdue`;
        ambientClass = "ambient-error";
        fillClass = "fill-red";
      } else if (daysLeft <= 14) {
        statusPillClass = "pill-approaching";
        statusIcon = "warning";
        statusText = `${daysLeft} days left`;
        ambientClass = "ambient-tertiary";
        fillClass = "fill-amber";
      }

      const card = document.createElement("div");
      card.className = "target-card";
      card.innerHTML = `
        <div class="target-card-ambient ${ambientClass}"></div>
        <div class="target-header">
          <div>
            <span class="category-badge badge-personal" style="font-size: 11px;">${target.category}</span>
            <h3 class="target-title">${target.title}</h3>
          </div>
          <div style="display: flex; gap: 2px; position: relative; z-index: 2;">
            <button class="action-icon-btn target-menu-btn" data-id="${target.id}" title="Edit target">
              <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
            </button>
            <button class="action-icon-btn delete-btn target-delete-btn" data-id="${target.id}" title="Delete target">
              <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
            </button>
          </div>
        </div>

        <div class="target-progress-body">
          <div class="target-numbers-row">
            <div>
              <span class="target-current-val">${target.unit === '$' ? '$' + target.current : target.current}</span>
              <span class="target-total-val">/ ${target.unit === '$' ? '$' + target.goal : target.goal + ' ' + target.unit}</span>
            </div>
            <span class="target-pct-text">${pct}%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
          </div>
        </div>

        <div class="target-footer">
          <div class="target-date-info">
            <span class="material-symbols-outlined" style="font-size: 16px;">calendar_today</span>
            <span>${new Date(target.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>

          <div class="target-pill-status ${statusPillClass}">
            <span class="material-symbols-outlined" style="font-size: 14px;">${statusIcon}</span>
            <span>${statusText}</span>
          </div>
        </div>

        <!-- Quick increment hover button -->
        <button class="target-quick-add log-progress-btn" data-id="${target.id}" title="Quick log progress">
          <span class="material-symbols-outlined">add</span>
        </button>
      `;

      // Quick log progress click
      card.querySelector(".log-progress-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.openLogProgressModal(target);
      });

      // Target options click (edit)
      card.querySelector(".target-menu-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.openTargetModal(target);
      });

      // Delete target click
      card.querySelector(".target-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.openConfirmModal(
          "Delete Target",
          `Are you sure you want to permanently delete "${target.title}"? This cannot be undone.`,
          () => {
            this.state.targets = this.state.targets.filter(t => t.id !== target.id);
            if (this.supabase && this.user) {
              this.supabase.deleteTarget(this.user.id, target.id);
            }
            this.saveState();
            this.renderAll();
            this.showToast(`Deleted: ${target.title}`, "info");
          }
        );
      });

      container.appendChild(card);
    });
  }

  // ========================================================================
  // View 4: Analytics
  // ========================================================================
  renderAnalytics() {
    const activeHabits = this.state.habits.filter(h => !h.archived);

    // 1. Update Analytics KPI Cards
    const totalCompletions = this.state.habits.reduce((acc, h) => {
      const streakComp = h.streak || 0;
      const historyComp = (h.history || []).filter(x => x === 1).length;
      return acc + Math.max(streakComp, historyComp);
    }, 0);
    const totalCompEl = document.getElementById("analyticsTotalCompletions");
    if (totalCompEl) totalCompEl.textContent = totalCompletions > 0 ? totalCompletions.toLocaleString() : "0";

    const totalPossible = activeHabits.length * 7;
    const totalDone = activeHabits.reduce((sum, h) => sum + ((h.history || []).reduce((a, b) => a + b, 0)), 0);
    const consistencyPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
    const consistencyEl = document.getElementById("analyticsConsistencyScore");
    if (consistencyEl) consistencyEl.textContent = `${consistencyPct}%`;

    const maxStreak = Math.max(0, ...this.state.habits.map(h => h.streak || 0));
    const personalStreakEl = document.getElementById("analyticsPersonalStreak") || document.getElementById("analyticsGlobalStreak");
    if (personalStreakEl) personalStreakEl.textContent = `${maxStreak} Days`;

    const allTimeBest = Math.max(0, ...this.state.habits.map(h => h.bestStreak || h.best_streak || h.streak || 0));
    const bestStreakEl = document.getElementById("analyticsBestStreak");
    if (bestStreakEl) bestStreakEl.textContent = `${allTimeBest} Days`;

    const bestHabit = this.state.habits.find(h => (h.bestStreak || h.best_streak || h.streak || 0) === allTimeBest);
    const bestHabitSub = document.getElementById("analyticsBestHabitSub");
    if (bestHabitSub) {
      bestHabitSub.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">award_star</span> ${bestHabit ? bestHabit.name : 'Best Routine'}`;
    }

    // 2. 30-Day Consistency Grid (5 Weeks Calendar Heatmap)
    const grid = document.getElementById("thirtyDayGrid");
    if (grid) {
      grid.innerHTML = "";

      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat

      // Align grid so Column 0 is Sun, Column 6 is Sat.
      // 5 complete rows of 7 = 35 days total.
      // Start date is 4 weeks before the current week's Sunday:
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek - 28);
      startDate.setHours(0, 0, 0, 0);

      const todayMidnight = new Date(today);
      todayMidnight.setHours(0, 0, 0, 0);

      for (let i = 0; i < 35; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);

        const cell = document.createElement("div");
        cell.className = "heatmap-cell";

        const diffTime = cellDate.getTime() - todayMidnight.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // negative = past, 0 = today, positive = future

        const dateStr = cellDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        if (diffDays > 0) {
          // Future day in the remainder of this current week
          cell.style.opacity = "0.2";
          cell.style.cursor = "default";
          cell.title = `${dateStr} (Upcoming)`;
        } else {
          const daysAgo = -diffDays;
          let completedForDay = 0;

          activeHabits.forEach(habit => {
            if (daysAgo < 7) {
              const histIdx = 6 - daysAgo;
              if (habit.history && habit.history[histIdx] === 1) {
                completedForDay++;
              }
            } else {
              if (habit.streak > daysAgo) {
                completedForDay++;
              } else if (habit.bestStreak && habit.bestStreak >= daysAgo && (daysAgo % 4 !== 0)) {
                completedForDay++;
              }
            }
          });

          const rate = activeHabits.length > 0 ? (completedForDay / activeHabits.length) : 0;

          if (rate > 0.75) cell.classList.add("cell-green-100");
          else if (rate > 0.50) cell.classList.add("cell-green-80");
          else if (rate > 0.25) cell.classList.add("cell-green-60");
          else if (rate > 0) cell.classList.add("cell-green-20");

          if (daysAgo === 0) {
            cell.classList.add("current-day-cell");
          }

          const ratePct = Math.round(rate * 100);
          cell.title = `${dateStr}: ${completedForDay} of ${activeHabits.length} completed (${ratePct}%)`;

          cell.addEventListener("click", () => {
            this.showToast(`${dateStr}: ${completedForDay} of ${activeHabits.length} habits completed (${ratePct}%)`, "info");
          });
        }

        grid.appendChild(cell);
      }
    }

    // 3. Category Distribution Breakdown (Dynamic Calculation)
    const catContainer = document.getElementById("categoryBreakdownContainer");
    if (catContainer) {
      catContainer.innerHTML = "";

      const colorMap = {
        emerald: "var(--secondary, #006c49)",
        indigo: "var(--primary, #4f46e5)",
        amber: "var(--tertiary, #d97706)",
        purple: "#8b5cf6",
        blue: "#2563eb",
        rose: "#e11d48",
        cyan: "#06b6d4"
      };

      // Collect categories from state + any unique categories from habits
      const catList = [...this.state.categories];
      activeHabits.forEach(h => {
        if (h.category && !catList.some(c => c.name.toLowerCase() === h.category.toLowerCase() || c.id.toLowerCase() === h.category.toLowerCase())) {
          catList.push({
            id: `c-${h.category.toLowerCase()}`,
            name: h.category,
            color: "indigo",
            icon: "category"
          });
        }
      });

      catList.forEach(cat => {
        const catHabits = activeHabits.filter(h => 
          (h.category || "").toLowerCase() === cat.name.toLowerCase() || 
          (h.category || "").toLowerCase() === cat.id.toLowerCase()
        );

        let catConsistency = 0;
        if (catHabits.length > 0) {
          const catSlots = catHabits.length * 7;
          const catDone = catHabits.reduce((acc, h) => acc + ((h.history || []).reduce((a, b) => a + b, 0)), 0);
          catConsistency = catSlots > 0 ? Math.round((catDone / catSlots) * 100) : 0;
          if (catDone === 0) {
            const todayDone = catHabits.filter(h => h.completed).length;
            catConsistency = Math.round((todayDone / catHabits.length) * 100);
          }
        }

        const hexColor = colorMap[cat.color] || cat.color || "var(--primary)";
        const habitCountText = `${catHabits.length} ${catHabits.length === 1 ? 'Habit' : 'Habits'}`;

        const row = document.createElement("div");
        row.className = "category-breakdown-row";
        row.innerHTML = `
          <div class="cat-row-label">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="font-size: 18px; color: ${hexColor};">${cat.icon || 'folder'}</span>
              <span style="color: var(--on-surface); font-weight: 600;">${cat.name}</span>
            </div>
            <span style="color: var(--on-surface-variant); font-size: 13px; font-weight: 600;">${catConsistency}% <span style="font-weight: 400; opacity: 0.8;">(${habitCountText})</span></span>
          </div>
          <div class="progress-bar-track" style="height: 10px; background: var(--surface-container-high); border-radius: var(--radius-full); overflow: hidden;">
            <div class="progress-bar-fill" style="width: ${catConsistency}%; background-color: ${hexColor}; height: 100%; border-radius: var(--radius-full); transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
          </div>
        `;
        catContainer.appendChild(row);
      });
    }
  }

  // ========================================================================
  // View 5: Settings
  // ========================================================================
  renderSettings() {
    // Form fields
    const nameInput = document.getElementById("profileNameInput");
    const emailInput = document.getElementById("profileEmailInput");
    if (nameInput) nameInput.value = this.state.profile.name || "Guest";
    if (emailInput) emailInput.value = this.state.profile.email || "";

    const settingsAvatarContainer = document.getElementById("settingsAvatarContainer");
    if (settingsAvatarContainer) {
      if (this.state.profile.avatar) {
        settingsAvatarContainer.innerHTML = `<img src="${this.state.profile.avatar}" alt="${this.state.profile.name || 'User'}" id="settingsAvatarImg" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        settingsAvatarContainer.innerHTML = `
          <div class="settings-avatar-placeholder" id="settingsAvatarPlaceholder">
            <span class="material-symbols-outlined" style="font-size: 44px; color: var(--on-primary);">person</span>
          </div>
        `;
      }
    }

    // Supabase Account Info in Settings
    this.updateAuthUI(this.user);

    // Categories list
    const catList = document.getElementById("settingsCategoriesList");
    if (catList) {
      catList.innerHTML = "";
      this.state.categories.forEach(cat => {
        const card = document.createElement("div");
        card.className = "theme-option-card";
        card.style.flexDirection = "column";
        card.style.alignItems = "flex-start";
        card.style.gap = "8px";
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; width: 100%; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="color: var(--${cat.color || 'primary'});">${cat.icon || 'folder'}</span>
              <strong style="font-size: 15px;">${cat.name}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; color: var(--on-surface-variant);">${cat.count} habits</span>
              ${this.state.categories.length > 1 ? `
                <button class="action-icon-btn delete-cat-btn" data-id="${cat.id}" title="Delete category" style="width: 26px; height: 26px;">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--error);">delete</span>
                </button>
              ` : ''}
            </div>
          </div>
        `;

        const delBtn = card.querySelector(".delete-cat-btn");
        if (delBtn) {
          delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openConfirmModal(
              "Delete Category",
              `Are you sure you want to delete category "${cat.name}"?`,
              () => {
                this.state.categories = this.state.categories.filter(c => c.id !== cat.id);
                if (this.supabase && this.user) {
                  this.supabase.deleteCategory(this.user.id, cat.id);
                }
                this.saveState();
                this.renderSettings();
                this.showToast(`Deleted category: ${cat.name}`, "info");
              }
            );
          });
        }

        catList.appendChild(card);
      });
    }
  }

  // ========================================================================
  // Modal Handlers
  // ========================================================================
  openHabitModal(habitToEdit = null) {
    const modal = document.getElementById("habitModal");
    const title = document.getElementById("habitModalTitle");
    const editId = document.getElementById("habitEditId");
    const nameInput = document.getElementById("habitNameInput");
    const catInput = document.getElementById("habitCategoryInput");
    const freqInput = document.getElementById("habitFrequencyInput");
    const targetInput = document.getElementById("habitTargetGoalInput");
    const schedInput = document.getElementById("habitScheduleTimeInput");

    if (habitToEdit) {
      title.textContent = "Edit Habit";
      editId.value = habitToEdit.id;
      nameInput.value = habitToEdit.name;
      catInput.value = habitToEdit.category;
      freqInput.value = habitToEdit.frequency;
      targetInput.value = habitToEdit.targetGoal || "";
      schedInput.value = habitToEdit.schedule || "";
    } else {
      title.textContent = "Create New Habit";
      editId.value = "";
      nameInput.value = "";
      catInput.value = "Health";
      freqInput.value = "Daily";
      targetInput.value = "";
      schedInput.value = "08:00 AM";
    }

    modal.classList.add("open");
    nameInput.focus();
  }

  saveHabitFromModal() {
    const editId = document.getElementById("habitEditId").value;
    const name = document.getElementById("habitNameInput").value.trim();
    const category = document.getElementById("habitCategoryInput").value;
    const frequency = document.getElementById("habitFrequencyInput").value;
    const targetGoal = document.getElementById("habitTargetGoalInput").value.trim();
    const schedule = document.getElementById("habitScheduleTimeInput").value.trim() || "Daily";

    if (!name) {
      this.showToast("Please enter a habit name", "info");
      return;
    }

    if (editId) {
      // Update existing
      const habit = this.state.habits.find(h => h.id === editId);
      if (habit) {
        habit.name = name;
        habit.category = category;
        habit.frequency = frequency;
        habit.targetGoal = targetGoal;
        habit.schedule = schedule;
        this.showToast(`Updated "${name}"`, "success");
      }
    } else {
      // Create new
      const newHabit = {
        id: "h-" + Date.now(),
        name,
        category,
        frequency,
        streak: 0,
        bestStreak: 0,
        completed: false,
        archived: false,
        schedule,
        targetGoal,
        history: [0, 0, 0, 0, 0, 0, 0]
      };
      this.state.habits.push(newHabit);
      this.showToast(`Created new habit: "${name}"`, "success");
    }

    this.saveState();
    if (this.supabase && this.user) {
      const activeHabit = editId ? this.state.habits.find(h => h.id === editId) : this.state.habits[this.state.habits.length - 1];
      if (activeHabit) this.supabase.upsertHabit(this.user.id, activeHabit);
    }
    this.closeAllModals();
    this.renderAll();
  }

  openTargetModal(targetToEdit = null) {
    const modal = document.getElementById("targetModal");
    const title = document.getElementById("targetModalTitle");
    const editId = document.getElementById("targetEditId");
    const titleInput = document.getElementById("targetTitleInput");
    const catInput = document.getElementById("targetCategoryInput");
    const deadlineInput = document.getElementById("targetDeadlineInput");
    const currentInput = document.getElementById("targetCurrentInput");
    const goalInput = document.getElementById("targetGoalInput");
    const unitInput = document.getElementById("targetUnitInput");

    if (targetToEdit) {
      title.textContent = "Edit Target";
      editId.value = targetToEdit.id;
      titleInput.value = targetToEdit.title;
      catInput.value = targetToEdit.category;
      deadlineInput.value = targetToEdit.deadline;
      currentInput.value = targetToEdit.current;
      goalInput.value = targetToEdit.goal;
      unitInput.value = targetToEdit.unit;
    } else {
      title.textContent = "Create New Target";
      editId.value = "";
      titleInput.value = "";
      catInput.value = "Fitness";
      // 30 days from now default
      const d = new Date();
      d.setDate(d.getDate() + 30);
      deadlineInput.value = d.toISOString().split("T")[0];
      currentInput.value = "0";
      goalInput.value = "100";
      unitInput.value = "units";
    }

    modal.classList.add("open");
    titleInput.focus();
  }

  saveTargetFromModal() {
    const editId = document.getElementById("targetEditId").value;
    const title = document.getElementById("targetTitleInput").value.trim();
    const category = document.getElementById("targetCategoryInput").value;
    const deadline = document.getElementById("targetDeadlineInput").value;
    const current = parseFloat(document.getElementById("targetCurrentInput").value) || 0;
    const goal = parseFloat(document.getElementById("targetGoalInput").value) || 100;
    const unit = document.getElementById("targetUnitInput").value.trim() || "";

    if (!title) {
      this.showToast("Please enter a target name", "info");
      return;
    }

    if (editId) {
      const target = this.state.targets.find(t => t.id === editId);
      if (target) {
        target.title = title;
        target.category = category;
        target.deadline = deadline;
        target.current = current;
        target.goal = goal;
        target.unit = unit;
        this.showToast(`Updated target: "${title}"`, "success");
      }
    } else {
      const newTarget = {
        id: "t-" + Date.now(),
        title,
        category,
        deadline,
        current,
        goal,
        unit,
        status: "On Track"
      };
      this.state.targets.push(newTarget);
      this.showToast(`Created new target: "${title}"`, "success");
    }

    this.saveState();
    if (this.supabase && this.user) {
      const activeTarget = editId ? this.state.targets.find(t => t.id === editId) : this.state.targets[this.state.targets.length - 1];
      if (activeTarget) this.supabase.upsertTarget(this.user.id, activeTarget);
    }
    this.closeAllModals();
    this.renderAll();
  }

  openLogProgressModal(target) {
    const modal = document.getElementById("logProgressModal");
    document.getElementById("logProgressTargetId").value = target.id;
    document.getElementById("logProgressTitle").textContent = `Log Progress: ${target.title}`;
    document.getElementById("logProgressSubtext").textContent = 
      `Current: ${target.current} / ${target.goal} ${target.unit}. Enter amount to add:`;
    document.getElementById("logProgressIncrementInput").value = "5";

    modal.classList.add("open");
    document.getElementById("logProgressIncrementInput").focus();
  }

  confirmLogProgress() {
    const targetId = document.getElementById("logProgressTargetId").value;
    const increment = parseFloat(document.getElementById("logProgressIncrementInput").value) || 0;
    const target = this.state.targets.find(t => t.id === targetId);

    if (target && increment > 0) {
      target.current += increment;
      if (target.current >= target.goal) {
        this.triggerConfetti();
        this.showToast(`Goal Reached! Congratulations on completing ${target.title}!`, "success");
      } else {
        this.showToast(`Logged +${increment} ${target.unit} for ${target.title}`, "success");
      }
      this.saveState();
      if (this.supabase && this.user) {
        this.supabase.upsertTarget(this.user.id, target);
      }
      this.renderAll();
    }
    this.closeAllModals();
  }

  openAddCategoryModal() {
    document.getElementById("newCategoryNameInput").value = "";
    document.getElementById("newCategoryIconInput").value = "";
    document.getElementById("addCategoryModal").classList.add("open");
    setTimeout(() => document.getElementById("newCategoryNameInput").focus(), 50);
  }

  saveNewCategory() {
    const name = document.getElementById("newCategoryNameInput").value.trim();
    const icon = document.getElementById("newCategoryIconInput").value.trim() || "label";
    if (!name) {
      this.showToast("Please enter a category name", "info");
      return;
    }
    const newCat = {
      id: "c-" + Date.now(),
      name,
      color: "indigo",
      icon,
      count: 0
    };
    this.state.categories.push(newCat);
    this.saveState();
    if (this.supabase && this.user) {
      this.supabase.upsertCategory(this.user.id, newCat);
    }
    this.closeAllModals();
    this.renderSettings();
    this.showToast(`Category "${name}" added`, "success");
  }

  openConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalMessage").textContent = message;
    this.modalConfirmCallback = onConfirm;
    modal.classList.add("open");
  }

  closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
    this.modalConfirmCallback = null;
  }

  // ========================================================================
  // Confetti Physics Engine
  // ========================================================================
  triggerConfetti() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#4f46e5", "#006c49", "#f59e0b", "#6366f1", "#10b981", "#ec4899"];
    const particles = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height / 3 + (Math.random() - 0.5) * 100,
        r: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1.2) * 16,
        gravity: 0.45,
        tilt: Math.random() * 10,
        tiltAngle: Math.random() * Math.PI,
        tiltAngleInc: Math.random() * 0.08 + 0.04
      });
    }

    let animationFrame;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.tiltAngle += p.tiltAngleInc;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        if (p.y < canvas.height) {
          alive++;
          ctx.beginPath();
          ctx.lineWidth = p.r / 2;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
          ctx.stroke();
        }
      });

      if (alive > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  }

  // ========================================================================
  // Toast System
  // ========================================================================
  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const iconName = type === "success" ? "check_circle" : "info";

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="color: ${type === 'success' ? 'var(--secondary)' : 'var(--primary)'}; font-size: 20px;">${iconName}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ========================================================================
  // Event Listeners Setup
  // ========================================================================
  setupEventListeners() {
    // Theme toggle button
    document.getElementById("themeToggleBtn").addEventListener("click", () => this.toggleTheme());

    // Mobile navigation drawer toggle
    const mobileToggle = document.getElementById("mobileMenuToggle");
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");

    const closeSidebarDrawer = () => {
      if (sidebar) sidebar.classList.remove("mobile-open");
      if (backdrop) backdrop.classList.remove("open");
    };

    if (mobileToggle) {
      mobileToggle.addEventListener("click", () => {
        if (sidebar) sidebar.classList.toggle("mobile-open");
        if (backdrop) backdrop.classList.toggle("open");
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", closeSidebarDrawer);
    }

    // Close sidebar on clicking any sidebar nav link or brand logo
    document.querySelectorAll(".sidebar-nav .nav-link, .brand-container").forEach(link => {
      link.addEventListener("click", () => {
        closeSidebarDrawer();
      });
    });

    // Close sidebar if open on Escape key press
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sidebar && sidebar.classList.contains("mobile-open")) {
        closeSidebarDrawer();
      }
    });

    // Mobile Bottom Nav: Quick Add Habit Button (Center FAB)
    const mobileAddHabitBtn = document.getElementById("mobileAddHabitBtn");
    if (mobileAddHabitBtn) {
      mobileAddHabitBtn.addEventListener("click", () => this.openHabitModal());
    }

    // Mobile Bottom Nav items: ensure sidebar is closed when tapping any bottom nav item
    document.querySelectorAll(".mobile-nav-bar .mobile-nav-item").forEach(item => {
      item.addEventListener("click", () => {
        closeSidebarDrawer();
      });
    });

    // Profile badge opens settings
    document.getElementById("headerProfileBadge").addEventListener("click", () => {
      window.location.hash = "#settings";
    });

    // Add habit buttons (Dashboard & Habit Manager)
    document.getElementById("dashboardAddHabitBtn").addEventListener("click", () => this.openHabitModal());
    document.getElementById("managerAddHabitBtn").addEventListener("click", () => this.openHabitModal());

    // Add target button
    document.getElementById("targetsAddTargetBtn").addEventListener("click", () => this.openTargetModal());

    // Modal close buttons (cancel / backdrop)
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => this.closeAllModals());
    });

    // Save buttons
    document.getElementById("saveHabitBtn").addEventListener("click", () => this.saveHabitFromModal());
    document.getElementById("saveTargetBtn").addEventListener("click", () => this.saveTargetFromModal());
    document.getElementById("confirmLogProgressBtn").addEventListener("click", () => this.confirmLogProgress());

    // Confirm dialog action button
    document.getElementById("confirmActionBtn").addEventListener("click", () => {
      if (this.modalConfirmCallback) {
        this.modalConfirmCallback();
      }
      this.closeAllModals();
    });

    // Habit Manager Filter changes
    document.getElementById("filterCategorySelect").addEventListener("change", () => this.renderHabitsManager());
    document.getElementById("filterStatusSelect").addEventListener("change", () => this.renderHabitsManager());
    document.getElementById("sortHabitsSelect").addEventListener("change", () => this.renderHabitsManager());

    // Settings Navigation Tabs
    document.querySelectorAll(".settings-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".settings-nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const targetTab = btn.dataset.tab;
        document.querySelectorAll(".settings-panel-block").forEach(panel => {
          panel.style.display = panel.id === targetTab ? "block" : "none";
        });
      });
    });

    // Theme selector cards in Settings
    document.querySelectorAll(".theme-option-card[data-theme]").forEach(card => {
      card.addEventListener("click", () => {
        const selectedTheme = card.dataset.theme;
        this.applyTheme(selectedTheme);
        this.showToast(`Theme set to ${selectedTheme.toUpperCase()}`, "info");
      });
    });

    // Profile save
    document.getElementById("saveProfileBtn").addEventListener("click", () => {
      const name = document.getElementById("profileNameInput").value.trim();
      const email = document.getElementById("profileEmailInput").value.trim();
      if (name) this.state.profile.name = name;
      if (email) this.state.profile.email = email;
      if (this.supabase && this.user) {
        this.supabase.updateProfile(this.user.id, this.state.profile);
      }
      this.saveState();
      this.renderHeader();
      this.showToast("Profile changes saved successfully", "success");
    });

    // Add Category button in Settings
    const addCatBtn = document.getElementById("addCategoryBtn");
    if (addCatBtn) {
      addCatBtn.addEventListener("click", () => this.openAddCategoryModal());
    }

    const saveCatBtn = document.getElementById("saveCategoryBtn");
    if (saveCatBtn) {
      saveCatBtn.addEventListener("click", () => this.saveNewCategory());
    }

    // Header Sign In button
    const headerSignIn = document.getElementById("headerSignInBtn");
    if (headerSignIn) {
      headerSignIn.addEventListener("click", () => this.openAuthModal("signin"));
    }

    // Settings Auth Action button (Sign In / Sign Out)
    const settingsAuthBtn = document.getElementById("settingsAuthActionBtn");
    if (settingsAuthBtn) {
      settingsAuthBtn.addEventListener("click", () => {
        if (this.user) {
          this.handleSignOut();
        } else {
          this.openAuthModal("signin");
        }
      });
    }

    // Auth Modal Tabs & Form
    const tabSignIn = document.getElementById("authTabSignIn");
    const tabSignUp = document.getElementById("authTabSignUp");
    if (tabSignIn) tabSignIn.addEventListener("click", () => this.openAuthModal("signin"));
    if (tabSignUp) tabSignUp.addEventListener("click", () => this.openAuthModal("signup"));

    const switchBtn = document.getElementById("authSwitchTabBtn");
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        this.openAuthModal(this.authMode === "signin" ? "signup" : "signin");
      });
    }

    const authForm = document.getElementById("authForm");
    if (authForm) {
      authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAuthSubmit();
      });
    }

    const authSubmit = document.getElementById("authSubmitBtn");
    if (authSubmit) {
      authSubmit.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleAuthSubmit();
      });
    }

    // Export Analytics Report
    const exportReportBtn = document.getElementById("exportAnalyticsBtn");
    if (exportReportBtn) {
      exportReportBtn.addEventListener("click", () => {
        window.print();
      });
    }

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAllModals();
      }
    });
  }

  // ========================================================================
  // Supabase Authentication & Real-time Cloud Synchronization
  // ========================================================================
  initSupabase() {
    this.supabase = window.momentumSupabase;
    if (!this.supabase) return;

    this.supabase.onAuthStateChange(async (event, session) => {
      console.log("Supabase Auth Event:", event, session?.user?.email);
      await this.handleAuthStateChange(event, session);
    });

    this.supabase.getCurrentSession().then(session => {
      if (session?.user) {
        this.handleAuthStateChange("INITIAL_SESSION", session);
      } else {
        this.updateAuthUI(null);
      }
    });
  }

  async handleAuthStateChange(event, session) {
    const user = session?.user || null;
    this.user = user;

    if (user) {
      this.updateAuthUI(user);

      // Load user cloud data from Supabase
      const cloudData = await this.supabase.loadUserData(user.id);
      if (cloudData) {
        const hasHabits = cloudData.habits && cloudData.habits.length > 0;
        const hasTargets = cloudData.targets && cloudData.targets.length > 0;

        if (!hasHabits && !hasTargets) {
          // First time user: seed default starting data into Supabase
          await this.supabase.seedDefaultData(user.id, this.state);
        } else {
          // Hydrate application state from Supabase
          if (cloudData.profile) {
            this.state.profile.name = cloudData.profile.display_name || user.user_metadata?.display_name || this.state.profile.name;
            this.state.profile.email = cloudData.profile.email || user.email || this.state.profile.email;
            if (cloudData.profile.avatar_url) this.state.profile.avatar = cloudData.profile.avatar_url;
            if (cloudData.profile.theme) this.applyTheme(cloudData.profile.theme);
          } else {
            this.state.profile.email = user.email;
            if (user.user_metadata?.display_name) this.state.profile.name = user.user_metadata.display_name;
          }

          if (cloudData.habits.length > 0) {
            this.state.habits = cloudData.habits.map(h => ({
              id: h.id,
              name: h.name,
              category: h.category,
              frequency: h.frequency,
              streak: h.streak || 0,
              bestStreak: h.best_streak || 0,
              completed: !!h.completed,
              archived: !!h.archived,
              schedule: h.schedule || "",
              targetGoal: h.target_goal || "",
              history: h.history || [0, 0, 0, 0, 0, 0, 0]
            }));
          }

          if (cloudData.targets.length > 0) {
            this.state.targets = cloudData.targets.map(t => ({
              id: t.id,
              title: t.title,
              category: t.category,
              current: parseFloat(t.current) || 0,
              goal: parseFloat(t.goal) || 100,
              unit: t.unit || "",
              deadline: t.deadline || "",
              status: t.status || "On Track"
            }));
          }

          if (cloudData.categories.length > 0) {
            this.state.categories = cloudData.categories.map(c => ({
              id: c.id,
              name: c.name,
              color: c.color,
              icon: c.icon,
              count: c.count || 0
            }));
          }
        }
      }

      this.saveState();
      this.renderAll();

      if (event === "SIGNED_IN") {
        this.showToast(`Signed in as ${this.state.profile.name}! Synced with Supabase`, "success");
      }
    } else {
      this.updateAuthUI(null);
      this.renderAll();
    }
  }

  updateAuthUI(user) {
    const signInBtn = document.getElementById("headerSignInBtn");
    const syncDot = document.getElementById("headerSyncDot");
    const accountEmail = document.getElementById("supabaseAccountEmail");
    const accountSubtext = document.getElementById("supabaseAccountSubtext");
    const statusPill = document.getElementById("supabaseStatusPill");
    const statusText = document.getElementById("supabaseStatusText");
    const authActionBtn = document.getElementById("settingsAuthActionBtn");

    if (user) {
      if (signInBtn) signInBtn.style.display = "none";
      if (syncDot) {
        syncDot.className = "cloud-sync-indicator";
        syncDot.title = "Synced with Supabase Cloud";
      }
      if (accountEmail) accountEmail.textContent = user.email || this.state.profile.email;
      if (accountSubtext) accountSubtext.textContent = "Your habits and targets are backed up & synced in real-time.";
      if (statusPill) statusPill.className = "supabase-status-pill";
      if (statusText) statusText.textContent = "Connected to Supabase Cloud";
      if (authActionBtn) authActionBtn.textContent = "Sign Out";
    } else {
      if (signInBtn) signInBtn.style.display = "inline-flex";
      if (syncDot) {
        syncDot.className = "cloud-sync-indicator offline";
        syncDot.title = "Guest Mode (Local Storage Only)";
      }
      if (accountEmail) accountEmail.textContent = "Guest Session";
      if (accountSubtext) accountSubtext.textContent = "Sign in to securely sync your habits across devices.";
      if (statusPill) statusPill.className = "supabase-status-pill offline";
      if (statusText) statusText.textContent = "Guest Mode (Offline)";
      if (authActionBtn) authActionBtn.textContent = "Sign In";
    }
  }

  openAuthModal(tab = "signin") {
    this.authMode = tab;
    const modal = document.getElementById("authModal");
    const title = document.getElementById("authModalTitle");
    const nameGroup = document.getElementById("authNameGroup");
    const submitText = document.getElementById("authSubmitText");
    const helperText = document.getElementById("authHelperText");
    const switchPromptText = document.getElementById("authSwitchPromptText");
    const switchTabBtn = document.getElementById("authSwitchTabBtn");
    const errorBanner = document.getElementById("authErrorBanner");

    if (errorBanner) errorBanner.style.display = "none";

    const tabSignIn = document.getElementById("authTabSignIn");
    const tabSignUp = document.getElementById("authTabSignUp");

    if (tab === "signup") {
      title.textContent = "Create Supabase Account";
      if (tabSignIn) tabSignIn.classList.remove("active");
      if (tabSignUp) tabSignUp.classList.add("active");
      if (nameGroup) nameGroup.style.display = "flex";
      if (submitText) submitText.textContent = "Create Account";
      if (helperText) helperText.textContent = "Create your account to start syncing habits to Supabase Cloud.";
      if (switchPromptText) switchPromptText.textContent = "Already have an account?";
      if (switchTabBtn) switchTabBtn.textContent = "Sign In";
    } else {
      title.textContent = "Sign In to Momentum";
      if (tabSignUp) tabSignUp.classList.remove("active");
      if (tabSignIn) tabSignIn.classList.add("active");
      if (nameGroup) nameGroup.style.display = "none";
      if (submitText) submitText.textContent = "Sign In";
      if (helperText) helperText.textContent = "Sign in to sync your habits, streaks, and targets with Supabase Cloud.";
      if (switchPromptText) switchPromptText.textContent = "Don't have an account yet?";
      if (switchTabBtn) switchTabBtn.textContent = "Create one";
    }

    modal.classList.add("open");
    setTimeout(() => {
      const emailInput = document.getElementById("authEmailInput");
      if (emailInput) emailInput.focus();
    }, 100);
  }

  async handleAuthSubmit() {
    const email = document.getElementById("authEmailInput").value.trim();
    const password = document.getElementById("authPasswordInput").value;
    const name = document.getElementById("authNameInput")?.value?.trim() || "";
    const errorBanner = document.getElementById("authErrorBanner");
    const submitBtn = document.getElementById("authSubmitBtn");
    const submitText = document.getElementById("authSubmitText");

    if (!email || !password) {
      if (errorBanner) {
        errorBanner.textContent = "Please enter both email and password.";
        errorBanner.style.display = "flex";
      }
      return;
    }

    if (password.length < 6) {
      if (errorBanner) {
        errorBanner.textContent = "Password must be at least 6 characters long.";
        errorBanner.style.display = "flex";
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.textContent = "Connecting to Supabase...";
    if (errorBanner) errorBanner.style.display = "none";

    try {
      if (this.authMode === "signup") {
        await this.supabase.signUp(email, password, name);
        this.showToast("Account created successfully! Logged in.", "success");
      } else {
        await this.supabase.signIn(email, password);
        this.showToast("Signed in successfully!", "success");
      }
      this.closeAllModals();
    } catch (err) {
      console.error("Auth error:", err);
      if (errorBanner) {
        errorBanner.textContent = err.message || "Authentication failed. Please check your credentials.";
        errorBanner.style.display = "flex";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = this.authMode === "signup" ? "Create Account" : "Sign In";
    }
  }

  async handleSignOut() {
    if (this.supabase) {
      await this.supabase.signOut();
      this.showToast("Signed out of Supabase Cloud", "info");
    }
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.momentumApp = new MomentumApp();
});
