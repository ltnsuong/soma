# ⚡ SOMA Telegram Bot: Quick Start (10 Minutes)

Get your bot live with auth & payments in 10 minutes.

---

## **Pre-Requisites (5 min)**

### **Step 1: Get Telegram Bot Token** (2 min)
```
1. Open Telegram → Search @BotFather
2. Send /newbot
3. Name: "SOMA AI" (or your name)
4. Username: "SomaAIBot" (or @YourNameBot)
5. Copy the token
```

### **Step 2: Get Stripe Keys** (2 min)
```
1. Go to https://stripe.com
2. Sign up
3. Go to Developers → API Keys
4. Copy Publishable Key (pk_test_...)
5. Copy Secret Key (sk_test_...)
6. Go to Products → Create product "SOMA Premium"
7. Add price: $9.99/month
8. Copy Price ID (price_...)
```

### **Step 3: Create Stripe Webhook** (1 min)
```
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: http://localhost:3000/stripe/webhook
3. Select events: subscription.created, subscription.updated, subscription.deleted
4. Copy webhook secret (whsec_...)
```

---

## **Configuration (3 min)**

### **Update .env File**

```bash
cd ~/soma/backend
nano .env
```

Add/Update:
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
STRIPE_PUBLIC_KEY=pk_test_51234567890abcdef
STRIPE_SECRET_KEY=sk_test_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
STRIPE_PREMIUM_PRICE_ID=price_1234567890abcdef
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

### **Run Database Migrations**

1. Go to https://supabase.co/dashboard
2. Select your SOMA project
3. Click **SQL Editor** → **New Query**
4. Copy all from `/Users/suongle/soma/backend/migrations.sql`
5. Paste and click **RUN**

---

## **Deploy (2 min)**

### **Start Backend**

```bash
cd ~/soma/backend
npm start
```

Expected output:
```
✅ SOMA backend running at http://localhost:3000
🤖 Telegram bot @SomaAIBot is live
```

---

## **Test (1 min)**

### **Test on Telegram**

1. Open Telegram
2. Search for your bot (e.g., @SomaAIBot)
3. Click **START**

Test each flow:

**Flow 1: Free Trial**
```
Bot: "Welcome to SOMA. What would you like to do?"
You: Click "💬 Try Free (No Login)"
Bot: "You can talk to Soma without signing up!"
You: Type "I'm feeling stressed"
Bot: "✦ Soma: Stress often..."
✅ No login required
✅ No data saved
```

**Flow 2: Sign Up**
```
Bot: "Welcome to SOMA."
You: Click "📝 Sign Up"
Bot: "What's your name?"
You: Type "Alex"
Bot: "Now your email?"
You: Type "alex@example.com"
Bot: "Choose a password (min 6)"
You: Type "password123"
Bot: "✅ Account created!"
✅ Account created in Supabase
✅ Can now save data
```

**Flow 3: Premium**
```
You: Click "💎 Premium"
Bot: Shows benefits + "💳 Upgrade Now" button
You: Click button
Bot: Sends Stripe checkout link
You: Click link → Pay with 4242 4242 4242 4242
Stripe: ✅ Payment successful
Bot: ✅ Premium activated
You: Can now access unlimited features
✅ Subscription saved
✅ Webhook updated database
```

---

## **What's Included**

### **Authentication**
- ✅ Signup (email + password)
- ✅ Login (email + password)
- ✅ Password hashing (bcrypt)
- ✅ Session management
- ✅ Free trial (no login)

### **Payments**
- ✅ Stripe checkout
- ✅ Monthly subscription
- ✅ Webhook handling
- ✅ Cancel subscription
- ✅ Test mode (use 4242...)

### **Features**
- ✅ Talk to Soma (AI)
- ✅ My Circle (relationships)
- ✅ Meet People (matching)
- ✅ Life Balance (tracking)
- ✅ Diary (reflections)

### **Free vs Premium**

| Feature | Free | Premium |
|---------|------|---------|
| Talk to Soma | ✅ | ✅ |
| My Circle | ✅ | ✅ |
| Meet People | 5/day | Unlimited |
| Life Balance | ✅ | ✅ |
| Diary | ✅ | ✅ |
| See who liked you | ❌ | ✅ |
| Advanced matching | ❌ | ✅ |
| Weekly insights | ❌ | ✅ |
| **Cost** | **Free** | **$9.99/mo** |

