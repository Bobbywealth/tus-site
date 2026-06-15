# TUS — The Untold Season

Sports podcast merch store.

**Live:** https://theuntoldseason.com
**API:** https://tus-api.onrender.com

## Order notifications
Orders email Bobby (via `NOTIFY_EMAIL` env var) on `checkout.session.completed`.
Requires `STRIPE_WEBHOOK_SECRET` configured in Render + webhook endpoint registered in Stripe Dashboard.
