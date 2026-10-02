// ===== Configuration =====
// Production backend on Railway — change if your Railway domain is different
const API_BASE = "https://sungarland-production.up.railway.app/api";   // Change if your Railway domain differs

// ===== SUPPORT CONTACT — EDIT THESE WITH YOUR REAL DETAILS =====
// Leave a field as "" if you do not use it.
const SUPPORT = {
  businessName: "SunGarland",
  // WhatsApp number with country code, digits only (example Ghana: 233241234567)
  whatsapp: "233279177884",
  // Your Gmail or business email
  email: "your.email@gmail.com",
  // Optional phone for calls
  phone: "",
  // Optional extra note
  hours: "Mon – Sat, 9:00am – 6:00pm",
  // Optional Instagram / Facebook / website
  instagram: "",
  facebook: "",
  website: "",
};
// ===============================================================

function renderSupportContacts() {
  const card = document.getElementById("supportContactCard");
  const buttons = document.getElementById("supportContactButtons");
  const footer = document.getElementById("footerSupport");

  const lines = [];
  if (SUPPORT.businessName) lines.push(`<div><strong>${escapeHtml(SUPPORT.businessName)} Support</strong></div>`);
  if (SUPPORT.whatsapp) lines.push(`<div>WhatsApp: <strong>${escapeHtml(SUPPORT.whatsapp)}</strong></div>`);
  if (SUPPORT.email) lines.push(`<div>Email: <a href="mailto:${escapeHtml(SUPPORT.email)}">${escapeHtml(SUPPORT.email)}</a></div>`);
  if (SUPPORT.phone) lines.push(`<div>Phone: <a href="tel:${escapeHtml(SUPPORT.phone)}">${escapeHtml(SUPPORT.phone)}</a></div>`);
  if (SUPPORT.hours) lines.push(`<div>Hours: ${escapeHtml(SUPPORT.hours)}</div>`);
  if (SUPPORT.website) lines.push(`<div>Website: <a href="${escapeHtml(SUPPORT.website)}" target="_blank" rel="noopener">${escapeHtml(SUPPORT.website)}</a></div>`);
  if (SUPPORT.instagram) lines.push(`<div>Instagram: ${escapeHtml(SUPPORT.instagram)}</div>`);
  if (SUPPORT.facebook) lines.push(`<div>Facebook: ${escapeHtml(SUPPORT.facebook)}</div>`);

  if (card) {
    card.innerHTML = lines.join("") || "<p>Update SUPPORT details in js/app.js</p>";
  }

  if (buttons) {
    const btns = [];
    if (SUPPORT.whatsapp) {
      const wa = String(SUPPORT.whatsapp).replace(/\D/g, "");
      const msg = encodeURIComponent("Hi SunGarland support, I need help with: ");
      btns.push(`<a class="btn btn-whatsapp btn-sm" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener">Chat on WhatsApp</a>`);
    }
    if (SUPPORT.email) {
      btns.push(`<a class="btn btn-primary btn-sm" href="mailto:${encodeURIComponent(SUPPORT.email)}?subject=SunGarland%20Support">Send Email</a>`);
    }
    buttons.innerHTML = btns.join("");
  }

  if (footer) {
    const bits = [];
    if (SUPPORT.whatsapp) bits.push(`WhatsApp: ${escapeHtml(SUPPORT.whatsapp)}`);
    if (SUPPORT.email) bits.push(`Email: ${escapeHtml(SUPPORT.email)}`);
    footer.innerHTML = bits.length
      ? bits.join("<br>") + `<br><a href="#" onclick="showSection('help');return false;" style="text-decoration:underline;">Help centre</a>`
      : `<a href="#" onclick="showSection('help');return false;" style="text-decoration:underline;">Help & Contact</a>`;
  }
}

function emptyState(title, subtitle, actionHtml = "") {
  return `<div style="grid-column:1/-1;text-align:center;padding:2.5rem 1.25rem;background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
    <div style="font-size:2rem;margin-bottom:0.5rem;">📭</div>
    <div style="font-weight:600;font-size:1.05rem;color:#0f172a;margin-bottom:0.35rem;">${title}</div>
    <div style="font-size:0.9rem;color:#6b7280;max-width:360px;margin:0 auto 1rem;">${subtitle}</div>
    ${actionHtml}
  </div>`;
}


const DISPLAY_CURRENCY = "GHS";

function formatMoney(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return DISPLAY_CURRENCY + " 0.00";
  return DISPLAY_CURRENCY + " " + n.toFixed(2);
}

// ===== State =====
let products = [];
let currentSeller = null;   // { id, username, shop_name, ... }
let authMode = "login";     // "login" | "register"

// ===== Initialization =====
document.addEventListener("DOMContentLoaded", async () => {
  // Restore token if present
  const token = localStorage.getItem("wm_token");
  if (token) {
    try {
      currentSeller = await apiGet("/auth/me", true);
      updateAuthUI();
    } catch (e) {
      localStorage.removeItem("wm_token");
    }
  }

  setupNavigation();
  setupMobileMenu();
  setupSearchAndFilter();
  setupListForm();
  setupAuthForm();

  await loadProducts();
  renderFeatured();
  renderAllProducts();
  await populateCategories();
  updateSellPrompt();
});

// ===== API Helpers =====
async function apiGet(path, auth = false) {
  const headers = {};
  if (auth) {
    const token = localStorage.getItem("wm_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

async function apiPost(path, data, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("wm_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error: ${res.status}`);
  return body;
}

// ===== Auth UI =====
function updateAuthUI() {
  const area = document.getElementById("authArea");
  if (!area) return;

  if (currentSeller) {
    area.innerHTML = `
      <span class="auth-user">👤 ${escapeHtml(currentSeller.shop_name || currentSeller.username)}</span>
      <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
    `;
  } else {
    area.innerHTML = `
      <button class="btn btn-sm btn-outline" id="loginBtn" onclick="openAuthModal('login')">Login</button>
      <button class="btn btn-sm btn-primary" id="registerBtn" onclick="openAuthModal('register')">Register</button>
    `;
  }
}

function updateSellPrompt() {
  const prompt = document.getElementById("sellLoginPrompt");
  const form = document.getElementById("listProductForm");
  if (!prompt || !form) return;

  if (currentSeller) {
    prompt.classList.add("hidden");
    form.classList.remove("hidden");
  } else {
    prompt.classList.remove("hidden");
    form.classList.add("hidden");
  }
}

function openAuthModal(mode) {
  authMode = mode;
  const modal = document.getElementById("authModal");
  const title = document.getElementById("authTitle");
  const regFields = document.getElementById("registerFields");
  const submitBtn = document.getElementById("authSubmitBtn");
  const switchText = document.getElementById("authSwitchText");
  const switchLink = document.getElementById("authSwitchLink");
  const errorEl = document.getElementById("authError");
  const successEl = document.getElementById("authSuccess");
  const forgotLink = document.getElementById("forgotPasswordLink");

  errorEl?.classList.add("hidden");
  successEl?.classList.add("hidden");
  document.getElementById("authForm")?.reset();

  if (mode === "register") {
    title.textContent = "Create Seller Account";
    regFields.classList.remove("hidden");
    submitBtn.textContent = "Register";
    switchText.textContent = "Already have an account?";
    switchLink.textContent = "Login";
    switchLink.onclick = (e) => { e.preventDefault(); openAuthModal("login"); };
    if (forgotLink) forgotLink.style.display = "none";
  } else {
    title.textContent = "Login";
    regFields.classList.add("hidden");
    submitBtn.textContent = "Login";
    switchText.textContent = "Don't have an account?";
    switchLink.textContent = "Register";
    switchLink.onclick = (e) => { e.preventDefault(); openAuthModal("register"); };
    if (forgotLink) forgotLink.style.display = "";
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function setupAuthForm() {
  const form = document.getElementById("authForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("authError");
    const successEl = document.getElementById("authSuccess");
    errorEl?.classList.add("hidden");
    successEl?.classList.add("hidden");

    const username = document.getElementById("authUsername").value.trim();
    const password = document.getElementById("authPassword").value;

    try {
      let result;
      if (authMode === "register") {
        const terms = document.getElementById("authTerms");
        if (terms && !terms.checked) {
          throw new Error("You must accept the Terms of Service and Privacy Policy");
        }
        result = await apiPost("/auth/register", {
          username,
          password,
          email: document.getElementById("authEmail").value.trim(),
          shop_name: document.getElementById("authShopName").value.trim(),
          whatsapp: document.getElementById("authWhatsapp").value.trim(),
          terms_accepted: true,
        });
        if (result.dev_verify_url) {
          console.log("DEV verify URL:", result.dev_verify_url);
          alert("Account created!\n\nEmail verification link (dev mode):\n" + result.dev_verify_url);
        } else {
          alert("Account created! Please check your email to verify your account.");
        }
      } else {
        result = await apiPost("/auth/login", { username, password });
      }

      localStorage.setItem("wm_token", result.token);
      currentSeller = result.seller;
      updateAuthUI();
      updateSellPrompt();
      closeAuthModal();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      }
    }
  });
}

function logout() {
  localStorage.removeItem("wm_token");
  currentSeller = null;
  updateAuthUI();
  updateSellPrompt();
}

// ===== Load Products =====
async function loadProducts() {
  try {
    products = await apiGet("/products");
  } catch (err) {
    console.error("Failed to load products:", err);
    const containers = ["featuredProducts", "allProducts"];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#6b7280;">
            <p><strong>Cannot connect to the backend.</strong></p>
            <p style="font-size:0.9rem;margin-top:0.5rem;">
              Make sure the API is running on <code>http://localhost:5000</code><br>
              Run: <code>python3 backend/server.py</code>
            </p>
          </div>`;
      }
    });
    products = [];
  }
}

// ===== Rendering =====
function createProductCard(product) {
  const imageContent = product.image
    ? `<img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'>📦</div>'" />`
    : `<div class="placeholder">📦</div>`;

  return `
    <article class="product-card">
      <div class="product-image">
        ${imageContent}
        <span class="product-badge">${escapeHtml(product.category)}</span>
      </div>
      <div class="product-body">
        <div class="product-category">${escapeHtml(product.category)}</div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <div class="product-seller">by ${escapeHtml(product.seller)}</div>
        <div class="product-price">${formatMoney(product.price)}</div>
        <div class="product-actions">
          <button class="btn btn-outline btn-sm" onclick="openProductModal(${product.id})">Details</button>
          <button class="btn btn-primary btn-sm" onclick="buyOnWhatsApp(${product.id})">Buy</button>
        </div>
      </div>
    </article>
  `;
}

function renderFeatured() {
  const container = document.getElementById("featuredProducts");
  if (!container) return;
  const featured = products.slice(0, 3);
  if (!featured.length) {
    container.innerHTML = emptyState(
      "No products yet",
      "Sellers are still setting up. Check back soon, or list your own item if you have an approved account.",
      `<button class="btn btn-primary btn-sm" onclick="showSection('sell')">List a product</button>`
    );
    return;
  }
  container.innerHTML = featured.map(createProductCard).join("");
}

function renderAllProducts(filtered = null) {
  const list = filtered || products;
  const container = document.getElementById("allProducts");
  const noResults = document.getElementById("noResults");
  if (!container) return;

  if (list.length === 0) {
    if (noResults) noResults.classList.add("hidden");
    container.innerHTML = emptyState(
      "No products found",
      "Try another search, clear filters, or browse again later. New sellers join regularly.",
      `<button class="btn btn-outline btn-sm" onclick="showSection('help')">Need help?</button>`
    );
  } else {
    if (noResults) noResults.classList.add("hidden");
    container.innerHTML = list.map(createProductCard).join("");
  }
}

async function populateCategories() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;
  select.innerHTML = `<option value="all">All Categories</option>`;
  try {
    const categories = await apiGet("/categories");
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  } catch (err) {
    const cats = [...new Set(products.map(p => p.category))].sort();
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  }
}

// ===== Navigation =====
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const section = document.getElementById(sectionId);
  if (section) section.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.section === sectionId);
  });

  document.getElementById("mainNav")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });
}

function setupMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
  }
}

// ===== Search & Filter =====
function setupSearchAndFilter() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");

  async function applyFilters() {
    const query = searchInput?.value.toLowerCase().trim() || "";
    const category = categoryFilter?.value || "all";
    try {
      let path = "/products?";
      const params = [];
      if (category !== "all") params.push(`category=${encodeURIComponent(category)}`);
      if (query) params.push(`search=${encodeURIComponent(query)}`);
      path += params.join("&");
      const filtered = await apiGet(path);
      renderAllProducts(filtered);
    } catch (err) {
      let filtered = products;
      if (category !== "all") filtered = filtered.filter(p => p.category === category);
      if (query) {
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.seller.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        );
      }
      renderAllProducts(filtered);
    }
  }

  searchInput?.addEventListener("input", applyFilters);
  categoryFilter?.addEventListener("change", applyFilters);
}

// ===== Product Modal =====
function openProductModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const imageContent = product.image
    ? `<img src="${product.image}" alt="${escapeHtml(product.name)}"
         onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\' style=\\'font-size:4rem\\'>📦</div>'" />`
    : `<div class="placeholder" style="font-size:4rem">📦</div>`;

  document.getElementById("modalBody").innerHTML = `
    <div class="modal-image">${imageContent}</div>
    <div class="modal-info">
      <div class="product-category">${escapeHtml(product.category)}</div>
      <h2>${escapeHtml(product.name)}</h2>
      <div class="product-seller">Sold by ${escapeHtml(product.seller)}</div>
      <div class="product-price">${formatMoney(product.price)}</div>
      <p class="modal-description">${escapeHtml(product.description)}</p>
      <button class="btn btn-whatsapp" onclick="buyOnWhatsApp(${product.id})">
        💬 Buy via WhatsApp
      </button>
    </div>
  `;

  document.getElementById("productModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("productModal").classList.add("hidden");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeAuthModal();
  }
});

// ===== WhatsApp Order =====
function buyOnWhatsApp_OLD(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const message = `Hi! I'd like to order this item from SunGarland:

*${product.name}*
Price: ${formatMoney(product.price)}
Seller: ${product.seller}

Please let me know about availability, payment, and delivery options. Thank you!`;

  const encoded = encodeURIComponent(message);
  const phone = String(product.whatsapp).replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
}

