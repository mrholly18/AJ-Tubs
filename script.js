const menu = [
  { id: 1, name: "Lasagna", desc: "Classic layered pasta with rich meat sauce", price: 200, category: "pasta", icon: "\uD83C\uDF5D" },
  { id: 2, name: "Carbonara", desc: "Creamy egg-based pasta with crispy bits", price: 180, category: "pasta", icon: "\uD83E\uDDC0" },
  { id: 3, name: "Mango Graham", desc: "Sweet mangoes layered with graham crackers", price: 150, category: "dessert", icon: "\uD83E\uDD6D" },
  { id: 4, name: "Oreo Cheesecake", desc: "No-bake cheesecake with Oreo cookie crust", price: 150, category: "dessert", icon: "\uD83C\uDF6A" },
  { id: 5, name: "Champorado", desc: "Chocolate rice porridge", price: 50, category: "others", icon: "\uD83C\uDF6B" }
];

let cart = [];
let selectedDelivery = "pickup";
let selectedPayment = "cash";

// DOM
const menuGrid = document.getElementById("menuGrid");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartSubtotal = document.getElementById("cartSubtotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const cartTotal = document.getElementById("cartTotal");
const cartSidebar = document.getElementById("cartSidebar");
const overlay = document.getElementById("overlay");
const cartBtn = document.getElementById("cartBtn");
const closeCart = document.getElementById("closeCart");
const checkoutBtn = document.getElementById("checkoutBtn");
const contactForm = document.getElementById("contactForm");
const menuToggle = document.getElementById("menuToggle");
const fullscreenNav = document.getElementById("fullscreenNav");
const navClose = document.getElementById("navClose");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const themeToggle = document.getElementById("themeToggle");
const customerNameInput = document.getElementById("customerName");
const historyList = document.getElementById("historyList");

// Theme - default dark
const savedTheme = localStorage.getItem("aj-theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("aj-theme", next);
});

// Fullscreen Nav
menuToggle.addEventListener("click", () => fullscreenNav.classList.add("active"));
navClose.addEventListener("click", () => fullscreenNav.classList.remove("active"));
fullscreenNav.querySelectorAll(".fullscreen-link").forEach(link => {
  link.addEventListener("click", () => fullscreenNav.classList.remove("active"));
});

// Header scroll
window.addEventListener("scroll", () => {
  document.getElementById("header").classList.toggle("scrolled", window.scrollY > 10);
});

// Menu
function renderMenu(category = "all") {
  const filtered = category === "all" ? menu : menu.filter(m => m.category === category);
  menuGrid.innerHTML = filtered.map(item => `
    <div class="menu-card" data-id="${item.id}">
      <div class="menu-card-img">
        <span class="menu-card-icon">${item.icon}</span>
      </div>
      <div class="menu-card-info">
        <div class="menu-card-name">${item.name}</div>
        <div class="menu-card-desc">${item.desc}</div>
        <div class="menu-card-bottom">
          <span class="menu-card-price">&#8369;${item.price}</span>
          <button class="add-btn" onclick="addToCart(${item.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderMenu(btn.dataset.category);
  });
});

// Cart
function addToCart(id) {
  const item = menu.find(m => m.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });
  updateCart();
  cartBtn.classList.add("bounce");
  setTimeout(() => cartBtn.classList.remove("bounce"), 400);
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCart();
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else updateCart();
}

function getDeliveryFee() {
  if (selectedDelivery === "nearby") return 50;
  return 0;
}

function updateCart() {
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const fee = getDeliveryFee();
  const total = subtotal + fee;

  cartCount.textContent = totalItems;
  cartCount.classList.toggle("visible", totalItems > 0);
  cartSubtotal.textContent = subtotal;
  deliveryFeeEl.textContent = fee === 0 ? "Free" : "\u20B1" + fee;
  cartTotal.textContent = total;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>Your cart is empty</p>
        <span>Add items from the menu</span>
      </div>`;
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-icon">${item.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
          <span class="cart-item-qty">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
        </div>
      </div>
      <div class="cart-item-price">&#8369;${item.price * item.qty}</div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  `).join("");
}

// Delivery buttons
document.querySelectorAll(".delivery-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".delivery-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDelivery = btn.dataset.delivery;
    updateCart();
  });
});

// Payment buttons
document.querySelectorAll(".payment-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".payment-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedPayment = btn.dataset.payment;
  });
});

// Cart open/close
cartBtn.addEventListener("click", () => {
  cartSidebar.classList.add("open");
  overlay.classList.add("active");
});

function closeCartSidebar() {
  cartSidebar.classList.remove("open");
  overlay.classList.remove("active");
}

