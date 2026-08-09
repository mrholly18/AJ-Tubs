// HTML escaping utility to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const menu = [
  { id: 1, name: "Lasagna", desc: "Classic layered pasta with rich meat sauce", price: 200, category: "pasta", icon: "\uD83C\uDF5D", image: "images/lasagna.jpg" },
  { id: 2, name: "Carbonara", desc: "Creamy egg-based pasta with crispy bits", price: 180, category: "pasta", icon: "\uD83E\uDDC0", image: "images/carbonara.jpg" },
  { id: 3, name: "Baked Macaroni", desc: "Cheesy baked macaroni to reach perfection", price: 180, category: "pasta", icon: "\uD83E\uDDC0" },
  { id: 4, name: "Mango Graham", desc: "Sweet mangoes layered with graham crackers", price: 150, category: "dessert", icon: "\uD83E\uDD6D", image: "images/mango-graham.jpg" },
  { id: 5, name: "Oreo Cheesecake", desc: "No-bake cheesecake with Oreo cookie crust", price: 150, category: "dessert", icon: "\uD83C\uDF6A", image: "images/oreo-cheesecake.jpg" },
  { id: 6, name: "Graham Balls - 4pcs", desc: "Sweet graham ball bites (4 pcs per tub)", price: 30, category: "dessert", icon: "\uD83C\uDF6E" },
  { id: 7, name: "Champorado", desc: "Chocolate rice porridge", price: 50, category: "others", icon: "\uD83C\uDF6B" }
];

// Name aliases: old names → new names (for backwards compatibility with release_menu table)
const MENU_NAME_ALIASES = {
  "Mac and Cheese": "Baked Macaroni",
  "Graham Balls": "Graham Balls - 4pcs"
};

function resolveMenuName(name) {
  return MENU_NAME_ALIASES[name] || name;
}

