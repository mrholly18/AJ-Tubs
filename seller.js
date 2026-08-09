// Menu items with prices
const MENU_ITEMS = {
  "Lasagna": { price: 200, icon: "🍝" },
  "Carbonara": { price: 180, icon: "🧀" },
  "Baked Macaroni": { price: 180, icon: "🧀" },
  "Mango Graham": { price: 150, icon: "🥭" },
  "Oreo Cheesecake": { price: 150, icon: "🍪" },
  "Graham Balls - 4pcs": { price: 30, icon: "\uD83C\uDF61" },
  "Champorado": { price: 50, icon: "🍫" }
};

// Safely parse order items (handles JSON string from Supabase)
function safeItems(order) {
  if (!order || !order.items) return [];
  if (Array.isArray(order.items)) return order.items;
  try { return JSON.parse(order.items); }
  catch { return []; }
}

// State
let allOrders = [];
let currentTab = 'dashboard';
let availableReleaseDates = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const headerTitle = document.getElementById('headerTitle');
const headerDate = document.getElementById('headerDate');
const logoutBtn = document.getElementById('logoutBtn');
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');
const filterDate = document.getElementById('filterDate');
const clearDate = document.getElementById('clearDate');
const filterStatus = document.getElementById('filterStatus');
const searchOrders = document.getElementById('searchOrders');
const ordersList = document.getElementById('ordersList');
const previousOrders = document.getElementById('previousOrders');
const orderForm = document.getElementById('orderForm');
const addItemRow = document.getElementById('addItemRow');
const editModal = document.getElementById('editModal');
const closeEditModal = document.getElementById('closeEditModal');
const editOrderForm = document.getElementById('editOrderForm');
const cancelEdit = document.getElementById('cancelEdit');
const receiptModal = document.getElementById('receiptModal');
const closeReceiptModal = document.getElementById('closeReceiptModal');
const closeReceiptBtn = document.getElementById('closeReceiptBtn');

// Check auth
function checkSession() {
  try {
    const raw = localStorage.getItem("sellerSession");
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session.loggedIn || !session.expiresAt) return false;
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem("sellerSession");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

if (!checkSession()) {
  window.location.href = "index.html";
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setHeaderDate();
  loadOrders();
  setupEventListeners();
  setDefaultDate();
});

// Theme
function initTheme() {
  const saved = localStorage.getItem('sellerTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sellerTheme', next);
});

function setHeaderDate() {
  const now = new Date();
  headerDate.textContent = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function setDefaultDate() {
  // No default selection - show all dates by default
}

// Event Listeners
function setupEventListeners() {
  // Mobile menu
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  });

  // Close sidebar on overlay click
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // Tab navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
      sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    });
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem("sellerSession");
    window.location.href = "index.html";
  });

  // Filters
  filterDate.addEventListener('change', applyFilters);
  clearDate.addEventListener('click', () => {
    filterDate.value = '';
    applyFilters();
  });
  filterStatus.addEventListener('change', applyFilters);
  searchOrders.addEventListener('input', applyFilters);

  // Add item row
  addItemRow.addEventListener('click', addItemRowHandler);
  
  // Add Release Date
  document.getElementById('addReleaseDateBtn').addEventListener('click', async () => {
    const dateInput = document.getElementById('newReleaseDate');
    const timeInput = document.getElementById('newReleaseTime');
    const labelInput = document.getElementById('newReleaseLabel');
    const date = dateInput.value;
    const time = timeInput.value || '17:00';
    const label = labelInput.value.trim() || date;
    
    if (!date) {
      alert('Please select a date');
      return;
    }
    
    const existing = await db.getReleaseDates();
    if (existing.find(d => d.date === date)) {
      alert('A release date already exists for this date');
      return;
    }
    
    try {
      await db.addReleaseDate(date, label, time);
      dateInput.value = '';
      timeInput.value = '17:00';
      labelInput.value = '';
      renderReleaseDates();
      renderPreorders();
    } catch (e) {
      console.error('addReleaseDate failed:', e);
      alert('Failed to add release date. Please try again.');
    }
  });

  // Order form
  orderForm.addEventListener('submit', handleOrderSubmit);
  orderForm.addEventListener('reset', () => {
    setTimeout(() => {
      document.getElementById('orderItems').innerHTML = getItemRowHTML();
      updateFormSummary();
    }, 10);
  });

  // Edit modal
  closeEditModal.addEventListener('click', () => editModal.classList.remove('active'));
  cancelEdit.addEventListener('click', () => editModal.classList.remove('active'));
  editOrderForm.addEventListener('submit', handleEditSubmit);

  // Close modal on overlay click
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) editModal.classList.remove('active');
  });

  // Receipt modal
  if (closeReceiptModal) {
    closeReceiptModal.addEventListener('click', () => receiptModal.classList.remove('active'));
  }
  if (closeReceiptBtn) {
    closeReceiptBtn.addEventListener('click', () => receiptModal.classList.remove('active'));
  }
  if (receiptModal) {
    receiptModal.addEventListener('click', (e) => {
      if (e.target === receiptModal) receiptModal.classList.remove('active');
    });
  }

  // Form summary updates
  document.getElementById('orderDelivery').addEventListener('change', updateFormSummary);
  document.getElementById('orderItems').addEventListener('input', updateFormSummary);

  // Available Meals
  document.getElementById('mealReleaseDate').addEventListener('change', (e) => {
    loadMealEditor(e.target.value);
  });
  document.getElementById('saveMealBtn').addEventListener('click', saveMealSelection);
}

// Tab Switching
function switchTab(tab) {
  currentTab = tab;
  
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });

  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });

  const titles = {
    dashboard: 'Dashboard',
    preorders: 'Pre-Orders',
    releasedates: 'Release Dates',
    previous: 'Previous Releases',
    addorder: 'Add Order',
    availablemeals: 'Available Meals',
    ingredients: 'Ingredients',
    costings: 'Costings'
  };
  headerTitle.textContent = titles[tab] || 'Dashboard';

  if (tab === 'preorders') renderPreorders();
  if (tab === 'releasedates') renderReleaseDates();
  if (tab === 'previous') renderPreviousOrders();
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'availablemeals') loadMealReleaseDates();
  if (tab === 'ingredients') renderIngredients();
  if (tab === 'costings') renderCostingTabs();
}