// ===== List Product Form =====
function setupListForm() {
  const form = document.getElementById("listProductForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentSeller) {
      openAuthModal("login");
      return;
    }

    const payload = {
      name: document.getElementById("productName").value.trim(),
      price: parseFloat(document.getElementById("productPrice").value),
      category: document.getElementById("productCategory").value,
      description: document.getElementById("productDescription").value.trim(),
      image: document.getElementById("productImage").value.trim() || null,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Listing...";
    submitBtn.disabled = true;

    try {
      const newProduct = await apiPost("/products", payload, true);
      products.unshift(newProduct);
      renderFeatured();
      renderAllProducts();
      await populateCategories();
      form.reset();
      const success = document.getElementById("listSuccess");
      success.classList.remove("hidden");
      setTimeout(() => success.classList.add("hidden"), 4000);
    } catch (err) {
      alert("Failed to list product: " + err.message);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ===== Helpers =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== Admin =====
let adminAuthenticated = false;

function adminLogin() {
  const password = document.getElementById("adminPassword").value.trim();
  const errorEl = document.getElementById("adminError");
  
  if (!password) {
    errorEl.textContent = "Please enter the admin password";
    errorEl.classList.remove("hidden");
    return;
  }

  // Store temporarily and try to load
  sessionStorage.setItem("wm_admin_key", password);
  loadSellers();
}

async function loadSellers() {
  const key = sessionStorage.getItem("wm_admin_key");
  const errorEl = document.getElementById("adminError");
  const loginBox = document.getElementById("adminLoginBox");
  const content = document.getElementById("adminContent");
  const table = document.getElementById("sellersTable");

  if (!key) {
    loginBox.classList.remove("hidden");
    content.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/sellers`, {
      headers: { "X-Admin-Key": key }
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Invalid admin password");
    }

    const sellers = await res.json();
    adminAuthenticated = true;
    
    loginBox.classList.add("hidden");
    content.classList.remove("hidden");
    errorEl.classList.add("hidden");

    if (sellers.length === 0) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No sellers registered yet.</p>`;
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">ID</th>
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">Shop Name</th>
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">Email</th>
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">WhatsApp</th>
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">Status</th>
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">Joined</th>
            <th style="padding:0.9rem 1rem;font-size:0.85rem;">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    sellers.forEach((s, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
      const date = s.created_at ? new Date(s.created_at).toLocaleDateString() : "—";
      const isBlocked = s.is_blocked == 1 || s.is_blocked === true;
      const statusBadge = isBlocked
        ? `<span style="background:#fee2e2;color:#b91c1c;padding:0.25rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:600;">Blocked</span>`
        : `<span style="background:#d1fae5;color:#065f46;padding:0.25rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:600;">Active</span>`;
      
      const actionBtn = isBlocked
        ? `<button class="btn btn-sm btn-primary" onclick="toggleBlockSeller(${s.id}, false)" style="padding:0.35rem 0.75rem;font-size:0.8rem;">Unblock</button>`
        : `<button class="btn btn-sm" onclick="toggleBlockSeller(${s.id}, true)" style="padding:0.35rem 0.75rem;font-size:0.8rem;background:#ef4444;color:white;">Block</button>`;

      html += `
        <tr style="background:${bg};border-top:1px solid #e5e7eb;">
          <td style="padding:0.85rem 1rem;font-size:0.9rem;">${s.id}</td>
          <td style="padding:0.85rem 1rem;font-size:0.9rem;font-weight:600;">${escapeHtml(s.shop_name)}<br><span style="font-weight:400;color:#6b7280;font-size:0.8rem;">@${escapeHtml(s.username)}</span></td>
          <td style="padding:0.85rem 1rem;font-size:0.9rem;">${escapeHtml(s.email)}</td>
          <td style="padding:0.85rem 1rem;font-size:0.9rem;">
            <a href="https://wa.me/${s.whatsapp}" target="_blank" style="color:#25D366;font-weight:500;">${s.whatsapp}</a>
          </td>
          <td style="padding:0.85rem 1rem;">${statusBadge}</td>
          <td style="padding:0.85rem 1rem;font-size:0.9rem;color:#6b7280;">${date}</td>
          <td style="padding:0.85rem 1rem;">${actionBtn}</td>
        </tr>
      `;
    });

    html += `</tbody></table>
      <p style="margin-top:1rem;font-size:0.85rem;color:#6b7280;">Total sellers: <strong>${sellers.length}</strong></p>
    `;
    table.innerHTML = html;

  } catch (err) {
    sessionStorage.removeItem("wm_admin_key");
    adminAuthenticated = false;
    loginBox.classList.remove("hidden");
    content.classList.add("hidden");
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  }
}

async function toggleBlockSeller(sellerId, shouldBlock) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;

  const action = shouldBlock ? "block" : "unblock";
  const confirmMsg = shouldBlock 
    ? "Are you sure you want to BLOCK this seller? They will not be able to login or list products."
    : "Are you sure you want to UNBLOCK this seller?";

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/sellers/${sellerId}/${action}`, {
      method: "POST",
      headers: { "X-Admin-Key": key }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Action failed");
    }

    // Refresh the table
    loadSellers();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Show admin link only if needed (optional - we can always show it)
document.addEventListener("DOMContentLoaded", () => {
  const adminLink = document.getElementById("adminNavLink");
  if (adminLink) adminLink.style.display = "inline";
});

// ===== Seller KYC =====
async function checkKycStatus() {
  const box = document.getElementById("kycStatusBox");
  const form = document.getElementById("kycForm");
  if (!box) return;

  if (!currentSeller) {
    box.innerHTML = `<p style="color:#92400e;">Please <a href="#" onclick="openAuthModal('login');return false;" style="font-weight:600;">Login</a> or <a href="#" onclick="openAuthModal('register');return false;" style="font-weight:600;">Register</a> first to complete KYC.</p>`;
    form?.classList.add("hidden");
    return;
  }

  try {
    const status = await apiGet("/kyc/status", true);
    const kyc = status.kyc_status || "none";

    if (kyc === "approved") {
      box.innerHTML = `<div style="background:#d1fae5;color:#065f46;padding:1rem;border-radius:8px;">
        ✅ <strong>Verified</strong> — Your KYC is approved. You can now list products.
      </div>`;
      form?.classList.add("hidden");
    } else if (kyc === "pending") {
      box.innerHTML = `<div style="background:#fef3c7;color:#92400e;padding:1rem;border-radius:8px;">
        ⏳ <strong>Pending Review</strong> — Your documents are being reviewed by our team. This usually takes 24–48 hours.
      </div>`;
      form?.classList.add("hidden");
    } else if (kyc === "rejected") {
      box.innerHTML = `<div style="background:#fee2e2;color:#b91c1c;padding:1rem;border-radius:8px;margin-bottom:1rem;">
        ❌ <strong>Rejected</strong> — Your previous submission was rejected. Please submit again with clearer documents.
      </div>`;
      form?.classList.remove("hidden");
    } else {
      box.innerHTML = `<div style="background:#e0f2fe;color:#075985;padding:1rem;border-radius:8px;margin-bottom:1rem;">
        📋 Please complete the form below to verify your identity before listing products.
      </div>`;
      form?.classList.remove("hidden");
    }
  } catch (err) {
    box.innerHTML = `<p style="color:#b91c1c;">Error loading KYC status: ${err.message}</p>`;
  }
}

document.getElementById("kycForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentSeller) return openAuthModal("login");

  const payload = {
    full_name: document.getElementById("kycFullName").value.trim(),
    id_number: document.getElementById("kycIdNumber").value.trim(),
    address: document.getElementById("kycAddress").value.trim(),
    id_document_url: document.getElementById("kycIdDoc").value.trim(),
    selfie_url: document.getElementById("kycSelfie").value.trim(),
  };

  try {
    await apiPost("/kyc/submit", payload, true);
    alert("KYC submitted successfully! Waiting for admin approval.");
    checkKycStatus();
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// Check KYC when entering the section
const originalShowSection = showSection;
showSection = function(sectionId) {
  originalShowSection(sectionId);
  if (sectionId === "kyc") checkKycStatus();
  if (sectionId === "sell") checkKycStatus(); // also remind on sell page
};

// ===== Buyer Verification =====
let pendingBuyProductId = null;

function buyOnWhatsApp(id) {
  // Check if buyer is already verified
  const buyerToken = localStorage.getItem("wm_buyer_token");
  if (buyerToken) {
    // Already verified → proceed to WhatsApp
    proceedToWhatsApp(id);
    return;
  }

  // Need verification first
  pendingBuyProductId = id;
  document.getElementById("buyerVerifyModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeBuyerModal() {
  document.getElementById("buyerVerifyModal").classList.add("hidden");
  document.body.style.overflow = "";
  pendingBuyProductId = null;
}

document.getElementById("buyerVerifyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("buyerError");
  errorEl.classList.add("hidden");

  const payload = {
    full_name: document.getElementById("buyerFullName").value.trim(),
    email: document.getElementById("buyerEmail").value.trim() || null,
    phone: document.getElementById("buyerPhone").value.trim() || null,
    selfie_url: document.getElementById("buyerSelfie").value.trim(),
  };

  try {
    const result = await apiPost("/buyer/verify", payload);
    localStorage.setItem("wm_buyer_token", result.buyer_token);
    localStorage.setItem("wm_buyer_name", result.full_name);
    closeBuyerModal();

    if (pendingBuyProductId) {
      proceedToWhatsApp(pendingBuyProductId);
      pendingBuyProductId = null;
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  }
});

function proceedToWhatsApp(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const buyerName = localStorage.getItem("wm_buyer_name") || "a verified buyer";
  const message = `Hi! I'd like to order this item from SunGarland:

*${product.name}*
Price: ${formatMoney(product.price)}
Seller: ${product.seller}

I am a verified buyer (${buyerName}).
Please let me know about availability, payment, and delivery options. Thank you!`;

  const encoded = encodeURIComponent(message);
  const phone = String(product.whatsapp).replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
}

// ===== Admin Tabs & KYC / Products =====
function showAdminTab(tab) {
  document.getElementById("adminTabSellers")?.classList.add("hidden");
  document.getElementById("adminTabKyc")?.classList.add("hidden");
  document.getElementById("adminTabProducts")?.classList.add("hidden");

  if (tab === "sellers") {
    document.getElementById("adminTabSellers")?.classList.remove("hidden");
    loadSellers();
  } else if (tab === "kyc") {
    document.getElementById("adminTabKyc")?.classList.remove("hidden");
    loadPendingKyc();
  } else if (tab === "products") {
    document.getElementById("adminTabProducts")?.classList.remove("hidden");
    loadAdminProducts();
  }
}

async function loadPendingKyc() {
  const key = (sessionStorage.getItem("wm_admin_key") || "").trim();
  const table = document.getElementById("kycTable");
  if (!table) return;
  if (!key) {
    table.innerHTML = `<p style="color:#b91c1c;padding:1rem;">Admin key missing. Log in to Admin again using Railway <code>ADMIN_SECRET</code>.</p>`;
    return;
  }

  try {
    // Header + query key for maximum compatibility
    const res = await fetch(`${API_BASE}/admin/kyc/pending?key=${encodeURIComponent(key)}`, {
      headers: { "X-Admin-Key": key }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized — admin password does not match Railway ADMIN_SECRET. Log in again.");
      }
      throw new Error(data.error || data.hint || `Failed to load (${res.status})`);
    }
    const list = Array.isArray(data) ? data : [];

    if (list.length === 0) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No pending KYC submissions.</p>`;
      return;
    }

    let html = `<div style="display:flex;flex-direction:column;gap:1rem;">`;
    list.forEach(s => {
      const face = (s.face_match_label || s.face_match_score != null)
        ? `<div><strong>Face match:</strong> ${escapeHtml(String(s.face_match_label || "—"))}${s.face_match_score != null ? ` (${s.face_match_score}%)` : ""}</div>`
        : "";
      html += `
        <div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <strong style="font-size:1.05rem;">${escapeHtml(s.shop_name)}</strong>
              <div style="font-size:0.85rem;color:#6b7280;">@${escapeHtml(s.username)} · ${escapeHtml(s.email)}</div>
              <div style="margin-top:0.5rem;font-size:0.9rem;">
                <div><strong>Name:</strong> ${escapeHtml(s.full_name || "—")}</div>
                <div><strong>ID Number:</strong> ${escapeHtml(s.id_number || "—")}</div>
                <div><strong>Address:</strong> ${escapeHtml(s.address || "—")}</div>
                ${face}
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-primary" onclick="reviewKyc(${s.id}, 'approve')">Approve</button>
              <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="reviewKyc(${s.id}, 'reject')">Reject</button>
            </div>
          </div>
          <div style="display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap;">
            ${s.id_document_url ? `<a href="${s.id_document_url}" target="_blank" style="color:#2563eb;font-size:0.9rem;">📄 View ID Document</a>` : ""}
            ${s.selfie_url ? `<a href="${s.selfie_url}" target="_blank" style="color:#2563eb;font-size:0.9rem;">🤳 View Selfie</a>` : ""}
          </div>
        </div>`;
    });
    html += `</div>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

async function reviewKyc(sellerId, action) {
  const key = (sessionStorage.getItem("wm_admin_key") || "").trim();
  if (!key) {
    alert("Admin key missing. Log in to Admin again.");
    return;
  }
  if (!confirm(`Are you sure you want to ${action.toUpperCase()} this KYC?`)) return;

  try {
    const res = await fetch(`${API_BASE}/admin/kyc/${sellerId}/${action}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "X-Admin-Key": key }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) throw new Error("Unauthorized — wrong ADMIN_SECRET");
      throw new Error(data.error || `Action failed (${res.status})`);
    }
    loadPendingKyc();
    if (typeof loadSellers === "function") loadSellers();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function loadAdminProducts() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("adminProductsTable");
  if (!key || !table) return;

  try {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Failed to load products");
    const list = await res.json();

    if (list.length === 0) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No products yet.</p>`;
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">ID</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Product</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Seller</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Price</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Action</th>
          </tr>
        </thead>
        <tbody>`;

    list.forEach((p, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
      html += `
        <tr style="background:${bg};border-top:1px solid #e5e7eb;">
          <td style="padding:0.75rem 1rem;font-size:0.9rem;">${p.id}</td>
          <td style="padding:0.75rem 1rem;font-size:0.9rem;font-weight:500;">${escapeHtml(p.name)}</td>
          <td style="padding:0.75rem 1rem;font-size:0.9rem;">${escapeHtml(p.seller)}</td>
          <td style="padding:0.75rem 1rem;font-size:0.9rem;">${formatMoney(p.price)}</td>
          <td style="padding:0.75rem 1rem;">
            <button class="btn btn-sm" style="background:#ef4444;color:white;padding:0.3rem 0.7rem;font-size:0.8rem;"
              onclick="adminDeleteProduct(${p.id})">Delete</button>
          </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

async function adminDeleteProduct(productId) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  if (!confirm("Delete this product permanently?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Delete failed");
    loadAdminProducts();
    // Also refresh public products
    await loadProducts();
    renderFeatured();
    renderAllProducts();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ===== Image Upload Helper =====
async function uploadImage(file) {
  if (!file) return null;

  // Basic validation
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

function setupImageUpload(fileInputId, hiddenInputId, previewId) {
  const fileInput = document.getElementById(fileInputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const preview = document.getElementById(previewId);
  if (!fileInput) return;

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    preview.innerHTML = `<span style="color:#6b7280;font-size:0.85rem;">Uploading...</span>`;

    try {
      const url = await uploadImage(file);
      hiddenInput.value = url;
      preview.innerHTML = `
        <img src="${url}" alt="Preview" style="max-width:160px;max-height:120px;border-radius:8px;border:1px solid #e5e7eb;" />
        <div style="font-size:0.8rem;color:#059669;margin-top:0.25rem;">✓ Uploaded successfully</div>
      `;
    } catch (err) {
      preview.innerHTML = `<span style="color:#b91c1c;font-size:0.85rem;">${err.message}</span>`;
      hiddenInput.value = "";
      fileInput.value = "";
    }
  });
}

// Initialize upload handlers when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setupImageUpload("kycIdDocFile", "kycIdDoc", "kycIdDocPreview");
  setupImageUpload("kycSelfieFile", "kycSelfie", "kycSelfiePreview");
  setupImageUpload("buyerSelfieFile", "buyerSelfie", "buyerSelfiePreview");
  setupImageUpload("productImageFile", "productImage", "productImagePreview");
});

// ===== Product Video Upload =====
document.addEventListener("DOMContentLoaded", () => {
  setupImageUpload("productVideoFile", "productVideo", "productVideoPreview");
});

// Override list form to include video_url
const originalListFormSetup = setupListForm;
// We patch the submit handler by re-binding

document.getElementById("listProductForm")?.addEventListener("submit", async function(e) {
  // This runs in addition - we need to make sure video is included
  // The existing handler already reads productImage. We'll ensure video is sent.
}, true);

// Patch: update the existing form submit to include video
(function patchListForm() {
  const form = document.getElementById("listProductForm");
  if (!form) return;

  // Remove old listeners by cloning
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentSeller) {
      openAuthModal("login");
      return;
    }

    const payload = {
      name: document.getElementById("productName").value.trim(),
      price: parseFloat(document.getElementById("productPrice").value),
      category: document.getElementById("productCategory").value,
      description: document.getElementById("productDescription").value.trim(),
      image: document.getElementById("productImage").value.trim() || null,
      video_url: document.getElementById("productVideo")?.value.trim() || null,
    };

    const submitBtn = newForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Listing...";
    submitBtn.disabled = true;

    try {
      const newProduct = await apiPost("/products", payload, true);
      products.unshift(newProduct);
      renderFeatured();
      renderAllProducts();
      await populateCategories();
      newForm.reset();
      document.getElementById("productImagePreview").innerHTML = "";
      document.getElementById("productVideoPreview").innerHTML = "";
      document.getElementById("productImage").value = "";
      if (document.getElementById("productVideo")) document.getElementById("productVideo").value = "";
      const success = document.getElementById("listSuccess");
      success.classList.remove("hidden");
      setTimeout(() => success.classList.add("hidden"), 4000);
    } catch (err) {
      alert("Failed to list product: " + err.message);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Re-setup image uploads after clone
  setupImageUpload("productImageFile", "productImage", "productImagePreview");
  setupImageUpload("productVideoFile", "productVideo", "productVideoPreview");
})();


// ===== Enhanced Product Detail Modal =====
async function openProductModal(id) {
  const modal = document.getElementById("productModal");
  const body = document.getElementById("modalBody");
  body.innerHTML = `<div style="padding:2rem;text-align:center;color:#6b7280;">Loading product details...</div>`;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  try {
    const product = await apiGet(`/products/${id}/details`);
    renderProductDetails(product);
  } catch (err) {
    // Fallback to local product data
    const product = products.find(p => p.id === id);
    if (product) {
      product.average_rating = 0;
      product.rating_count = 0;
      product.ratings = [];
      product.comments = [];
      renderProductDetails(product);
    } else {
      body.innerHTML = `<div style="padding:2rem;color:#b91c1c;">Failed to load product.</div>`;
    }
  }
}

function renderProductDetails(product) {
  const body = document.getElementById("modalBody");
  const stars = renderStars(product.average_rating || 0);
  const ratingText = product.rating_count
    ? `${product.average_rating} / 5 (${product.rating_count} rating${product.rating_count > 1 ? "s" : ""})`
    : "No ratings yet";

  let mediaHtml = "";
  if (product.image) {
    mediaHtml += `<img src="${product.image}" alt="${escapeHtml(product.name)}" style="width:100%;max-height:280px;object-fit:cover;" onerror="this.style.display='none'" />`;
  }
  if (product.video_url) {
    mediaHtml += `
      <video controls style="width:100%;max-height:280px;background:#000;margin-top:${product.image ? "0.5rem" : "0"};">
        <source src="${product.video_url}" />
        Your browser does not support video.
      </video>`;
  }
  if (!mediaHtml) {
    mediaHtml = `<div style="height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:3rem;">📦</div>`;
  }

  let commentsHtml = "";
  if (product.comments && product.comments.length) {
    commentsHtml = product.comments.map(c => `
      <div style="border-bottom:1px solid #e5e7eb;padding:0.75rem 0;">
        <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(c.author_name)}</div>
        <div style="font-size:0.85rem;color:#6b7280;margin:0.15rem 0;">${c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</div>
        <div style="font-size:0.95rem;margin-top:0.25rem;">${escapeHtml(c.comment)}</div>
      </div>
    `).join("");
  } else {
    commentsHtml = `<p style="color:#6b7280;font-size:0.9rem;">No comments yet. Be the first!</p>`;
  }

  body.innerHTML = `
    <div class="modal-image" style="background:#f3f4f6;">${mediaHtml}</div>
    <div class="modal-info">
      <div class="product-category">${escapeHtml(product.category)}</div>
      <h2>${escapeHtml(product.name)}</h2>
      <div class="product-seller">Sold by ${escapeHtml(product.seller)}</div>
      <div class="product-price">${formatMoney(product.price)}</div>
      
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
        <span style="color:#f59e0b;letter-spacing:1px;">${stars}</span>
        <span style="font-size:0.9rem;color:#6b7280;">${ratingText}</span>
      </div>

      <p class="modal-description">${escapeHtml(product.description)}</p>

      <button class="btn btn-whatsapp" onclick="buyOnWhatsApp(${product.id})">
        💬 Buy via WhatsApp
      </button>

      <!-- Rating Form -->
      <div style="margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid #e5e7eb;">
        <h3 style="font-size:1rem;margin-bottom:0.75rem;">Rate this product</h3>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <select id="ratingValue" style="padding:0.5rem;border-radius:6px;border:1px solid #d1d5db;">
            <option value="5">★★★★★ 5</option>
            <option value="4">★★★★ 4</option>
            <option value="3">★★★ 3</option>
            <option value="2">★★ 2</option>
            <option value="1">★ 1</option>
          </select>
          <input type="text" id="ratingAuthor" placeholder="Your name" style="padding:0.5rem;border-radius:6px;border:1px solid #d1d5db;flex:1;min-width:120px;" />
          <button class="btn btn-primary btn-sm" onclick="submitRating(${product.id})">Submit Rating</button>
        </div>
      </div>

      <!-- Comment Form -->
      <div style="margin-top:1.5rem;">
        <h3 style="font-size:1rem;margin-bottom:0.75rem;">Leave a comment</h3>
        <textarea id="commentText" rows="2" placeholder="Write your comment..." style="width:100%;padding:0.6rem;border-radius:8px;border:1px solid #d1d5db;font-family:inherit;margin-bottom:0.5rem;"></textarea>
        <div style="display:flex;gap:0.5rem;">
          <input type="text" id="commentAuthor" placeholder="Your name" style="padding:0.5rem;border-radius:6px;border:1px solid #d1d5db;flex:1;" />
          <button class="btn btn-primary btn-sm" onclick="submitComment(${product.id})">Post</button>
        </div>
      </div>

      <!-- Comments List -->
      <div style="margin-top:1.5rem;">
        <h3 style="font-size:1rem;margin-bottom:0.75rem;">Comments (${product.comments?.length || 0})</h3>
        <div id="commentsList">${commentsHtml}</div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "★".repeat(full);
  if (half) stars += "½";
  stars += "☆".repeat(5 - full - (half ? 1 : 0));
  return stars || "☆☆☆☆☆";
}

async function submitRating(productId) {
  const rating = document.getElementById("ratingValue").value;
  const author = document.getElementById("ratingAuthor").value.trim() || "Anonymous";
  try {
    await apiPost(`/products/${productId}/ratings`, { rating: Number(rating), author_name: author });
    alert("Thank you for your rating!");
    openProductModal(productId); // refresh
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function submitComment(productId) {
  const comment = document.getElementById("commentText").value.trim();
  const author = document.getElementById("commentAuthor").value.trim() || "Anonymous";
  if (!comment) return alert("Please write a comment");
  try {
    await apiPost(`/products/${productId}/comments`, { comment, author_name: author });
    openProductModal(productId); // refresh
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ===== Better KYC Previews in Admin =====
async function loadPendingKyc() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("kycTable");
  if (!key || !table) return;

  try {
    const res = await fetch(`${API_BASE}/admin/kyc/pending`, {
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Failed to load");
    const list = await res.json();

    if (list.length === 0) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No pending KYC submissions.</p>`;
      return;
    }

    let html = `<div style="display:flex;flex-direction:column;gap:1.25rem;">`;
    list.forEach(s => {
      html += `
        <div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <strong style="font-size:1.1rem;">${escapeHtml(s.shop_name)}</strong>
              <div style="font-size:0.85rem;color:#6b7280;">@${escapeHtml(s.username)} · ${escapeHtml(s.email)}</div>
              <div style="margin-top:0.6rem;font-size:0.9rem;line-height:1.6;">
                <div><strong>Full Name:</strong> ${escapeHtml(s.full_name || "—")}</div>
                <div><strong>ID Number:</strong> ${escapeHtml(s.id_number || "—")}</div>
                <div><strong>Address:</strong> ${escapeHtml(s.address || "—")}</div>
                <div><strong>WhatsApp:</strong> <a href="https://wa.me/${s.whatsapp}" target="_blank" style="color:#25D366;">${s.whatsapp}</a></div>
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-primary" onclick="reviewKyc(${s.id}, 'approve')">✓ Approve</button>
              <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="reviewKyc(${s.id}, 'reject')">✗ Reject</button>
            </div>
          </div>
          <div style="display:flex;gap:1.25rem;margin-top:1.25rem;flex-wrap:wrap;">
            ${s.id_document_url ? `
              <div>
                <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;color:#374151;">ID Document</div>
                <a href="${s.id_document_url}" target="_blank">
                  <img src="${s.id_document_url}" alt="ID Document" 
                    style="max-width:220px;max-height:160px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;" />
                </a>
              </div>` : ""}
            ${s.selfie_url ? `
              <div>
                <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;color:#374151;">Face Selfie</div>
                <a href="${s.selfie_url}" target="_blank">
                  <img src="${s.selfie_url}" alt="Selfie" 
                    style="max-width:220px;max-height:160px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;" />
                </a>
              </div>` : ""}
          </div>
        </div>`;
    });
    html += `</div>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

// ===== Enhanced Search & Filters =====
function setupSearchAndFilter() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const minPrice = document.getElementById("minPrice");
  const maxPrice = document.getElementById("maxPrice");

  async function applyFilters() {
    const query = searchInput?.value.trim() || "";
    const category = categoryFilter?.value || "all";
    const sort = sortFilter?.value || "newest";
    const minP = minPrice?.value || "";
    const maxP = maxPrice?.value || "";

    try {
      const params = [];
      if (category !== "all") params.push(`category=${encodeURIComponent(category)}`);
      if (query) params.push(`search=${encodeURIComponent(query)}`);
      if (sort) params.push(`sort=${encodeURIComponent(sort)}`);
      if (minP) params.push(`min_price=${encodeURIComponent(minP)}`);
      if (maxP) params.push(`max_price=${encodeURIComponent(maxP)}`);
      const path = "/products?" + params.join("&");
      const filtered = await apiGet(path);
      renderAllProducts(filtered);
    } catch (err) {
      let filtered = [...products];
      if (category !== "all") filtered = filtered.filter(p => p.category === category);
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.seller || "").toLowerCase().includes(q)
        );
      }
      if (minP) filtered = filtered.filter(p => p.price >= parseFloat(minP));
      if (maxP) filtered = filtered.filter(p => p.price <= parseFloat(maxP));
      if (sort === "price_asc") filtered.sort((a, b) => a.price - b.price);
      else if (sort === "price_desc") filtered.sort((a, b) => b.price - a.price);
      else if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
      renderAllProducts(filtered);
    }
  }

  searchInput?.addEventListener("input", applyFilters);
  categoryFilter?.addEventListener("change", applyFilters);
  sortFilter?.addEventListener("change", applyFilters);
  minPrice?.addEventListener("change", applyFilters);
  maxPrice?.addEventListener("change", applyFilters);
}

// Re-init filters
document.addEventListener("DOMContentLoaded", () => {
  setupSearchAndFilter();
});

// ===== Seller Profile =====
async function openSellerProfile(sellerId) {
  showSection("sellerProfile");
  const container = document.getElementById("sellerProfileContent");
  container.innerHTML = `<p style="color:#6b7280;">Loading...</p>`;

  try {
    const seller = await apiGet(`/sellers/${sellerId}`);
    const stars = renderStars(seller.average_rating || 0);

    let productsHtml = "";
    if (seller.products && seller.products.length) {
      productsHtml = `<div class="products-grid" style="margin-top:1.5rem;">${seller.products.map(createProductCard).join("")}</div>`;
    } else {
      productsHtml = `<p style="color:#6b7280;margin-top:1rem;">This seller has no products yet.</p>`;
    }

    container.innerHTML = `
      <div style="background:white;border-radius:16px;padding:1.75rem;box-shadow:0 4px 20px rgba(0,0,0,0.06);margin-bottom:1.5rem;">
        <h2 style="font-size:1.5rem;margin-bottom:0.35rem;">${escapeHtml(seller.shop_name)}</h2>
        <div style="color:#6b7280;font-size:0.95rem;margin-bottom:0.75rem;">@${escapeHtml(seller.username)}</div>
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.95rem;">
          <div><strong>${seller.product_count}</strong> products</div>
          <div><span style="color:#f59e0b;">${stars}</span> ${seller.average_rating || 0}/5 (${seller.rating_count || 0} ratings)</div>
          <div>Member since ${seller.created_at ? new Date(seller.created_at).toLocaleDateString() : "—"}</div>
          ${seller.kyc_status === "approved" ? `<div style="color:#059669;font-weight:600;">✓ Verified Seller</div>` : ""}
        </div>
        ${seller.whatsapp ? `<a href="https://wa.me/${seller.whatsapp}" target="_blank" class="btn btn-primary btn-sm" style="margin-top:1rem;display:inline-flex;">💬 Contact on WhatsApp</a>` : ""}
      </div>
      <h3 style="font-size:1.2rem;margin-bottom:0.75rem;">Products by ${escapeHtml(seller.shop_name)}</h3>
      ${productsHtml}
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c;">Could not load seller profile: ${err.message}</p>`;
  }
}

// Make seller name clickable in product cards
function createProductCard(product) {
  const imageContent = product.image
    ? `<img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'>📦</div>'" />`
    : `<div class="placeholder">📦</div>`;

  const sellerLink = product.seller_id
    ? `<a href="#" onclick="openSellerProfile(${product.seller_id});return false;" style="color:#2563eb;font-weight:500;">${escapeHtml(product.seller)}</a>`
    : escapeHtml(product.seller);

  return `
    <article class="product-card">
      <div class="product-image">
        ${imageContent}
        <span class="product-badge">${escapeHtml(product.category)}</span>
      </div>
      <div class="product-body">
        <div class="product-category">${escapeHtml(product.category)}</div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <div class="product-seller">by ${sellerLink}</div>
        <div class="product-price">${formatMoney(product.price)}</div>
        <div class="product-actions">
          <button class="btn btn-outline btn-sm" onclick="openProductModal(${product.id})">Details</button>
          <button class="btn btn-primary btn-sm" onclick="buyOnWhatsApp(${product.id})">Buy</button>
        </div>
      </div>
    </article>
  `;
}

// ===== Seller Dashboard =====
async function loadDashboard() {
  const container = document.getElementById("dashboardContent");
  if (!container) return;

  if (!currentSeller) {
    container.innerHTML = `<p style="text-align:center;color:#6b7280;">Please <a href="#" onclick="openAuthModal('login');return false;" style="font-weight:600;color:#25D366;">Login</a> to view your dashboard.</p>`;
    return;
  }

  container.innerHTML = `<p style="color:#6b7280;">Loading your products...</p>`;

  try {
    const myProducts = await apiGet("/my/products", true);

    if (!myProducts.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:2rem;background:white;border-radius:12px;">
          <p style="color:#6b7280;margin-bottom:1rem;">You haven't listed any products yet.</p>
          <button class="btn btn-primary" onclick="showSection('sell')">List Your First Product</button>
        </div>`;
      return;
    }

    let html = `
      <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <div style="font-size:0.95rem;color:#6b7280;">You have <strong>${myProducts.length}</strong> product${myProducts.length > 1 ? "s" : ""}</div>
        <button class="btn btn-primary btn-sm" onclick="showSection('sell')">+ Add New Product</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">`;

    myProducts.forEach(p => {
      html += `
        <div style="background:white;border-radius:12px;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="display:flex;align-items:center;gap:1rem;">
            ${p.image ? `<img src="${p.image}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />` : `<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;">📦</div>`}
            <div>
              <div style="font-weight:600;">${escapeHtml(p.name)}</div>
              <div style="font-size:0.85rem;color:#6b7280;">${formatMoney(p.price)} · ${escapeHtml(p.category)}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">View</button>
            <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="deleteMyProduct(${p.id})">Delete</button>
          </div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

async function deleteMyProduct(id) {
  if (!confirm("Delete this product permanently?")) return;
  try {
    await fetch(`${API_BASE}/my/products/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem("wm_token")}` }
    }).then(r => {
      if (!r.ok) throw new Error("Delete failed");
    });
    loadDashboard();
    await loadProducts();
    renderFeatured();
    renderAllProducts();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Hook dashboard into showSection
const _origShow = showSection;
showSection = function(id) {
  _origShow(id);
  if (id === "dashboard") loadDashboard();
  if (id === "kyc") checkKycStatus();
};

// ===== Log inquiries when buying =====
const _origProceed = typeof proceedToWhatsApp === "function" ? proceedToWhatsApp : null;

async function proceedToWhatsApp(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const buyerName = localStorage.getItem("wm_buyer_name") || "Anonymous";

  // Log the inquiry (fire and forget)
  try {
    await apiPost("/inquiries", {
      product_id: product.id,
      product_name: product.name,
      seller_name: product.seller,
      buyer_name: buyerName
    });
  } catch (e) { /* ignore */ }

  const message = `Hi! I'd like to order this item from SunGarland:

*${product.name}*
Price: ${formatMoney(product.price)}
Seller: ${product.seller}

I am a verified buyer (${buyerName}).
Please let me know about availability, payment, and delivery options. Thank you!`;

  const encoded = encodeURIComponent(message);
  const phone = String(product.whatsapp).replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
}

// ===== Admin Inquiries =====
function showAdminTab(tab) {
  ["sellers", "kyc", "products", "inquiries"].forEach(t => {
    const el = document.getElementById("adminTab" + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.classList.add("hidden");
  });

  const map = { sellers: "Sellers", kyc: "Kyc", products: "Products", inquiries: "Inquiries" };
  const el = document.getElementById("adminTab" + map[tab]);
  if (el) el.classList.remove("hidden");

  if (tab === "sellers") loadSellers();
  else if (tab === "kyc") loadPendingKyc();
  else if (tab === "products") loadAdminProducts();
  else if (tab === "inquiries") loadInquiries();
}

async function loadInquiries() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("inquiriesTable");
  if (!key || !table) return;

  try {
    const res = await fetch(`${API_BASE}/admin/inquiries`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed");
    const list = await res.json();

    if (!list.length) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No buy inquiries yet.</p>`;
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Date</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Product</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Seller</th>
            <th style="padding:0.75rem 1rem;font-size:0.85rem;">Buyer</th>
          </tr>
        </thead>
        <tbody>`;
    list.forEach((inq, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
      const date = inq.created_at ? new Date(inq.created_at).toLocaleString() : "—";
      html += `
        <tr style="background:${bg};border-top:1px solid #e5e7eb;">
          <td style="padding:0.75rem 1rem;font-size:0.85rem;color:#6b7280;">${date}</td>
          <td style="padding:0.75rem 1rem;font-size:0.9rem;font-weight:500;">${escapeHtml(inq.product_name || "—")}</td>
          <td style="padding:0.75rem 1rem;font-size:0.9rem;">${escapeHtml(inq.seller_name || "—")}</td>
          <td style="padding:0.75rem 1rem;font-size:0.9rem;">${escapeHtml(inq.buyer_name || "Anonymous")}</td>
        </tr>`;
    });
    html += `</tbody></table>
      <p style="margin-top:0.75rem;font-size:0.85rem;color:#6b7280;">Showing latest ${list.length} inquiries</p>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

// ===== Subscription System =====
async function loadSubscriptionStatus() {
  if (!currentSeller) return null;
  try {
    return await apiGet("/subscription/status", true);
  } catch (e) {
    return null;
  }
}

async function renewSubscription() {
  if (!currentSeller) return openAuthModal("login");

  try {
    const sub = await loadSubscriptionStatus();
    const currency = sub?.currency || "GHS";
    const price = sub?.price || (sub?.is_first_time ? 50 : 100);
    const label = sub?.is_first_time ? "first-time subscription" : "renewal";
    if (!confirm(`Pay ${currency} ${Number(price).toFixed(2)} for 30 days (${label}) via Paystack?`)) return;

    const result = await apiPost("/subscription/pay/initialize", {
      callback_url: window.location.origin + window.location.pathname + "?sub_ref=1"
    }, true);
    window.location.href = result.authorization_url;
  } catch (err) {
    // Fallback: free renew only if payments disabled
    if (String(err.message).includes("not enabled") || String(err.message).includes("not configured")) {
      if (confirm("Paystack is not enabled. Activate subscription without payment (demo mode)?")) {
        try {
          const result = await apiPost("/subscription/renew", {}, true);
          alert("Subscription activated until " + new Date(result.expires_at).toLocaleDateString());
          loadDashboard();
        } catch (e2) {
          alert(e2.message);
        }
      }
      return;
    }
    alert("Payment failed: " + err.message);
  }
}

// Enhance dashboard to show subscription status
const _origLoadDashboard = typeof loadDashboard === "function" ? loadDashboard : null;

async function loadDashboard() {
  const container = document.getElementById("dashboardContent");
  if (!container) return;

  if (!currentSeller) {
    container.innerHTML = `<p style="text-align:center;color:#6b7280;">Please <a href="#" onclick="openAuthModal('login');return false;" style="font-weight:600;color:#25D366;">Login</a> to view your dashboard.</p>`;
    return;
  }

  container.innerHTML = `<p style="color:#6b7280;">Loading...</p>`;

  try {
    const [myProducts, sub] = await Promise.all([
      apiGet("/my/products", true),
      loadSubscriptionStatus()
    ]);

    let subHtml = "";
    if (sub) {
      const active = sub.active;
      const expDate = sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—";
      const days = sub.days_left != null ? sub.days_left : "—";

      if (active) {
        subHtml = `
          <div style="background:#d1fae5;color:#065f46;padding:1rem 1.25rem;border-radius:10px;margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <strong>✓ Subscription Active</strong>
              <div style="font-size:0.9rem;margin-top:0.2rem;">Expires: ${expDate} · ${days} day${days !== 1 ? "s" : ""} left</div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="renewSubscription()">Renew early (+30 days)</button>
          </div>`;
      } else {
        subHtml = `
          <div style="background:#fee2e2;color:#b91c1c;padding:1rem 1.25rem;border-radius:10px;margin-bottom:1.25rem;">
            <strong>⚠ Subscription Expired</strong>
            <div style="font-size:0.9rem;margin-top:0.35rem;margin-bottom:0.75rem;">
              Your products are hidden from the marketplace. Renew to make them visible again and to list new products.
            </div>
            <button class="btn btn-sm btn-primary" onclick="renewSubscription()">Renew Subscription (30 days)</button>
          </div>`;
      }
    }

    if (!myProducts.length) {
      container.innerHTML = subHtml + `
        <div style="text-align:center;padding:2rem;background:white;border-radius:12px;">
          <p style="color:#6b7280;margin-bottom:1rem;">You haven't listed any products yet.</p>
          <button class="btn btn-primary" onclick="showSection('sell')">List Your First Product</button>
        </div>`;
      return;
    }

    let html = subHtml + `
      <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <div style="font-size:0.95rem;color:#6b7280;">You have <strong>${myProducts.length}</strong> product${myProducts.length > 1 ? "s" : ""}</div>
        <button class="btn btn-primary btn-sm" onclick="showSection('sell')">+ Add New Product</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">`;

    myProducts.forEach(p => {
      html += `
        <div style="background:white;border-radius:12px;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="display:flex;align-items:center;gap:1rem;">
            ${p.image ? `<img src="${p.image}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />` : `<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;">📦</div>`}
            <div>
              <div style="font-weight:600;">${escapeHtml(p.name)}</div>
              <div style="font-size:0.85rem;color:#6b7280;">${formatMoney(p.price)} · ${escapeHtml(p.category)}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">View</button>
            <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="deleteMyProduct(${p.id})">Delete</button>
          </div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

// Admin: show subscription status + Extend button in sellers table
// Patch loadSellers to include subscription info
const _origLoadSellers = typeof loadSellers === "function" ? loadSellers : null;

async function loadSellers() {
  const key = sessionStorage.getItem("wm_admin_key");
  const errorEl = document.getElementById("adminError");
  const loginBox = document.getElementById("adminLoginBox");
  const content = document.getElementById("adminContent");
  const table = document.getElementById("sellersTable");

  if (!key) {
    loginBox?.classList.remove("hidden");
    content?.classList.add("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/sellers`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Invalid admin password");
    }

    const sellers = await res.json();
    adminAuthenticated = true;
    loginBox?.classList.add("hidden");
    content?.classList.remove("hidden");
    errorEl?.classList.add("hidden");

    if (sellers.length === 0) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No sellers registered yet.</p>`;
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:0.75rem 0.9rem;font-size:0.8rem;">Shop</th>
            <th style="padding:0.75rem 0.9rem;font-size:0.8rem;">Email</th>
            <th style="padding:0.75rem 0.9rem;font-size:0.8rem;">KYC</th>
            <th style="padding:0.75rem 0.9rem;font-size:0.8rem;">Subscription</th>
            <th style="padding:0.75rem 0.9rem;font-size:0.8rem;">Status</th>
            <th style="padding:0.75rem 0.9rem;font-size:0.8rem;">Actions</th>
          </tr>
        </thead>
        <tbody>`;

    const now = new Date();
    sellers.forEach((s, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
      const isBlocked = s.is_blocked == 1 || s.is_blocked === true;
      const statusBadge = isBlocked
        ? `<span style="background:#fee2e2;color:#b91c1c;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:600;">Blocked</span>`
        : `<span style="background:#d1fae5;color:#065f46;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:600;">Active</span>`;

      let subBadge = `<span style="color:#6b7280;font-size:0.8rem;">No plan</span>`;
      let subActive = false;
      if (s.subscription_expires_at) {
        const exp = new Date(s.subscription_expires_at);
        subActive = exp > now;
        subBadge = subActive
          ? `<span style="background:#d1fae5;color:#065f46;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:600;">Until ${exp.toLocaleDateString()}</span>`
          : `<span style="background:#fee2e2;color:#b91c1c;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:600;">Expired</span>`;
      }

      const kycBadge = {
        approved: `<span style="color:#059669;font-size:0.8rem;font-weight:600;">Approved</span>`,
        pending: `<span style="color:#d97706;font-size:0.8rem;font-weight:600;">Pending</span>`,
        rejected: `<span style="color:#b91c1c;font-size:0.8rem;font-weight:600;">Rejected</span>`,
      }[s.kyc_status] || `<span style="color:#6b7280;font-size:0.8rem;">None</span>`;

      const blockBtn = isBlocked
        ? `<button class="btn btn-sm btn-primary" onclick="toggleBlockSeller(${s.id}, false)" style="padding:0.3rem 0.6rem;font-size:0.75rem;">Unblock</button>`
        : `<button class="btn btn-sm" onclick="toggleBlockSeller(${s.id}, true)" style="padding:0.3rem 0.6rem;font-size:0.75rem;background:#ef4444;color:white;">Block</button>`;

      html += `
        <tr style="background:${bg};border-top:1px solid #e5e7eb;">
          <td style="padding:0.75rem 0.9rem;font-size:0.9rem;">
            <strong>${escapeHtml(s.shop_name)}</strong><br>
            <span style="font-size:0.8rem;color:#6b7280;">@${escapeHtml(s.username)}</span>
          </td>
          <td style="padding:0.75rem 0.9rem;font-size:0.85rem;">${escapeHtml(s.email)}</td>
          <td style="padding:0.75rem 0.9rem;">${kycBadge}</td>
          <td style="padding:0.75rem 0.9rem;">${subBadge}</td>
          <td style="padding:0.75rem 0.9rem;">${statusBadge}</td>
          <td style="padding:0.75rem 0.9rem;">
            <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
              ${blockBtn}
              <button class="btn btn-sm btn-outline" onclick="adminExtendSub(${s.id})" style="padding:0.3rem 0.6rem;font-size:0.75rem;">+30 days</button>
            </div>
          </td>
        </tr>`;
    });

    html += `</tbody></table>
      <p style="margin-top:0.75rem;font-size:0.85rem;color:#6b7280;">Total sellers: <strong>${sellers.length}</strong></p>`;
    table.innerHTML = html;
  } catch (err) {
    sessionStorage.removeItem("wm_admin_key");
    adminAuthenticated = false;
    loginBox?.classList.remove("hidden");
    content?.classList.add("hidden");
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    }
  }
}

async function adminExtendSub(sellerId) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  if (!confirm("Extend this seller's subscription by 30 days?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/sellers/${sellerId}/extend`, {
      method: "POST",
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Failed");
    loadSellers();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ===== Subscription Pricing UI =====
async function renewSubscription() {
  if (!currentSeller) return openAuthModal("login");

  let priceText = "the subscription fee";
  try {
    const sub = await loadSubscriptionStatus();
    if (sub) {
      const currency = sub.currency || "GHS";
      const price = sub.price || (sub.is_first_time ? 50 : 100);
      priceText = `${currency} ${Number(price).toFixed(2)}`;
      const label = sub.is_first_time ? "first-time subscription" : "renewal";
      if (!confirm(`Pay ${priceText} for 30 days (${label})?\n\n(In production this would open a payment gateway.)`)) return;
    } else {
      if (!confirm("Renew your subscription for 30 days?")) return;
    }
  } catch (e) {
    if (!confirm("Renew your subscription for 30 days?")) return;
  }

  try {
    const result = await apiPost("/subscription/renew", {}, true);
    alert("Subscription activated successfully!\nValid until: " + new Date(result.expires_at).toLocaleDateString());
    loadDashboard();
  } catch (err) {
    alert("Renewal failed: " + err.message);
  }
}

// Override loadDashboard subscription banner to show price
async function loadDashboard() {
  const container = document.getElementById("dashboardContent");
  if (!container) return;

  if (!currentSeller) {
    container.innerHTML = `<p style="text-align:center;color:#6b7280;">Please <a href="#" onclick="openAuthModal('login');return false;" style="font-weight:600;color:#25D366;">Login</a> to view your dashboard.</p>`;
    return;
  }

  container.innerHTML = `<p style="color:#6b7280;">Loading...</p>`;

  try {
    const [myProducts, sub] = await Promise.all([
      apiGet("/my/products", true),
      loadSubscriptionStatus()
    ]);

    let subHtml = "";
    if (sub) {
      const currency = sub.currency || "GHS";
      const price = Number(sub.price || 0).toFixed(2);
      const priceLabel = sub.is_first_time
        ? `First subscription: ${currency} ${price}`
        : `Renewal: ${currency} ${price}`;
      const expDate = sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—";
      const days = sub.days_left != null ? sub.days_left : "—";

      if (sub.active) {
        subHtml = `
          <div style="background:#d1fae5;color:#065f46;padding:1rem 1.25rem;border-radius:10px;margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <strong>✓ Subscription Active</strong>
              <div style="font-size:0.9rem;margin-top:0.2rem;">Expires: ${expDate} · ${days} day${days !== 1 ? "s" : ""} left</div>
              <div style="font-size:0.85rem;margin-top:0.15rem;opacity:0.9;">Next renewal: ${currency} ${Number(sub.price_renewal || 100).toFixed(2)}</div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="renewSubscription()">Renew early — ${currency} ${Number(sub.price_renewal || 100).toFixed(2)}</button>
          </div>`;
      } else {
        subHtml = `
          <div style="background:#fee2e2;color:#b91c1c;padding:1rem 1.25rem;border-radius:10px;margin-bottom:1.25rem;">
            <strong>⚠ Subscription Expired</strong>
            <div style="font-size:0.9rem;margin-top:0.35rem;margin-bottom:0.5rem;">
              Your products are hidden. Renew to make them visible and to list new products.
            </div>
            <div style="font-size:0.9rem;margin-bottom:0.75rem;font-weight:600;">${priceLabel} / 30 days</div>
            <button class="btn btn-sm btn-primary" onclick="renewSubscription()">
              Pay ${currency} ${price} & Activate
            </button>
          </div>`;
      }
    }

    if (!myProducts.length) {
      container.innerHTML = subHtml + `
        <div style="text-align:center;padding:2rem;background:white;border-radius:12px;">
          <p style="color:#6b7280;margin-bottom:1rem;">You haven't listed any products yet.</p>
          <button class="btn btn-primary" onclick="showSection('sell')">List Your First Product</button>
        </div>`;
      return;
    }

    let html = subHtml + `
      <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <div style="font-size:0.95rem;color:#6b7280;">You have <strong>${myProducts.length}</strong> product${myProducts.length > 1 ? "s" : ""}</div>
        <button class="btn btn-primary btn-sm" onclick="showSection('sell')">+ Add New Product</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">`;

    myProducts.forEach(p => {
      html += `
        <div style="background:white;border-radius:12px;padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="display:flex;align-items:center;gap:1rem;">
            ${p.image ? `<img src="${p.image}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />` : `<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;">📦</div>`}
            <div>
              <div style="font-weight:600;">${escapeHtml(p.name)}</div>
              <div style="font-size:0.85rem;color:#6b7280;">${formatMoney(p.price)} · ${escapeHtml(p.category)}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">View</button>
            <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="deleteMyProduct(${p.id})">Delete</button>
          </div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

// Admin Settings
function showAdminTab(tab) {
  ["sellers", "kyc", "products", "inquiries", "settings"].forEach(t => {
    const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
    document.getElementById(name)?.classList.add("hidden");
  });

  const map = {
    sellers: "Sellers", kyc: "Kyc", products: "Products",
    inquiries: "Inquiries", settings: "Settings"
  };
  document.getElementById("adminTab" + map[tab])?.classList.remove("hidden");

  if (tab === "sellers") loadSellers();
  else if (tab === "kyc") loadPendingKyc();
  else if (tab === "products") loadAdminProducts();
  else if (tab === "inquiries") loadInquiries();
  else if (tab === "settings") loadAdminSettings();
}

async function loadAdminSettings() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;

  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Failed to load settings");
    const data = await res.json();
    document.getElementById("settingPriceFirst").value = data.price_first;
    document.getElementById("settingPriceRenewal").value = data.price_renewal;
    document.getElementById("settingCurrency").value = data.currency || "GHS";
  } catch (err) {
    console.error(err);
  }
}

async function saveAdminSettings() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;

  const payload = {
    price_first: parseFloat(document.getElementById("settingPriceFirst").value),
    price_renewal: parseFloat(document.getElementById("settingPriceRenewal").value),
    currency: document.getElementById("settingCurrency").value.trim() || "GHS"
  };

  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": key
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");

    const msg = document.getElementById("settingsMsg");
    msg.textContent = `✓ Saved: First ${data.currency} ${data.price_first} · Renewal ${data.currency} ${data.price_renewal}`;
    msg.style.color = "#059669";
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 4000);
  } catch (err) {
    const msg = document.getElementById("settingsMsg");
    msg.textContent = "Error: " + err.message;
    msg.style.color = "#b91c1c";
    msg.classList.remove("hidden");
  }
}

// ===== Paystack Online Payments =====
let pendingPaymentProductId = null;
let paystackEnabled = false;

async function checkPaystackConfig() {
  try {
    const cfg = await apiGet("/payment/config");
    paystackEnabled = !!cfg.enabled;
    return cfg;
  } catch (e) {
    paystackEnabled = false;
    return null;
  }
}

// On load
document.addEventListener("DOMContentLoaded", () => {
  checkPaystackConfig();
  // Handle Paystack return (reference in URL)
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("reference") || params.get("trxref");
  if (ref) {
    verifyPaystackPayment(ref);
    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
  }
});

// Override buy flow to show payment choice
function buyOnWhatsApp(id) {
  pendingPaymentProductId = id;
  const product = products.find(p => p.id === id);
  if (!product) return;

  const info = document.getElementById("paymentProductInfo");
  if (info) {
    info.textContent = `${product.name} — ${getSettingCurrency()} ${Number(product.price).toFixed(2)}`;
  }

  const paystackOpt = document.getElementById("paystackOption");
  if (paystackOpt) {
    if (paystackEnabled) paystackOpt.classList.remove("hidden");
    else paystackOpt.classList.add("hidden");
  }

  document.getElementById("paymentChoiceModal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function getSettingCurrency() {
  return "GHS"; // default display; actual from config when available
}

function closePaymentChoice() {
  document.getElementById("paymentChoiceModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

function startWhatsAppOrder() {
  closePaymentChoice();
  const id = pendingPaymentProductId;
  // Existing buyer verification flow
  const buyerToken = localStorage.getItem("wm_buyer_token");
  if (buyerToken) {
    proceedToWhatsApp(id);
    return;
  }
  pendingBuyProductId = id;
  document.getElementById("buyerVerifyModal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function startPaystackPayment() {
  closePaymentChoice();
  const product = products.find(p => p.id === pendingPaymentProductId);
  if (!product) return;

  const amountInfo = document.getElementById("paystackAmountInfo");
  if (amountInfo) {
    amountInfo.textContent = `Amount: GHS ${Number(product.price).toFixed(2)}`;
  }

  // Pre-fill name if buyer was verified before
  const savedName = localStorage.getItem("wm_buyer_name");
  if (savedName && document.getElementById("payBuyerName")) {
    document.getElementById("payBuyerName").value = savedName;
  }

  document.getElementById("paystackCheckoutModal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closePaystackCheckout() {
  document.getElementById("paystackCheckoutModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("paystackForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("paystackError");
  const btn = document.getElementById("paystackSubmitBtn");
  errorEl?.classList.add("hidden");

  const payload = {
    product_id: pendingPaymentProductId,
    buyer_name: document.getElementById("payBuyerName").value.trim(),
    buyer_email: document.getElementById("payBuyerEmail").value.trim(),
    buyer_phone: document.getElementById("payBuyerPhone").value.trim() || null,
    callback_url: window.location.origin + window.location.pathname,
  };

  btn.textContent = "Redirecting to Paystack...";
  btn.disabled = true;

  try {
    const result = await apiPost("/payment/initialize", payload);
    // Redirect to Paystack payment page
    window.location.href = result.authorization_url;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    btn.textContent = "Proceed to Payment";
    btn.disabled = false;
  }
});

async function verifyPaystackPayment(reference) {
  try {
    const result = await apiGet(`/payment/verify/${reference}`);
    if (result.status === "success") {
      const o = result.order;
      alert(
        `✅ Payment Successful!\n\n` +
        `Product: ${o.product_name}\n` +
        `Amount: ${o.currency} ${Number(o.amount).toFixed(2)}\n` +
        `Seller: ${o.seller_name}\n\n` +
        `The seller will be notified. You can also contact them on WhatsApp.`
      );
      // Offer WhatsApp contact
      if (o.seller_whatsapp && confirm("Would you like to message the seller on WhatsApp now?")) {
        const msg = encodeURIComponent(
          `Hi! I just paid for *${o.product_name}* (Ref: ${o.reference}) via SunGarland. Please confirm delivery details.`
        );
        window.open(`https://wa.me/${o.seller_whatsapp}?text=${msg}`, "_blank");
      }
    } else {
      alert("Payment was not completed: " + (result.message || result.status));
    }
  } catch (err) {
    alert("Could not verify payment: " + err.message);
  }
}

// Admin settings - load/save Paystack keys
async function loadAdminSettings() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  try {
    const res = await fetch(`${API_BASE}/admin/settings`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    document.getElementById("settingPriceFirst").value = data.price_first;
    document.getElementById("settingPriceRenewal").value = data.price_renewal;
    document.getElementById("settingCurrency").value = data.currency || "GHS";
    const en = document.getElementById("settingPaystackEnabled");
    if (en) en.checked = !!data.paystack_enabled;
    const pk = document.getElementById("settingPaystackPublic");
    if (pk) pk.value = data.paystack_public_key || "";
    const sk = document.getElementById("settingPaystackSecret");
    if (sk) sk.value = data.paystack_secret_key || "";
  } catch (err) {
    console.error(err);
  }
}

async function saveAdminSettings() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;

  const payload = {
    price_first: parseFloat(document.getElementById("settingPriceFirst").value),
    price_renewal: parseFloat(document.getElementById("settingPriceRenewal").value),
    currency: document.getElementById("settingCurrency").value.trim() || "GHS",
    paystack_enabled: document.getElementById("settingPaystackEnabled")?.checked || false,
    paystack_public_key: document.getElementById("settingPaystackPublic")?.value.trim() || "",
    paystack_secret_key: document.getElementById("settingPaystackSecret")?.value.trim() || "",
  };

  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": key },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");

    await checkPaystackConfig(); // refresh frontend flag

    const msg = document.getElementById("settingsMsg");
    msg.textContent = "✓ Settings saved successfully";
    msg.style.color = "#059669";
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 4000);
  } catch (err) {
    const msg = document.getElementById("settingsMsg");
    msg.textContent = "Error: " + err.message;
    msg.style.color = "#b91c1c";
    msg.classList.remove("hidden");
  }
}

// Admin Orders tab
function showAdminTab(tab) {
  ["sellers", "kyc", "products", "inquiries", "orders", "settings"].forEach(t => {
    const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
    document.getElementById(name)?.classList.add("hidden");
  });
  const map = {
    sellers: "Sellers", kyc: "Kyc", products: "Products",
    inquiries: "Inquiries", orders: "Orders", settings: "Settings"
  };
  document.getElementById("adminTab" + map[tab])?.classList.remove("hidden");

  if (tab === "sellers") loadSellers();
  else if (tab === "kyc") loadPendingKyc();
  else if (tab === "products") loadAdminProducts();
  else if (tab === "inquiries") loadInquiries();
  else if (tab === "orders") loadAdminOrders();
  else if (tab === "settings") loadAdminSettings();
}

async function loadAdminOrders() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("ordersTable");
  if (!key || !table) return;

  try {
    const res = await fetch(`${API_BASE}/admin/orders`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed");
    const list = await res.json();

    if (!list.length) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No online orders yet.</p>`;
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <thead>
          <tr style="background:#f3f4f6;text-align:left;">
            <th style="padding:0.7rem 0.9rem;font-size:0.8rem;">Date</th>
            <th style="padding:0.7rem 0.9rem;font-size:0.8rem;">Product</th>
            <th style="padding:0.7rem 0.9rem;font-size:0.8rem;">Buyer</th>
            <th style="padding:0.7rem 0.9rem;font-size:0.8rem;">Amount</th>
            <th style="padding:0.7rem 0.9rem;font-size:0.8rem;">Status</th>
            <th style="padding:0.7rem 0.9rem;font-size:0.8rem;">Ref</th>
          </tr>
        </thead>
        <tbody>`;
    list.forEach((o, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
      const date = o.created_at ? new Date(o.created_at).toLocaleString() : "—";
      const statusColor = o.payment_status === "paid" ? "#059669" : o.payment_status === "pending" ? "#d97706" : "#b91c1c";
      html += `
        <tr style="background:${bg};border-top:1px solid #e5e7eb;">
          <td style="padding:0.7rem 0.9rem;font-size:0.8rem;color:#6b7280;">${date}</td>
          <td style="padding:0.7rem 0.9rem;font-size:0.85rem;font-weight:500;">${escapeHtml(o.product_name || "—")}</td>
          <td style="padding:0.7rem 0.9rem;font-size:0.85rem;">
            ${escapeHtml(o.buyer_name || "—")}<br>
            <span style="font-size:0.75rem;color:#6b7280;">${escapeHtml(o.buyer_email || "")}</span>
          </td>
          <td style="padding:0.7rem 0.9rem;font-size:0.85rem;">${o.currency || "GHS"} ${Number(o.amount || 0).toFixed(2)}</td>
          <td style="padding:0.7rem 0.9rem;font-size:0.8rem;font-weight:600;color:${statusColor};">${o.payment_status || "—"}</td>
          <td style="padding:0.7rem 0.9rem;font-size:0.75rem;color:#6b7280;">${escapeHtml(o.payment_reference || "")}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

// ===== Houses & Hostels =====
let properties = [];

async function loadProperties() {
  const search = document.getElementById("housingSearch")?.value.trim() || "";
  const ptype = document.getElementById("housingTypeFilter")?.value || "all";
  try {
    let path = "/properties?";
    const params = [];
    if (ptype !== "all") params.push(`type=${encodeURIComponent(ptype)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    path += params.join("&");
    const data = await apiGet(path);
    properties = data.properties || data || [];
    renderHousing();
  } catch (err) {
    const grid = document.getElementById("housingGrid");
    if (grid) grid.innerHTML = `<p style="grid-column:1/-1;color:#b91c1c;">Could not load properties. Is the backend running?</p>`;
  }
}

function renderHousing() {
  const grid = document.getElementById("housingGrid");
  const empty = document.getElementById("housingEmpty");
  if (!grid) return;

  if (!properties.length) {
    grid.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");

  grid.innerHTML = properties.map(p => {
    const img = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'>🏠</div>'" />`
      : `<div class="placeholder">🏠</div>`;
    return `
      <article class="product-card">
        <div class="product-image">
          ${img}
          <span class="product-badge">${escapeHtml(p.property_type)}</span>
        </div>
        <div class="product-body">
          <div class="product-category">${escapeHtml(p.location)}</div>
          <h3 class="product-title">${escapeHtml(p.title)}</h3>
          <div class="product-seller">Agent: ${escapeHtml(p.agent_name)}</div>
          ${p.price ? `<div class="product-price" style="font-size:1.05rem;">${escapeHtml(p.price)}</div>` : `<div class="product-price" style="font-size:0.95rem;color:#6b7280;">Price on enquiry</div>`}
          <div class="product-actions">
            <button class="btn btn-outline btn-sm" onclick="openPropertyModal(${p.id})">Details</button>
            <button class="btn btn-primary btn-sm" onclick="contactAgent(${p.id})">Contact Agent</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function openPropertyModal(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;

  let media = "";
  if (p.image) media += `<img src="${p.image}" style="width:100%;max-height:260px;object-fit:cover;" />`;
  if (p.video_url) {
    media += `<video controls style="width:100%;max-height:260px;background:#000;margin-top:0.5rem;"><source src="${p.video_url}" /></video>`;
  }
  if (!media) media = `<div style="height:160px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:3rem;">🏠</div>`;

  document.getElementById("propertyModalBody").innerHTML = `
    <div class="modal-image">${media}</div>
    <div class="modal-info">
      <div class="product-category">${escapeHtml(p.property_type)} · ${escapeHtml(p.location)}</div>
      <h2>${escapeHtml(p.title)}</h2>
      <div class="product-seller">Listed by ${escapeHtml(p.agent_name)}</div>
      ${p.price ? `<div class="product-price">${escapeHtml(p.price)}</div>` : ""}
      <p class="modal-description">${escapeHtml(p.description)}</p>

      <div style="background:#fef3c7;border-radius:8px;padding:0.85rem 1rem;margin:1rem 0;font-size:0.85rem;color:#78350f;line-height:1.5;">
        <strong>⚠ No online payment on this listing.</strong><br>
        Do not pay until you have seen the property yourself and confirmed this is the real agent in charge.
      </div>

      <button class="btn btn-whatsapp" onclick="contactAgent(${p.id})">
        💬 Contact Agent on WhatsApp
      </button>
    </div>
  `;
  document.getElementById("propertyModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closePropertyModal() {
  document.getElementById("propertyModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

function contactAgent(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;

  const message = `Hi, I saw your listing on SunGarland (Houses & Hostels):

*${p.title}*
Location: ${p.location}
Type: ${p.property_type}

I would like to arrange a viewing. I understand that no payment should be made until I have seen the property in person and confirmed you are the agent in charge.

Thank you.`;

  const phone = String(p.agent_whatsapp).replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

// List property form
function updateListPropertyForm() {
  const prompt = document.getElementById("listPropertyLoginPrompt");
  const form = document.getElementById("listPropertyForm");
  if (!prompt || !form) return;
  if (currentSeller) {
    prompt.classList.add("hidden");
    form.classList.remove("hidden");
  } else {
    prompt.classList.remove("hidden");
    form.classList.add("hidden");
  }
}

document.getElementById("listPropertyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentSeller) return openAuthModal("login");

  const payload = {
    title: document.getElementById("propTitle").value.trim(),
    property_type: document.getElementById("propType").value,
    location: document.getElementById("propLocation").value.trim(),
    price: document.getElementById("propPrice").value.trim() || null,
    description: document.getElementById("propDescription").value.trim(),
    image: document.getElementById("propImage").value.trim() || null,
    video_url: document.getElementById("propVideo").value.trim() || null,
  };

  try {
    await apiPost("/properties", payload, true);
    document.getElementById("listPropertyForm").reset();
    document.getElementById("propImagePreview").innerHTML = "";
    document.getElementById("propVideoPreview").innerHTML = "";
    document.getElementById("propImage").value = "";
    document.getElementById("propVideo").value = "";
    const success = document.getElementById("listPropertySuccess");
    success.classList.remove("hidden");
    setTimeout(() => success.classList.add("hidden"), 4000);
    loadProperties();
  } catch (err) {
    alert("Failed to list: " + err.message);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setupImageUpload("propImageFile", "propImage", "propImagePreview");
  setupImageUpload("propVideoFile", "propVideo", "propVideoPreview");
  document.getElementById("housingSearch")?.addEventListener("input", loadProperties);
  document.getElementById("housingTypeFilter")?.addEventListener("change", loadProperties);
});

// Hook into showSection
const __showSectionHousing = showSection;
showSection = function(id) {
  __showSectionHousing(id);
  if (id === "housing") loadProperties();
  if (id === "listProperty") updateListPropertyForm();
  if (id === "dashboard") loadDashboard();
  if (id === "kyc") checkKycStatus();
};

// Admin housing
async function loadAdminHousing() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("adminHousingTable");
  if (!key || !table) return;
  try {
    const res = await fetch(`${API_BASE}/admin/properties`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed");
    const list = await res.json();
    if (!list.length) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No property listings yet.</p>`;
      return;
    }
    let html = `<table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <thead><tr style="background:#f3f4f6;text-align:left;">
        <th style="padding:0.7rem;font-size:0.8rem;">Title</th>
        <th style="padding:0.7rem;font-size:0.8rem;">Type</th>
        <th style="padding:0.7rem;font-size:0.8rem;">Location</th>
        <th style="padding:0.7rem;font-size:0.8rem;">Agent</th>
        <th style="padding:0.7rem;font-size:0.8rem;">Action</th>
      </tr></thead><tbody>`;
    list.forEach((p, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
      html += `<tr style="background:${bg};border-top:1px solid #e5e7eb;">
        <td style="padding:0.7rem;font-size:0.9rem;font-weight:500;">${escapeHtml(p.title)}</td>
        <td style="padding:0.7rem;font-size:0.85rem;">${escapeHtml(p.property_type)}</td>
        <td style="padding:0.7rem;font-size:0.85rem;">${escapeHtml(p.location)}</td>
        <td style="padding:0.7rem;font-size:0.85rem;">${escapeHtml(p.agent_name)}</td>
        <td style="padding:0.7rem;">
          <button class="btn btn-sm" style="background:#ef4444;color:white;padding:0.3rem 0.6rem;font-size:0.75rem;"
            onclick="adminDeleteProperty(${p.id})">Delete</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

async function adminDeleteProperty(id) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key || !confirm("Delete this property listing?")) return;
  try {
    const res = await fetch(`${API_BASE}/admin/properties/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Failed");
    loadAdminHousing();
    loadProperties();
  } catch (err) {
    alert(err.message);
  }
}

// Extend showAdminTab
const __showAdminTab = showAdminTab;
showAdminTab = function(tab) {
  ["sellers", "kyc", "products", "inquiries", "orders", "housing", "settings"].forEach(t => {
    const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
    document.getElementById(name)?.classList.add("hidden");
  });
  const map = {
    sellers: "Sellers", kyc: "Kyc", products: "Products",
    inquiries: "Inquiries", orders: "Orders", housing: "Housing", settings: "Settings"
  };
  document.getElementById("adminTab" + map[tab])?.classList.remove("hidden");
  if (tab === "sellers") loadSellers();
  else if (tab === "kyc") loadPendingKyc();
  else if (tab === "products") loadAdminProducts();
  else if (tab === "inquiries") loadInquiries();
  else if (tab === "orders") loadAdminOrders();
  else if (tab === "housing") loadAdminHousing();
  else if (tab === "settings") loadAdminSettings();
};

// ===== Houses & Hostels (UI helpers; state uses existing `properties` from above) =====
async function loadPropertiesAlt() {
  try {
    const type = document.getElementById("houseTypeFilter")?.value || "all";
    const search = document.getElementById("houseSearch")?.value.trim() || "";
    const params = [];
    if (type !== "all") params.push(`type=${encodeURIComponent(type)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    const path = "/properties" + (params.length ? "?" + params.join("&") : "");
    properties = await apiGet(path);
    if (typeof renderProperties === "function") renderProperties(properties);
    else if (typeof renderHousing === "function") renderHousing();
  } catch (err) {
    const grid = document.getElementById("housesGrid") || document.getElementById("housingGrid");
    if (grid) grid.innerHTML = `<p style="color:#b91c1c;grid-column:1/-1;text-align:center;">Failed to load properties.</p>`;
  }
}

// Prefer primary loader name used by navigation
async function loadProperties() {
  if (document.getElementById("housingSearch") || document.getElementById("housingGrid")) {
    const search = document.getElementById("housingSearch")?.value.trim() || "";
    const ptype = document.getElementById("housingTypeFilter")?.value || "all";
    try {
      let path = "/properties?";
      const params = [];
      if (ptype !== "all") params.push(`type=${encodeURIComponent(ptype)}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      path += params.join("&");
      const data = await apiGet(path);
      properties = data.properties || data || [];
      if (typeof renderHousing === "function") renderHousing();
      if (typeof renderProperties === "function" && document.getElementById("housesGrid")) {
        renderProperties(Array.isArray(properties) ? properties : []);
      }
    } catch (err) {
      const grid = document.getElementById("housingGrid") || document.getElementById("housesGrid");
      if (grid) grid.innerHTML = `<p style="grid-column:1/-1;color:#b91c1c;">Could not load properties. Is the backend running?</p>`;
    }
    return;
  }
  return loadPropertiesAlt();
}

function renderProperties(list) {
  const grid = document.getElementById("housesGrid");
  if (!grid) return;

  if (!list || !list.length) {
    grid.innerHTML = emptyState(
      "No houses or hostels yet",
      "Verified agents will appear here. Remember: never pay before you view a property in person.",
      `<button class="btn btn-outline btn-sm" onclick="showSection('housingDisclaimer')">Read housing rules</button>
       <button class="btn btn-primary btn-sm" onclick="showSection('agentVerify')" style="margin-left:0.35rem;">I'm an agent</button>`
    );
    return;
  }

  grid.innerHTML = list.map(p => {
    const img = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'>🏠</div>'" />`
      : `<div class="placeholder">🏠</div>`;
    const period = p.price_period || "month";
    return `
      <article class="product-card">
        <div class="product-image">
          ${img}
          <span class="product-badge">${escapeHtml((p.property_type || "").toUpperCase())}</span>
        </div>
        <div class="product-body">
          <div class="product-category">${escapeHtml(p.location || "")}</div>
          <h3 class="product-title">${escapeHtml(p.title)}</h3>
          <div class="product-seller">Agent: ${escapeHtml(p.agent_name || "")}</div>
          <div class="product-price">GHS ${Number(p.price).toFixed(2)}<span style="font-size:0.8rem;font-weight:400;color:#6b7280;"> / ${escapeHtml(period)}</span></div>
          <div class="product-actions">
            <button class="btn btn-outline btn-sm" onclick="openPropertyModal(${p.id})">Details</button>
            <button class="btn btn-primary btn-sm" onclick="contactAgent(${p.id})">Contact Agent</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

async function openPropertyModal(id) {
  const modal = document.getElementById("propertyModal");
  const body = document.getElementById("propertyModalBody");
  if (!modal || !body) return;

  body.innerHTML = `<div style="padding:2rem;text-align:center;color:#6b7280;">Loading...</div>`;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  try {
    const p = await apiGet(`/properties/${id}`);
    const period = p.price_period || "month";
    const img = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" style="width:100%;max-height:280px;object-fit:cover;" />`
      : `<div style="height:160px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:3rem;">🏠</div>`;

    body.innerHTML = `
      <div class="modal-image">${img}</div>
      <div class="modal-info">
        <div class="product-category">${escapeHtml((p.property_type || "").toUpperCase())} · ${escapeHtml(p.location || "")}</div>
        <h2>${escapeHtml(p.title)}</h2>
        <div class="product-seller">Listed by ${escapeHtml(p.agent_name || "Agent")}</div>
        <div class="product-price">GHS ${Number(p.price).toFixed(2)} <span style="font-size:0.9rem;font-weight:400;color:#6b7280;">/ ${escapeHtml(period)}</span></div>
        <p class="modal-description">${escapeHtml(p.description)}</p>

        <div style="background:#fff7ed;border:1px solid #f59e0b;border-radius:10px;padding:1rem;margin:1rem 0;font-size:0.9rem;color:#78350f;">
          <strong>⚠️ Before you pay anything:</strong>
          <ul style="margin:0.5rem 0 0;padding-left:1.2rem;">
            <li>Visit the property and see it with your own eyes</li>
            <li>Confirm this person is the agent in charge</li>
            <li>No payment through this website — arrange only after viewing</li>
          </ul>
        </div>

        <button class="btn btn-whatsapp btn-full" onclick="contactAgent(${p.id})">
          💬 Contact Agent on WhatsApp
        </button>
        <p style="text-align:center;font-size:0.8rem;color:#6b7280;margin-top:0.75rem;">
          Online payment is not available for houses & hostels.
        </p>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div style="padding:2rem;color:#b91c1c;">Could not load property.</div>`;
  }
}

function closePropertyModal() {
  document.getElementById("propertyModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

function contactAgent(id) {
  const p = properties.find(x => x.id === id);
  // If not in local list, try from modal context
  if (!p) {
    // fetch quick - or use whatsapp from open modal
    apiGet(`/properties/${id}`).then(prop => {
      openAgentWhatsApp(prop);
    }).catch(() => alert("Could not find property"));
    return;
  }
  openAgentWhatsApp(p);
}

function openAgentWhatsApp(p) {
  const message = `Hi, I saw your *${p.title}* listing on SunGarland (Houses & Hostels).

Location: ${p.location}
Price: GHS ${Number(p.price).toFixed(2)} / ${p.price_period || "month"}

I would like to arrange a viewing. I understand that no payment should be made until I have seen the property in person and confirmed you are the agent in charge.

Thank you.`;

  const phone = String(p.whatsapp).replace(/\D/g, "");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

// Filters
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("houseSearch")?.addEventListener("input", () => loadProperties());
  document.getElementById("houseTypeFilter")?.addEventListener("change", () => loadProperties());
  setupImageUpload("propImageFile", "propImage", "propImagePreview");
});

// List property form
document.getElementById("listPropertyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentSeller) {
    openAuthModal("login");
    return;
  }

  const payload = {
    title: document.getElementById("propTitle").value.trim(),
    property_type: document.getElementById("propType").value,
    location: document.getElementById("propLocation").value.trim(),
    price: parseFloat(document.getElementById("propPrice").value),
    price_period: document.getElementById("propPeriod").value,
    description: document.getElementById("propDescription").value.trim(),
    image: document.getElementById("propImage").value.trim() || null,
    whatsapp: document.getElementById("propWhatsapp").value.trim(),
  };

  try {
    await apiPost("/properties", payload, true);
    document.getElementById("listPropertyForm").reset();
    document.getElementById("propImagePreview").innerHTML = "";
    document.getElementById("propImage").value = "";
    const ok = document.getElementById("propListSuccess");
    ok.classList.remove("hidden");
    setTimeout(() => ok.classList.add("hidden"), 4000);
    loadProperties();
  } catch (err) {
    alert("Failed to list: " + err.message);
  }
});

// Load when section shown
const _showSectionHouses = showSection;
showSection = function(id) {
  _showSectionHouses(id);
  if (id === "houses") loadProperties();
  if (id === "dashboard") loadDashboard();
  if (id === "kyc") checkKycStatus();
};

// ===== Email verification / password reset from URL =====
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get("verify_email");
  const resetToken = params.get("reset_token");

  if (verifyToken) {
    try {
      await apiPost("/auth/verify-email", { token: verifyToken });
      alert("Email verified successfully! You can now use your account fully.");
      if (currentSeller) currentSeller.email_verified = true;
    } catch (err) {
      alert("Email verification failed: " + err.message);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }

  if (resetToken) {
    document.getElementById("resetTokenValue").value = resetToken;
    document.getElementById("resetModal")?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    window.history.replaceState({}, "", window.location.pathname);
  }
});

function openForgotPassword() {
  closeAuthModal();
  document.getElementById("forgotModal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("forgotMsg")?.classList.add("hidden");
}

function closeForgotModal() {
  document.getElementById("forgotModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

function closeResetModal() {
  document.getElementById("resetModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("forgotMsg");
  try {
    const result = await apiPost("/auth/forgot-password", {
      email: document.getElementById("forgotEmail").value.trim()
    });
    let text = result.message || "If that email exists, a reset link has been sent.";
    if (result.dev_reset_url) {
      text += "\n\nDEV link: " + result.dev_reset_url;
      console.log("DEV reset URL:", result.dev_reset_url);
      // Auto-open reset in dev
      if (confirm(text + "\n\nOpen reset form now?")) {
        const url = new URL(result.dev_reset_url);
        const token = url.searchParams.get("reset_token");
        closeForgotModal();
        document.getElementById("resetTokenValue").value = token;
        document.getElementById("resetModal")?.classList.remove("hidden");
        return;
      }
    }
    msg.textContent = text;
    msg.style.color = "#059669";
    msg.classList.remove("hidden");
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "#b91c1c";
    msg.classList.remove("hidden");
  }
});

document.getElementById("resetForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("resetMsg");
  const p1 = document.getElementById("resetNewPassword").value;
  const p2 = document.getElementById("resetConfirmPassword").value;
  if (p1 !== p2) {
    msg.textContent = "Passwords do not match";
    msg.style.color = "#b91c1c";
    msg.classList.remove("hidden");
    return;
  }
  try {
    await apiPost("/auth/reset-password", {
      token: document.getElementById("resetTokenValue").value,
      password: p1
    });
    msg.textContent = "Password updated! You can now log in.";
    msg.style.color = "#059669";
    msg.classList.remove("hidden");
    setTimeout(() => {
      closeResetModal();
      openAuthModal("login");
    }, 1500);
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "#b91c1c";
    msg.classList.remove("hidden");
  }
});

// ===== My Account page =====
async function loadAccountPage() {
  const container = document.getElementById("accountContent");
  if (!container) return;

  if (!currentSeller) {
    container.innerHTML = `<p style="text-align:center;color:#6b7280;">Please <a href="#" onclick="openAuthModal('login');return false;" style="font-weight:600;color:#25D366;">Login</a> to manage your account.</p>`;
    return;
  }

  try {
    const me = await apiGet("/auth/me", true);
    currentSeller = { ...currentSeller, ...me };
    const verified = me.email_verified
      ? `<span style="color:#059669;font-weight:600;">✓ Email verified</span>`
      : `<span style="color:#d97706;font-weight:600;">Email not verified</span>
         <button class="btn btn-sm btn-outline" style="margin-left:0.5rem;" onclick="resendVerification()">Resend link</button>`;

    container.innerHTML = `
      <div style="background:white;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:1.25rem;">
        <h3 style="margin-bottom:1rem;font-size:1.1rem;">Profile</h3>
        <div style="margin-bottom:0.75rem;font-size:0.9rem;">${verified}</div>
        <form id="profileForm">
          <div class="form-group">
            <label>Username</label>
            <input type="text" value="${escapeHtml(me.username || "")}" disabled />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" value="${escapeHtml(me.email || "")}" disabled />
          </div>
          <div class="form-group">
            <label for="profileFullName">Full Name</label>
            <input type="text" id="profileFullName" value="${escapeHtml(me.full_name_profile || "")}" />
          </div>
          <div class="form-group">
            <label for="profileShopName">Shop Name</label>
            <input type="text" id="profileShopName" value="${escapeHtml(me.shop_name || "")}" required />
          </div>
          <div class="form-group">
            <label for="profileWhatsapp">WhatsApp</label>
            <input type="tel" id="profileWhatsapp" value="${escapeHtml(me.whatsapp || "")}" required />
          </div>
          <div class="form-group">
            <label for="profileBio">Bio</label>
            <textarea id="profileBio" rows="3">${escapeHtml(me.bio || "")}</textarea>
          </div>
          <div class="form-group">
            <label for="profileImageFile">Profile Photo</label>
            <input type="file" id="profileImageFile" accept="image/*" />
            <div id="profileImagePreview" style="margin-top:0.5rem;">
              ${me.profile_image ? `<img src="${me.profile_image}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" />` : ""}
            </div>
            <input type="hidden" id="profileImage" value="${escapeHtml(me.profile_image || "")}" />
          </div>
          <button type="submit" class="btn btn-primary">Save Profile</button>
          <p id="profileMsg" class="hidden" style="margin-top:0.75rem;font-size:0.9rem;"></p>
        </form>
      </div>

      <div style="background:white;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:1.25rem;">
        <h3 style="margin-bottom:1rem;font-size:1.1rem;">Change Password</h3>
        <form id="changePasswordForm">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input type="password" id="currentPassword" required minlength="6" />
          </div>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" required minlength="6" />
          </div>
          <div class="form-group">
            <label for="confirmNewPassword">Confirm New Password</label>
            <input type="password" id="confirmNewPassword" required minlength="6" />
          </div>
          <button type="submit" class="btn btn-primary">Update Password</button>
          <p id="pwMsg" class="hidden" style="margin-top:0.75rem;font-size:0.9rem;"></p>
        </form>
      </div>

      <div style="background:#fef2f2;border-radius:12px;padding:1.5rem;border:1px solid #fecaca;">
        <h3 style="margin-bottom:0.5rem;font-size:1.1rem;color:#b91c1c;">Delete Account</h3>
        <p style="font-size:0.9rem;color:#7f1d1d;margin-bottom:1rem;">This permanently deletes your account, products, and property listings. This cannot be undone.</p>
        <form id="deleteAccountForm">
          <div class="form-group">
            <label for="deletePassword">Confirm with your password</label>
            <input type="password" id="deletePassword" required />
          </div>
          <button type="submit" class="btn" style="background:#dc2626;color:white;">Delete My Account Forever</button>
        </form>
      </div>
    `;

    setupImageUpload("profileImageFile", "profileImage", "profileImagePreview");

    document.getElementById("profileForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("profileMsg");
      try {
        const result = await fetch(`${API_BASE}/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("wm_token")}`
          },
          body: JSON.stringify({
            full_name_profile: document.getElementById("profileFullName").value.trim(),
            shop_name: document.getElementById("profileShopName").value.trim(),
            whatsapp: document.getElementById("profileWhatsapp").value.trim(),
            bio: document.getElementById("profileBio").value.trim(),
            profile_image: document.getElementById("profileImage").value.trim() || null,
          })
        }).then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "Update failed");
          return d;
        });
        currentSeller = result.seller;
        msg.textContent = "Profile saved.";
        msg.style.color = "#059669";
        msg.classList.remove("hidden");
        updateAuthUI();
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = "#b91c1c";
        msg.classList.remove("hidden");
      }
    });

    document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("pwMsg");
      const np = document.getElementById("newPassword").value;
      const cp = document.getElementById("confirmNewPassword").value;
      if (np !== cp) {
        msg.textContent = "New passwords do not match";
        msg.style.color = "#b91c1c";
        msg.classList.remove("hidden");
        return;
      }
      try {
        await apiPost("/auth/change-password", {
          current_password: document.getElementById("currentPassword").value,
          new_password: np
        }, true);
        msg.textContent = "Password updated successfully.";
        msg.style.color = "#059669";
        msg.classList.remove("hidden");
        e.target.reset();
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = "#b91c1c";
        msg.classList.remove("hidden");
      }
    });

    document.getElementById("deleteAccountForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
      try {
        await apiPost("/auth/delete-account", {
          password: document.getElementById("deletePassword").value
        }, true);
        logout();
        alert("Your account has been deleted.");
        showSection("home");
      } catch (err) {
        alert("Error: " + err.message);
      }
    });
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c;">Error loading account: ${err.message}</p>`;
  }
}

async function resendVerification() {
  try {
    const result = await apiPost("/auth/resend-verification", {}, true);
    if (result.dev_verify_url) {
      alert("Verification link (dev mode):\n" + result.dev_verify_url);
    } else {
      alert(result.message || "Verification email sent.");
    }
  } catch (err) {
    alert(err.message);
  }
}

// Hook account into navigation
const _showForAccount = showSection;
showSection = function(id) {
  _showForAccount(id);
  if (id === "account") loadAccountPage();
  if (id === "houses") loadProperties();
  if (id === "dashboard") loadDashboard();
  if (id === "kyc") checkKycStatus();
};

// ===== Agent Verification (Houses & Hostels) =====
async function checkAgentStatus() {
  const box = document.getElementById("agentStatusBox");
  const form = document.getElementById("agentVerifyForm");
  if (!box) return;

  if (!currentSeller) {
    box.innerHTML = `<p style="color:#92400e;">Please <a href="#" onclick="openAuthModal('login');return false;" style="font-weight:600;">Login</a> first to submit agent documents.</p>`;
    form?.classList.add("hidden");
    return;
  }

  try {
    const status = await apiGet("/agent/status", true);
    const st = status.agent_status || "none";

    if (st === "approved") {
      box.innerHTML = `<div style="background:#d1fae5;color:#065f46;padding:1rem;border-radius:8px;">
        ✅ <strong>Approved agent</strong> — You can list houses and hostels.
        <div style="margin-top:0.5rem;"><button class="btn btn-sm btn-primary" onclick="showSection('listProperty')">List a Property</button></div>
      </div>`;
      form?.classList.add("hidden");
    } else if (st === "pending") {
      box.innerHTML = `<div style="background:#fef3c7;color:#92400e;padding:1rem;border-radius:8px;">
        ⏳ <strong>Pending review</strong> — Your government registration document is being reviewed.
        ${status.agent_license_number ? `<div style="margin-top:0.35rem;font-size:0.9rem;">License: ${escapeHtml(status.agent_license_number)}</div>` : ""}
      </div>`;
      form?.classList.add("hidden");
    } else if (st === "rejected") {
      box.innerHTML = `<div style="background:#fee2e2;color:#b91c1c;padding:1rem;border-radius:8px;margin-bottom:1rem;">
        ❌ <strong>Rejected</strong> — Please re-submit a clearer government-registered agent document.
      </div>`;
      form?.classList.remove("hidden");
    } else {
      box.innerHTML = `<div style="background:#e0f2fe;color:#075985;padding:1rem;border-radius:8px;margin-bottom:1rem;">
        📋 Submit your government agent registration document below to list houses and hostels.
      </div>`;
      form?.classList.remove("hidden");
    }
  } catch (err) {
    box.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupImageUpload("agentDocFile", "agentDocUrl", "agentDocPreview");
});

document.getElementById("agentVerifyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentSeller) return openAuthModal("login");

  const payload = {
    agent_license_number: document.getElementById("agentLicense").value.trim(),
    agent_doc_url: document.getElementById("agentDocUrl").value.trim(),
  };
  if (!payload.agent_doc_url) {
    alert("Please upload your government registration document first.");
    return;
  }

  try {
    await apiPost("/agent/submit", payload, true);
    alert("Documents submitted. Waiting for admin approval.");
    checkAgentStatus();
  } catch (err) {
    alert("Error: " + err.message);
  }
});

async function loadPendingAgents() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("agentsTable");
  if (!key || !table) return;

  try {
    const res = await fetch(`${API_BASE}/admin/agents/pending`, {
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Failed to load");
    const list = await res.json();

    if (!list.length) {
      table.innerHTML = `<p style="color:#6b7280;padding:1.5rem;text-align:center;">No pending agent verifications.</p>`;
      return;
    }

    let html = `<div style="display:flex;flex-direction:column;gap:1.25rem;">`;
    list.forEach(s => {
      html += `
        <div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <strong style="font-size:1.05rem;">${escapeHtml(s.shop_name)}</strong>
              <div style="font-size:0.85rem;color:#6b7280;">@${escapeHtml(s.username)} · ${escapeHtml(s.email)}</div>
              <div style="margin-top:0.5rem;font-size:0.9rem;">
                <div><strong>License / Reg. No:</strong> ${escapeHtml(s.agent_license_number || "—")}</div>
                <div><strong>WhatsApp:</strong> ${escapeHtml(s.whatsapp || "—")}</div>
                <div><strong>Submitted:</strong> ${s.agent_submitted_at ? new Date(s.agent_submitted_at).toLocaleString() : "—"}</div>
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-primary" onclick="reviewAgent(${s.id}, 'approve')">✓ Approve</button>
              <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="reviewAgent(${s.id}, 'reject')">✗ Reject</button>
            </div>
          </div>
          ${s.agent_doc_url ? `
            <div style="margin-top:1rem;">
              <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;color:#374151;">Government registration document</div>
              <a href="${s.agent_doc_url}" target="_blank">
                <img src="${s.agent_doc_url}" alt="Agent document"
                  style="max-width:280px;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;object-fit:contain;background:#f9fafb;"
                  onerror="this.outerHTML='<a href=\\'${s.agent_doc_url}\\' target=\\'_blank\\' style=\\'color:#2563eb;\\'>Open document</a>'" />
              </a>
            </div>` : ""}
        </div>`;
    });
    html += `</div>`;
    table.innerHTML = html;
  } catch (err) {
    table.innerHTML = `<p style="color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

async function reviewAgent(sellerId, action) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  if (!confirm(`Are you sure you want to ${action.toUpperCase()} this agent?`)) return;
  try {
    const res = await fetch(`${API_BASE}/admin/agents/${sellerId}/${action}`, {
      method: "POST",
      headers: { "X-Admin-Key": key }
    });
    if (!res.ok) throw new Error("Action failed");
    loadPendingAgents();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Extend showAdminTab for agents
const _showAdminTabAgents = showAdminTab;
showAdminTab = function(tab) {
  document.getElementById("adminTabAgents")?.classList.add("hidden");
  _showAdminTabAgents(tab);
  if (tab === "agents") {
    ["sellers", "kyc", "products", "inquiries", "orders", "settings"].forEach(t => {
      const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
      document.getElementById(name)?.classList.add("hidden");
    });
    document.getElementById("adminTabAgents")?.classList.remove("hidden");
    loadPendingAgents();
  }
};

const _showAgentSection = showSection;
showSection = function(id) {
  _showAgentSection(id);
  if (id === "agentVerify") checkAgentStatus();
  if (id === "listProperty") checkAgentStatus();
};

// ===== Notifications =====
async function refreshNotifications() {
  if (!currentSeller) {
    document.getElementById("notifBell")?.style.setProperty("display", "none");
    return;
  }
  try {
    const data = await apiGet("/notifications", true);
    const bell = document.getElementById("notifBell");
    const count = document.getElementById("notifCount");
    if (bell) bell.style.display = "inline-flex";
    const unread = data.unread || 0;
    if (count) {
      if (unread > 0) {
        count.textContent = unread > 9 ? "9+" : String(unread);
        count.style.display = "inline";
      } else {
        count.style.display = "none";
      }
    }
    const list = document.getElementById("notifList");
    if (list) {
      if (!data.notifications?.length) {
        list.innerHTML = `<p style="color:#6b7280;font-size:0.85rem;">No notifications</p>`;
      } else {
        list.innerHTML = data.notifications.map(n => `
          <div style="padding:0.6rem;border-bottom:1px solid #f3f4f6;${n.is_read ? "" : "background:#f0fdf4;"}">
            <div style="font-weight:600;font-size:0.85rem;">${escapeHtml(n.title)}</div>
            <div style="font-size:0.8rem;color:#6b7280;">${escapeHtml(n.body || "")}</div>
            <div style="font-size:0.7rem;color:#9ca3af;">${n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
          </div>
        `).join("");
      }
    }
  } catch (e) { /* ignore */ }
}

function toggleNotifPanel() {
  const panel = document.getElementById("notifPanel");
  if (!panel) return;
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) refreshNotifications();
}

async function markAllNotifsRead() {
  try {
    await apiPost("/notifications/read", {}, true);
    refreshNotifications();
  } catch (e) {}
}

// Refresh notifs when logged in
setInterval(() => { if (currentSeller) refreshNotifications(); }, 30000);
document.addEventListener("DOMContentLoaded", () => {
  if (currentSeller) refreshNotifications();
});

const _updateAuthUINotif = typeof updateAuthUI === "function" ? updateAuthUI : null;
// Patch after login via polling on token presence
setTimeout(() => { if (localStorage.getItem("wm_token")) refreshNotifications(); }, 1500);

// ===== In-app Chat =====
let activeConvId = null;

function openChatStart(productId, propertyId) {
  document.getElementById("chatProductId").value = productId || "";
  document.getElementById("chatPropertyId").value = propertyId || "";
  const saved = localStorage.getItem("wm_buyer_name");
  if (saved) document.getElementById("chatBuyerName").value = saved;
  document.getElementById("chatStartModal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeChatStart() {
  document.getElementById("chatStartModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("chatStartForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("chatStartError");
  err?.classList.add("hidden");
  const payload = {
    buyer_name: document.getElementById("chatBuyerName").value.trim(),
    buyer_email: document.getElementById("chatBuyerEmail").value.trim() || null,
    message: document.getElementById("chatMessage").value.trim(),
  };
  const pid = document.getElementById("chatProductId").value;
  const propId = document.getElementById("chatPropertyId").value;
  if (pid) payload.product_id = Number(pid);
  if (propId) payload.property_id = Number(propId);

  try {
    const result = await apiPost("/chat/start", payload);
    localStorage.setItem("wm_buyer_name", payload.buyer_name);
    closeChatStart();
    alert("Message sent! Conversation #" + result.conversation_id);
    if (currentSeller) {
      showSection("messages");
      openConversation(result.conversation_id);
    }
  } catch (ex) {
    if (err) { err.textContent = ex.message; err.classList.remove("hidden"); }
  }
});

async function loadConversations() {
  const list = document.getElementById("convList");
  if (!list) return;
  if (!currentSeller) {
    list.innerHTML = `<p style="color:#6b7280;font-size:0.9rem;padding:0.5rem;">Please login to view messages.</p>`;
    return;
  }
  try {
    const rows = await apiGet("/chat/my", true);
    if (!rows.length) {
      list.innerHTML = emptyState(
      "No messages yet",
      "When buyers contact you about a product or property, conversations will show up here.",
      ""
    );
      return;
    }
    list.innerHTML = rows.map(c => `
      <div onclick="openConversation(${c.id})" style="padding:0.75rem;border-radius:8px;cursor:pointer;margin-bottom:0.35rem;${activeConvId===c.id?"background:#ecfdf5;":"background:#f9fafb;"}">
        <div style="font-weight:600;font-size:0.9rem;">${escapeHtml(c.buyer_name)}</div>
        <div style="font-size:0.8rem;color:#6b7280;">${escapeHtml(c.subject || "")}</div>
        <div style="font-size:0.75rem;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.last_message || "")}</div>
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
  }
}

async function openConversation(id) {
  activeConvId = id;
  loadConversations();
  const thread = document.getElementById("chatThread");
  const form = document.getElementById("chatReplyForm");
  form?.classList.remove("hidden");
  try {
    const data = await apiGet(`/chat/${id}/messages`);
    thread.innerHTML = (data.messages || []).map(m => {
      const mine = m.sender_type === "seller";
      return `<div style="margin-bottom:0.6rem;text-align:${mine?"right":"left"};">
        <div style="display:inline-block;max-width:80%;padding:0.5rem 0.75rem;border-radius:10px;background:${mine?"#d1fae5":"#f3f4f6"};font-size:0.9rem;">
          <div style="font-size:0.7rem;color:#6b7280;margin-bottom:0.15rem;">${escapeHtml(m.sender_name)}</div>
          ${escapeHtml(m.body)}
        </div>
      </div>`;
    }).join("") || `<p style="color:#6b7280;">No messages</p>`;
    thread.scrollTop = thread.scrollHeight;
  } catch (e) {
    thread.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
  }
}

document.getElementById("chatReplyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeConvId) return;
  const input = document.getElementById("chatReplyInput");
  const body = input.value.trim();
  if (!body) return;
  try {
    await apiPost(`/chat/${activeConvId}/messages`, {
      message: body,
      sender_type: "seller"
    }, true);
    input.value = "";
    openConversation(activeConvId);
  } catch (err) {
    alert(err.message);
  }
});

// Add Message buttons into product modal rendering - patch buy area via helper
function addChatButtonToProductActions(productId) {
  return `<button class="btn btn-outline btn-sm" onclick="openChatStart(${productId}, null)">💬 Message</button>`;
}

// Track product views
const _openProductModalAnalytics = openProductModal;
openProductModal = async function(id) {
  try { apiPost("/analytics/view", { path: "product", product_id: id }); } catch(e){}
  return _openProductModalAnalytics(id);
};

const _openPropertyModalAnalytics = typeof openPropertyModal === "function" ? openPropertyModal : null;
if (_openPropertyModalAnalytics) {
  openPropertyModal = async function(id) {
    try { apiPost("/analytics/view", { path: "property", property_id: id }); } catch(e){}
    return _openPropertyModalAnalytics(id);
  };
}

// Enhance product detail to include Message button - override render when modal opens
const _renderProductDetailsChat = typeof renderProductDetails === "function" ? renderProductDetails : null;
if (_renderProductDetailsChat) {
  renderProductDetails = function(product) {
    _renderProductDetailsChat(product);
    // Inject message button after whatsapp button if present
    setTimeout(() => {
      const info = document.querySelector("#modalBody .modal-info");
      if (!info || document.getElementById("inAppMsgBtn")) return;
      const btn = document.createElement("button");
      btn.id = "inAppMsgBtn";
      btn.className = "btn btn-outline btn-full";
      btn.style.marginTop = "0.5rem";
      btn.textContent = "💬 Message seller in-app";
      btn.onclick = () => openChatStart(product.id, null);
      const wa = info.querySelector(".btn-whatsapp");
      if (wa) wa.after(btn);
      else info.appendChild(btn);
    }, 50);
  };
}

// Property contact: add in-app message option in modal body via mutation - simpler: patch contact in openPropertyModal result
// Already have contactAgent - add button in openPropertyModal HTML if we re-open - patch openPropertyModal completion

// ===== Analytics =====
async function loadAnalytics() {
  const key = sessionStorage.getItem("wm_admin_key");
  const grid = document.getElementById("analyticsGrid");
  if (!key || !grid) return;
  try {
    const res = await fetch(`${API_BASE}/admin/analytics`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed");
    const d = await res.json();
    const cards = [
      ["Sellers", d.sellers],
      ["Products", d.products],
      ["Properties", d.properties],
      ["Page views", d.page_views],
      ["Inquiries", d.inquiries],
      ["Messages", d.messages],
      ["Orders", d.orders_total],
      ["Paid orders", d.orders_paid],
      [`Revenue (${d.currency})`, Number(d.revenue || 0).toFixed(2)],
      ["Pending KYC", d.pending_kyc],
      ["Pending agents", d.pending_agents],
    ];
    grid.innerHTML = cards.map(([label, val]) => `
      <div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,0.06);text-align:center;">
        <div style="font-size:1.5rem;font-weight:700;color:#0f172a;">${val}</div>
        <div style="font-size:0.8rem;color:#6b7280;margin-top:0.25rem;">${label}</div>
      </div>
    `).join("");
  } catch (e) {
    grid.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
  }
}

const _showAdminTabFull = showAdminTab;
showAdminTab = function(tab) {
  document.getElementById("adminTabAnalytics")?.classList.add("hidden");
  document.getElementById("adminTabAgents")?.classList.add("hidden");
  _showAdminTabFull(tab);
  if (tab === "analytics") {
    ["sellers", "kyc", "products", "inquiries", "orders", "settings", "agents"].forEach(t => {
      const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
      document.getElementById(name)?.classList.add("hidden");
    });
    document.getElementById("adminTabAnalytics")?.classList.remove("hidden");
    loadAnalytics();
  }
};

const _showSectionLow = showSection;
showSection = function(id) {
  _showSectionLow(id);
  if (id === "messages") loadConversations();
  if (id === "help") renderSupportContacts();
  if (id === "agentVerify") checkAgentStatus();
  if (id === "account") loadAccountPage();
  if (id === "houses") loadProperties();
  if (id === "dashboard") loadDashboard();
  if (id === "kyc") checkKycStatus();
};

// Face-check assist on KYC submit (non-blocking)
const kycFormEl = document.getElementById("kycForm");
if (kycFormEl) {
  kycFormEl.addEventListener("submit", async () => {
    try {
      const selfie = document.getElementById("kycSelfie")?.value;
      const idDoc = document.getElementById("kycIdDoc")?.value;
      if (selfie && idDoc && currentSeller) {
        await apiPost("/kyc/face-check", { selfie_url: selfie, id_document_url: idDoc }, true);
      }
    } catch (e) { /* assist only */ }
  }, true);
}

// Responsive chat layout
const styleChat = document.createElement("style");
styleChat.textContent = `@media (max-width:720px){ #messagesLayout{grid-template-columns:1fr !important;} }`;
document.head.appendChild(styleChat);

// Verify subscription payment return from Paystack
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("reference") || params.get("trxref");
  if (ref && ref.startsWith("SUB-") && localStorage.getItem("wm_token")) {
    try {
      const result = await apiGet(`/subscription/pay/verify/${ref}`, true);
      if (result.status === "success") {
        alert("✅ Subscription payment successful!\nValid until: " + new Date(result.expires_at).toLocaleDateString());
        showSection("dashboard");
        loadDashboard();
      }
    } catch (e) {
      alert("Subscription verification: " + e.message);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }
});

async function loadAdminSettings() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  try {
    const res = await fetch(`${API_BASE}/admin/settings`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; };
    set("settingPriceFirst", data.price_first);
    set("settingPriceRenewal", data.price_renewal);
    set("settingCurrency", data.currency || "GHS");
    const en = document.getElementById("settingPaystackEnabled");
    if (en) en.checked = !!data.paystack_enabled;
    set("settingPaystackPublic", data.paystack_public_key || "");
    set("settingPaystackSecret", data.paystack_secret_key || "");
    set("settingCloudName", data.cloudinary_cloud_name || "");
    set("settingCloudKey", data.cloudinary_api_key || "");
    set("settingCloudSecret", data.cloudinary_api_secret || "");
    const note = document.getElementById("smtpStatusNote");
    if (note) {
      note.textContent = data.smtp_configured
        ? "Email: SMTP is configured on the server."
        : "Email: SMTP not configured yet. Set SMTP_HOST, SMTP_USER, SMTP_PASS, FRONTEND_URL on Railway.";
    }
  } catch (err) {
    console.error(err);
  }
}

async function saveAdminSettings() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  const payload = {
    price_first: parseFloat(document.getElementById("settingPriceFirst")?.value),
    price_renewal: parseFloat(document.getElementById("settingPriceRenewal")?.value),
    currency: document.getElementById("settingCurrency")?.value.trim() || "GHS",
    paystack_enabled: document.getElementById("settingPaystackEnabled")?.checked || false,
    paystack_public_key: document.getElementById("settingPaystackPublic")?.value.trim() || "",
    paystack_secret_key: document.getElementById("settingPaystackSecret")?.value.trim() || "",
    cloudinary_cloud_name: document.getElementById("settingCloudName")?.value.trim() || "",
    cloudinary_api_key: document.getElementById("settingCloudKey")?.value.trim() || "",
    cloudinary_api_secret: document.getElementById("settingCloudSecret")?.value.trim() || "",
  };
  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": key },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    await checkPaystackConfig();
    const msg = document.getElementById("settingsMsg");
    if (msg) {
      msg.textContent = "✓ Settings saved successfully";
      msg.style.color = "#059669";
      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 4000);
    }
  } catch (err) {
    const msg = document.getElementById("settingsMsg");
    if (msg) {
      msg.textContent = "Error: " + err.message;
      msg.style.color = "#b91c1c";
      msg.classList.remove("hidden");
    }
  }
}

// ===== Free biometric face matching (face-api.js in browser) =====
let faceModelsLoaded = false;

async function loadFaceModels() {
  if (faceModelsLoaded) return true;
  if (typeof faceapi === "undefined") {
    console.warn("face-api.js not loaded");
    return false;
  }
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";
  // fallback models path for face-api 0.22
  const URLS = [
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model",
    "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights",
  ];
  for (const url of URLS) {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(url),
        faceapi.nets.faceLandmark68Net.loadFromUri(url),
        faceapi.nets.faceRecognitionNet.loadFromUri(url),
      ]);
      faceModelsLoaded = true;
      console.log("Face models loaded from", url);
      return true;
    } catch (e) {
      console.warn("Model load failed from", url, e);
    }
  }
  return false;
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function compareFaces(selfieUrl, idDocUrl) {
  const status = document.getElementById("kycFaceMatchStatus");
  const setStatus = (t, color) => {
    if (status) {
      status.textContent = t;
      status.style.color = color || "#6b7280";
    }
  };

  setStatus("Loading face recognition models (free, on-device)...");
  const ok = await loadFaceModels();
  if (!ok) {
    setStatus("Face models could not load. Admin will review manually.", "#d97706");
    return { score: null, label: "model_unavailable" };
  }

  setStatus("Detecting faces in selfie and ID document...");
  try {
    const [selfieImg, idImg] = await Promise.all([
      loadImageElement(selfieUrl),
      loadImageElement(idDocUrl),
    ]);

    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });
    const selfieDet = await faceapi
      .detectSingleFace(selfieImg, opts)
      .withFaceLandmarks()
      .withFaceDescriptor();
    const idDet = await faceapi
      .detectSingleFace(idImg, opts)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!selfieDet) {
      setStatus("No face detected in selfie. Use a clearer front-facing photo.", "#b91c1c");
      return { score: null, label: "no_face_selfie" };
    }
    if (!idDet) {
      setStatus("No face detected on ID document. Upload a clearer ID photo.", "#b91c1c");
      return { score: null, label: "no_face_id" };
    }

    const distance = faceapi.euclideanDistance(selfieDet.descriptor, idDet.descriptor);
    // Lower distance = more similar. Typical threshold ~0.6
    const score = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
    let label = "review";
    if (distance < 0.45) label = "strong_match";
    else if (distance < 0.6) label = "possible_match";
    else label = "weak_match";

    const colors = { strong_match: "#059669", possible_match: "#d97706", weak_match: "#b91c1c" };
    const messages = {
      strong_match: `Face match: ${score}% — strong match (distance ${distance.toFixed(3)})`,
      possible_match: `Face match: ${score}% — possible match; admin will confirm`,
      weak_match: `Face match: ${score}% — weak match; admin review required`,
    };
    setStatus(messages[label], colors[label]);

    return { score, label, distance };
  } catch (e) {
    console.error(e);
    setStatus("Face comparison failed. Admin will review manually.", "#d97706");
    return { score: null, label: "error" };
  }
}

