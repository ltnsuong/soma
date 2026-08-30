# 🔐 SOMA Telegram Bot: Auth & Payments Setup

Complete guide to set up user authentication and Stripe payments for the Telegram bot.

---

## **Overview**

The bot has three user modes:
1. **Free Trial** - Talk to Soma without account
2. **Free Account** - Sign up, save data, access all features
3. **Premium** - $9.99/month for unlimited features

---

## **Part 1: Telegram Bot Setup**

### **Step 1: Create Telegram Bot**
1. Open Telegram, search **@BotFather**
2. Send `/newbot`
3. Choose name (e.g., "SOMA AI")
4. Choose username (e.g., "@SomaAIBot")
5. Save the token: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

### **Step 2: Update .env**
```bash
cd ~/soma/backend
nano .env
```

Replace:
```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
```

With your actual token.

---

## **Part 2: Stripe Payment Setup** 💳

### **Step 1: Create Stripe Account**
1. Go to https://stripe.com
2. Sign up (email + phone)
3. Verify email
4. Go to Dashboard

### **Step 2: Get Stripe API Keys**

1. In Stripe Dashboard, click **Developers** (top right)
2. Click **API Keys** tab
3. You'll see:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

Copy both and save temporarily.

### **Step 3: Create Premium Product & Price**

1. In Stripe Dashboard, go to **Products** (left sidebar)
2. Click **Create Product**
3. Fill in:
   - **Name**: SOMA Premium
   - **Description**: Unlimited matches, advanced matching, insights
   - **Type**: Service (not physical)
   - Click **Create**

4. Scroll to **Pricing** section
5. Click **Add pricing**
   - **Billing period**: Monthly
   - **Price**: $9.99
   - **Recurring**: Yes
   - Click **Save**

6. Save the **Price ID** (looks like: `price_1234567890abcdef`)

### **Step 4: Create Webhook Endpoint**

1. In Stripe Dashboard, go to **Webhooks** (Developers → Webhooks)
2. Click **Add endpoint**
3. For **Endpoint URL**, enter:
   ```
   https://your-backend-domain.com/stripe/webhook
   ```
   (If local: `http://localhost:3000/stripe/webhook`)

4. For **Events to send**, select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click **Add endpoint**

6. Click the endpoint you just created
7. Scroll down to **Signing secret**
8. Click **Reveal** and copy the secret (starts with `whsec_`)

### **Step 5: Update .env with Stripe Keys**

```bash
nano ~/soma/backend/.env
```

Replace:
```
STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here
STRIPE_PREMIUM_PRICE_ID=price_1234567890
```

With your actual keys:
```
STRIPE_PUBLIC_KEY=pk_test_51234567890abcdefghij1234567890abcdef
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghij1234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghij1234567890abcdef
STRIPE_PREMIUM_PRICE_ID=price_1234567890abcdefghij1234567890
```

---

## **Part 3: Database Migrations**

### **Run Migrations in Supabase**

1. Go to https://supabase.co/dashboard
2. Select your SOMA project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy all content from:
   ```
   /Users/suongle/soma/backend/migrations.sql
   ```
6. Paste into SQL Editor
7. Click **RUN**

This adds:
- ✅ `stripe_customer_id` column
- ✅ `stripe_subscription_id` column
- ✅ `telegram_id` column
- ✅ Telegram-specific tables (circle, memories, diary, likes)

---

## **Part 4: Start the Bot**

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

## **User Flow: How Auth & Payments Work**

### **Scenario 1: New User (Free Trial)**
```
1. User starts bot: /start
2. Bot shows:
   - 📝 Sign Up
   - 🔗 Log In
   - 💬 Try Free (No Login)

3. User clicks "Try Free"
4. Can talk to Soma immediately
5. No data saved
6. No login required
```

### **Scenario 2: New User (Create Account)**
```
1. User clicks "Sign Up"
2. Bot asks: "What's your name?"
   User: "Alex"

3. Bot asks: "What's your email?"
   User: "alex@example.com"

4. Bot asks: "Choose a password (min 6 chars)"
   User: "secure123"

5. Bot: "✅ Account created!"
6. Now logged in with all features
7. Data saved to database

Home screen shows:
💬 Talk to Soma (FREE)
👥 My Circle (FREE)
🎲 Meet New People (LIMITED: 5/day)
📊 Life Balance (FREE)
📝 Diary (FREE)
💎 Premium (UPGRADE)
```

### **Scenario 3: Upgrade to Premium**
```
1. User on home screen
2. Clicks "💎 Premium"
3. Bot shows premium benefits:
   ✨ Unlimited matches
   ✨ See who liked you
   ✨ Advanced matching
   ✨ Weekly insights
   ✨ Only $9.99/month

4. User clicks "💳 Upgrade Now"
5. Bot generates Stripe checkout link
6. User clicks to pay
7. Enters card details in Stripe
8. Payment processed
9. Webhook fires: "subscription.created"
10. Backend updates: user.premium = true
11. User gets full access immediately

Next time user opens bot:
💎 Premium Member
✅ All features unlocked
```

