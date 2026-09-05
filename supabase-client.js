/**
 * Supabase Backend Client & Database Layer for Momentum
 * Connected to Project: sagnikrc07-maker's Project (yagvczdnfyhdtvggkclj)
 */

const SUPABASE_CONFIG = {
  url: "https://yagvczdnfyhdtvggkclj.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZ3ZjemRuZnloZHR2Z2drY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODM2MDcsImV4cCI6MjEwMzY1OTYwN30.VsaIdEh9PZGdFfVuJy1KMAISkl8yhRepxAXNGGMxibA"
};

class MomentumSupabaseClient {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.currentSession = null;
    this.init();
  }

  init() {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } else {
      console.warn("Supabase SDK not yet loaded in window.");
    }
  }

  getClient() {
    if (!this.client && window.supabase && typeof window.supabase.createClient === "function") {
      this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return this.client;
  }

  // ========================================================================
  // Authentication
  // ========================================================================

  async getCurrentSession() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      this.currentSession = data.session;
      this.currentUser = data.session?.user || null;
      return data.session;
    } catch (err) {
      console.error("Error getting session:", err);
      return null;
    }
  }

  async signUp(email, password, displayName = "") {
    const client = this.getClient();
    if (!client) throw new Error("Supabase client is not available.");

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0]
        }
      }
    });

    if (error) throw error;

    const user = data.user;
    if (user) {
      this.currentUser = user;
      this.currentSession = data.session;
      // Upsert profile record
      try {
        await this.updateProfile(user.id, {
          display_name: displayName || user.user_metadata?.display_name || email.split("@")[0],
          email: user.email,
          avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(email)}`,
          theme: "light"
        });
      } catch (profErr) {
        console.warn("Could not immediately create profile row:", profErr);
      }
    }

    return data;
  }

  async signIn(email, password) {
    const client = this.getClient();
    if (!client) throw new Error("Supabase client is not available.");

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    this.currentUser = data.user;
    this.currentSession = data.session;
    return data;
  }

  async signOut() {
    const client = this.getClient();
    if (!client) return;

    const { error } = await client.auth.signOut();
    this.currentUser = null;
    this.currentSession = null;
    if (error) throw error;
  }

  onAuthStateChange(callback) {
    const client = this.getClient();
    if (!client) return { data: { subscription: { unsubscribe: () => {} } } };
    return client.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      this.currentUser = session?.user || null;
      callback(event, session);
    });
  }

  // ========================================================================
  // Database Operations (Row Level Security protected)
  // ========================================================================

  async loadUserData(userId) {
    const client = this.getClient();
    if (!client || !userId) return null;

    try {
      const [profileRes, habitsRes, targetsRes, categoriesRes] = await Promise.all([
        client.from("momentum_profiles").select("*").eq("id", userId).maybeSingle(),
        client.from("momentum_habits").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
        client.from("momentum_targets").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
        client.from("momentum_categories").select("*").eq("user_id", userId).order("created_at", { ascending: true })
      ]);

      if (profileRes.error) console.error("Error loading profile:", profileRes.error);
      if (habitsRes.error) console.error("Error loading habits:", habitsRes.error);
      if (targetsRes.error) console.error("Error loading targets:", targetsRes.error);
      if (categoriesRes.error) console.error("Error loading categories:", categoriesRes.error);

      return {
        profile: profileRes.data,
        habits: habitsRes.data || [],
        targets: targetsRes.data || [],
        categories: categoriesRes.data || []
      };
    } catch (err) {
      console.error("loadUserData error:", err);
      return null;
    }
  }

  async seedDefaultData(userId, defaultState) {
    const client = this.getClient();
    if (!client || !userId) return;

    try {
      // 1. Seed Profile
      const profileRow = {
        id: userId,
        display_name: defaultState.profile?.name || this.currentUser?.user_metadata?.display_name || "Momentum Member",
        email: this.currentUser?.email || defaultState.profile?.email || "",
        avatar_url: defaultState.profile?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${userId}`,
        theme: defaultState.profile?.theme || "light"
      };
      await client.from("momentum_profiles").upsert(profileRow);

      // 2. Seed Categories
      if (defaultState.categories && defaultState.categories.length > 0) {
        const catRows = defaultState.categories.map(c => ({
          id: c.id,
          user_id: userId,
          name: c.name,
          color: c.color,
          icon: c.icon,
          count: c.count || 0
        }));
        await client.from("momentum_categories").upsert(catRows);
      }

      // 3. Seed Habits
      if (defaultState.habits && defaultState.habits.length > 0) {
        const habitRows = defaultState.habits.map(h => ({
          id: h.id,
          user_id: userId,
          name: h.name,
          category: h.category,
          frequency: h.frequency,
          streak: h.streak || 0,
          best_streak: h.bestStreak || h.best_streak || 0,
          completed: !!h.completed,
          archived: !!h.archived,
          schedule: h.schedule || "",
          target_goal: h.targetGoal || h.target_goal || "",
          history: h.history || [0, 0, 0, 0, 0, 0, 0]
        }));
        await client.from("momentum_habits").upsert(habitRows);
      }

      // 4. Seed Targets
      if (defaultState.targets && defaultState.targets.length > 0) {
        const targetRows = defaultState.targets.map(t => ({
          id: t.id,
          user_id: userId,
          title: t.title,
          category: t.category,
          current: t.current || 0,
          goal: t.goal || 100,
          unit: t.unit || "",
          deadline: t.deadline || null,
          status: t.status || "On Track"
        }));
        await client.from("momentum_targets").upsert(targetRows);
      }
    } catch (err) {
      console.error("Error seeding default data in Supabase:", err);
    }
  }

  async upsertHabit(userId, habit) {
    const client = this.getClient();
    if (!client || !userId) return;

    const row = {
      id: habit.id,
      user_id: userId,
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      streak: habit.streak || 0,
      best_streak: habit.bestStreak !== undefined ? habit.bestStreak : (habit.best_streak || 0),
      completed: !!habit.completed,
      archived: !!habit.archived,
      schedule: habit.schedule || "",
      target_goal: habit.targetGoal !== undefined ? habit.targetGoal : (habit.target_goal || ""),
      history: habit.history || [0, 0, 0, 0, 0, 0, 0],
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from("momentum_habits").upsert(row);
    if (error) console.error("Error upserting habit to Supabase:", error);
  }

  async deleteHabit(userId, habitId) {
    const client = this.getClient();
    if (!client || !userId) return;

    const { error } = await client.from("momentum_habits").delete().match({ id: habitId, user_id: userId });
    if (error) console.error("Error deleting habit from Supabase:", error);
  }

  async upsertTarget(userId, target) {
    const client = this.getClient();
    if (!client || !userId) return;

    const row = {
      id: target.id,
      user_id: userId,
      title: target.title,
      category: target.category,
      current: target.current || 0,
      goal: target.goal || 100,
      unit: target.unit || "",
      deadline: target.deadline || null,
      status: target.status || "On Track",
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from("momentum_targets").upsert(row);
    if (error) console.error("Error upserting target to Supabase:", error);
  }

  async deleteTarget(userId, targetId) {
    const client = this.getClient();
    if (!client || !userId) return;

    const { error } = await client.from("momentum_targets").delete().match({ id: targetId, user_id: userId });
    if (error) console.error("Error deleting target from Supabase:", error);
  }

  async upsertCategory(userId, category) {
    const client = this.getClient();
    if (!client || !userId) return;

    const row = {
      id: category.id,
      user_id: userId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      count: category.count || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from("momentum_categories").upsert(row);
    if (error) console.error("Error upserting category to Supabase:", error);
  }

  async deleteCategory(userId, categoryId) {
    const client = this.getClient();
    if (!client || !userId) return;

    const { error } = await client.from("momentum_categories").delete().match({ id: categoryId, user_id: userId });
    if (error) console.error("Error deleting category from Supabase:", error);
  }

  async updateProfile(userId, profile) {
    const client = this.getClient();
    if (!client || !userId) return;

    const row = {
      id: userId,
      display_name: profile.display_name || profile.name || "",
      email: profile.email || "",
      avatar_url: profile.avatar_url || profile.avatar || "",
      theme: profile.theme || "light",
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from("momentum_profiles").upsert(row);
    if (error) console.error("Error updating profile in Supabase:", error);
  }
}

// Attach globally
window.momentumSupabase = new MomentumSupabaseClient();