let cart = [];
let selectedDelivery = "pickup";
let selectedPayment = "cash";
let availableReleaseDates = [];
let releaseMenuCache = {}; // { release_date: [item_names] }

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
const menuToggle = document.getElementById("menuToggle");
const fullscreenNav = document.getElementById("fullscreenNav");
const navClose = document.getElementById("navClose");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const themeToggle = document.getElementById("themeToggle");
const customerNameInput = document.getElementById("customerName");
const confirmModal = document.getElementById("confirmModal");
const confirmBack = document.getElementById("confirmBack");
const confirmSubmit = document.getElementById("confirmSubmit");
const releaseBanner = document.getElementById("releaseBanner");
const closeReleaseBanner = document.getElementById("closeReleaseBanner");
const heroOrderCount = document.getElementById("heroOrderCount");
const socialProofText = document.getElementById("socialProofText");
const featuredImg = document.getElementById("featuredImg");
const featuredDesc = document.getElementById("featuredDesc");
const featuredPrice = document.getElementById("featuredPrice");
const featuredAddBtn = document.getElementById("featuredAddBtn");

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
  const select = document.getElementById("releaseDate");
  const selectedDate = select ? select.value : "";
  const availableItems = selectedDate ? (releaseMenuCache[selectedDate] || []) : [];
  const menuSectionTag = document.getElementById("menuSectionTag");
  const menuFilters = document.getElementById("menuFilters");

  // Check if any release date is open for ordering
  const today = new Date().toISOString().split("T")[0];
  const hasOpenDate = availableReleaseDates.some(d => d.is_active !== false && d.date >= today && !isOrderingClosed(d.date, d.time));

  // If no open release dates exist at all, show friendly message
  if (!hasOpenDate) {
    if (menuSectionTag) menuSectionTag.style.display = "none";
    if (menuFilters) menuFilters.style.display = "none";
    menuGrid.innerHTML = `
      <div class="no-menu-message">
        <span class="no-menu-message-icon" aria-hidden="true">📦</span>
        <h3>No pre-orders open right now</h3>
        <p>Check back for the next release. We'll have fresh tubs ready for you!</p>
      </div>
    `;
    return;
  }

  // If a release date is selected but no menu items are set for it, show message
  if (selectedDate && availableItems.length === 0) {
    menuGrid.innerHTML = `
      <div class="no-menu-message">
        <span class="no-menu-message-icon" aria-hidden="true">📋</span>
        <h3>No menu set for this release</h3>
        <p>Check back soon or select a different release date.</p>
      </div>
    `;
    return;
  }

  let filtered = category === "all" ? menu : menu.filter(m => m.category === category);

  // Filter by available items for selected release date (resolve old names to new)
  if (selectedDate && availableItems.length > 0) {
    const resolvedNames = availableItems.map(resolveMenuName);
    filtered = filtered.filter(m => resolvedNames.includes(m.name));
  }

  if (filtered.length === 0) {
    menuGrid.innerHTML = `
      <div class="no-menu-message">
        <span class="no-menu-message-icon" aria-hidden="true">🍽</span>
        <h3>No items in this category</h3>
      </div>
    `;
    return;
  }

  if (menuSectionTag) menuSectionTag.style.display = "";
  if (menuFilters) menuFilters.style.display = "";
  menuGrid.innerHTML = filtered.map(item => `
    <div class="menu-card" data-id="${item.id}">
      <div class="menu-card-img" ${item.image ? `onclick="openLightbox('${item.image}', '${item.name}')"` : ''}>
        ${item.image 
          ? `<img src="${item.image}" alt="${item.name}" class="menu-card-photo" loading="lazy">`
          : `<span class="menu-card-icon">${item.icon}</span>`
        }
      </div>
      ${item.image ? `<div class="image-preview" onclick="openLightbox('${item.image}', '${item.name}')"><img src="${item.image}" alt="${item.name}"></div>` : ''}
      <div class="menu-card-info">
        <div class="menu-card-name">${item.name}</div>
        <div class="menu-card-desc">${item.desc}</div>
        <div class="menu-card-bottom">
          <span class="menu-card-price">&#8369;${item.price}</span>
          <button class="add-btn" onclick="addToCart(${item.id}, event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// Lightbox functions
function openLightbox(imageSrc, imageName) {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  
  lightboxImg.src = imageSrc;
  lightboxImg.alt = imageName;
  lightboxCaption.textContent = imageName;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

// Close lightbox on click outside
document.getElementById('imageLightbox').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    closeLightbox();
  }
});

// Close lightbox on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderMenu(btn.dataset.category);
  });
});

// Cart
function addToCart(id, event) {
  const item = menu.find(m => m.id === id);
  // Check if item is available for selected release date
  const releaseDateSelect = document.getElementById("releaseDate");
  if (releaseDateSelect && releaseDateSelect.value) {
    const itemsForDate = (releaseMenuCache[releaseDateSelect.value] || []).map(resolveMenuName);
    if (itemsForDate.length > 0 && !itemsForDate.includes(item.name)) {
      alert(item.name + " is not available for the selected release date.");
      return;
    }
  }
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });
  updateCart();

  // Flying animation
  if (event) {
    const btn = event.currentTarget || event.target.closest('.add-btn');
    if (btn) {
      const btnRect = btn.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();
      const flyEl = document.createElement('div');
      flyEl.className = 'fly-to-cart';
      flyEl.textContent = item.icon || '🛒';
      flyEl.style.left = btnRect.left + 'px';
      flyEl.style.top = btnRect.top + 'px';
      document.body.appendChild(flyEl);

      // Animate to cart position
      requestAnimationFrame(() => {
        flyEl.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        flyEl.style.left = cartRect.left + cartRect.width / 2 - 20 + 'px';
        flyEl.style.top = cartRect.top + 'px';
        flyEl.style.transform = 'scale(0.3)';
        flyEl.style.opacity = '0';
      });

      setTimeout(() => flyEl.remove(), 600);
    }
  }

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
      <div class="cart-item-icon ${item.image ? 'has-image' : ''}">${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy">` : item.icon}</div>
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
    const addressOption = document.getElementById("addressOption");
    addressOption.style.display = (selectedDelivery === "nearby" || selectedDelivery === "lalamove") ? "block" : "none";
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

// Save or update order - if same customer name + same release date exists, merge items
async function saveOrder(order) {
  try {
    await db.addOrder(order);
    showReceiptModal(order);
  } catch (e) {
    console.error("Failed to save order:", e);
    alert("There was a problem saving your order. Please try again.");
  }
}

