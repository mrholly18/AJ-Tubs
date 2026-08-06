// Menu items with prices
const MENU_ITEMS = {
  "Lasagna": { price: 200, icon: "🍝" },
  "Carbonara": { price: 180, icon: "🧀" },
  "Mac and Cheese": { price: 180, icon: "🧀" },
  "Mango Graham": { price: 150, icon: "🥭" },
  "Oreo Cheesecake": { price: 150, icon: "🍪" },
  "Champorado": { price: 50, icon: "🍫" }
};

// State
let allOrders = [];
let currentTab = 'dashboard';

// DOM Elements
const sidebar = document.getElementById('sidebar');
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
const ordersTableBody = document.getElementById('ordersTableBody');
const todayOrders = document.getElementById('todayOrders');
const previousOrders = document.getElementById('previousOrders');
const orderForm = document.getElementById('orderForm');
const addItemRow = document.getElementById('addItemRow');
const editModal = document.getElementById('editModal');
const closeEditModal = document.getElementById('closeEditModal');
const editOrderForm = document.getElementById('editOrderForm');
const cancelEdit = document.getElementById('cancelEdit');
const prevDateFrom = document.getElementById('prevDateFrom');
const prevDateTo = document.getElementById('prevDateTo');
const applyDateRange = document.getElementById('applyDateRange');

// Check auth
const isLoggedIn = sessionStorage.getItem("sellerLoggedIn") === "true";
if (!isLoggedIn) {
  window.location.href = "index.html";
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setHeaderDate();
  loadOrders();
  setupEventListeners();
  setDefaultDate();
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
  const today = new Date().toISOString().split('T')[0];
  filterDate.value = today;
}

// Event Listeners
function setupEventListeners() {
  // Mobile menu
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem("sellerLoggedIn");
    window.location.href = "index.html";
  });

  // Tab navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
      sidebar.classList.remove('active');
    });
  });

  // Filters
  filterDate.addEventListener('change', applyFilters);
  clearDate.addEventListener('click', () => {
    filterDate.value = '';
    applyFilters();
  });
  filterStatus.addEventListener('change', applyFilters);
  searchOrders.addEventListener('input', applyFilters);

  // Date range for previous orders
  applyDateRange.addEventListener('click', () => {
    renderPreviousOrders();
  });

  // Add item row
  addItemRow.addEventListener('click', addItemRowHandler);

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

  // Form summary updates
  document.getElementById('orderDelivery').addEventListener('change', updateFormSummary);
  document.getElementById('orderItems').addEventListener('input', updateFormSummary);
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
    today: "Today's Orders",
    previous: 'Previous Orders',
    addorder: 'Add Order'
  };
  headerTitle.textContent = titles[tab] || 'Dashboard';

  if (tab === 'today') renderTodayOrders();
  if (tab === 'previous') renderPreviousOrders();
  if (tab === 'dashboard') renderDashboard();
}

// Load Orders
async function loadOrders() {
  allOrders = await db.getOrders();
  renderDashboard();
  renderTodayOrders();
  renderPreviousOrders();
}

// Dashboard
function renderDashboard() {
  const filtered = getFilteredOrders();
  
  const revenue = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
  const expenses = filtered.reduce((sum, o) => sum + (o.expenses || 0), 0);
  const profit = revenue - expenses;

  document.getElementById('statRevenue').textContent = '₱' + revenue.toLocaleString();
  document.getElementById('statExpenses').textContent = '₱' + expenses.toLocaleString();
  document.getElementById('statProfit').textContent = '₱' + profit.toLocaleString();
  document.getElementById('statOrders').textContent = filtered.length;

  renderOrdersTable(filtered);
}

