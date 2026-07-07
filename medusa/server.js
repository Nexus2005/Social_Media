const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 9000;

// Universal CORS middleware supporting public cross-origin API requests
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-medusa-access-token, x-publishable-api-key, x-medusa-locale");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(express.json());

// Sample Medusa Products Catalog
const products = [
  {
    id: "prod_01H1",
    title: "Cartly Studio Cyber Hoodie",
    handle: "cyber-hoodie",
    description: "Premium heavyweight organic cotton hoodie with metallic Cartly embroidery and futuristic silhouette.",
    thumbnail: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600",
    images: [
      { url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600" },
      { url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=600" }
    ],
    collection_id: "col_streetwear",
    category_id: "cat_apparel",
    variants: [
      { id: "var_01A", title: "Size M / Obsidian Black", prices: [{ amount: 8900, currency_code: "usd" }] },
      { id: "var_01B", title: "Size L / Obsidian Black", prices: [{ amount: 8900, currency_code: "usd" }] }
    ]
  },
  {
    id: "prod_02H2",
    title: "Quantum Wireless ANC Headphones",
    handle: "quantum-headphones",
    description: "Spatial audio headphone headset with hybrid noise cancellation and 40-hour battery life.",
    thumbnail: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    images: [
      { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600" }
    ],
    collection_id: "col_audio",
    category_id: "cat_electronics",
    variants: [
      { id: "var_02A", title: "Matte Black", prices: [{ amount: 24900, currency_code: "usd" }] }
    ]
  },
  {
    id: "prod_03H3",
    title: "Aura Minimalist Smart Watch",
    handle: "aura-smartwatch",
    description: "Ultra-thin titanium body smart watch with biometric heart rate tracking and OLED canvas display.",
    thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    images: [
      { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600" }
    ],
    collection_id: "col_trending",
    category_id: "cat_watches",
    variants: [
      { id: "var_03A", title: "Titanium Silver", prices: [{ amount: 19900, currency_code: "usd" }] }
    ]
  },
  {
    id: "prod_04H4",
    title: "Vortex Pro Ergonomic Sneakers",
    handle: "vortex-sneakers",
    description: "Lightweight mesh running sneakers engineered with responsive air cushioning.",
    thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    images: [
      { url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" }
    ],
    collection_id: "col_streetwear",
    category_id: "cat_footwear",
    variants: [
      { id: "var_04A", title: "US 10 / Flame Red", prices: [{ amount: 12900, currency_code: "usd" }] }
    ]
  }
];

const collections = [
  { id: "col_streetwear", title: "Streetwear Essentials", handle: "streetwear" },
  { id: "col_audio", title: "Hi-Fi Audio Gear", handle: "audio" },
  { id: "col_trending", title: "Trending on Cartly", handle: "trending" }
];

const categories = [
  { id: "cat_apparel", name: "Apparel & Fashion", handle: "apparel" },
  { id: "cat_electronics", name: "Electronics & Tech", handle: "electronics" },
  { id: "cat_watches", name: "Watches & Accessories", handle: "watches" },
  { id: "cat_footwear", name: "Footwear & Kicks", handle: "footwear" }
];

// In-memory Cart Store
const activeCarts = {};

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Medusa Commerce Engine", port: PORT });
});

// GET /store/products
app.get("/store/products", (req, res) => {
  let list = [...products];
  if (req.query.handle) {
    list = list.filter(p => p.handle === req.query.handle || p.id === req.query.handle);
  }
  if (req.query.category_id) {
    list = list.filter(p => p.category_id === req.query.category_id);
  }
  if (req.query.collection_id) {
    list = list.filter(p => p.collection_id === req.query.collection_id);
  }
  if (req.query.q) {
    const query = String(req.query.q).toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
  }
  res.json({ products: list, count: list.length });
});

// GET /store/products/:id
app.get("/store/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id || p.handle === req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json({ product });
});

// GET /store/collections
app.get("/store/collections", (req, res) => {
  res.json({ collections });
});

// GET /store/product-categories
app.get("/store/product-categories", (req, res) => {
  res.json({ product_categories: categories });
});

// POST /store/carts
app.post("/store/carts", (req, res) => {
  const id = "cart_" + Math.random().toString(36).substring(2, 9);
  const cart = {
    id,
    items: [],
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0,
    total: 0
  };
  activeCarts[id] = cart;
  res.json({ cart });
});

// GET /store/carts/:id
app.get("/store/carts/:id", (req, res) => {
  const cart = activeCarts[req.params.id] || {
    id: req.params.id,
    items: [],
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0,
    total: 0
  };
  res.json({ cart });
});

// POST /store/carts/:id/line-items
app.post("/store/carts/:id/line-items", (req, res) => {
  const cart = activeCarts[req.params.id] || {
    id: req.params.id,
    items: [],
    subtotal: 0,
    shipping_total: 0,
    tax_total: 0,
    total: 0
  };

  const { variant_id, quantity } = req.body;
  let targetProd = null;
  let targetVar = null;

  for (const p of products) {
    const v = p.variants.find(varItem => varItem.id === variant_id);
    if (v) {
      targetProd = p;
      targetVar = v;
      break;
    }
  }

  const unitPrice = targetVar ? targetVar.prices[0].amount : 5000;
  const existingIndex = cart.items.findIndex(i => i.variant_id === variant_id);

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += (quantity || 1);
  } else {
    cart.items.push({
      id: "item_" + Math.random().toString(36).substring(2, 9),
      variant_id,
      title: targetProd ? targetProd.title : "Product Item",
      description: targetVar ? targetVar.title : "Variant",
      thumbnail: targetProd ? targetProd.thumbnail : "",
      unit_price: unitPrice,
      quantity: quantity || 1
    });
  }

  // Calculate totals
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  cart.total = cart.subtotal;
  activeCarts[cart.id] = cart;

  res.json({ cart });
});

// POST /store/carts/:id/complete
app.post("/store/carts/:id/complete", (req, res) => {
  const cart = activeCarts[req.params.id];
  const orderId = "order_" + Math.random().toString(36).substring(2, 9);
  delete activeCarts[req.params.id];

  res.json({
    type: "order",
    data: {
      id: orderId,
      status: "completed",
      total: cart ? cart.total : 0
    }
  });
});

app.listen(PORT, () => {
  console.log(`\x1b[35m[MEDUSA]\x1b[0m Commerce engine operational on http://localhost:${PORT}`);
});