// Receipt
function showReceiptModal(order) {
  document.getElementById("receiptCustomer").textContent = "Customer: " + (order.customer_name || order.customer || 'Walk-in');
  document.getElementById("receiptDate").textContent = order.date;
  document.getElementById("receiptId").textContent = order.order_number || order.id;
  document.getElementById("receiptSubtotal").textContent = "\u20B1" + order.subtotal;
  document.getElementById("receiptDelivery").textContent = (order.delivery_fee || order.deliveryFee || 0) === 0 ? "Free" : "\u20B1" + (order.delivery_fee || order.deliveryFee);
  document.getElementById("receiptTotal").textContent = "\u20B1" + order.total;

  const deliveryLabels = { pickup: "Pickup (Free)", nearby: "Nearby Delivery (+\u20B150)", lalamove: "Lalamove (Arrange with rider)" };
  const paymentLabels = { cash: "Cash", gcash: "GCash", bank: "Bank Transfer" };

  const deliveryType = order.delivery_option || order.delivery;
  const paymentType = order.payment_method || order.payment;
  document.getElementById("receiptDeliveryType").textContent = deliveryLabels[deliveryType] || deliveryType;
  document.getElementById("receiptPayment").textContent = paymentLabels[paymentType] || paymentType;

  const rd = order.release_date;
  const rdObj = availableReleaseDates.find(d => d.date === rd);
  document.getElementById("receiptReleaseDate").textContent = rdObj ? rdObj.label : (rd || 'Not specified');

  const addressRow = document.getElementById("receiptAddressRow");
  if (order.address) {
    document.getElementById("receiptAddress").textContent = order.address;
    addressRow.style.display = "flex";
  } else {
    addressRow.style.display = "none";
  }

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

async function generateReceipt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const orderId = generateOrderId();

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const fee = getDeliveryFee();
  const total = subtotal + fee;
  const customerName = customerNameInput.value.trim() || "Walk-in Customer";
  const releaseDateSelect = document.getElementById("releaseDate");
  const releaseDate = releaseDateSelect ? releaseDateSelect.value : "";
  const notes = document.getElementById("customerNotes").value.trim();
  const address = document.getElementById("customerAddress").value.trim();

  const order = {
    id: orderId,
    order_number: orderId,
    customer_name: customerName,
    date: dateStr + " " + timeStr,
    items: JSON.parse(JSON.stringify(cart)),
    subtotal,
    delivery_fee: fee,
    total,
    delivery_option: selectedDelivery,
    payment_method: selectedPayment,
    release_date: releaseDate,
    address: address,
    status: 'pending',
    is_paid: false,
    is_delivered: false,
    notes: notes,
    created_at: now.toISOString()
  };

  await saveOrder(order);
}

// Checkout - show confirmation modal
checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) return;
  if (!customerNameInput.value.trim()) {
    customerNameInput.style.borderColor = "#ef4444";
    customerNameInput.focus();
    setTimeout(() => { customerNameInput.style.borderColor = ""; }, 2000);
    return;
  }
  const releaseDateSelect = document.getElementById("releaseDate");
  if (releaseDateSelect && !releaseDateSelect.value) {
    releaseDateSelect.style.borderColor = "#ef4444";
    releaseDateSelect.focus();
    setTimeout(() => { releaseDateSelect.style.borderColor = ""; }, 2000);
    return;
  }
  if (isOrderingClosed(releaseDateSelect.value)) {
    const rd = availableReleaseDates.find(d => d.date === releaseDateSelect.value);
    const cutoff = rd ? getReleaseCutoff(rd.date, rd.time) : null;
    const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
    const cutoffStr = cutoff ? cutoff.toLocaleString("en-US", opts) : "12 hours before release";
    alert("Ordering is closed for " + (rd ? rd.label : "this release") + ".\nOrders closed " + cutoffStr + ".");
    return;
  }
  // Validate address is provided for delivery orders
  if (selectedDelivery === "nearby" || selectedDelivery === "lalamove") {
    const addressInput = document.getElementById("customerAddress");
    if (!addressInput.value.trim()) {
      addressInput.style.borderColor = "#ef4444";
      addressInput.focus();
      setTimeout(() => { addressInput.style.borderColor = ""; }, 2000);
      return;
    }
  }
  // Validate cart items are available for selected release date
  const itemsForDate = (releaseMenuCache[releaseDateSelect.value] || []).map(resolveMenuName);
  if (itemsForDate.length > 0) {
    const unavailable = cart.filter(c => !itemsForDate.includes(c.name));
    if (unavailable.length > 0) {
      alert("Some items in your cart are not available for this release date:\n" + unavailable.map(i => i.name).join(", "));
      return;
    }
  }
  showConfirmModal();
});