// Load Orders
async function loadOrders() {
  allOrders = await db.getOrders();
  await loadReleaseDatesForSelects();
  renderDashboard();
  await renderPreorders();
  renderReleaseDates();
  renderPreviousOrders();
}

// Load release dates into order form selects
async function loadReleaseDatesForSelects() {
  const releaseDates = await db.getReleaseDates();
  availableReleaseDates = releaseDates;
  const orderReleaseDate = document.getElementById('orderReleaseDate');
  const filterDateSelect = document.getElementById('filterDate');
  const editReleaseDate = document.getElementById('editReleaseDate');
  
  if (orderReleaseDate) {
    const currentValue = orderReleaseDate.value;
    orderReleaseDate.innerHTML = '<option value="">Select release date...</option>';
    releaseDates.forEach(rd => {
      const option = document.createElement('option');
      option.value = rd.date;
      option.textContent = rd.label || rd.date;
      orderReleaseDate.appendChild(option);
    });
    if (currentValue) orderReleaseDate.value = currentValue;
  }
  
  if (filterDateSelect) {
    const currentValue = filterDateSelect.value;
    filterDateSelect.innerHTML = '<option value="">All Dates</option>';
    releaseDates.sort((a, b) => b.date.localeCompare(a.date)).forEach(rd => {
      const option = document.createElement('option');
      option.value = rd.date;
      option.textContent = rd.label || rd.date;
      filterDateSelect.appendChild(option);
    });
    if (currentValue) filterDateSelect.value = currentValue;
  }
  
  if (editReleaseDate) {
    const currentValue = editReleaseDate.value;
    editReleaseDate.innerHTML = '<option value="">Select release date...</option>';
    releaseDates.forEach(rd => {
      const option = document.createElement('option');
      option.value = rd.date;
      option.textContent = rd.label || rd.date;
      editReleaseDate.appendChild(option);
    });
    if (currentValue) editReleaseDate.value = currentValue;
  }
}

// Dashboard
function renderDashboard() {
  const filtered = getFilteredOrders();
  
  const revenue = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
  const income = filtered.filter(o => o.is_paid).reduce((sum, o) => sum + (o.total || 0), 0);

  document.getElementById('statRevenue').textContent = '₱' + revenue.toLocaleString();
  if (document.getElementById('statProfit')) {
    document.getElementById('statProfit').textContent = '₱' + income.toLocaleString();
  }
  document.getElementById('statOrders').textContent = filtered.length;

  renderOrdersTable(filtered);
}

function getFilteredOrders() {
  let orders = [...allOrders];
  
  const date = filterDate.value;
  if (date) {
    orders = orders.filter(o => o.release_date === date);
  }

  const status = filterStatus.value;
  if (status === 'paid') orders = orders.filter(o => o.is_paid);
  else if (status === 'unpaid') orders = orders.filter(o => !o.is_paid);
  else if (status === 'pending') orders = orders.filter(o => !o.is_delivered);
  else if (status === 'delivered') orders = orders.filter(o => o.is_delivered);

  const search = searchOrders.value.toLowerCase();
  if (search) {
    orders = orders.filter(o => 
      (o.customer_name || '').toLowerCase().includes(search)
    );
  }

  return orders;
}

function applyFilters() {
  renderDashboard();
}

function renderOrdersTable(orders) {
  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>No orders found</p>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = orders.map(order => {
    const items = safeItems(order).map(i => `${i.name} x${i.qty}`).join(', ');
    
    const paymentBadge = order.is_paid 
      ? '<span class="badge badge-paid">Paid</span>'
      : '<span class="badge badge-unpaid">Unpaid</span>';
    
    const statusBadge = order.is_delivered
      ? '<span class="badge badge-delivered">Delivered</span>'
      : '<span class="badge badge-pending">Pending</span>';

    return `
      <div class="order-row" onclick="openEditModal('${order.id}')">
        <div class="order-customer">${order.customer_name || 'Walk-in'}</div>
        <div class="order-badges">${paymentBadge} ${statusBadge}</div>
        <div class="order-items">${items}</div>
        <div class="order-total">₱${order.total || 0}</div>
      </div>
    `;
  }).join('');
}

// Today's Orders
let activeReleaseDate = null;

