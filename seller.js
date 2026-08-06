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
let availableReleaseDates = [];

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
  // No default selection - show all dates by default
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
  
  // Add Release Date
  document.getElementById('addReleaseDateBtn').addEventListener('click', async () => {
    const dateInput = document.getElementById('newReleaseDate');
    const labelInput = document.getElementById('newReleaseLabel');
    const date = dateInput.value;
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
    
    await db.addReleaseDate(date, label);
    dateInput.value = '';
    labelInput.value = '';
    renderReleaseDates();
    renderPreorders();
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
    preorders: 'Pre-Orders',
    releasedates: 'Release Dates',
    previous: 'Previous Orders',
    addorder: 'Add Order'
  };
  headerTitle.textContent = titles[tab] || 'Dashboard';

  if (tab === 'preorders') renderPreorders();
  if (tab === 'releasedates') renderReleaseDates();
  if (tab === 'previous') renderPreviousOrders();
  if (tab === 'dashboard') renderDashboard();
}

// Load Orders
async function loadOrders() {
  allOrders = await db.getOrders();
  await loadReleaseDatesForSelects();
  renderDashboard();
  renderPreorders();
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
  
  // Sort release dates descending
  releaseDates.sort((a, b) => b.date.localeCompare(a.date));
  
  // If no active release date, select the first one
  if (!activeReleaseDate || !releaseDates.find(d => d.date === activeReleaseDate)) {
    activeReleaseDate = releaseDates[0].date;
  }
  
  // Render tabs
  releaseTabs.innerHTML = releaseDates.map(rd => {
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
    const items = (order.items || []).map(i => `${i.icon} ${i.name} x${i.qty}`).join(', ');
    const deliveryLabels = { pickup: '📍 Pickup', nearby: '🚗 Nearby (+₱50)', lalamove: '🏍 Lalamove (+₱80)' };
    const paymentLabels = { cash: '💵 Cash', gcash: '📱 GCash', bank: '🏦 Bank Transfer' };
    
    return `
      <div class="order-card">
        <div class="order-card-left">
          <div class="order-card-name">${order.customer_name || 'Walk-in'}</div>
          <div class="order-card-items">${items}</div>
          <div class="order-card-meta">${deliveryLabels[order.delivery_type] || ''} • ${paymentLabels[order.payment_type] || ''} • ${time}</div>
          ${order.notes ? `<div class="order-card-notes">${order.notes}</div>` : ''}
        </div>
        <div class="order-card-right">
          <span class="order-card-total">₱${order.total || 0}</span>
          <div class="order-card-actions">
            <button class="btn btn-sm ${order.is_paid ? 'btn-success' : 'btn-outline'}" onclick="togglePaid('${order.id}', ${!order.is_paid})">
              ${order.is_paid ? 'Paid' : 'Mark Paid'}
            </button>
            <button class="btn btn-sm ${order.is_delivered ? 'btn-primary' : 'btn-outline'}" onclick="toggleDelivered('${order.id}', ${!order.is_delivered})">
              ${order.is_delivered ? 'Delivered' : 'Mark Delivered'}
            </button>
            <button class="btn btn-sm btn-outline" onclick="openEditModal('${order.id}')">Edit</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Release Dates Management
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
    const isPast = new Date(rd.date) < new Date(new Date().toISOString().split('T')[0]);
    
    return `
      <div class="release-date-item ${isPast ? 'past' : ''}">
        <div class="release-date-info">
          <div class="release-date-label">${rd.label || rd.date}</div>
          <div class="release-date-meta">${orderCount} order${orderCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="release-date-actions">
          <button class="btn btn-sm btn-outline" onclick="editReleaseDate('${rd.id}', '${rd.date}', '${(rd.label || '').replace(/'/g, "\\'")}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteReleaseDate('${rd.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.editReleaseDate = function(id, date, label) {
  const newLabel = prompt('Edit label:', label);
  if (newLabel !== null) {
    db.updateReleaseDate(id, { label: newLabel }).then(() => renderReleaseDates());
  }
};

window.deleteReleaseDate = function(id) {
  if (confirm('Delete this release date? Orders will not be deleted.')) {
    db.deleteReleaseDate(id).then(() => renderReleaseDates());
  }
};

// Previous Orders
function renderPreviousOrders() {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all release dates and find completed ones (past dates)
  db.getReleaseDates().then(releaseDates => {
    const pastReleaseDates = releaseDates
      .filter(rd => rd.date < today)
      .map(rd => rd.date);
    
    let prevOrders = allOrders.filter(o => 
      o.release_date && pastReleaseDates.includes(o.release_date)
    );

    const dateFrom = prevDateFrom.value;
    const dateTo = prevDateTo.value;

    if (dateFrom) {
      prevOrders = prevOrders.filter(o => o.release_date >= dateFrom);
    }

    if (dateTo) {
      prevOrders = prevOrders.filter(o => o.release_date <= dateTo);
    }

    const totalRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById('prevTotalOrders').textContent = prevOrders.length;
    document.getElementById('prevTotalRevenue').textContent = '₱' + totalRevenue.toLocaleString();

    if (prevOrders.length === 0) {
      previousOrders.innerHTML = `
        <div class="empty-state">
          <p>No previous orders</p>
        </div>
      `;
      return;
    }

    // Group by release date
    const grouped = {};
    prevOrders.forEach(order => {
      const rd = releaseDates.find(d => d.date === order.release_date);
      const dateLabel = rd ? rd.label : order.release_date;
      if (!grouped[dateLabel]) grouped[dateLabel] = [];
      grouped[dateLabel].push(order);
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
  });
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
  const releaseDate = document.getElementById('orderReleaseDate').value;
  const delivery = document.getElementById('orderDelivery').value;
  const payment = document.getElementById('orderPayment').value;
  const notes = document.getElementById('orderNotes').value.trim();

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

  const deliveryFee = delivery === 'nearby' ? 50 : 0;
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

  // Store items in a working array
  editWorkingItems = JSON.parse(JSON.stringify(order.items || []));
  renderEditItems();
  updateEditReceiptPreview();

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
      <button type="button" class="btn-remove" onclick="editRemoveItem(${index})">×</button>
    </div>
  `).join('');
}

window.editItemQty = function(index, value) {
  const qty = parseInt(value) || 1;
  if (editWorkingItems[index]) {
    editWorkingItems[index].qty = qty;
    renderEditItems();
    updateEditReceiptPreview();
  }
};

window.editRemoveItem = function(index) {
  editWorkingItems.splice(index, 1);
  renderEditItems();
  updateEditReceiptPreview();
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
  updateEditReceiptPreview();
});

function updateEditReceiptPreview() {
  const content = document.getElementById('editReceiptContent');
  if (!content) return;

  const customerName = document.getElementById('editCustomerName').value.trim() || 'Walk-in';
  const status = document.getElementById('editStatus').value;
  const isPaid = document.getElementById('editPaymentStatus').value === 'true';
  const notes = document.getElementById('editNotes').value.trim();
  const releaseDate = document.getElementById('editReleaseDate').value;
  const rdObj = availableReleaseDates.find(d => d.date === releaseDate);

  const subtotal = editWorkingItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = subtotal;

  let html = `
    <div class="receipt-preview-customer">${customerName}</div>
    <div class="receipt-preview-release">${rdObj ? rdObj.label : (releaseDate || 'No release date')}</div>
    <div class="receipt-preview-items">
  `;

  editWorkingItems.forEach(item => {
    html += `
      <div class="receipt-preview-item">
        <span class="receipt-preview-item-name">${item.icon} ${item.name} x${item.qty}</span>
        <span class="receipt-preview-item-price">₱${item.price * item.qty}</span>
      </div>
    `;
  });

  html += `
    </div>
    <div class="receipt-preview-totals">
      <div class="receipt-preview-total-row grand-total">
        <span>TOTAL</span>
        <span>₱${total}</span>
      </div>
    </div>
    <div class="receipt-preview-status">
      <span class="receipt-status-badge ${status}">${status}</span>
      <span class="receipt-payment-badge ${isPaid ? 'paid' : 'unpaid'}">${isPaid ? 'Paid' : 'Unpaid'}</span>
    </div>
  `;

  if (notes) {
    html += `<div class="receipt-preview-notes">${notes}</div>`;
  }

  content.innerHTML = html;
}

// Add live update listeners to edit form
document.getElementById('editCustomerName').addEventListener('input', updateEditReceiptPreview);
document.getElementById('editStatus').addEventListener('change', updateEditReceiptPreview);
document.getElementById('editPaymentStatus').addEventListener('change', updateEditReceiptPreview);
document.getElementById('editNotes').addEventListener('input', updateEditReceiptPreview);
document.getElementById('editReleaseDate').addEventListener('change', updateEditReceiptPreview);

// Delete order
document.getElementById('deleteOrderBtn').addEventListener('click', async () => {
  const id = document.getElementById('editOrderId').value;
  if (!id) return;
  if (confirm('Are you sure you want to delete this order? This cannot be undone.')) {
    await db.deleteOrder(id);
    editModal.classList.remove('active');
    loadOrders();
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

  const subtotal = editWorkingItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  await db.updateOrder(id, {
    customer_name: customerName,
    release_date: releaseDate,
    items: editWorkingItems,
    subtotal,
    total,
    is_paid: isPaid,
    is_delivered: isDelivered,
    status,
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
