// Supabase Configuration
const SUPABASE_URL = 'https://usnxadqxniwapztyeflf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnhhZHF4bml3YXB6dHllZmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMDI4MDEsImV4cCI6MjEwMTU3ODgwMX0.V447hj8DCcPh87xpeIwX-Gch1a1CBeksQaWMTJz551k';

// Init Supabase client — use 'supabaseClient' to avoid conflict with CDN's global 'supabase'
let supabaseClient = null;
try {
  const sdk = window.supabase || window.supabaseClient;
  if (sdk && typeof sdk.createClient === 'function') {
    supabaseClient = sdk.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DB] Supabase client initialized');
  } else {
    console.error('[DB] Supabase JS library not loaded — check CDN script tag');
  }
} catch (e) {
  console.error('[DB] Supabase init error:', e);
}

// Test connection on load
(async () => {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('orders').select('id').limit(1);
    if (error) {
      console.error('[DB] Connection test FAILED:', error.message);
      console.error('[DB] Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('[DB] Connection test OK — orders table accessible, rows:', data.length);
    }
  } catch (e) {
    console.error('[DB] Connection test exception:', e);
  }
})();

// localStorage helpers
const LS_ORDERS_KEY = 'aj-orders';

function lsGetOrders() {
  try { return JSON.parse(localStorage.getItem(LS_ORDERS_KEY)) || []; }
  catch { return []; }
}

function lsSaveOrders(orders) {
  localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
}

// Database helpers — Supabase is primary, localStorage is fallback
const db = {
  async getOrders(browserId = null) {
    if (supabaseClient) {
      try {
        let query = supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (browserId) query = query.eq('browser_id', browserId);
        const { data, error } = await query;
        if (error) throw error;
        if (data) return data;
      } catch (e) {
        console.error('[DB] getOrders error:', e.message || e);
      }
    }
    let orders = lsGetOrders();
    if (browserId) orders = orders.filter(o => (o.browser_id || o.browserId) === browserId);
    return orders;
  },

  async addOrder(order) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    order.order_number = order.order_number ||
      `AJ-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${rand}`;
    order.created_at = order.created_at || now.toISOString();
    order.browser_id = order.browser_id || order.browserId || 'unknown';
    order.date = order.date || now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) + ' ' +
      now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });

    if (supabaseClient) {
      try {
        const row = {
          order_number: order.order_number,
          customer_name: order.customer_name || 'Walk-in',
          phone: order.phone || '',
          items: order.items || [],
          subtotal: order.subtotal || 0,
          delivery_fee: order.delivery_fee || 0,
          total: order.total || 0,
          delivery_option: order.delivery_option || 'pickup',
          payment_method: order.payment_method || 'cash',
          status: order.status || 'pending',
          is_paid: order.is_paid || false,
          is_delivered: order.is_delivered || false,
          expenses: order.expenses || 0,
          notes: order.notes || '',
          browser_id: order.browser_id,
          date: order.date,
          created_at: order.created_at
        };
        console.log('[DB] Inserting order...', row);
        const { data, error } = await supabaseClient.from('orders').insert([row]).select();
        if (error) {
          console.error('[DB] Insert error:', error.message);
          console.error('[DB] Full error:', JSON.stringify(error, null, 2));
          throw error;
        }
        console.log('[DB] Order saved to Supabase, id:', data?.[0]?.id);
        const saved = { ...order, id: data?.[0]?.id };
        const orders = lsGetOrders();
        orders.unshift(saved);
        lsSaveOrders(orders);
        return saved;
      } catch (e) {
        console.error('[DB] addOrder failed:', e.message || e);
      }
    }
    order.id = order.id || order.order_number;
    const orders = lsGetOrders();
    orders.unshift(order);
    lsSaveOrders(orders);
    console.log('[DB] Order saved to localStorage:', order.order_number);
    return order;
  },

  async updateOrder(id, updates) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('orders').update(updates).eq('id', id).select();
        if (error) throw error;
        const orders = lsGetOrders();
        const idx = orders.findIndex(o => o.id === id);
        if (idx !== -1) { Object.assign(orders[idx], updates); lsSaveOrders(orders); }
        return data?.[0] || null;
      } catch (e) {
        console.error('[DB] updateOrder error:', e.message || e);
      }
    }
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
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('orders').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('[DB] deleteOrder error:', e.message || e);
      }
    }
    const orders = lsGetOrders();
    lsSaveOrders(orders.filter(o => o.id !== id));
    return true;
  },

  async clearOrders(browserId) {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('orders').delete().eq('browser_id', browserId);
        if (error) throw error;
      } catch (e) {
        console.error('[DB] clearOrders error:', e.message || e);
      }
    }
    const orders = lsGetOrders();
    lsSaveOrders(orders.filter(o => (o.browser_id || o.browserId) !== browserId));
    return true;
  },

  async getMenu() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('menu').select('*');
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error('[DB] getMenu error:', e.message || e);
      }
    }
    return [];
  },

  async updateMenu(id, updates) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('menu').update(updates).eq('id', id).select();
        if (error) throw error;
        return data?.[0] || null;
      } catch (e) {
        console.error('[DB] updateMenu error:', e.message || e);
      }
    }
    return null;
  },

  async checkPassword(password) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('admin_config').select('value').eq('key', 'seller_password').single();
        if (error) throw error;
        return data?.value === password;
      } catch (e) {
        console.error('[DB] checkPassword error:', e.message || e);
      }
    }
    return password === 'AJST16';
  }
};