// Pre-Orders (grouped by release date)
async function renderPreorders() {
  const releaseTabs = document.getElementById('releaseTabs');
  const preorderSummary = document.getElementById('preorderSummary');
  const preorderOrders = document.getElementById('preorderOrders');
  
  const releaseDates = await db.getReleaseDates();
  
  if (releaseDates.length === 0) {
    releaseTabs.innerHTML = '<div class="release-tab-empty">No release dates set. Add one in Release Dates tab.</div>';
    preorderSummary.style.display = 'none';
    preorderOrders.innerHTML = '<div class="empty-state"><p>No release dates</p><span>Create a release date to start grouping orders</span></div>';
    return;
  }
  
  // Only show current/upcoming release dates (12h after release hasn't passed)
  const now = new Date();
  const activeReleaseDates = releaseDates.filter(rd => {
    const rdDateTime = getReleaseDateTime(rd);
    const expireTime = new Date(rdDateTime.getTime() + 12 * 60 * 60 * 1000);
    return now < expireTime;
  });
  
  if (activeReleaseDates.length === 0) {
    releaseTabs.innerHTML = '<div class="release-tab-empty">No upcoming release dates. All releases have passed.</div>';
    preorderSummary.style.display = 'none';
    preorderOrders.innerHTML = '<div class="empty-state"><p>No active pre-orders</p><span>All release dates have passed. Check Previous Releases tab.</span></div>';
    return;
  }
  
  // Sort release dates descending
  activeReleaseDates.sort((a, b) => b.date.localeCompare(a.date));
  
  // If no active release date, select the first one
  if (!activeReleaseDate || !activeReleaseDates.find(d => d.date === activeReleaseDate)) {
    activeReleaseDate = activeReleaseDates[0].date;
  }
  
  // Render tabs
  releaseTabs.innerHTML = activeReleaseDates.map(rd => {
    const orderCount = allOrders.filter(o => o.release_date === rd.date).length;
    const isActive = rd.date === activeReleaseDate;
    return `<button class="release-tab ${isActive ? 'active' : ''}" data-date="${rd.date}">
      ${rd.label || rd.date}
      <span class="release-tab-count">${orderCount}</span>
    </button>`;
  }).join('');
  
  // Add tab click handlers
  releaseTabs.querySelectorAll('.release-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeReleaseDate = tab.dataset.date;
      renderPreorders();
    });
  });
  
  // Filter orders for active release date
  const ordersForDate = allOrders.filter(o => o.release_date === activeReleaseDate);
  
  // Summary
  const revenue = ordersForDate.reduce((sum, o) => sum + (o.total || 0), 0);
  const pending = ordersForDate.filter(o => !o.is_delivered).length;
  const delivered = ordersForDate.filter(o => o.is_delivered).length;
  
  preorderSummary.style.display = 'flex';
  document.getElementById('preorderCount').textContent = ordersForDate.length;
  document.getElementById('preorderRevenue').textContent = '₱' + revenue.toLocaleString();
  document.getElementById('preorderPending').textContent = pending;
  document.getElementById('preorderDelivered').textContent = delivered;
  
  // Render orders
  if (ordersForDate.length === 0) {
    preorderOrders.innerHTML = '<div class="empty-state"><p>No orders for this release date</p></div>';
    return;
  }
  
  preorderOrders.innerHTML = ordersForDate.map(order => {
    const time = new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const items = safeItems(order).map(i => `${i.icon} ${i.name} x${i.qty}`).join(', ');
    const deliveryLabels = { pickup: '📍 Pickup', nearby: '🚗 Nearby (+₱50)', lalamove: '🏍 Lalamove (+₱80)' };
    const paymentLabels = { cash: '💵 Cash', gcash: '📱 GCash', bank: '🏦 Bank Transfer' };
    
    return `
      <div class="order-card">
        <div class="order-card-left">
          <div class="order-card-name">${order.customer_name || 'Walk-in'}</div>
          <div class="order-card-items">${items}</div>
          <div class="order-card-meta">${deliveryLabels[order.delivery_option] || ''} • ${paymentLabels[order.payment_method] || ''} • ${time}</div>
          ${order.address ? `<div class="order-card-notes">📍 ${order.address}</div>` : ''}
          ${order.notes ? `<div class="order-card-notes">${order.notes}</div>` : ''}
        </div>
        <div class="order-card-right">
          <span class="order-card-total">₱${order.total || 0}</span>
          <div class="order-card-actions">
            <button class="btn btn-sm ${order.is_paid ? 'btn-success' : 'btn-ghost'}" onclick="togglePaid('${order.id}', ${!order.is_paid})">
              ${order.is_paid ? 'Paid' : 'Mark Paid'}
            </button>
            <button class="btn btn-sm ${order.is_delivered ? 'btn-primary' : 'btn-ghost'}" onclick="toggleDelivered('${order.id}', ${!order.is_delivered})">
              ${order.is_delivered ? 'Delivered' : 'Mark Delivered'}
            </button>
            <button class="btn btn-sm btn-primary" onclick="viewReceipt('${order.id}')">Receipt</button>
            <button class="btn btn-sm btn-ghost" onclick="openEditModal('${order.id}')">Edit</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Release Dates Management
function getReleaseDateTime(rd) {
  const time = rd.time || '00:00';
  return new Date(rd.date + 'T' + time);
}

async function renderReleaseDates() {
  const list = document.getElementById('releaseDatesList');
  const releaseDates = await db.getReleaseDates();
  
  if (releaseDates.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No release dates</p></div>';
    return;
  }
  
  releaseDates.sort((a, b) => b.date.localeCompare(a.date));
  
  list.innerHTML = releaseDates.map(rd => {
    const orderCount = allOrders.filter(o => o.release_date === rd.date).length;
    const rdTime = getReleaseDateTime(rd);
    const now12hAfter = new Date(rdTime.getTime() + 12 * 60 * 60 * 1000);
    const isPast = new Date() >= now12hAfter;
    const displayTime = rd.time ? formatTime12(rd.time) : '5:00 PM';
    
    return `
      <div class="release-date-item ${isPast ? 'past' : ''}">
        <div class="release-date-info">
          <div class="release-date-label">${rd.label || rd.date}</div>
          <div class="release-date-meta">${orderCount} order${orderCount !== 1 ? 's' : ''} &middot; Release: ${displayTime}</div>
        </div>
        <div class="release-date-actions">
          <button class="btn btn-sm btn-ghost" onclick="editReleaseDate('${rd.id}', '${rd.date}', '${rd.time || ''}', '${(rd.label || '').replace(/'/g, "\\'")}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteReleaseDate('${rd.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

window.editReleaseDate = function(id, date, time, label) {
  const newLabel = prompt('Edit label:', label);
  if (newLabel === null) return;
  const newTime = prompt('Edit release time (HH:MM, 24h):', time || '17:00');
  if (newTime === null) return;
  db.updateReleaseDate(id, { label: newLabel, time: newTime || '17:00' }).then(() => {
    renderReleaseDates();
    renderPreorders();
    renderPreviousOrders();
  });
};

window.deleteReleaseDate = function(id) {
  if (confirm('Delete this release date? Orders will not be deleted.')) {
    db.deleteReleaseDate(id).then(() => renderReleaseDates());
  }
};

// Previous Releases
let activePrevReleaseDate = null;

async function renderPreviousOrders() {
  const prevReleaseTabs = document.getElementById('prevReleaseTabs');
  const previousOrders = document.getElementById('previousOrders');
  
  const releaseDates = await db.getReleaseDates();
  
  if (releaseDates.length === 0) {
    prevReleaseTabs.innerHTML = '<div class="release-tab-empty">No release dates set</div>';
    previousOrders.innerHTML = '<div class="empty-state"><p>No previous orders</p></div>';
    return;
  }
  
  // Only show past/closed release dates (12h after release has passed)
  const now = new Date();
  const pastReleaseDates = releaseDates.filter(rd => {
    const rdDateTime = getReleaseDateTime(rd);
    const expireTime = new Date(rdDateTime.getTime() + 12 * 60 * 60 * 1000);
    return now >= expireTime;
  }).sort((a, b) => b.date.localeCompare(a.date));
  
  if (pastReleaseDates.length === 0) {
    prevReleaseTabs.innerHTML = '<div class="release-tab-empty">No past releases yet</div>';
    previousOrders.innerHTML = '<div class="empty-state"><p>No previous orders</p><span>Completed releases will appear here</span></div>';
    return;
  }
  
  // Auto-select first if none active
  if (!activePrevReleaseDate || !pastReleaseDates.find(d => d.date === activePrevReleaseDate)) {
    activePrevReleaseDate = pastReleaseDates[0].date;
  }
  
  // Render tabs
  prevReleaseTabs.innerHTML = pastReleaseDates.map(rd => {
    const orderCount = allOrders.filter(o => o.release_date === rd.date).length;
    const isActive = rd.date === activePrevReleaseDate;
    return `<button class="release-tab ${isActive ? 'active' : ''}" data-date="${rd.date}">
      ${rd.label || rd.date}
      <span class="release-tab-count">${orderCount}</span>
    </button>`;
  }).join('');
  
  // Tab click handler
  prevReleaseTabs.querySelectorAll('.release-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activePrevReleaseDate = tab.dataset.date;
      renderPreviousOrders();
    });
  });
  
  // Filter orders for selected release date
  let prevOrders = allOrders.filter(o => o.release_date === activePrevReleaseDate);
  
  const totalRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  document.getElementById('prevTotalOrders').textContent = prevOrders.length;
  document.getElementById('prevTotalRevenue').textContent = '₱' + totalRevenue.toLocaleString();
  document.getElementById('previousStats').style.display = 'grid';
  
  if (prevOrders.length === 0) {
    previousOrders.innerHTML = '<div class="empty-state"><p>No orders for this release</p></div>';
    return;
  }
  
  let html = '';
  prevOrders.forEach(order => {
    const time = new Date(order.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const items = safeItems(order).map(i => `${i.icon} ${i.name} x${i.qty}`).join(', ');
    const deliveryLabels = { pickup: '📍 Pickup', nearby: '🚗 Nearby (+₱50)', lalamove: '🏍 Lalamove' };
    const paymentLabels = { cash: '💵 Cash', gcash: '📱 GCash', bank: '🏦 Bank Transfer' };

    html += `
      <div class="order-card">
        <div class="order-card-left">
          <div class="order-card-name">${order.customer_name || 'Walk-in'}</div>
          <div class="order-card-items">${items}</div>
          <div class="order-card-meta">${deliveryLabels[order.delivery_option] || ''} • ${paymentLabels[order.payment_method] || ''} • ${time}</div>
          ${order.address ? `<div class="order-card-notes">📍 ${order.address}</div>` : ''}
          ${order.notes ? `<div class="order-card-notes">${order.notes}</div>` : ''}
        </div>
        <div class="order-card-right">
          <span class="order-card-total">₱${order.total || 0}</span>
          <div class="order-card-actions">
            <button class="btn btn-sm ${order.is_paid ? 'btn-success' : 'btn-ghost'}" onclick="togglePaid('${order.id}', ${!order.is_paid})">
              ${order.is_paid ? 'Paid' : 'Mark Paid'}
            </button>
            <button class="btn btn-sm ${order.is_delivered ? 'btn-primary' : 'btn-ghost'}" onclick="toggleDelivered('${order.id}', ${!order.is_delivered})">
              ${order.is_delivered ? 'Delivered' : 'Mark Delivered'}
            </button>
            <button class="btn btn-sm btn-primary" onclick="viewReceipt('${order.id}')">Receipt</button>
            <button class="btn btn-sm btn-ghost" onclick="openEditModal('${order.id}')">Edit</button>
          </div>
        </div>
      </div>
    `;
  });
  
  previousOrders.innerHTML = html;
}

// Toggle Status
async function togglePaid(id, isPaid) {
  try {
    await db.updateOrder(id, { is_paid: isPaid });
  } catch (e) {
    console.error('togglePaid failed:', e);
    alert('Failed to update payment status. Please try again.');
  }
  await loadOrders();
}

async function toggleDelivered(id, isDelivered) {
  try {
    await db.updateOrder(id, { is_delivered: isDelivered });
  } catch (e) {
    console.error('toggleDelivered failed:', e);
    alert('Failed to update delivery status. Please try again.');
  }
  await loadOrders();
}

// Add Order Form
function getItemRowHTML() {
  return `
    <div class="order-item-row">
      <select class="form-input item-select" required>
        <option value="">Select item...</option>
        <option value="Lasagna">Lasagna - ₱200</option>
        <option value="Carbonara">Carbonara - ₱180</option>
        <option value="Baked Macaroni">Baked Macaroni - ₱180</option>
        <option value="Mango Graham">Mango Graham - ₱150</option>
        <option value="Oreo Cheesecake">Oreo Cheesecake - ₱150</option>
        <option value="Graham Balls - 4pcs">Graham Balls - 4pcs - ₱30</option>
        <option value="Champorado">Champorado - ₱50</option>
      </select>
      <input type="number" class="form-input item-qty" value="1" min="1" max="99">
      <button type="button" class="btn-remove-item" onclick="removeItemRow(this)">×</button>
    </div>
  `;
}

function addItemRowHandler() {
  const itemsList = document.getElementById('orderItems');
  const div = document.createElement('div');
  div.innerHTML = getItemRowHTML();
  itemsList.appendChild(div.firstElementChild);
}

function removeItemRow(btn) {
  const container = document.getElementById('orderItems');
  const rows = container.querySelectorAll('.order-item-row');
  if (rows.length > 1) {
    btn.parentElement.remove();
    updateFormSummary();
  }
}

function updateFormSummary() {
  const container = document.getElementById('orderItems');
  const items = container ? container.querySelectorAll('.order-item-row') : document.querySelectorAll('.order-item-row');
  let subtotal = 0;

  items.forEach(row => {
    const name = row.querySelector('.item-select').value;
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;
    if (name && MENU_ITEMS[name]) {
      subtotal += MENU_ITEMS[name].price * qty;
    }
  });

  const delivery = document.getElementById('orderDelivery').value;
  const deliveryFee = delivery === 'nearby' ? 50 : delivery === 'lalamove' ? 80 : 0;
  const total = subtotal + deliveryFee;

  document.getElementById('formSubtotal').textContent = '₱' + subtotal;
  document.getElementById('formDelivery').textContent = deliveryFee > 0 ? '₱' + deliveryFee : 'Free';
  document.getElementById('formTotal').textContent = '₱' + total;
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const customerName = document.getElementById('customerName').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const releaseDate = document.getElementById('orderReleaseDate').value;
  const delivery = document.getElementById('orderDelivery').value;
  const payment = document.getElementById('orderPayment').value;
  const notes = document.getElementById('orderNotes').value.trim();
  const address = document.getElementById('orderAddress').value.trim();

  if (!releaseDate) {
    alert('Please select a release date');
    return;
  }

  const itemRows = document.querySelectorAll('.order-item-row');
  const items = [];
  let subtotal = 0;

  itemRows.forEach(row => {
    const name = row.querySelector('.item-select').value;
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;
    if (name && MENU_ITEMS[name]) {
      items.push({ name, qty, price: MENU_ITEMS[name].price, icon: MENU_ITEMS[name].icon });
      subtotal += MENU_ITEMS[name].price * qty;
    }
  });

  if (items.length === 0) {
    alert('Please add at least one item');
    return;
  }

  const deliveryFee = delivery === 'nearby' ? 50 : delivery === 'lalamove' ? 80 : 0;
  const total = subtotal + deliveryFee;

  const order = {
    customer_name: customerName,
    phone: customerPhone,
    release_date: releaseDate,
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    delivery_option: delivery,
    payment_method: payment,
    notes,
    address,
    status: 'pending',
    is_paid: false,
    is_delivered: false,
    browser_id: 'seller-' + Date.now(),
    created_at: new Date().toISOString()
  };

  const result = await db.addOrder(order);
  if (result) {
    orderForm.reset();
    document.getElementById('orderItems').innerHTML = getItemRowHTML();
    updateFormSummary();
    await loadOrders();
    switchTab('preorders');
  } else {
    alert('Error saving order. Please try again.');
  }
}

// Edit Modal
function openEditModal(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;

  document.getElementById('editOrderId').value = id;
  document.getElementById('editCustomerName').value = order.customer_name || '';
  document.getElementById('editReleaseDate').value = order.release_date || '';
  document.getElementById('editStatus').value = order.is_delivered ? 'delivered' : order.status || 'pending';
  document.getElementById('editPaymentStatus').value = order.is_paid ? 'true' : 'false';
  document.getElementById('editNotes').value = order.notes || '';
  document.getElementById('editAddress').value = order.address || '';

  // Store items in a working array
  editWorkingItems = JSON.parse(JSON.stringify(safeItems(order)));
  renderEditItems();

  editModal.classList.add('active');
}

// Edit items management
let editWorkingItems = [];

function renderEditItems() {
  const container = document.getElementById('editItemsList');
  if (!container) return;

  if (editWorkingItems.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:10px;font-size:0.78rem;">No items</div>';
    return;
  }

  container.innerHTML = editWorkingItems.map((item, index) => `
    <div class="edit-item-row" data-index="${index}">
      <span class="item-name">${item.icon} ${item.name}</span>
      <input type="number" class="item-qty" value="${item.qty}" min="1" max="99" onchange="editItemQty(${index}, this.value)">
      <span class="item-total">₱${item.price * item.qty}</span>
      <button type="button" class="btn-remove-item" onclick="editRemoveItem(${index})">×</button>
    </div>
  `).join('');
}

window.editItemQty = function(index, value) {
  const qty = parseInt(value) || 1;
  if (editWorkingItems[index]) {
    editWorkingItems[index].qty = qty;
    renderEditItems();
  }
};

window.editRemoveItem = function(index) {
  editWorkingItems.splice(index, 1);
  renderEditItems();
};

document.getElementById('editAddItemBtn').addEventListener('click', () => {
  const select = document.getElementById('editNewItemSelect');
  const name = select.value;
  if (!name || !MENU_ITEMS[name]) return;

  const existing = editWorkingItems.find(i => i.name === name);
  if (existing) {
    existing.qty += 1;
  } else {
    editWorkingItems.push({
      name,
      qty: 1,
      price: MENU_ITEMS[name].price,
      icon: MENU_ITEMS[name].icon
    });
  }
  select.value = '';
  renderEditItems();
});

// Delete order
document.getElementById('deleteOrderBtn').addEventListener('click', async () => {
  const id = document.getElementById('editOrderId').value;
  if (!id) return;
  if (confirm('Are you sure you want to delete this order? This cannot be undone.')) {
    try {
      await db.deleteOrder(id);
      editModal.classList.remove('active');
      await loadOrders();
    } catch (e) {
      console.error('deleteOrder failed:', e);
      alert('Failed to delete order. Please try again.');
    }
  }
});

async function handleEditSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('editOrderId').value;
  const status = document.getElementById('editStatus').value;
  const isPaid = document.getElementById('editPaymentStatus').value === 'true';
  const isDelivered = status === 'delivered';
  const notes = document.getElementById('editNotes').value.trim();
  const customerName = document.getElementById('editCustomerName').value.trim();
  const releaseDate = document.getElementById('editReleaseDate').value;
  const address = document.getElementById('editAddress').value.trim();

  const subtotal = editWorkingItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const originalOrder = allOrders.find(o => o.id === id);
  const deliveryOption = originalOrder ? originalOrder.delivery_option : 'pickup';
  const deliveryFee = deliveryOption === 'nearby' ? 50 : deliveryOption === 'lalamove' ? 80 : 0;
  const total = subtotal + deliveryFee;

  try {
    await db.updateOrder(id, {
      customer_name: customerName,
      release_date: releaseDate,
      items: editWorkingItems,
      subtotal,
      total,
      is_paid: isPaid,
      is_delivered: isDelivered,
      status,
      notes,
      address
    });
    editModal.classList.remove('active');
    await loadOrders();
  } catch (e) {
    console.error('handleEditSubmit failed:', e);
    alert('Failed to save changes. Please try again.');
  }
}