// Build and show confirmation modal
function showConfirmModal() {
  const customerName = customerNameInput.value.trim() || "Walk-in Customer";
  const releaseDateSelect = document.getElementById("releaseDate");
  const releaseDate = releaseDateSelect ? releaseDateSelect.value : "";
  const rdObj = availableReleaseDates.find(d => d.date === releaseDate);
  const notes = document.getElementById("customerNotes").value.trim();

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const fee = getDeliveryFee();
  const total = subtotal + fee;

  const deliveryLabels = { pickup: "Pickup (Free)", nearby: "Nearby Delivery (+\u20B150)", lalamove: "Lalamove" };
  const paymentLabels = { cash: "Cash", gcash: "GCash", bank: "Bank Transfer" };

  const body = document.getElementById("confirmBody");
  let html = `
    <div class="confirm-section">
      <div class="confirm-label">Customer</div>
      <div class="confirm-value">${escapeHtml(customerName)}</div>
    </div>
    <div class="confirm-section">
      <div class="confirm-label">Release Date</div>
      <div class="confirm-value">${rdObj ? rdObj.label : (releaseDate || "Not specified")}</div>
    </div>
    <div class="confirm-divider"></div>
    <div class="confirm-section">
      <div class="confirm-label">Items</div>
  `;

  cart.forEach(item => {
    html += `
      <div class="confirm-item-row">
        <span class="confirm-item-name">${item.icon} ${item.name} x${item.qty}</span>
        <span class="confirm-item-price">\u20B1${item.price * item.qty}</span>
      </div>
    `;
  });

  html += `
    </div>
    <div class="confirm-divider"></div>
    <div class="confirm-section">
      <div class="confirm-label">Subtotal</div>
      <div class="confirm-value">\u20B1${subtotal}</div>
    </div>
    <div class="confirm-section">
      <div class="confirm-label">Delivery</div>
      <div class="confirm-value">${deliveryLabels[selectedDelivery] || "Pickup"}</div>
    </div>
  `;

  const address = document.getElementById("customerAddress").value.trim();
  if (address && (selectedDelivery === "nearby" || selectedDelivery === "lalamove")) {
    html += `
      <div class="confirm-section">
        <div class="confirm-label">Address</div>
        <div class="confirm-value">${escapeHtml(address)}</div>
      </div>
    `;
  }

  html += `
    <div class="confirm-section">
      <div class="confirm-label">Payment</div>
      <div class="confirm-value">${paymentLabels[selectedPayment] || "Cash"}</div>
    </div>
    <div class="confirm-total-row">
      <span>Total</span>
      <span>\u20B1${total}</span>
    </div>
  `;

  if (notes) {
    html += `
      <div class="confirm-divider"></div>
      <div class="confirm-section">
        <div class="confirm-label">Special Requests</div>
        <div class="confirm-notes">${escapeHtml(notes)}</div>
      </div>
    `;
  }

  body.innerHTML = html;
  confirmModal.classList.add("active");
}

  closeModal.addEventListener("click", () => {
    modalOverlay.classList.remove("active");
    cart = [];
    selectedDelivery = "pickup";
    selectedPayment = "cash";
    customerNameInput.value = "";
    const rdSelect = document.getElementById("releaseDate");
    if (rdSelect) rdSelect.value = "";
    document.getElementById("customerNotes").value = "";
    document.getElementById("customerAddress").value = "";
    document.getElementById("addressOption").style.display = "none";
    document.querySelectorAll(".delivery-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(".delivery-btn[data-delivery='pickup']").classList.add("active");
    document.querySelectorAll(".payment-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(".payment-btn[data-payment='cash']").classList.add("active");
    updateCart();
  });

// Confirmation modal
confirmBack.addEventListener("click", () => {
  confirmModal.classList.remove("active");
});

confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) confirmModal.classList.remove("active");
});

confirmSubmit.addEventListener("click", async () => {
  const releaseDateSelect = document.getElementById("releaseDate");
  if (releaseDateSelect && isOrderingClosed(releaseDateSelect.value)) {
    const rd = availableReleaseDates.find(d => d.date === releaseDateSelect.value);
    const cutoff = rd ? getReleaseCutoff(rd.date, rd.time) : null;
    const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
    const cutoffStr = cutoff ? cutoff.toLocaleString("en-US", opts) : "12 hours before release";
    alert("Ordering is closed for this release.\nOrders closed " + cutoffStr + ".");
    return;
  }
  confirmModal.classList.remove("active");
  closeCartSidebar();
  await generateReceipt();
});

