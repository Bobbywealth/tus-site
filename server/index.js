"use strict";

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Stripe ──────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const isLive = (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live");
console.log(`[boot] stripe mode: ${isLive ? "LIVE" : "TEST/INVALID"}`);

// ── Email (nodemailer SMTP) ─────────────────────────────────────────────────
// SMTP_URL is the easiest setup: smtps://user:pass@smtp.gmail.com:465
// For Gmail: enable 2FA → create an "App Password" at myaccount.google.com/apppasswords
// Then set SMTP_URL=smtps://yourname@gmail.com:abcd-efgh-ijkl-mnop@smtp.gmail.com:465
// AND set MAIL_FROM="The Untold Season <orders@theuntoldseason.com>"
// AND set NOTIFY_EMAIL=bobby@... (where YOU get the merchant alert)
const SMTP_URL = process.env.SMTP_URL || "";
const MAIL_FROM = process.env.MAIL_FROM || "The Untold Season <noreply@theuntoldseason.com>";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "";
const CUSTOMER_CONFIRMATION = process.env.CUSTOMER_CONFIRMATION !== "false"; // on by default

let transporter = null;
if (SMTP_URL) {
  try {
    transporter = nodemailer.createTransport(SMTP_URL);
    // verify so we fail loud at boot, not silently at first order
    transporter.verify().then(
      () => console.log("[boot] email transporter verified (SMTP_URL configured)"),
      (err) => console.error("[boot] email transporter verify FAILED:", err.message)
    );
  } catch (e) {
    console.error("[boot] email transporter init failed:", e.message);
  }
} else {
  console.warn("[boot] SMTP_URL not set — order emails DISABLED (set SMTP_URL + MAIL_FROM + NOTIFY_EMAIL to enable)");
}

async function sendMail(opts) {
  if (!transporter) {
    console.warn("[mail] skipped (no transporter):", opts.subject);
    return { skipped: true };
  }
  try {
    const info = await transporter.sendMail({ from: MAIL_FROM, ...opts });
    console.log(`[mail] sent: ${opts.subject} → ${info.messageId}`);
    return info;
  } catch (e) {
    console.error(`[mail] send FAILED for "${opts.subject}":`, e.message);
    throw e;
  }
}

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "https://theuntoldseason.com,http://localhost:5173"
).split(",");

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) => origin.startsWith(o.trim()));
      if (allowed) return callback(null, true);
      callback(new Error(`CORS not allowed: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsers ─────────────────────────────────────────────────────────────
// Stripe webhook needs the raw body for signature verification
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "tus-api",
    emailEnabled: Boolean(transporter),
    stripeMode: isLive ? "live" : "test",
  })
);

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
    if (
      !item.option ||
      typeof item.quantity !== "number" ||
      item.quantity < 1 ||
      item.quantity > 10
    ) {
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
    const total = lineItems.reduce(
      (s, i) => s + i.price_data.unit_amount * i.quantity,
      0
    ) / 100;
    console.log(
      `[checkout] session create — ${lineItems.length} line item(s), $${total} USD`
    );

    const publicUrl = process.env.PUBLIC_URL || "https://theuntoldseason.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${publicUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicUrl}/#store`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
      metadata: {
        items_json: JSON.stringify(items),
      },
      phone_number_collection: { enabled: true },
    });

    console.log(`[checkout] session created: ${session.id}`);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[checkout] stripe session error:", err.message, err.type, err.code);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

app.get("/api/checkout/:sessionId", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
      expand: ["payment_intent", "line_items"],
    });
    res.json({
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
    });
  } catch (err) {
    console.error("[checkout] retrieve error:", err.message);
    res.status(500).json({ error: "Failed to retrieve session" });
  }
});