// View Receipt Modal
function viewReceipt(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const content = document.getElementById('receiptModalContent');
  const rdObj = availableReleaseDates.find(d => d.date === order.release_date);

  const deliveryLabels = { pickup: 'Pickup', nearby: 'Nearby (+₱50)', lalamove: 'Lalamove (+₱80)' };
  const paymentLabels = { cash: 'Cash', gcash: 'GCash', bank: 'Bank Transfer' };
  const deliveryFee = order.delivery_fee || 0;
  const subtotal = safeItems(order).reduce((sum, i) => sum + i.price * i.qty, 0);

  let html = `
    <div class="receipt-divider-dashed"></div>

    <div class="receipt-section">
      <div class="receipt-label">CUSTOMER</div>
      <div class="receipt-value">${order.customer_name || 'Walk-in'}</div>
      ${order.phone ? `<div class="receipt-value receipt-secondary">${order.phone}</div>` : ''}
      ${order.address ? `<div class="receipt-value receipt-secondary">📍 ${order.address}</div>` : ''}
    </div>

    <div class="receipt-section">
      <div class="receipt-label">RELEASE</div>
      <div class="receipt-value">${rdObj ? rdObj.label : (order.release_date || 'N/A')}</div>
    </div>

    <div class="receipt-divider"></div>

    <div class="receipt-section">
      <div class="receipt-label">ITEMS</div>
  `;

  safeItems(order).forEach(item => {
    html += `
      <div class="receipt-item-row">
        <span class="receipt-item-name">${item.name} x${item.qty}</span>
        <span class="receipt-item-price">₱${item.price * item.qty}</span>
      </div>
    `;
  });

  html += `
    </div>

    <div class="receipt-divider"></div>

    <div class="receipt-totals">
      <div class="receipt-total-row">
        <span>Subtotal</span>
        <span>₱${subtotal}</span>
      </div>
      <div class="receipt-total-row">
        <span>${deliveryLabels[order.delivery_option] || 'Pickup'}</span>
        <span>${deliveryFee > 0 ? '₱' + deliveryFee : 'Free'}</span>
      </div>
      <div class="receipt-total-row receipt-grand-total">
        <span>TOTAL</span>
        <span>₱${order.total || 0}</span>
      </div>
    </div>

    <div class="receipt-divider"></div>

    <div class="receipt-section">
      <div class="receipt-label">PAYMENT</div>
      <div class="receipt-value">${paymentLabels[order.payment_method] || 'Cash'}</div>
      <div class="receipt-badges">
        <span class="receipt-status-badge ${order.status || 'pending'}">${order.status || 'pending'}</span>
        <span class="receipt-payment-badge ${order.is_paid ? 'paid' : 'unpaid'}">${order.is_paid ? 'Paid' : 'Unpaid'}</span>
      </div>
    </div>

    ${order.notes ? `
    <div class="receipt-section">
      <div class="receipt-label">NOTES</div>
      <div class="receipt-value">${order.notes}</div>
    </div>
    ` : ''}

    <div class="receipt-divider-dashed"></div>

    <div class="receipt-footer">
      Order #${order.id ? order.id.slice(0, 8) : 'N/A'}
    </div>
  `;

  content.innerHTML = html;
  receiptModal.classList.add('active');
}