// Release banner dismiss
closeReleaseBanner.addEventListener("click", () => {
  releaseBanner.style.display = "none";
});

// Init
updateCart();
loadReleaseDates();

// Load release dates from Supabase
async function loadReleaseDates() {
  const select = document.getElementById("releaseDate");
  if (!select) return;
  try {
    availableReleaseDates = await db.getReleaseDates();
    const activeDates = availableReleaseDates.filter(d => d.is_active !== false);
    const today = new Date().toISOString().split("T")[0];
    const upcomingDates = activeDates.filter(d => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));

    select.innerHTML = '<option value="">Select release date...</option>' +
      activeDates.map(d => {
        const closed = isOrderingClosed(d.date, d.time);
        return `<option value="${d.date}" ${closed ? 'disabled' : ''}>${d.label}${closed ? ' (Ordering closed)' : ''}</option>`;
      }).join("");

    // Auto-select next upcoming, non-closed date, or single active date
    const openUpcomingDates = upcomingDates.filter(d => !isOrderingClosed(d.date, d.time));
    if (openUpcomingDates.length > 0) {
      select.value = openUpcomingDates[0].date;
    } else if (activeDates.length === 1 && !isOrderingClosed(activeDates[0].date, activeDates[0].time)) {
      select.value = activeDates[0].date;
    }

    // Load release menus for all active dates
    await loadReleaseMenus();

    // Show upcoming release banner
    showUpcomingBanner();

    // Re-render menu based on selected release date
    pickFeaturedFromAvailable();
    renderMenu();
    renderFeatured();
    updateCutoffInfo();
    updateCheckoutAvailability();
    await setupSocialProof();
  } catch (e) {
    console.warn("[DB] Could not load release dates:", e);
  }

  // Re-render menu when release date changes
  if (select) {
    select.addEventListener("change", () => {
      pickFeaturedFromAvailable();
      renderMenu();
      renderFeatured();
      updateCutoffInfo();
      updateCheckoutAvailability();
    });
  }
}

// Load release menus (which items are available per release date)
async function loadReleaseMenus() {
  releaseMenuCache = {};
  try {
    const rows = await db.getAllReleaseMenus();
    (rows || []).forEach(row => {
      if (!releaseMenuCache[row.release_date]) releaseMenuCache[row.release_date] = [];
      releaseMenuCache[row.release_date].push(row.menu_item_name);
    });
  } catch (e) {
    console.warn("[DB] Could not load release menus:", e);
  }
}