closeCart.addEventListener("click", closeCartSidebar);
overlay.addEventListener("click", closeCartSidebar);

// Generate unique order ID
function generateOrderId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `AJ-${y}${m}${d}-${h}${min}${s}-${rand}`;
}

// Order History
function getHistory() {
  try { return JSON.parse(localStorage.getItem("aj-orders")) || []; }
  catch { return []; }
}

function saveOrder(order) {
  const history = getHistory();
  history.unshift(order);
  localStorage.setItem("aj-orders", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <p>No orders yet</p>
        <span>Your order history will appear here</span>
      </div>`;
    return;
  }

  historyList.innerHTML = history.map(order => {
    const itemsList = order.items.map(i => `${i.icon} ${i.name} x${i.qty}`).join(", ");
    return `
      <div class="history-card" onclick="viewReceipt('${order.id}')">
        <div class="history-card-header">
          <span class="history-card-id">${order.id}</span>
          <span class="history-card-date">${order.date}</span>
        </div>
        <div class="history-card-name">${order.customer}</div>
        <div class="history-card-items">${itemsList}</div>
        <div class="history-card-footer">
          <span class="history-card-total">&#8369;${order.total}</span>
          <span class="history-card-badge">Confirmed</span>
        </div>
      </div>`;
  }).join("");
}

function viewReceipt(orderId) {
  const history = getHistory();
  const order = history.find(o => o.id === orderId);
  if (!order) return;
  showReceiptModal(order);
}

// Receipt
function showReceiptModal(order) {
  document.getElementById("receiptCustomer").textContent = "Customer: " + order.customer;
  document.getElementById("receiptDate").textContent = order.date;
  document.getElementById("receiptId").textContent = order.id;
  document.getElementById("receiptSubtotal").textContent = "\u20B1" + order.subtotal;
  document.getElementById("receiptDelivery").textContent = order.deliveryFee === 0 ? "Free" : "\u20B1" + order.deliveryFee;
  document.getElementById("receiptTotal").textContent = "\u20B1" + order.total;

  const deliveryLabels = { pickup: "Pickup (Free)", nearby: "Nearby Delivery (+\u20B150)", lalamove: "Lalamove (Arrange with rider)" };
  const paymentLabels = { cash: "Cash", gcash: "GCash", bank: "Bank Transfer" };

  document.getElementById("receiptDeliveryType").textContent = deliveryLabels[order.delivery] || order.delivery;
  document.getElementById("receiptPayment").textContent = paymentLabels[order.payment] || order.payment;

  document.getElementById("receiptItems").innerHTML = order.items.map(item => `
    <div class="receipt-item">
      <div>
        <div class="receipt-item-name">${item.icon} ${item.name}</div>
        <div class="receipt-item-qty">x${item.qty} \u20B1${item.price} each</div>
      </div>
      <div class="receipt-item-price">\u20B1${item.price * item.qty}</div>
    </div>
  `).join("");

  modalOverlay.classList.add("active");
}

function generateReceipt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const orderId = generateOrderId();

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const fee = getDeliveryFee();
  const total = subtotal + fee;
  const customerName = customerNameInput.value.trim() || "Walk-in Customer";

  const order = {
    id: orderId,
    customer: customerName,
    date: dateStr + " " + timeStr,
    items: JSON.parse(JSON.stringify(cart)),
    subtotal,
    deliveryFee: fee,
    total,
    delivery: selectedDelivery,
    payment: selectedPayment
  };

  saveOrder(order);
  showReceiptModal(order);
}

// Checkout
checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) return;
  if (!customerNameInput.value.trim()) {
    customerNameInput.style.borderColor = "#ef4444";
    customerNameInput.focus();
    setTimeout(() => { customerNameInput.style.borderColor = ""; }, 2000);
    return;
  }
  generateReceipt();
  closeCartSidebar();
});

closeModal.addEventListener("click", () => {
  modalOverlay.classList.remove("active");
  cart = [];
  selectedDelivery = "pickup";
  selectedPayment = "cash";
  customerNameInput.value = "";
  document.querySelectorAll(".delivery-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(".delivery-btn[data-delivery='pickup']").classList.add("active");
  document.querySelectorAll(".payment-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(".payment-btn[data-payment='cash']").classList.add("active");
  updateCart();
});

// Contact
contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector("button");
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Sent!`;
  btn.style.background = "#16a34a";
  setTimeout(() => {
    btn.innerHTML = `Send Message <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`;
    btn.style.background = "";
    contactForm.reset();
  }, 2500);
});

// Init
renderMenu();
updateCart();
renderHistory();