// Make functions global
window.togglePaid = togglePaid;
window.toggleDelivered = toggleDelivered;
window.removeItemRow = removeItemRow;
window.openEditModal = openEditModal;
window.viewReceipt = viewReceipt;

// Available Meals Management
const ALL_MENU_ITEMS = [
  { name: "Lasagna", price: 200, icon: "🍝" },
  { name: "Carbonara", price: 180, icon: "🧀" },
  { name: "Baked Macaroni", price: 180, icon: "🧀" },
  { name: "Mango Graham", price: 150, icon: "🥭" },
  { name: "Oreo Cheesecake", price: 150, icon: "🍪" },
  { name: "Graham Balls - 4pcs", price: 30, icon: "\uD83C\uDF61" },
  { name: "Champorado", price: 50, icon: "🍫" }
];

async function loadMealReleaseDates() {
  const select = document.getElementById('mealReleaseDate');
  if (!select) return;
  const releaseDates = await db.getReleaseDates();
  select.innerHTML = '<option value="">Choose a release date...</option>';
  releaseDates.sort((a, b) => b.date.localeCompare(a.date)).forEach(rd => {
    const option = document.createElement('option');
    option.value = rd.date;
    option.textContent = rd.label || rd.date;
    select.appendChild(option);
  });
}

async function loadMealEditor(releaseDate) {
  const editor = document.getElementById('mealEditor');
  const empty = document.getElementById('mealEmpty');
  const list = document.getElementById('mealCheckboxList');

  if (!releaseDate) {
    editor.style.display = 'none';
    empty.style.display = '';
    return;
  }

  editor.style.display = '';
  empty.style.display = 'none';

  // Get currently available items for this release date
  const existing = await db.getReleaseMenu(releaseDate);
  const availableNames = existing.map(r => r.menu_item_name);

  list.innerHTML = ALL_MENU_ITEMS.map(item => {
    const isChecked = availableNames.includes(item.name);
    return `
      <label class="meal-checkbox-item ${isChecked ? 'checked' : ''}">
        <input type="checkbox" value="${item.name}" ${isChecked ? 'checked' : ''}>
        <span class="meal-item-icon">${item.icon}</span>
        <div class="meal-item-info">
          <div class="meal-item-name">${item.name}</div>
          <div class="meal-item-price">₱${item.price}</div>
        </div>
      </label>
    `;
  }).join('');

  // Toggle checked class on change
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.meal-checkbox-item').classList.toggle('checked', cb.checked);
    });
  });
}