---

## **Key Files**

```
soma/backend/
├─ telegram-bot-auth.js      ← Bot with auth & payments
├─ server.js                 ← Express backend
├─ migrations.sql            ← Database schema
├─ .env                       ← Configuration
└─ package.json

soma/
├─ TELEGRAM_AUTH_PAYMENTS.md  ← Full setup guide
├─ TELEGRAM_BOT_ARCHITECTURE.md ← How it works
└─ QUICK_START_TELEGRAM.md    ← This file
```

---

## **Environment Variables Explained**

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
# Get from: @BotFather in Telegram

# Stripe - Public (safe to share)
STRIPE_PUBLIC_KEY=pk_test_...
# Get from: https://dashboard.stripe.com/apikeys

# Stripe - Secret (KEEP PRIVATE!)
STRIPE_SECRET_KEY=sk_test_...
# Get from: Same link above

# Stripe - Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...
# Get from: Stripe → Developers → Webhooks → Endpoint

# Stripe - Price ID
STRIPE_PREMIUM_PRICE_ID=price_...
# Get from: Stripe → Products → SOMA Premium → Price
```

---

## **Troubleshooting**

| Problem | Solution |
|---------|----------|
| **Bot doesn't respond** | Check if backend is running: `npm start` |
| **Signup fails** | Run migrations in Supabase (copy migrations.sql) |
| **Payment doesn't work** | Check STRIPE_SECRET_KEY is correct (sk_test_...) |
| **Webhook not firing** | Verify webhook URL is accessible (test with Stripe CLI) |
| **Premium not activated** | Check Supabase user.premium column was updated |

---

## **Next Steps**

### **Immediate (Today)**
- [x] Set up bot and payments
- [x] Test signup flow
- [x] Test payment flow
- [x] Invite friends to test

### **This Week**
- [ ] Collect user feedback
- [ ] Fix bugs based on feedback
- [ ] Add more features (voice, photos)
- [ ] Improve Soma AI responses

### **This Month**
- [ ] Deploy to production (get live Stripe keys)
- [ ] Launch public version
- [ ] Get first 100 paying users
- [ ] Collect testimonials

### **This Quarter**
- [ ] Build iOS/Android app
- [ ] Submit to App Store
- [ ] Cross-promote (Telegram → App)
- [ ] Reach 1000 paying users

---

## **Deploy to Production** (Later)

When ready to go live:

1. **Get Live Stripe Keys**
   - Stripe Dashboard → Developers → API Keys
   - Use LIVE keys (not test keys)
   - Update .env

2. **Deploy Backend**
   ```bash
   git add .
   git commit -m "Add Telegram bot with auth and payments"
   git push origin main
   
   # Then deploy to Railway/Heroku/etc
   ```

3. **Update Webhook URL**
   - Stripe → Developers → Webhooks
   - Change from localhost:3000 to your.domain.com

4. **Test Payments**
   - Use real card (or test card 4242...)
   - Verify subscription in Stripe
   - Check user.premium in Supabase

---

## **Security Checklist**

Before sharing bot publicly:

- [x] Keep STRIPE_SECRET_KEY private
- [x] Use strong JWT_SECRET (min 32 chars)
- [x] Enable HTTPS on production
- [x] Verify webhook signatures
- [x] Hash passwords with bcrypt
- [x] Don't commit .env to git
- [x] Use service role for backend

---

## **Success Metrics**

Track these to know if bot is working:

```
✅ Signup: Users can create accounts
✅ Payments: Users can upgrade to premium
✅ Retention: Users come back daily
✅ Engagement: Users have 5+ conversations
✅ Conversion: 5-10% free → premium
```

---

## **Support**

Questions?
- Telegram Bot API: https://core.telegram.org/bots
- Stripe docs: https://stripe.com/docs
- Supabase: https://supabase.io/docs

---

## **You're Ready! 🚀**

Your bot is now:
- ✅ Live on Telegram
- ✅ Handling user authentication
- ✅ Processing payments
- ✅ Saving user data
- ✅ Running AI conversations

**Next: Invite your first users and collect feedback!**

---

*SOMA Telegram Bot - Making human connection AI-native* 💫
