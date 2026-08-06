// Menu items with prices
const MENU_ITEMS = {
  "Lasagna": { price: 200, icon: "🍝" },
  "Carbonara": { price: 180, icon: "🧀" },
  "Mac and Cheese": { price: 180, icon: "🧀" },
  "Mango Graham": { price: 150, icon: "🥭" },
  "Oreo Cheesecake": { price: 150, icon: "🍪" },
  "Champorado": { price: 50, icon: "🍫" }
};

// DOM Elements
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const sellerDashboard = document.getElementById("sellerDashboard");
const logoutBtn = document.getElementById("logoutBtn");
const toggleAddOrder = document.getElementById("toggleAddOrder");
const addOrderForm = document.getElementById("addOrderForm");
const orderForm = document.getElementById("orderForm");
const cancelOrder = document.getElementById("cancelOrder");
const addItemRow = document.getElementById("addItemRow");
const ordersList = document.getElementById("ordersList");
const filterStatus = document.getElementById("filterStatus");
const searchOrders = document.getElementById("searchOrders");

// Check if already logged in
const isLoggedIn = sessionStorage.getItem("sellerLoggedIn") === "true";
if (isLoggedIn) {
  showDashboard();
}

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = loginPassword.value.trim();
  
  if (await db.checkPassword(password)) {
    sessionStorage.setItem("sellerLoggedIn", "true");
    showDashboard();
  } else {
    loginError.classList.add("show");
    loginPassword.value = "";
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("sellerLoggedIn");
  loginScreen.style.display = "flex";
  sellerDashboard.style.display = "none";
});

function showDashboard() {
  loginScreen.style.display = "none";
  sellerDashboard.style.display = "block";
  loadOrders();
}

// Toggle Add Order Form
toggleAddOrder.addEventListener("click", () => {
  const isVisible = addOrderForm.style.display !== "none";
  addOrderForm.style.display = isVisible ? "none" : "block";
  toggleAddOrder.textContent = isVisible ? "+ New Order" : "Close";
});

cancelOrder.addEventListener("click", () => {
  addOrderForm.style.display = "none";
  toggleAddOrder.textContent = "+ New Order";
  orderForm.reset();
  // Reset items list to single row
  document.getElementById("orderItems").innerHTML = `
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
});

// Add Item Row
addItemRow.addEventListener("click", () => {
  const itemsList = document.getElementById("orderItems");
  const newRow = document.createElement("div");
  newRow.className = "order-item-row";
  newRow.innerHTML = `
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
  `;
  itemsList.appendChild(newRow);
});

// Remove Item Row
function removeItemRow(btn) {
  const rows = document.querySelectorAll(".order-item-row");
  if (rows.length > 1) {
    btn.parentElement.remove();
  }
}

// Submit Order
orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const customerName = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  const delivery = document.getElementById("orderDelivery").value;
  const payment = document.getElementById("orderPayment").value;
  const notes = document.getElementById("orderNotes").value.trim();
  
  // Collect items
  const itemRows = document.querySelectorAll(".order-item-row");
  const items = [];
  let subtotal = 0;
  
  itemRows.forEach(row => {
    const itemName = row.querySelector(".item-select").value;
    const qty = parseInt(row.querySelector(".item-qty").value) || 1;
    if (itemName && MENU_ITEMS[itemName]) {
      const price = MENU_ITEMS[itemName].price;
      const icon = MENU_ITEMS[itemName].icon;
      items.push({ name: itemName, qty, price, icon });
      subtotal += price * qty;
    }
  });
  
  if (items.length === 0) {
    alert("Please add at least one item");
    return;
  }
  
  const deliveryFee = delivery === "nearby" ? 50 : 0;
  const total = subtotal + deliveryFee;
  
  const order = {
    customer_name: customerName,
    phone: customerPhone,
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    delivery_option: delivery,
    payment_method: payment,
    notes,
    status: "pending",
    is_paid: false,
    is_delivered: false,
    browser_id: "seller-" + Date.now(),
    created_at: new Date().toISOString()
  };
  
  const result = await db.addOrder(order);
  if (result) {
    addOrderForm.style.display = "none";
    toggleAddOrder.textContent = "+ New Order";
    orderForm.reset();
    loadOrders();
  } else {
    alert("Error saving order. Please try again.");
  }
});

// Load Orders
async function loadOrders() {
  const orders = await db.getOrders();
  updateStats(orders);
  renderOrders(orders);
}

// Update Stats
function updateStats(orders) {
  document.getElementById("totalOrders").textContent = orders.length;
  
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById("totalRevenue").textContent = "₱" + totalRevenue.toLocaleString();
  
  const pending = orders.filter(o => !o.is_delivered).length;
  document.getElementById("pendingOrders").textContent = pending;
  
  const delivered = orders.filter(o => o.is_delivered).length;
  document.getElementById("deliveredOrders").textContent = delivered;
}

// Render Orders
function renderOrders(orders) {
  const filter = filterStatus.value;
  const search = searchOrders.value.toLowerCase();
  
  let filtered = orders;
  
  if (filter === "pending") {
    filtered = orders.filter(o => !o.is_delivered);
  } else if (filter === "confirmed") {
    filtered = orders.filter(o => o.is_paid && !o.is_delivered);
  } else if (filter === "delivered") {
    filtered = orders.filter(o => o.is_delivered);
  }
  
  if (search) {
    filtered = filtered.filter(o => 
      (o.customer_name || "").toLowerCase().includes(search)
    );
  }
  
  if (filtered.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No orders found</p>
        <span>${search ? "Try a different search" : "Add your first order above"}</span>
      </div>
    `;
    return;
  }
  
  ordersList.innerHTML = filtered.map(order => {
    const date = new Date(order.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    const itemsList = (order.items || []).map(i => `${i.icon || ""} ${i.name} x${i.qty}`).join(", ");
    
    return `
      <div class="order-card" data-id="${order.id}">
        <div class="order-card-header">
          <span class="order-card-id">${order.id?.substring(0, 8) || "N/A"}</span>
          <span class="order-card-date">${date}</span>
        </div>
        <div class="order-card-customer">${order.customer_name || "Walk-in"}</div>
        <div class="order-card-items">${itemsList}</div>
        <div class="order-card-footer">
          <span class="order-card-total">₱${order.total || 0}</span>
          <div class="order-status-group">
            <button class="status-badge ${order.is_paid ? 'status-paid' : 'status-unpaid'}" 
                    onclick="togglePaid('${order.id}', ${!order.is_paid})">
              ${order.is_paid ? 'Paid' : 'Unpaid'}
            </button>
            <button class="status-badge ${order.is_delivered ? 'status-delivered' : 'status-pending'}" 
                    onclick="toggleDelivered('${order.id}', ${!order.is_delivered})">
              ${order.is_delivered ? 'Delivered' : 'Pending'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Toggle Paid Status
async function togglePaid(id, isPaid) {
  await db.updateOrder(id, { is_paid: isPaid });
  loadOrders();
}

// Toggle Delivered Status
async function toggleDelivered(id, isDelivered) {
  await db.updateOrder(id, { is_delivered: isDelivered });
  loadOrders();
}

// Filter and Search
filterStatus.addEventListener("change", loadOrders);
searchOrders.addEventListener("input", loadOrders);

// Initial load
if (isLoggedIn) {
  loadOrders();
}