async function saveMealSelection() {
  const select = document.getElementById('mealReleaseDate');
  const releaseDate = select.value;
  if (!releaseDate) return;

  const checkboxes = document.querySelectorAll('#mealCheckboxList input[type="checkbox"]:checked');
  const selectedItems = Array.from(checkboxes).map(cb => cb.value);

  const result = await db.setReleaseMenu(releaseDate, selectedItems);
  if (result !== false) {
    alert('Available meals saved!');
  } else {
    alert('Error saving. Please try again.');
  }
}

// ============================================
// Ingredients Management
// ============================================
let allIngredients = [];

async function renderIngredients() {
  const list = document.getElementById('ingredientsList');
  const search = document.getElementById('ingredientSearch').value.toLowerCase();

  allIngredients = await db.getIngredients();
  let filtered = allIngredients;
  if (search) {
    filtered = allIngredients.filter(i => i.name.toLowerCase().includes(search));
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
        <p>${search ? 'No ingredients match your search' : 'No ingredients yet'}</p>
        <span>${search ? 'Try a different search term' : 'Add your first ingredient to start costing'}</span>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(i => {
    const costPerUnit = i.price_paid / i.quantity;
    return `
      <div class="ingredient-card">
        <div class="ingredient-card-left">
          <div class="ingredient-card-name">${i.name}</div>
          <div class="ingredient-card-meta">₱${i.price_paid} for ${i.quantity} ${i.unit}</div>
        </div>
        <div class="ingredient-card-right">
          <span class="ingredient-card-cost">₱${costPerUnit.toFixed(2)}/${i.unit}</span>
          <div class="ingredient-card-actions">
            <button class="btn btn-sm btn-ghost" onclick="editIngredient('${i.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-sm btn-ghost" onclick="deleteIngredient('${i.id}')" style="color: #ef4444;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Ingredient Modal
const ingredientModal = document.getElementById('ingredientModal');
const ingredientForm = document.getElementById('ingredientForm');
const ingredientName = document.getElementById('ingredientName');
const ingredientPrice = document.getElementById('ingredientPrice');
const ingredientQuantity = document.getElementById('ingredientQuantity');
const ingredientUnit = document.getElementById('ingredientUnit');
const ingredientCostPerUnit = document.getElementById('ingredientCostPerUnit');
const editIngredientId = document.getElementById('editIngredientId');
const ingredientModalTitle = document.getElementById('ingredientModalTitle');

function updateCostPreview() {
  const price = parseFloat(ingredientPrice.value) || 0;
  const qty = parseFloat(ingredientQuantity.value) || 1;
  const costPerUnit = price / qty;
  ingredientCostPerUnit.textContent = '₱' + costPerUnit.toFixed(2);
}

ingredientPrice.addEventListener('input', updateCostPreview);
ingredientQuantity.addEventListener('input', updateCostPreview);

document.getElementById('addIngredientBtn').addEventListener('click', () => {
  editIngredientId.value = '';
  ingredientModalTitle.textContent = 'Add Ingredient';
  ingredientForm.reset();
  ingredientUnit.value = 'piece';
  updateCostPreview();
  ingredientModal.classList.add('active');
});

document.getElementById('closeIngredientModal').addEventListener('click', () => {
  ingredientModal.classList.remove('active');
});

document.getElementById('cancelIngredient').addEventListener('click', () => {
  ingredientModal.classList.remove('active');
});

ingredientModal.addEventListener('click', (e) => {
  if (e.target === ingredientModal) ingredientModal.classList.remove('active');
});

ingredientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: ingredientName.value.trim(),
    price_paid: parseFloat(ingredientPrice.value),
    quantity: parseFloat(ingredientQuantity.value),
    unit: ingredientUnit.value
  };

  if (editIngredientId.value) {
    await db.updateIngredient(editIngredientId.value, data);
  } else {
    await db.addIngredient(data);
  }

  ingredientModal.classList.remove('active');
  renderIngredients();
});

window.editIngredient = async function(id) {
  const ingredient = allIngredients.find(i => i.id === id);
  if (!ingredient) return;

  editIngredientId.value = id;
  ingredientModalTitle.textContent = 'Edit Ingredient';
  ingredientName.value = ingredient.name;
  ingredientPrice.value = ingredient.price_paid;
  ingredientQuantity.value = ingredient.quantity;
  ingredientUnit.value = ingredient.unit;
  updateCostPreview();
  ingredientModal.classList.add('active');
};

window.deleteIngredient = async function(id) {
  if (!confirm('Delete this ingredient?')) return;
  await db.deleteIngredient(id);
  renderIngredients();
};

document.getElementById('ingredientSearch').addEventListener('input', renderIngredients);

// ============================================
// Costings Management
// ============================================
let allCostings = [];
let activeCostingId = null;
let activeCostingItems = [];

async function renderCostingTabs() {
  const tabs = document.getElementById('costingTabs');
  allCostings = await db.getCostings();

  if (allCostings.length === 0) {
    tabs.innerHTML = '<div class="release-tab-empty">No costings yet</div>';
    document.getElementById('costingBody').style.display = 'none';
    document.getElementById('costingEmpty').style.display = 'flex';
    return;
  }

  if (!activeCostingId || !allCostings.find(c => c.id === activeCostingId)) {
    activeCostingId = allCostings[0].id;
  }

  tabs.innerHTML = allCostings.map(c => {
    const isActive = c.id === activeCostingId;
    return `<button class="costing-tab ${isActive ? 'active' : ''}" data-id="${c.id}">${c.name}</button>`;
  }).join('');

  tabs.querySelectorAll('.costing-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCostingId = tab.dataset.id;
      renderCostingTabs();
      loadCostingDetails();
    });
  });

  loadCostingDetails();
}

async function loadCostingDetails() {
  const costing = allCostings.find(c => c.id === activeCostingId);
  if (!costing) return;

  document.getElementById('costingBody').style.display = 'flex';
  document.getElementById('costingEmpty').style.display = 'none';
  document.getElementById('batchSize').value = costing.batch_size;
  document.getElementById('markupPercent').value = costing.markup_percent;

  // Ensure ingredients are loaded for the dropdown
  if (allIngredients.length === 0) {
    allIngredients = await db.getIngredients();
  }

  activeCostingItems = await db.getCostingItems(activeCostingId);
  renderCostingItems();
  updateCostingSummary();
}

function renderCostingItems() {
  const list = document.getElementById('costingItemsList');

  if (activeCostingItems.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No ingredients added</p>
        <span>Click "Add" to select ingredients from your master list</span>
      </div>
    `;
    return;
  }

  list.innerHTML = activeCostingItems.map((item, idx) => {
    const ingredient = allIngredients.find(i => i.id === item.ingredient_id);
    const name = ingredient ? ingredient.name : 'Select ingredient...';
    const costPerUnit = ingredient ? ingredient.price_paid / ingredient.quantity : 0;
    const unit = ingredient ? ingredient.unit : item.unit;
    const itemCost = item.amount_used * costPerUnit;

    return `
      <div class="costing-item-row">
        <div class="form-group">
          <label class="form-label">Ingredient</label>
          <select class="form-input" onchange="updateCostingItemIngredient(${idx}, this.value)">
            <option value="">Select ingredient...</option>
            ${allIngredients.map(i =>
              `<option value="${i.id}" ${i.id === item.ingredient_id ? 'selected' : ''}>${i.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount</label>
          <input type="number" class="form-input" value="${item.amount_used}" step="0.01" min="0"
            onchange="updateCostingItemAmount(${idx}, this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <select class="form-input" onchange="updateCostingItemUnit(${idx}, this.value)">
            <option value="piece" ${unit === 'piece' ? 'selected' : ''}>Piece</option>
            <option value="grams" ${unit === 'grams' ? 'selected' : ''}>Grams</option>
            <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ML</option>
            <option value="liters" ${unit === 'liters' ? 'selected' : ''}>Liters</option>
            <option value="kg" ${unit === 'kg' ? 'selected' : ''}>Kg</option>
          </select>
        </div>
        <div class="costing-item-cost">₱${itemCost.toFixed(2)}</div>
        <button class="costing-item-delete" onclick="deleteCostingItem(${idx})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

function updateCostingSummary() {
  const batchSize = parseInt(document.getElementById('batchSize').value) || 1;
  const markup = parseFloat(document.getElementById('markupPercent').value) || 120;

  let totalCost = 0;
  activeCostingItems.forEach(item => {
    const ingredient = allIngredients.find(i => i.id === item.ingredient_id);
    if (ingredient) {
      const costPerUnit = ingredient.price_paid / ingredient.quantity;
      totalCost += item.amount_used * costPerUnit;
    }
  });

  const costPerTub = totalCost / batchSize;
  const sellingPrice = costPerTub * (1 + markup / 100);
  const profit = sellingPrice - costPerTub;

  document.getElementById('totalBatchCost').textContent = '₱' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('costPerTub').textContent = '₱' + costPerTub.toFixed(2);
  document.getElementById('sellingPrice').textContent = '₱' + sellingPrice.toFixed(2);
  document.getElementById('profitPerTub').textContent = '₱' + profit.toFixed(2);
}

window.updateCostingItemIngredient = async function(idx, ingredientId) {
  activeCostingItems[idx].ingredient_id = ingredientId;
  await db.updateCostingItem(activeCostingItems[idx].id, { ingredient_id: ingredientId });
  renderCostingItems();
  updateCostingSummary();
};

window.updateCostingItemAmount = async function(idx, amount) {
  activeCostingItems[idx].amount_used = parseFloat(amount) || 0;
  await db.updateCostingItem(activeCostingItems[idx].id, { amount_used: activeCostingItems[idx].amount_used });
  renderCostingItems();
  updateCostingSummary();
};

window.updateCostingItemUnit = async function(idx, unit) {
  activeCostingItems[idx].unit = unit;
  await db.updateCostingItem(activeCostingItems[idx].id, { unit });
};

window.deleteCostingItem = async function(idx) {
  const item = activeCostingItems[idx];
  await db.deleteCostingItem(item.id);
  activeCostingItems.splice(idx, 1);
  renderCostingItems();
  updateCostingSummary();
};

// Batch settings change
document.getElementById('batchSize').addEventListener('change', async () => {
  const val = parseInt(document.getElementById('batchSize').value) || 1;
  await db.updateCosting(activeCostingId, { batch_size: val });
  updateCostingSummary();
});

document.getElementById('markupPercent').addEventListener('change', async () => {
  const val = parseFloat(document.getElementById('markupPercent').value) || 120;
  await db.updateCosting(activeCostingId, { markup_percent: val });
  updateCostingSummary();
});

// Add Costing
const costingModal = document.getElementById('costingModal');
const costingForm = document.getElementById('costingForm');
const costingName = document.getElementById('costingName');

document.getElementById('addCostingBtn').addEventListener('click', () => {
  costingForm.reset();
  costingModal.classList.add('active');
});

document.getElementById('closeCostingModal').addEventListener('click', () => {
  costingModal.classList.remove('active');
});

document.getElementById('cancelCosting').addEventListener('click', () => {
  costingModal.classList.remove('active');
});

costingModal.addEventListener('click', (e) => {
  if (e.target === costingModal) costingModal.classList.remove('active');
});

costingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = costingName.value.trim();
  if (!name) return;

  const result = await db.addCosting({ name, batch_size: 1, markup_percent: 120 });
  if (result) {
    activeCostingId = result.id;
    renderCostingTabs();
  }
  costingModal.classList.remove('active');
});

// Delete Costing
document.getElementById('deleteCostingBtn').addEventListener('click', async () => {
  if (!confirm('Delete this costing?')) return;
  await db.deleteCosting(activeCostingId);
  activeCostingId = null;
  renderCostingTabs();
});

// Add Costing Item
document.getElementById('addCostingItemBtn').addEventListener('click', async () => {
  // Ensure ingredients are loaded
  if (allIngredients.length === 0) {
    allIngredients = await db.getIngredients();
  }

  if (allIngredients.length === 0) {
    alert('Please add ingredients first in the Ingredients tab.');
    return;
  }

  const result = await db.addCostingItem({
    costing_id: activeCostingId,
    ingredient_id: null,
    amount_used: 1,
    unit: 'piece'
  });

  if (result) {
    activeCostingItems.push(result);
    renderCostingItems();
    updateCostingSummary();
  }
});
