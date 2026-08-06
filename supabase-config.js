// Supabase Configuration
const SUPABASE_URL = 'https://usnxadqxiwapztyefif.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Xe_8bSKI7cChhlJlbNqekg_1pMOaptH';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Database helper functions
const db = {
  // Orders
  async getOrders(browserId = null) {
    if (!supabase) return [];
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (browserId) query = query.eq('browser_id', browserId);
    const { data, error } = await query;
    if (error) console.error('Error fetching orders:', error);
    return data || [];
  },

  async addOrder(order) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('orders').insert([order]).select();
    if (error) console.error('Error adding order:', error);
    return data?.[0] || null;
  },

  async updateOrder(id, updates) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select();
    if (error) console.error('Error updating order:', error);
    return data?.[0] || null;
  },

  async deleteOrder(id) {
    if (!supabase) return false;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) console.error('Error deleting order:', error);
    return !error;
  },

  async clearOrders(browserId) {
    if (!supabase) return false;
    const { error } = await supabase.from('orders').delete().eq('browser_id', browserId);
    if (error) console.error('Error clearing orders:', error);
    return !error;
  },

  // Menu
  async getMenu() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('menu').select('*');
    if (error) console.error('Error fetching menu:', error);
    return data || [];
  },

  async updateMenu(id, updates) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('menu').update(updates).eq('id', id).select();
    if (error) console.error('Error updating menu:', error);
    return data?.[0] || null;
  },

  // Admin
  async checkPassword(password) {
    if (!supabase) return false;
    const { data, error } = await supabase.from('admin_config').select('value').eq('key', 'seller_password').single();
    if (error) console.error('Error checking password:', error);
    return data?.value === password;
  }
};
