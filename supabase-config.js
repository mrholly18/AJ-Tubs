// Supabase Configuration
const SUPABASE_URL = 'https://usnxadqxiwapztyefif.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Xe_8bSKI7cChhlJlbNqekg_1pMOaptH';

// Initialize Supabase client
let supabase = null;
try {
  const client = window.supabase || window.supabaseClient;
  if (client && typeof client.createClient === 'function') {
    supabase = client.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DB] Supabase client initialized');
  } else {
    console.warn('[DB] Supabase library not loaded, using localStorage fallback');
  }
} catch (e) {
  console.warn('[DB] Supabase init failed, using localStorage fallback:', e.message);
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

// Database helper functions
const db = {
  // Orders
  async getOrders(browserId = null) {
    // Try Supabase first
    if (supabase) {
      try {
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (browserId) query = query.eq('browser_id', browserId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error('[DB] Supabase getOrders error, falling back to localStorage:', e.message || e);
      }
    }
    // Fallback to localStorage
    let orders = lsGetOrders();
    if (browserId) orders = orders.filter(o => o.browser_id === browserId);
    return orders;
  },

  async addOrder(order) {
    // Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').insert([order]).select();
        if (error) throw error;
        console.log('[DB] Order saved to Supabase:', data?.[0]?.id);
        return data?.[0] || null;
      } catch (e) {
        console.error('[DB] Supabase addOrder error, falling back to localStorage:', e.message || e);
      }
    }
    // Fallback to localStorage
    const orders = lsGetOrders();
    order.created_at = order.created_at || new Date().toISOString();
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
        return data?.[0] || null;
      } catch (e) {
        console.error('[DB] Supabase updateOrder error:', e.message || e);
      }
    }
    // Fallback to localStorage
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
        return true;
      } catch (e) {
        console.error('[DB] Supabase deleteOrder error:', e.message || e);
      }
    }
    // Fallback to localStorage
    const orders = lsGetOrders();
    const filtered = orders.filter(o => o.id !== id);
    lsSaveOrders(filtered);
    return true;
  },

  async clearOrders(browserId) {
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').delete().eq('browser_id', browserId);
        if (error) throw error;
        return true;
      } catch (e) {
        console.error('[DB] Supabase clearOrders error:', e.message || e);
      }
    }
    // Fallback to localStorage
    const orders = lsGetOrders();
    const filtered = orders.filter(o => o.browser_id !== browserId);
    lsSaveOrders(filtered);
    return true;
  },

  // Menu
  async getMenu() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('menu').select('*');
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error('[DB] Supabase getMenu error:', e.message || e);
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
        console.error('[DB] Supabase updateMenu error:', e.message || e);
      }
    }
    return null;
  },

  // Admin
  async checkPassword(password) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('admin_config').select('value').eq('key', 'seller_password').single();
        if (error) throw error;
        return data?.value === password;
      } catch (e) {
        console.error('[DB] Supabase checkPassword error:', e.message || e);
      }
    }
    // Fallback: hardcoded password
    return password === 'AJST16';
  }
};