// Hook KYC form submit to run face match first
(function enhanceKycSubmit() {
  const form = document.getElementById("kycForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    // This runs in bubble phase after our earlier listener may have fired.
    // We intercept with capture on a dedicated path by replacing handler.
  }, true);
})();

// Replace KYC submit with face-aware version
document.getElementById("kycForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!currentSeller) return openAuthModal("login");

  const idDoc = document.getElementById("kycIdDoc").value.trim();
  const selfie = document.getElementById("kycSelfie").value.trim();
  if (!idDoc || !selfie) {
    alert("Please upload both ID document and selfie first.");
    return;
  }

  const match = await compareFaces(selfie, idDoc);

  const payload = {
    full_name: document.getElementById("kycFullName").value.trim(),
    id_number: document.getElementById("kycIdNumber").value.trim(),
    address: document.getElementById("kycAddress").value.trim(),
    id_document_url: idDoc,
    selfie_url: selfie,
    face_match_score: match.score,
    face_match_label: match.label,
  };

  try {
    await apiPost("/kyc/submit", payload, true);
    try {
      await apiPost("/kyc/face-match", {
        face_match_score: match.score,
        face_match_label: match.label,
      }, true);
    } catch (e2) { /* optional */ }
    alert("KYC submitted with face match result. Waiting for admin approval.");
    checkKycStatus();
  } catch (err) {
    alert("Error: " + err.message);
  }
}, true);

