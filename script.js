const menu = [
  { id: 1, name: "Lasagna", desc: "Classic layered pasta with rich meat sauce", price: 200, category: "pasta", icon: "\uD83C\uDF5D", image: "images/lasagna.jpg" },
  { id: 2, name: "Carbonara", desc: "Creamy egg-based pasta with crispy bits", price: 180, category: "pasta", icon: "\uD83E\uDDC0", image: "images/carbonara.jpg" },
  { id: 3, name: "Mac and Cheese", desc: "Cheesy pasta no baked to reach perfection", price: 180, category: "pasta", icon: "\uD83E\uDDC0" },
  { id: 4, name: "Mango Graham", desc: "Sweet mangoes layered with graham crackers", price: 150, category: "dessert", icon: "\uD83E\uDD6D", image: "images/mango-graham.jpg" },
  { id: 5, name: "Oreo Cheesecake", desc: "No-bake cheesecake with Oreo cookie crust", price: 150, category: "dessert", icon: "\uD83C\uDF6A", image: "images/oreo-cheesecake.jpg" },
  { id: 6, name: "Champorado", desc: "Chocolate rice porridge", price: 50, category: "others", icon: "\uD83C\uDF6B" }
];

let cart = [];
let selectedDelivery = "pickup";
let selectedPayment = "cash";
let availableReleaseDates = [];

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

// Save or update order - if same customer name + same release date exists, merge items
async function saveOrder(order) {
  await db.addOrder(order);
  showReceiptModal(order);
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
  const releaseDateSelect = document.getElementById("releaseDate");
  const releaseDate = releaseDateSelect ? releaseDateSelect.value : "";

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
    status: 'pending',
    is_paid: false,
    is_delivered: false,
    notes: '',
    created_at: now.toISOString()
  };

  saveOrder(order);
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
  const releaseDateSelect = document.getElementById("releaseDate");
  if (releaseDateSelect && !releaseDateSelect.value) {
    releaseDateSelect.style.borderColor = "#ef4444";
    releaseDateSelect.focus();
    setTimeout(() => { releaseDateSelect.style.borderColor = ""; }, 2000);
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
  const rdSelect = document.getElementById("releaseDate");
  if (rdSelect) rdSelect.value = "";
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
loadReleaseDates();

// Load release dates from Supabase
async function loadReleaseDates() {
  const select = document.getElementById("releaseDate");
  if (!select) return;
  try {
    availableReleaseDates = await db.getReleaseDates();
    const activeDates = availableReleaseDates.filter(d => d.is_active);
    select.innerHTML = '<option value="">Select release date...</option>' +
      activeDates.map(d => `<option value="${d.date}">${d.label}</option>`).join("");
    if (activeDates.length === 1) {
      select.value = activeDates[0].date;
    }
  } catch (e) {
    console.warn("[DB] Could not load release dates:", e);
  }
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
      sessionStorage.setItem("sellerLoggedIn", "true");
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
  const sections = document.querySelectorAll('.features, .menu, .about, .contact');
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