### **Scenario 4: Cancel Premium**
```
1. Premium user clicks "💎 Premium"
2. Bot shows:
   ✨ You Have Premium!
   ❌ Cancel Subscription

3. User clicks "Cancel Subscription"
4. Backend cancels Stripe subscription
5. Premium access continues until billing period ends
6. After period, reverts to free
```

---

## **API Endpoints for Payments**

### **Create Checkout Session**
```
POST /stripe/checkout
Headers: Authorization: Bearer <JWT_TOKEN>
Response:
{
  "sessionId": "cs_test_123...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

### **Get Subscription Status**
```
GET /stripe/subscription
Headers: Authorization: Bearer <JWT_TOKEN>
Response:
{
  "status": "active",
  "current_period_end": 1234567890,
  "cancel_at_period_end": false
}
```

### **Webhook Event**
```
POST /stripe/webhook
(Automatically handled - no auth needed)

When payment succeeds:
- Updates user.premium = true
- Updates user.stripe_subscription_id
```

---

## **Database Schema**

### **Users Table (Updated)**
```sql
users (
  id UUID,
  email TEXT,
  name TEXT,
  password_hash TEXT,
  telegram_id BIGINT,
  premium BOOLEAN,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  ...
)
```

### **Circle Table (Relationships)**
```sql
circle (
  id UUID,
  user_id UUID,
  name TEXT,
  relationship_type TEXT, -- therapy, family, friend, work, romantic
  created_at TIMESTAMP
)
```

### **Memories Table**
```sql
memories (
  id UUID,
  user_id UUID,
  domain TEXT, -- health, finance, hobby, relationships, purpose, mind
  content TEXT,
  created_at TIMESTAMP
)
```

### **Diary Table**
```sql
diary_entries (
  id UUID,
  user_id UUID,
  content TEXT,
  mood TEXT,
  created_at TIMESTAMP
)
```

---

## **Testing**

### **Test Mode (Development)**

Use Stripe test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0000 0000 3220`

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits

### **Test Telegram Bot**

1. Open Telegram
2. Search for your bot (e.g., @SomaAIBot)
3. Click START

Test each flow:
- ✅ Try Free (no login)
- ✅ Sign Up (create account)
- ✅ Login (use created account)
- ✅ Talk to Soma (free feature)
- ✅ Premium (upgrade flow)
- ✅ Use test card `4242...`
- ✅ Verify payment succeeded

---

## **Production Setup**

### **Before Going Live:**

1. **Use Live Stripe Keys**
   - Get real Stripe API keys
   - Update .env with live keys
   - Update STRIPE_PREMIUM_PRICE_ID

2. **Update Webhook URL**
   - Go to Stripe Webhooks
   - Edit endpoint URL to your production domain
   - Update STRIPE_WEBHOOK_SECRET

3. **Enable Email Verification**
   - Set RESEND_API_KEY
   - Add email verification flow
   - Update sign-up to require email confirmation

4. **Deploy Backend**
   - Push to GitHub
   - Deploy to Railway
   - Update CORS_ORIGINS
   - Test all endpoints

5. **Test Payments**
   - Process real payment (use test card first)
   - Verify subscription in Stripe Dashboard
   - Verify user.premium updated in Supabase

---

## **Troubleshooting**

### **Bot doesn't respond to signup**
```bash
# Check backend is running
curl http://localhost:3000/health

# Check logs
npm start

# Verify TELEGRAM_BOT_TOKEN
echo $TELEGRAM_BOT_TOKEN
```

### **Payment fails with "Webhook Error"**
- Check STRIPE_WEBHOOK_SECRET is correct
- Verify webhook endpoint URL is public/reachable
- Test with Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/stripe/webhook
  ```

### **User created but data not saved**
- Run migrations in Supabase
- Check Row Level Security (RLS) policies
- Verify SUPABASE_SERVICE_KEY in .env

### **Premium upgrade doesn't work**
- Check STRIPE_PREMIUM_PRICE_ID is valid
- Verify Stripe API keys are correct
- Check webhook is receiving events
- Test with Stripe Dashboard → Events

### **Subscription not canceling**
- Verify STRIPE_SECRET_KEY is correct
- Check Stripe Dashboard for subscription
- Verify webhook is processing `subscription.deleted`

---

## **Security Best Practices**

✅ **DO:**
- Store STRIPE_SECRET_KEY in .env (never in code)
- Use HTTPS in production
- Validate webhook signatures (already done)
- Keep JWT_SECRET long & random (min 32 chars)
- Use service role for backend (SUPABASE_SERVICE_KEY)

❌ **DON'T:**
- Expose STRIPE_SECRET_KEY in frontend
- Store passwords in plaintext (use bcrypt - already done)
- Commit .env to git
- Use same JWT_SECRET for prod/dev
- Handle card details (Stripe does it)

---

## **Next Steps**

1. ✅ Get Telegram bot token
2. ✅ Get Stripe API keys
3. ✅ Run migrations
4. ✅ Update .env
5. ✅ Test signup flow
6. ✅ Test payment flow
7. ✅ Deploy to production
8. ✅ Invite beta users

---

## **Support**

Need help?
- Telegram Bot API: https://core.telegram.org/bots
- Stripe docs: https://stripe.com/docs
- Supabase docs: https://supabase.io/docs

**You're ready to launch! 🚀**