// ── Order formatting helpers ────────────────────────────────────────────────
function formatLineItems(session) {
  const fromMetadata = (() => {
    try {
      const raw = session.metadata?.items_json;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  if (fromMetadata && fromMetadata.length) {
    return fromMetadata.map((it) => {
      const product = PRODUCTS[it.id];
      return {
        sku: it.id,
        name: product ? product.name : it.id,
        option: it.option || "—",
        quantity: it.quantity,
        lineTotal: product ? `$${((product.price * it.quantity) / 100).toFixed(2)}` : "—",
      };
    });
  }
  // Fallback: use Stripe's line_items (after expand)
  if (session.line_items?.data) {
    return session.line_items.data.map((li) => ({
      sku: li.price?.product || "?",
      name: li.description || "Item",
      option: "—",
      quantity: li.quantity,
      lineTotal: `$${((li.amount_total || 0) / 100).toFixed(2)}`,
    }));
  }
  return [];
}

function formatAddress(addr) {
  if (!addr) return null;
  return [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(", ");
}

function buildMerchantEmailHtml(order) {
  const itemsHtml = order.items
    .map(
      (it) =>
        `<tr><td>${it.name}</td><td>${it.option}</td><td>${it.quantity}</td><td>${it.lineTotal}</td></tr>`
    )
    .join("");
  return `
    <h2>💰 New Order Received</h2>
    <p><strong>Amount:</strong> $${(order.amountTotal / 100).toFixed(2)} ${order.currency.toUpperCase()}</p>
    <p><strong>Order ID:</strong> ${order.sessionId}</p>
    <hr>
    <h3>Customer</h3>
    <p>
      <strong>Name:</strong> ${order.customerName || "—"}<br>
      <strong>Email:</strong> ${order.customerEmail || "—"}<br>
      <strong>Phone:</strong> ${order.customerPhone || "—"}<br>
      <strong>Ship to:</strong> ${order.shipTo || "—"}
    </p>
    <h3>Items</h3>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <thead>
        <tr><th align="left">Item</th><th align="left">Option</th><th>Qty</th><th align="left">Total</th></tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p style="margin-top:24px">
      <a href="https://dashboard.stripe.com/test/payments/${order.paymentIntentId || ""}">
        View in Stripe Dashboard →
      </a>
    </p>
  `;
}

function buildCustomerEmailHtml(order) {
  const itemsHtml = order.items
    .map(
      (it) =>
        `<tr><td>${it.name}</td><td>${it.option}</td><td>${it.quantity}</td></tr>`
    )
    .join("");
  return `
    <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0f172a">Thanks for your order! 🎙️</h2>
      <p>Hi ${order.customerName || "there"},</p>
      <p>We received your order for <strong>The Untold Season</strong> merch. Heather and the team will get it shipped within 3–5 business days.</p>
      <h3>Your order</h3>
      <table border="1" cellpadding="8" style="border-collapse:collapse;border-color:#e2e8f0">
        <thead>
          <tr style="background:#f8fafc"><th align="left">Item</th><th align="left">Option</th><th>Qty</th></tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="margin-top:16px"><strong>Total:</strong> $${(order.amountTotal / 100).toFixed(2)}</p>
      <p style="color:#64748b;font-size:14px;margin-top:24px">
        Order ID: ${order.sessionId}<br>
        Questions? Reply to this email.
      </p>
    </div>
  `;
}

// ── Webhook (Stripe) ────────────────────────────────────────────────────────
// This is the ONLY reliable signal that money actually changed hands.
// success_url is hit on redirect, which can happen even for declined cards.
// Register the endpoint in Stripe Dashboard → Developers → Webhooks,
// point it at https://tus-api.onrender.com/webhook,
// and subscribe to: checkout.session.completed
// Then copy the signing secret to Render env var STRIPE_WEBHOOK_SECRET
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // Loud log so Bobby notices in the Render logs
    console.error(
      "[webhook] STRIPE_WEBHOOK_SECRET not set — cannot verify signature, ignoring event. " +
        "Set the env var in Render and register the endpoint in Stripe Dashboard."
    );
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`[webhook] signature verification FAILED: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[webhook] event received: ${event.type} (id=${event.id})`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Re-fetch with line_items expanded for richer emails
    let fullSession = session;
    try {
      fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items", "payment_intent"],
      });
    } catch (e) {
      console.warn(`[webhook] could not re-fetch session ${session.id}: ${e.message}`);
    }

    const order = {
      sessionId: fullSession.id,
      paymentIntentId:
        typeof fullSession.payment_intent === "string"
          ? fullSession.payment_intent
          : fullSession.payment_intent?.id,
      amountTotal: fullSession.amount_total || 0,
      currency: fullSession.currency || "usd",
      customerEmail: fullSession.customer_details?.email || fullSession.customer_email,
      customerName: fullSession.customer_details?.name,
      customerPhone: fullSession.customer_details?.phone,
      shipTo: formatAddress(fullSession.shipping_details?.address),
      items: formatLineItems(fullSession),
      paidAt: new Date(fullSession.created * 1000).toISOString(),
    };

    // 1) Always log to Render logs (free, durable while service is up)
    console.log(
      `\n📦 NEW ORDER ${order.sessionId} | $${(order.amountTotal / 100).toFixed(2)} ${order.currency.toUpperCase()} | ${order.customerEmail} | ${order.customerName || "—"} | ${order.shipTo || "—"}`
    );
    console.log(`   Items: ${order.items.map((i) => `${i.quantity}x ${i.name} (${i.option})`).join(", ")}`);
    console.log(`   Payment intent: ${order.paymentIntentId}`);

    // 2) Email the merchant (Bobby)
    if (NOTIFY_EMAIL) {
      try {
        await sendMail({
          to: NOTIFY_EMAIL,
          subject: `💰 New TUS order: $${(order.amountTotal / 100).toFixed(2)} from ${order.customerName || order.customerEmail}`,
          html: buildMerchantEmailHtml(order),
        });
      } catch (e) {
        // Already logged inside sendMail; don't fail the webhook
        console.error("[webhook] merchant email send failed (continuing):", e.message);
      }
    } else {
      console.warn("[webhook] NOTIFY_EMAIL not set — merchant alert SKIPPED");
    }

    // 3) Email the customer (order confirmation)
    if (CUSTOMER_CONFIRMATION && order.customerEmail) {
      try {
        await sendMail({
          to: order.customerEmail,
          subject: "Your TUS order is confirmed 🎙️",
          html: buildCustomerEmailHtml(order),
        });
      } catch (e) {
        console.error("[webhook] customer email send failed (continuing):", e.message);
      }
    }
  }

  // Always 200 unless signature failed — Stripe will retry on 4xx/5xx
  res.json({ received: true });
});

// ── Health check for the webhook itself ──────────────────────────────────────
app.get("/webhook", (_req, res) =>
  res.json({
    status: "ok",
    message: "POST Stripe events here. Configure at https://dashboard.stripe.com/webhooks",
  })
);

// ── Orders (in-memory store) ─────────────────────────────────────────────────
// NOTE: This is lost on Render free-tier cold starts. Render keeps logs longer
// than the service runs, so order info is still recoverable from the logs.
// For real persistence, swap this for a JSON file on a Render persistent disk
// or a tiny Postgres DB.
const orders = [];

app.get("/api/orders", (_req, res) => res.json({ orders }));
app.get("/api/orders/:sessionId", (req, res) => {
  const order = orders.find((o) => o.sessionId === req.params.sessionId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎙️  tus-api running on port ${PORT}`);
  console.log(`   Stripe mode: ${isLive ? "LIVE" : "TEST/INVALID"}`);
  console.log(`   Email: ${transporter ? "ENABLED → " + NOTIFY_EMAIL : "DISABLED (set SMTP_URL + NOTIFY_EMAIL)"}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(", ")}\n`);
});