// Show upcoming release banner
function showUpcomingBanner() {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = availableReleaseDates
    .filter(d => d.date >= today && d.is_active !== false)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) {
    releaseBanner.style.display = "none";
    return;
  }

  const next = upcoming[0];
  const items = releaseMenuCache[next.date] || [];
  const itemCount = items.length;

  document.getElementById("releaseBannerLabel").textContent = next.label || next.date;
  document.getElementById("releaseBannerItems").textContent =
    itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""} available` : "Menu coming soon";

  releaseBanner.style.display = "block";
}

// Cutoff: orders close 12 hours before the release date+time
function getReleaseCutoff(releaseDate, releaseTime) {
  const time = releaseTime || '00:00';
  const cutoff = new Date(releaseDate + "T" + time + ":00");
  cutoff.setHours(cutoff.getHours() - 12);
  return cutoff;
}

function isOrderingClosed(releaseDate, releaseTime) {
  if (!releaseDate) return false;
  const time = releaseTime || findReleaseTime(releaseDate);
  return new Date() >= getReleaseCutoff(releaseDate, time);
}

function findReleaseTime(releaseDate) {
  const match = availableReleaseDates.find(d => d.date === releaseDate);
  return match ? (match.time || '00:00') : '00:00';
}

// Update the hero cutoff info (orders close 12 hours before release)
function updateCutoffInfo() {
  const cutoffText = document.getElementById("heroCutoffText");
  const cutoffEl = document.getElementById("heroCutoff");
  if (!cutoffText) return;

  const select = document.getElementById("releaseDate");
  const selectedDate = select ? select.value : "";
  const today = new Date().toISOString().split("T")[0];

  let next = availableReleaseDates
    .filter(d => d.is_active !== false && d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (selectedDate) {
    const match = availableReleaseDates.find(d => d.date === selectedDate);
    if (match) next = match;
  }

  if (cutoffEl) cutoffEl.classList.remove("closed");

  if (!next) {
    cutoffText.textContent = "Orders close 12 hours before the release";
    return;
  }

  const label = next.label || next.date;
  const cutoff = getReleaseCutoff(next.date, next.time);

  if (isOrderingClosed(next.date, next.time)) {
    cutoffText.textContent = `Ordering closed for ${label}`;
    if (cutoffEl) cutoffEl.classList.add("closed");
    return;
  }

  const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
  cutoffText.textContent = `Orders close ${cutoff.toLocaleString("en-US", opts)} — 12 hours before release`;
}

// Disable/enable the checkout button based on whether ordering is closed
function updateCheckoutAvailability() {
  const select = document.getElementById("releaseDate");
  const closed = select && isOrderingClosed(select.value);
  checkoutBtn.disabled = !!closed;
  checkoutBtn.classList.toggle("disabled", !!closed);
}

// Admin Modal
const adminLink = document.getElementById("adminLink");
const adminModal = document.getElementById("adminModal");
const adminForm = document.getElementById("adminForm");
const adminPassword = document.getElementById("adminPassword");
const adminError = document.getElementById("adminError");
const closeAdminModal = document.getElementById("closeAdminModal");

if (adminLink) {
  adminLink.addEventListener("click", (e) => {
    e.preventDefault();
    fullscreenNav.classList.remove("active");
    document.body.style.overflow = "";
    adminModal.classList.add("active");
  });
}

if (closeAdminModal) {
  closeAdminModal.addEventListener("click", () => {
    adminModal.classList.remove("active");
    adminPassword.value = "";
    adminError.classList.remove("show");
  });
}

if (adminForm) {
  adminForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = adminPassword.value.trim();
    if (password === "AJST16") {
      const session = { loggedIn: true, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      localStorage.setItem("sellerSession", JSON.stringify(session));
      window.open("seller.html", "_blank");
      adminModal.classList.remove("active");
      adminPassword.value = "";
      adminError.classList.remove("show");
    } else {
      adminError.classList.add("show");
      adminPassword.value = "";
    }
  });
}

// Scroll reveal animation
function setupScrollReveal() {
  const sections = document.querySelectorAll('.features, .menu, .about, .contact, .featured');
  const cards = document.querySelectorAll('.feature-card, .menu-card, .about-card');
  
  // Add reveal class to sections
  sections.forEach(section => {
    const header = section.querySelector('.section-header');
    if (header) header.classList.add('reveal');
  });
  
  // Add reveal class to cards with staggered delays
  cards.forEach((card, index) => {
    card.classList.add('reveal');
    const delay = (index % 3) + 1;
    card.classList.add(`reveal-delay-${delay}`);
  });

  // Intersection Observer for scroll reveals
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Initialize scroll reveal after DOM is ready
setupScrollReveal();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Hero food carousel
function setupHeroCarousel() {
  const cards = document.querySelectorAll('.hero-food-card');
  const dots = document.querySelectorAll('.hero-dot');
  const prevBtn = document.getElementById('heroPrev');
  const nextBtn = document.getElementById('heroNext');
  if (cards.length === 0) return;

  let current = 0;
  let interval = null;

  const goTo = (index) => {
    current = (index + cards.length) % cards.length;
    cards.forEach((c, i) => c.classList.toggle('active', i === current));
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const startAuto = () => {
    if (interval) clearInterval(interval);
    interval = setInterval(next, 3500);
  };

  startAuto();

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.index, 10));
      startAuto();
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAuto(); });

  // Pause carousel on hover
  const showcase = document.getElementById('heroShowcase');
  if (showcase) {
    showcase.addEventListener('mouseenter', () => clearInterval(interval));
    showcase.addEventListener('mouseleave', startAuto);

    // Touch swipe support
    let startX = 0;
    let startY = 0;
    showcase.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    showcase.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next(); else prev();
        startAuto();
      }
    }, { passive: true });
  }
}

// Featured item spotlight
let featuredItem = null;
const featuredBadge = document.getElementById("featuredBadge");
const featuredSection = document.getElementById("featured");

function getSelectedReleaseDate() {
  const select = document.getElementById("releaseDate");
  return select ? select.value : "";
}

function isItemAvailableNow(item) {
  const selectedDate = getSelectedReleaseDate();
  if (!selectedDate) return true;
  const items = (releaseMenuCache[selectedDate] || []).map(resolveMenuName);
  if (items.length === 0) return false;
  return items.includes(item.name);
}

function pickFeaturedFromAvailable() {
  const selectedDate = getSelectedReleaseDate();
  if (!selectedDate) {
    // No release selected, pick first item with image
    featuredItem = menu.find(m => m.image) || menu[0];
    return;
  }
  const availableNames = (releaseMenuCache[selectedDate] || []).map(resolveMenuName);
  if (availableNames.length === 0) {
    featuredItem = null;
    return;
  }
  // Pick first available item that has an image
  const availableWithImages = menu.filter(m => availableNames.includes(m.name) && m.image);
  featuredItem = availableWithImages[0] || menu.find(m => availableNames.includes(m.name)) || null;
}

function renderFeatured() {
  const featuredLabel = document.getElementById("featuredLabel");
  
  if (!featuredItem) {
    if (featuredSection) featuredSection.style.display = "none";
    return;
  }

  const available = isItemAvailableNow(featuredItem);
  
  // Hide entire section if not available
  if (!available) {
    if (featuredSection) featuredSection.style.display = "none";
    return;
  }
  
  // Show section
  if (featuredSection) featuredSection.style.display = "";

  if (featuredItem.image) {
    featuredImg.src = featuredItem.image;
    featuredImg.style.display = "";
  } else {
    featuredImg.style.display = "none";
  }
  featuredDesc.textContent = `${featuredItem.name} — ${featuredItem.desc}`;
  featuredPrice.innerHTML = `<span class="featured-price-label">Price</span> \u20B1${featuredItem.price}`;

  featuredAddBtn.disabled = false;
  featuredAddBtn.classList.remove("btn-outline");
  featuredAddBtn.classList.add("btn-primary");
  featuredAddBtn.innerHTML = `Add to Cart
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  featuredBadge.textContent = "Featured This Week";
  featuredBadge.classList.remove("unavailable");
  featuredBadge.style.display = "";
  if (featuredLabel) featuredLabel.style.display = "none";
}