// Show face match in admin KYC cards - enhance loadPendingKyc display
const _loadPendingKycFace = typeof loadPendingKyc === "function" ? loadPendingKyc : null;
// Patch by wrapping after load - inject into existing function output via override at end of loadPendingKyc
// Safer: monkey-patch after responses - update loadPendingKyc HTML generation is hard; add note in review.

// ===== Web Push (phone OS notifications) =====
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push notifications are not supported in this browser.");
    return;
  }
  if (!currentSeller) {
    openAuthModal("login");
    return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      alert("Notification permission denied.");
      return;
    }
    const cfg = await apiGet("/push/vapid-public-key");
    if (!cfg.enabled || !cfg.publicKey) {
      alert("Push is not configured on the server yet. Set VAPID keys on Railway (see DEPLOY.md).");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
    }
    const json = sub.toJSON();
    await apiPost("/push/subscribe", {
      endpoint: json.endpoint,
      keys: json.keys,
    }, true);
    alert("Phone notifications enabled! You will get alerts for messages, orders, and KYC updates.");
    localStorage.setItem("wm_push_on", "1");
  } catch (e) {
    console.error(e);
    alert("Could not enable push: " + e.message);
  }
}

async function disablePushNotifications() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const json = sub.toJSON();
      await apiPost("/push/unsubscribe", { endpoint: json.endpoint }, true);
      await sub.unsubscribe();
    }
    localStorage.removeItem("wm_push_on");
    alert("Push notifications disabled.");
  } catch (e) {
    alert(e.message);
  }
}