function getFilteredOrders() {
  let orders = [...allOrders];
  
  const date = filterDate.value;
  if (date) {
    orders = orders.filter(o => {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate === date;
    });
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
    ordersTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <p>No orders found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  ordersTableBody.innerHTML = orders.map(order => {
    const time = new Date(order.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const items = (order.items || []).map(i => `${i.name} x${i.qty}`).join(', ');
    
    const paymentBadge = order.is_paid 
      ? '<span class="badge badge-paid">Paid</span>'
      : '<span class="badge badge-unpaid">Unpaid</span>';
    
    const statusBadge = order.is_delivered
      ? '<span class="badge badge-delivered">Delivered</span>'
      : '<span class="badge badge-pending">Pending</span>';

    return `
      <tr onclick="openEditModal('${order.id}')">
        <td><strong>${order.customer_name || 'Walk-in'}</strong></td>
        <td>${items}</td>
        <td><strong>₱${order.total || 0}</strong></td>
        <td>${paymentBadge}</td>
        <td>${statusBadge}</td>
        <td>${time}</td>
      </tr>
    `;
  }).join('');
}

// Today's Orders
function renderTodayOrders() {
  const today = new Date().toISOString().split('T')[0];
  const todayOrdersList = allOrders.filter(o => {
    const orderDate = new Date(o.created_at).toISOString().split('T')[0];
    return orderDate === today;
  });

  const revenue = todayOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
  const pending = todayOrdersList.filter(o => !o.is_delivered).length;
  const delivered = todayOrdersList.filter(o => o.is_delivered).length;

  document.getElementById('todayCount').textContent = `${todayOrdersList.length} orders`;
  document.getElementById('todayRevenue').textContent = '₱' + revenue.toLocaleString();
  document.getElementById('todayPending').textContent = pending;
  document.getElementById('todayDelivered').textContent = delivered;

  if (todayOrdersList.length === 0) {
    todayOrders.innerHTML = `
      <div class="empty-state">
        <p>No orders today</p>
        <span>Orders placed today will appear here</span>
      </div>
    `;
    return;
  }

  todayOrders.innerHTML = todayOrdersList.map(order => {
    const time = new Date(order.created_at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const items = (order.items || []).map(i => `${i.icon} ${i.name} x${i.qty}`).join(', ');

    return `
      <div class="order-card">
        <div class="order-card-left">
          <div class="order-card-name">${order.customer_name || 'Walk-in'}</div>
          <div class="order-card-items">${items}</div>
        </div>
        <div class="order-card-right">
          <span class="order-card-total">₱${order.total || 0}</span>
          <div class="order-card-actions">
            <button class="btn btn-sm ${order.is_paid ? 'btn-success' : 'btn-outline'}" 
                    onclick="togglePaid('${order.id}', ${!order.is_paid})">
              ${order.is_paid ? 'Paid' : 'Mark Paid'}
            </button>
            <button class="btn btn-sm ${order.is_delivered ? 'btn-primary' : 'btn-outline'}"
                    onclick="toggleDelivered('${order.id}', ${!order.is_delivered})">
              ${order.is_delivered ? 'Delivered' : 'Mark Delivered'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Previous Orders
function renderPreviousOrders() {
  const today = new Date().toISOString().split('T')[0];
  let prevOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at).toISOString().split('T')[0];
    return orderDate < today;
  });

  const dateFrom = prevDateFrom.value;
  const dateTo = prevDateTo.value;

  if (dateFrom) {
    prevOrders = prevOrders.filter(o => {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate >= dateFrom;
    });
  }

  if (dateTo) {
    prevOrders = prevOrders.filter(o => {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate <= dateTo;
    });
  }

  const totalRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalExpenses = prevOrders.reduce((sum, o) => sum + (o.expenses || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;

  document.getElementById('prevTotalOrders').textContent = prevOrders.length;
  document.getElementById('prevTotalRevenue').textContent = '₱' + totalRevenue.toLocaleString();
  document.getElementById('prevTotalProfit').textContent = '₱' + totalProfit.toLocaleString();

  if (prevOrders.length === 0) {
    previousOrders.innerHTML = `
      <div class="empty-state">
        <p>No previous orders</p>
      </div>
    `;
    return;
  }

  // Group by date
  const grouped = {};
  prevOrders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(order);
  });

  let html = '';
  Object.entries(grouped).forEach(([date, orders]) => {
    const dayTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    html += `
      <div class="date-group-header">
        <span>${date}</span>
        <span>${orders.length} orders - ₱${dayTotal.toLocaleString()}</span>
      </div>
    `;
    orders.forEach(order => {
      const time = new Date(order.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const items = (order.items || []).map(i => `${i.icon} ${i.name} x${i.qty}`).join(', ');

      html += `
        <div class="order-card">
          <div class="order-card-left">
            <div class="order-card-name">${order.customer_name || 'Walk-in'}</div>
            <div class="order-card-items">${items}</div>
          </div>
          <div class="order-card-right">
            <span class="order-card-total">₱${order.total || 0}</span>
            <span class="badge ${order.is_paid ? 'badge-paid' : 'badge-unpaid'}">${order.is_paid ? 'Paid' : 'Unpaid'}</span>
            <span class="badge ${order.is_delivered ? 'badge-delivered' : 'badge-pending'}">${order.is_delivered ? 'Delivered' : 'Pending'}</span>
          </div>
        </div>
      `;
    });
  });

  previousOrders.innerHTML = html;
}

// Toggle Status
async function togglePaid(id, isPaid) {
  await db.updateOrder(id, { is_paid: isPaid });
  loadOrders();
}

async function toggleDelivered(id, isDelivered) {
  await db.updateOrder(id, { is_delivered: isDelivered });
  loadOrders();
}

// Add Order Form
function getItemRowHTML() {
  return `
    <div class="order-item-row">
      <select class="item-select" required>
        <option value="">Select item...</option>
        <option value="Lasagna">Lasagna - ₱200</option>
        <option value="Carbonara">Carbonara - ₱180</option>
        <option value="Mac and Cheese">Mac and Cheese - ₱180</option>
        <option value="Mango Graham">Mango Graham - ₱150</option>
        <option value="Oreo Cheesecake">Oreo Cheesecake - ₱150</option>
        <option value="Champorado">Champorado - ₱50</option>
      </select>
      <input type="number" class="item-qty" value="1" min="1" max="99">
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
  const rows = document.querySelectorAll('.order-item-row');
  if (rows.length > 1) {
    btn.parentElement.remove();
    updateFormSummary();
  }
}

function updateFormSummary() {
  const items = document.querySelectorAll('.order-item-row');
  let subtotal = 0;

  items.forEach(row => {
    const name = row.querySelector('.item-select').value;
    const qty = parseInt(row.querySelector('.item-qty').value) || 1;
    if (name && MENU_ITEMS[name]) {
      subtotal += MENU_ITEMS[name].price * qty;
    }
  });

  const delivery = document.getElementById('orderDelivery').value;
  const deliveryFee = delivery === 'nearby' ? 50 : 0;
  const total = subtotal + deliveryFee;

  document.getElementById('formSubtotal').textContent = '₱' + subtotal;
  document.getElementById('formDelivery').textContent = deliveryFee > 0 ? '₱' + deliveryFee : 'Free';
  document.getElementById('formTotal').textContent = '₱' + total;
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const customerName = document.getElementById('customerName').value.trim();
  const customerPhone = document.getElementById('customerPhone').value.trim();
  const delivery = document.getElementById('orderDelivery').value;
  const payment = document.getElementById('orderPayment').value;
  const expenses = parseInt(document.getElementById('orderExpenses').value) || 0;
  const notes = document.getElementById('orderNotes').value.trim();

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

  const deliveryFee = delivery === 'nearby' ? 50 : 0;
  const total = subtotal + deliveryFee;

  const order = {
    customer_name: customerName,
    phone: customerPhone,
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    expenses,
    delivery_option: delivery,
    payment_method: payment,
    notes,
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
    switchTab('today');
    loadOrders();
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
  document.getElementById('editStatus').value = order.is_delivered ? 'delivered' : order.status || 'pending';
  document.getElementById('editPaymentStatus').value = order.is_paid ? 'true' : 'false';
  document.getElementById('editExpenses').value = order.expenses || 0;
  document.getElementById('editNotes').value = order.notes || '';

  editModal.classList.add('active');
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('editOrderId').value;
  const status = document.getElementById('editStatus').value;
  const isPaid = document.getElementById('editPaymentStatus').value === 'true';
  const isDelivered = status === 'delivered';
  const expenses = parseInt(document.getElementById('editExpenses').value) || 0;
  const notes = document.getElementById('editNotes').value.trim();
  const customerName = document.getElementById('editCustomerName').value.trim();

  await db.updateOrder(id, {
    customer_name: customerName,
    is_paid: isPaid,
    is_delivered: isDelivered,
    status,
    expenses,
    notes
  });

  editModal.classList.remove('active');
  loadOrders();
}

// Make functions global
window.togglePaid = togglePaid;
window.toggleDelivered = toggleDelivered;
window.removeItemRow = removeItemRow;
window.openEditModal = openEditModal;
