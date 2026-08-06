// Supabase Configuration
const SUPABASE_URL = 'https://usnxadqxiwapztyefif.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnhhZHF4bml3YXB6dHllZmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMDI4MDEsImV4cCI6MjEwMTU3ODgwMX0.V447hj8DCcPh87xpeIwX-Gch1a1CBeksQaWMTJz551k';

// Supabase v2 anon keys are JWT tokens starting with "eyJ"
// If the key doesn't match, skip Supabase entirely and use localStorage
const isSupabaseKeyValid = SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ');

let supabase = null;
if (isSupabaseKeyValid) {
  try {
    const client = window.supabase || window.supabaseClient;
    if (client && typeof client.createClient === 'function') {
      supabase = client.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('[DB] Supabase client initialized');
    } else {
      console.warn('[DB] Supabase library not loaded, using localStorage');
    }
  } catch (e) {
    console.warn('[DB] Supabase init failed, using localStorage:', e.message);
  }
} else {
  console.warn('[DB] Invalid Supabase key format (expected JWT starting with "eyJ"), using localStorage');
}

// localStorage helpers
const LS_ORDERS_KEY = 'aj-orders';

function lsGetOrders() {
  try { return JSON.parse(localStorage.getItem(LS_ORDERS_KEY)) || []; }
  catch { return []; }
}

function lsSaveOrders(orders) {
  localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
}

// Database helper functions — localStorage is primary, Supabase is optional
const db = {
  async getOrders(browserId = null) {
    // Try Supabase first if available
    if (supabase) {
      try {
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (browserId) query = query.eq('browser_id', browserId);
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) return data;
        // If Supabase returns empty, also check localStorage (might have offline orders)
      } catch (e) {
        console.warn('[DB] Supabase getOrders failed:', e.message || e);
      }
    }
    // localStorage is the source of truth
    let orders = lsGetOrders();
    if (browserId) orders = orders.filter(o => (o.browser_id || o.browserId) === browserId);
    return orders;
  },

  async addOrder(order) {
    // Ensure required fields
    if (!order.id) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      order.id = `AJ-${y}${m}${d}-${h}${min}${s}-${rand}`;
    }
    order.created_at = order.created_at || new Date().toISOString();
    order.browser_id = order.browser_id || order.browserId || 'unknown';

    // Try Supabase first if available
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').insert([order]).select();
        if (error) throw error;
        console.log('[DB] Order saved to Supabase:', data?.[0]?.id);
        // Also save to localStorage as backup
        const orders = lsGetOrders();
        orders.unshift(order);
        lsSaveOrders(orders);
        return data?.[0] || order;
      } catch (e) {
        console.warn('[DB] Supabase addOrder failed:', e.message || e);
      }
    }
    // localStorage fallback — this IS the primary storage
    const orders = lsGetOrders();
    orders.unshift(order);
    lsSaveOrders(orders);
    console.log('[DB] Order saved to localStorage:', order.id);
    return order;
  },

  async updateOrder(id, updates) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select();
        if (error) throw error;
        // Also update localStorage
        const orders = lsGetOrders();
        const idx = orders.findIndex(o => o.id === id);
        if (idx !== -1) { Object.assign(orders[idx], updates); lsSaveOrders(orders); }
        return data?.[0] || null;
      } catch (e) {
        console.warn('[DB] Supabase updateOrder failed:', e.message || e);
      }
    }
    // localStorage fallback
    const orders = lsGetOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      Object.assign(orders[idx], updates);
      lsSaveOrders(orders);
      return orders[idx];
    }
    return null;
  },

  async deleteOrder(id) {
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.warn('[DB] Supabase deleteOrder failed:', e.message || e);
      }
    }
    // Always update localStorage
    const orders = lsGetOrders();
    lsSaveOrders(orders.filter(o => o.id !== id));
    return true;
  },

  async clearOrders(browserId) {
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').delete().eq('browser_id', browserId);
        if (error) throw error;
      } catch (e) {
        console.warn('[DB] Supabase clearOrders failed:', e.message || e);
      }
    }
    // Always update localStorage
    const orders = lsGetOrders();
    lsSaveOrders(orders.filter(o => (o.browser_id || o.browserId) !== browserId));
    return true;
  },

  async getMenu() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('menu').select('*');
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn('[DB] Supabase getMenu failed:', e.message || e);
      }
    }
    return [];
  },

  async updateMenu(id, updates) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('menu').update(updates).eq('id', id).select();
        if (error) throw error;
        return data?.[0] || null;
      } catch (e) {
        console.warn('[DB] Supabase updateMenu failed:', e.message || e);
      }
    }
    return null;
  },

  async checkPassword(password) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('admin_config').select('value').eq('key', 'seller_password').single();
        if (error) throw error;
        return data?.value === password;
      } catch (e) {
        console.warn('[DB] Supabase checkPassword failed:', e.message || e);
      }
    }
    return password === 'AJST16';
  }
};