// Add push toggle on account page when loaded
const _loadAccountPagePush = typeof loadAccountPage === "function" ? loadAccountPage : null;
if (_loadAccountPagePush) {
  loadAccountPage = async function() {
    await _loadAccountPagePush();
    const container = document.getElementById("accountContent");
    if (!container || !currentSeller) return;
    if (document.getElementById("pushEnableBtn")) return;
    const box = document.createElement("div");
    box.style.cssText = "background:white;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:1.25rem;";
    box.innerHTML = `
      <h3 style="margin-bottom:0.5rem;font-size:1.1rem;">Phone notifications</h3>
      <p style="font-size:0.9rem;color:#6b7280;margin-bottom:1rem;">Get OS alerts for new messages, paid orders, and KYC/agent updates. Works when the site is installed as an app or open in the browser.</p>
      <button type="button" class="btn btn-primary btn-sm" id="pushEnableBtn" onclick="enablePushNotifications()">Enable push notifications</button>
      <button type="button" class="btn btn-outline btn-sm" id="pushDisableBtn" onclick="disablePushNotifications()">Disable</button>
    `;
    container.insertBefore(box, container.firstChild);
  };
}

// Admin: show face match on pending KYC - enhance after load
const _origLoadPendingKyc = typeof loadPendingKyc === "function" ? loadPendingKyc : null;
if (_origLoadPendingKyc) {
  loadPendingKyc = async function() {
    await _origLoadPendingKyc();
    // Try to inject face scores if table has structure - fetch again for scores
    const key = sessionStorage.getItem("wm_admin_key");
    const table = document.getElementById("kycTable");
    if (!key || !table) return;
    try {
      const res = await fetch(`${API_BASE}/admin/kyc/pending`, { headers: { "X-Admin-Key": key } });
      const list = await res.json();
      list.forEach((s) => {
        if (s.face_match_label || s.face_match_score != null) {
          // already in HTML if we update loadPendingKyc - append badges via text search
        }
      });
      // Re-render with face match
      if (!list.length) return;
      let html = `<div style="display:flex;flex-direction:column;gap:1.25rem;">`;
      list.forEach(s => {
        const faceInfo = s.face_match_label
          ? `<div style="margin-top:0.35rem;font-size:0.85rem;"><strong>Face match:</strong> ${escapeHtml(String(s.face_match_label))} ${s.face_match_score != null ? `(${s.face_match_score}%)` : ""}</div>`
          : "";
        html += `
        <div style="background:white;border-radius:12px;padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <strong style="font-size:1.1rem;">${escapeHtml(s.shop_name)}</strong>
              <div style="font-size:0.85rem;color:#6b7280;">@${escapeHtml(s.username)} · ${escapeHtml(s.email)}</div>
              <div style="margin-top:0.6rem;font-size:0.9rem;line-height:1.6;">
                <div><strong>Full Name:</strong> ${escapeHtml(s.full_name || "—")}</div>
                <div><strong>ID Number:</strong> ${escapeHtml(s.id_number || "—")}</div>
                <div><strong>Address:</strong> ${escapeHtml(s.address || "—")}</div>
                ${faceInfo}
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-primary" onclick="reviewKyc(${s.id}, 'approve')">✓ Approve</button>
              <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="reviewKyc(${s.id}, 'reject')">✗ Reject</button>
            </div>
          </div>
          <div style="display:flex;gap:1.25rem;margin-top:1.25rem;flex-wrap:wrap;">
            ${s.id_document_url ? `<div><div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;">ID Document</div><a href="${s.id_document_url}" target="_blank"><img src="${s.id_document_url}" style="max-width:220px;max-height:160px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;" /></a></div>` : ""}
            ${s.selfie_url ? `<div><div style="font-size:0.8rem;font-weight:600;margin-bottom:0.35rem;">Face Selfie</div><a href="${s.selfie_url}" target="_blank"><img src="${s.selfie_url}" style="max-width:220px;max-height:160px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;" /></a></div>` : ""}
          </div>
        </div>`;
      });
      html += `</div>`;
      table.innerHTML = html;
    } catch (e) {}
  };
}


// ===== Reports =====
function openReportModal(targetType, targetId, targetName) {
  document.getElementById("reportTargetType").value = targetType || "other";
  document.getElementById("reportTargetId").value = targetId || "";
  document.getElementById("reportTargetName").value = targetName || "";
  document.getElementById("reportMsg")?.classList.add("hidden");
  document.getElementById("reportModal")?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReportModal() {
  document.getElementById("reportModal")?.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("reportForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("reportMsg");
  try {
    await apiPost("/reports", {
      target_type: document.getElementById("reportTargetType").value,
      target_id: document.getElementById("reportTargetId").value
        ? Number(document.getElementById("reportTargetId").value)
        : null,
      target_name: document.getElementById("reportTargetName").value,
      reason: document.getElementById("reportReason").value,
      details: document.getElementById("reportDetails").value.trim(),
      reporter_name: document.getElementById("reportName").value.trim() || "Anonymous",
      reporter_email: document.getElementById("reportEmail").value.trim() || null,
    });
    msg.textContent = "Report submitted. Thank you.";
    msg.style.color = "#059669";
    msg.classList.remove("hidden");
    e.target.reset();
    setTimeout(closeReportModal, 1500);
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "#b91c1c";
    msg.classList.remove("hidden");
  }
});

// Inject Report button into product modal
const _renderProductDetailsReport = typeof renderProductDetails === "function" ? renderProductDetails : null;
if (_renderProductDetailsReport) {
  renderProductDetails = function(product) {
    _renderProductDetailsReport(product);
    setTimeout(() => {
      const info = document.querySelector("#modalBody .modal-info");
      if (!info || document.getElementById("reportProductBtn")) return;
      const btn = document.createElement("button");
      btn.id = "reportProductBtn";
      btn.className = "btn btn-outline btn-sm";
      btn.style.marginTop = "0.75rem";
      btn.textContent = "⚑ Report listing";
      btn.onclick = () => openReportModal("product", product.id, product.name);
      info.appendChild(btn);
    }, 80);
  };
}

async function loadAdminReports() {
  const key = sessionStorage.getItem("wm_admin_key");
  const table = document.getElementById("reportsTable");
  if (!key || !table) return;
  try {
    const res = await fetch(`${API_BASE}/admin/reports`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed to load reports");
    const list = await res.json();
    if (!list.length) {
      table.innerHTML = `<p style="color:#6b7280;padding:1rem;">No reports yet.</p>`;
      return;
    }
    table.innerHTML = list.map(r => {
      const st = r.status || "open";
      const color = st === "open" ? "#d97706" : st === "resolved" ? "#059669" : "#6b7280";
      return `<div style="background:white;border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
          <div>
            <div style="font-weight:600;">${escapeHtml(r.reason)} · <span style="color:${color};text-transform:uppercase;font-size:0.8rem;">${escapeHtml(st)}</span></div>
            <div style="font-size:0.85rem;color:#6b7280;">${escapeHtml(r.target_type || "")} ${r.target_name ? "— " + escapeHtml(r.target_name) : ""} ${r.target_id ? "#" + r.target_id : ""}</div>
            <div style="font-size:0.9rem;margin-top:0.35rem;">${escapeHtml(r.details || "")}</div>
            <div style="font-size:0.8rem;color:#9ca3af;margin-top:0.35rem;">By ${escapeHtml(r.reporter_name || "Anonymous")} ${r.reporter_email ? "(" + escapeHtml(r.reporter_email) + ")" : ""} · ${r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
          </div>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" onclick="updateReportStatus(${r.id}, 'resolved')">Resolve</button>
            <button class="btn btn-sm btn-outline" onclick="updateReportStatus(${r.id}, 'dismissed')">Dismiss</button>
            <button class="btn btn-sm btn-outline" onclick="updateReportStatus(${r.id}, 'open')">Reopen</button>
          </div>
        </div>
      </div>`;
    }).join("");
  } catch (e) {
    table.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
  }
}

async function updateReportStatus(id, status) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  try {
    const res = await fetch(`${API_BASE}/admin/reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": key },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error("Update failed");
    loadAdminReports();
  } catch (e) {
    alert(e.message);
  }
}

const _showAdminTabReports = showAdminTab;
showAdminTab = function(tab) {
  document.getElementById("adminTabReports")?.classList.add("hidden");
  _showAdminTabReports(tab);
  if (tab === "reports") {
    ["sellers", "kyc", "products", "inquiries", "orders", "settings", "agents", "analytics"].forEach(t => {
      const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
      document.getElementById(name)?.classList.add("hidden");
    });
    document.getElementById("adminTabReports")?.classList.remove("hidden");
    loadAdminReports();
  }
};

// ===== Backup & DB status =====
async function loadDbStatus() {
  const key = sessionStorage.getItem("wm_admin_key");
  const box = document.getElementById("dbStatusBox");
  if (!key || !box) return;
  try {
    const res = await fetch(`${API_BASE}/admin/db-status`, { headers: { "X-Admin-Key": key } });
    if (!res.ok) throw new Error("Failed to load DB status");
    const d = await res.json();
    const okColor = d.persistent ? "#059669" : "#b91c1c";
    const counts = d.table_counts || {};
    box.innerHTML = `
      <div style="font-weight:700;color:${okColor};margin-bottom:0.5rem;">
        ${d.persistent ? "✓ Persistent database (PostgreSQL)" : "⚠ SQLite — not safe for production on Railway"}
      </div>
      <div style="font-size:0.9rem;line-height:1.6;color:#374151;">
        <div><strong>Engine:</strong> ${escapeHtml(d.engine)}</div>
        <div><strong>DATABASE_URL set:</strong> ${d.database_url_set ? "Yes" : "No"}</div>
        <div><strong>REQUIRE_POSTGRES:</strong> ${d.require_postgres ? "Yes" : "No"}</div>
        <div style="margin-top:0.5rem;"><strong>Row counts:</strong>
          sellers ${counts.sellers ?? "—"},
          products ${counts.products ?? "—"},
          properties ${counts.properties ?? "—"},
          orders ${counts.orders ?? "—"},
          reports ${counts.reports ?? "—"},
          messages ${counts.messages ?? "—"}
        </div>
        <div style="margin-top:0.75rem;padding:0.75rem;background:#f9fafb;border-radius:8px;font-size:0.85rem;">
          ${escapeHtml(d.recommendation || "")}
        </div>
      </div>`;
  } catch (e) {
    box.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
  }
}

function downloadFullBackup() {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  // fetch as blob so we can send header
  fetch(`${API_BASE}/admin/backup`, { headers: { "X-Admin-Key": key } })
    .then(r => {
      if (!r.ok) throw new Error("Backup failed");
      return r.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sungarland-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(e => alert(e.message));
}

function downloadTableExport(table) {
  const key = sessionStorage.getItem("wm_admin_key");
  if (!key) return;
  fetch(`${API_BASE}/admin/export/${table}?format=csv`, { headers: { "X-Admin-Key": key } })
    .then(r => {
      if (!r.ok) throw new Error("Export failed");
      return r.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(e => alert(e.message));
}

const _showAdminTabBackup = showAdminTab;
showAdminTab = function(tab) {
  document.getElementById("adminTabBackup")?.classList.add("hidden");
  _showAdminTabBackup(tab);
  if (tab === "backup") {
    ["sellers", "kyc", "products", "inquiries", "orders", "settings", "agents", "analytics", "reports"].forEach(t => {
      const name = "adminTab" + t.charAt(0).toUpperCase() + t.slice(1);
      document.getElementById(name)?.classList.add("hidden");
    });
    document.getElementById("adminTabBackup")?.classList.remove("hidden");
    loadDbStatus();
  }
};
