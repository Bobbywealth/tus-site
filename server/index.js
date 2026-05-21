"use strict";

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Stripe ──────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

console.log("STRIPE_KEY starts with:", (process.env.STRIPE_SECRET_KEY || "").substring(0, 12));
console.log("STRIPE_KEY length:", (process.env.STRIPE_SECRET_KEY || "").length);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://theuntoldseason.com,http://localhost:5173").split(",");

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow any origin that starts with an allowed prefix
      const allowed = allowedOrigins.some((o) => origin.startsWith(o.trim()));
      if (allowed) return callback(null, true);
      // Reject — but don't throw, just deny
      callback(new Error(`CORS not allowed: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Raw body for Stripe webhooks ──────────────────────────────────────────────
app.use("/webhook", express.raw({ type: "application/json" }));

// ── JSON body parser for all other routes ─────────────────────────────────────
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "tus-api" }));

// ── Product catalog ───────────────────────────────────────────────────────────
const PRODUCTS = {
  "tus-tee": {
    id: "tus-tee",
    name: "TUS Signature T-Shirt",
    type: "Apparel",
    price: 2500,
    priceDisplay: "$25.00",
    options: ["S", "M", "L", "XL", "2XL"],
    active: true,
  },
  "tus-hat": {
    id: "tus-hat",
    name: "TUS Dad Hat",
    type: "Headwear",
    price: 1999,
    priceDisplay: "$19.99",
    options: ["One Size"],
    active: true,
  },
  "tus-hoodie": {
    id: "tus-hoodie",
    name: "TUS Premium Hoodie",
    type: "Apparel",
    price: 4499,
    priceDisplay: "$44.99",
    options: ["S", "M", "L", "XL", "2XL"],
    active: true,
  },
  "tus-mug": {
    id: "tus-mug",
    name: "TUS Coffee Mug",
    type: "Accessories",
    price: 1200,
    priceDisplay: "$12.00",
    options: ["11 oz"],
    active: true,
  },
  "tus-crop-top": {
    id: "tus-crop-top",
    name: "TUS Crop Top",
    type: "Women's Apparel",
    price: 2500,
    priceDisplay: "$25.00",
    options: ["XS", "S", "M", "L"],
    active: true,
  },
};

app.get("/api/products", (_req, res) => {
  const active = Object.values(PRODUCTS).filter((p) => p.active);
  res.json({ products: active });
});

app.get("/api/products/:id", (req, res) => {
  const product = PRODUCTS[req.params.id];
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// ── Checkout ──────────────────────────────────────────────────────────────────
const VALID_PRODUCT_IDS = new Set(Object.keys(PRODUCTS));

app.post("/api/checkout", async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items provided" });
  }

  for (const item of items) {
    if (!VALID_PRODUCT_IDS.has(item.id)) {
      return res.status(400).json({ error: `Invalid product ID: ${item.id}` });
    }
    if (!item.option || typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 10) {
      return res.status(400).json({ error: `Invalid quantity for ${item.id}` });
    }
  }

  const lineItems = items.map((item) => {
    const product = PRODUCTS[item.id];
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
          description: `Size/Option: ${item.option}`,
          images: [],
        },
        unit_amount: product.price,
      },
      quantity: item.quantity,
    };
  });

  try {
    console.log("Creating Stripe session with", lineItems.length, "items, total:",
      lineItems.reduce((s, i) => s + (i.price_data.unit_amount * i.quantity), 0) / 100, "USD");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${getOrigin(req)}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getOrigin(req)}/#store`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
      metadata: {
        items_json: JSON.stringify(items),
      },
      phone_number_collection: { enabled: true },
    });

    console.log("Session created:", session.id);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe session error:", err.message);
    console.error("Stripe error type:", err.type);
    console.error("Stripe error code:", err.code);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

app.get("/api/checkout/:sessionId", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
      expand: ["payment_intent"],
    });
    res.json({
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
    });
  } catch (err) {
    console.error("Stripe retrieve error:", err.message);
    res.status(500).json({ error: "Failed to retrieve session" });
  }
});

// ── Webhook ──────────────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.log("No webhook secret configured — skipping verification");
    return res.json({ received: true });
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Payment succeeded:", session.id, "—", session.customer_details?.email);
  }

  res.json({ received: true });
});

// ── Orders (in-memory store) ─────────────────────────────────────────────────
const orders = [];

app.get("/api/orders", (_req, res) => res.json({ orders }));
app.get("/api/orders/:sessionId", (req, res) => {
  const order = orders.find((o) => o.sessionId === req.params.sessionId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// ── Debug route ──────────────────────────────────────────────────────────────
app.get("/api/debug/key", (_req, res) => {
  const key = process.env.STRIPE_SECRET_KEY || "";
  res.json({
    prefix: key.substring(0, 12),
    length: key.length,
    hasSpaces: key.includes(" "),
    dotCount: (key.match(/\./g) || []).length,
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function getOrigin(req) {
  return `https://theuntoldseason.com`;
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎙️  tus-api running on port ${PORT}`);
  console.log(`   Stripe mode: ${process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "TEST/INVALID"}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(", ")}\n`);
});