function setupFeaturedItem() {
  pickFeaturedFromAvailable();

  featuredAddBtn.addEventListener("click", (e) => {
    if (!featuredAddBtn.disabled && featuredItem) addToCart(featuredItem.id, e);
  });

  renderFeatured();
}

// Social proof - show order count and tubs available for next release
let totalOrderCount = 0;
const heroTubsCount = document.getElementById("heroTubsCount");
const heroTubsStat = document.getElementById("heroTubsStat");
const heroStatsDivider = document.getElementById("heroStatsDivider");
async function setupSocialProof() {
  try {
    const data = await db.getOrders();
    totalOrderCount = data.length;
  } catch (e) {
    console.warn("[DB] Could not load order count:", e);
  }

  if (heroOrderCount) heroOrderCount.textContent = totalOrderCount;

  // Calculate tubs available from next open release menu
  const today = new Date().toISOString().split("T")[0];
  const nextOpen = availableReleaseDates
    .filter(d => d.is_active !== false && d.date >= today && !isOrderingClosed(d.date, d.time))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const tubsAvailable = nextOpen ? (releaseMenuCache[nextOpen.date] || []).length : 0;

  if (heroTubsCount) heroTubsCount.textContent = tubsAvailable;
  if (heroTubsStat) heroTubsStat.style.display = tubsAvailable > 0 ? "" : "none";
  if (heroStatsDivider) heroStatsDivider.style.display = tubsAvailable > 0 ? "" : "none";

  if (socialProofText) {
    const next = availableReleaseDates
      .filter(d => d.is_active !== false)
      .sort((a, b) => a.date.localeCompare(b.date))
      .find(d => d.date >= today);
    socialProofText.textContent = next
      ? `Prepare for the next release — ${next.label || next.date}. ${totalOrderCount} orders placed so far.`
      : `${totalOrderCount} orders placed so far`;
  }
}

setupHeroCarousel();
setupFeaturedItem();
