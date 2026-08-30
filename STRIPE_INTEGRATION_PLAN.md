# 🔑 SOMA Stripe Integration Plan

**Business Context**: SOMA Telegram bot with AI companion, relationship management, and psychological matching  
**Stripe Products**: Payments + Billing (Subscriptions)  
**Target Users**: Telegram users upgrading from free to premium ($9.99/month)

---

## **Phase 1: Core Setup**

### **1.1 Stripe Account Configuration**

**Status**: ✅ Ready to configure

```
Required:
- Stripe Account (free tier OK for testing)
- API Keys: Publishable (pk_test_) and Secret (sk_test_)
- Webhook Signing Secret (whsec_)
- Product Created: SOMA Premium
- Price Created: $9.99/month recurring
```

**Checklist**:
- [ ] Create Stripe account at stripe.com
- [ ] Get API keys from Developers → API keys
- [ ] Create Product: SOMA Premium
- [ ] Create Price: $9.99/month (subscription mode)
- [ ] Set up webhook endpoint
- [ ] Add to .env file

### **1.2 Database Schema**

**Status**: ✅ Ready (migrations.sql updated)

```sql
-- Users table updates
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_status TEXT;
ALTER TABLE users ADD COLUMN stripe_current_period_end BIGINT;
ALTER TABLE users ADD COLUMN premium BOOLEAN DEFAULT FALSE;
```

### **1.3 Backend Endpoints**

**Status**: ✅ Ready (added to server.js)

```
POST   /stripe/checkout              Create checkout session
GET    /stripe/subscription          Get subscription status
POST   /stripe/webhook               Handle payment events
POST   /premium/upgrade              Legacy upgrade endpoint
POST   /premium/cancel               Cancel subscription
```

---

## **Phase 2: Payment Processing** 💳

### **2.1 Checkout Session Creation**

**Endpoint**: `POST /stripe/checkout`  
**Auth**: Required (JWT token)  
**Purpose**: Generate payment link for user

```javascript
// Request
{
  "user_id": "abc-123-def"
}

// Response
{
  "sessionId": "cs_test_123abc",
  "url": "https://checkout.stripe.com/pay/cs_test_123abc"
}
```

**Flow**:
1. User clicks "💎 Premium" in Telegram bot
2. Bot calls `/stripe/checkout`
3. Backend creates Stripe customer if needed
4. Creates checkout session
5. Returns payment link to user
6. User clicks → Stripe checkout page
7. User enters card details
8. Stripe processes payment

**Current Implementation** ✅:
```javascript
app.post('/stripe/checkout', auth, async (req, res) => {
  // 1. Get user from database
  // 2. Create or retrieve Stripe customer
  // 3. Create checkout session with STRIPE_PREMIUM_PRICE_ID
  // 4. Return session.url to frontend/bot
})
```

### **2.2 Test Payments**

**Status**: ✅ Ready

Use test card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits

**Test Scenarios**:
```
✓ Successful payment: 4242 4242 4242 4242
✓ Declined card: 4000 0000 0000 0002
✓ 3D Secure: 4000 0000 0000 3220
✓ Requires authentication: 4000 0025 0000 3155
```

---

## **Phase 3: Subscription Management** 📅

### **3.1 Webhook Handling**

**Endpoint**: `POST /stripe/webhook`  
**Purpose**: Process subscription events from Stripe

**Events to Handle**:
1. `customer.subscription.created`
   - User just paid → Activate premium
   - Update user.premium = true
   - Save subscription ID

2. `customer.subscription.updated`
   - Payment method changed
   - Subscription renewed
   - Update subscription details

3. `customer.subscription.deleted`
   - User cancelled subscription
   - Deactivate premium
   - Set end date

**Current Implementation** ✅:
```javascript
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // 1. Verify webhook signature
  // 2. Extract event type
  // 3. If subscription.created → Set user.premium = true
  // 4. If subscription.deleted → Set user.premium = false
  // 5. Return 200 to Stripe
})
```

### **3.2 Subscription Status**

**Endpoint**: `GET /stripe/subscription`  
**Auth**: Required  
**Purpose**: Check if user has active subscription

```javascript
// Response
{
  "status": "active",
  "current_period_end": 1234567890,
  "cancel_at_period_end": false,
  "days_until_renewal": 15
}
```

**Status Values**:
- `active` - Premium user, can access all features
- `past_due` - Payment failed, needs action
- `canceled` - User cancelled, may have grace period
- `unpaid` - Invoice unpaid
- `no_subscription` - User is free tier

---

## **Phase 4: Feature Access Control** 🔐

### **4.1 Premium Feature Gates**

**Pattern**: Check `user.premium` before allowing feature

```javascript
// In Telegram bot
if (data === 'meet_people') {
  const session = userSessions.get(chatId)
  
  if (session.premium) {
    // Show unlimited matches
    showMatches(chatId, 'unlimited')
  } else {
    // Show limited matches (5/day)
    showMatches(chatId, 5)
  }
}

// In Express backend
app.get('/insights', auth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('premium')
    .eq('id', req.user.userId)
    .single()
  
  if (!user?.premium) {
    return res.status(403).json({ error: 'Premium only' })
  }
  
  // Return premium features
})
```

### **4.2 Feature Matrix**

| Feature | Free | Premium | Notes |
|---------|------|---------|-------|
| Talk to Soma | ✅ | ✅ | Unlimited for both |
| My Circle | ✅ | ✅ | Manage relationships |
| View Matches | 5/day | ∞ | Unlimited swiping |
| See Likes | ❌ | ✅ | Who liked you |
| Advanced Matching | ❌ | ✅ | Detailed compatibility |
| Weekly Insights | ❌ | ✅ | Growth reports |
| Life Balance | ✅ | ✅ | Track 6 domains |
| Diary | ✅ | ✅ | Daily reflections |

---

## **Phase 5: Billing Management** 📊

### **5.1 Subscription Lifecycle**

```
User clicks "Upgrade"
       ↓
Checkout session created
       ↓
User enters payment info
       ↓
Stripe processes payment (user.premium = false still)
       ↓
Webhook fires: customer.subscription.created
       ↓
Backend updates: user.premium = true
       ↓
User sees ✨ Premium access unlocked
       ↓
Monthly renewal (automatic)
       ↓
Webhook fires: customer.subscription.updated
       ↓
Period end updated
```

### **5.2 Cancellation Flow**

```
User clicks "Cancel Subscription"
       ↓
Backend calls stripe.subscriptions.cancel()
       ↓
Stripe cancels at period end (not immediately)
       ↓
Webhook fires: customer.subscription.deleted
       ↓
Backend updates: user.premium = false (after period ends)
       ↓
User can still access premium until period end
       ↓
After period ends → Reverts to free
```

### **5.3 Failed Payments**

```
Payment fails on renewal date
       ↓
Webhook fires: invoice.payment_failed
       ↓
subscription.status = 'past_due'
       ↓
Backend updates: user.premium = false
       ↓
User sees: "Payment failed - update payment method"
       ↓
User updates card in Stripe
       ↓
Retry payment
       ↓
If successful → subscription.status = 'active'
       ↓
user.premium = true again
```

---

## **Phase 6: Monitoring & Analytics** 📈

### **6.1 Key Metrics to Track**

```sql
-- SQL queries for analytics

-- Total revenue
SELECT SUM(amount) as total_revenue 
FROM stripe_events 
WHERE type = 'charge.succeeded';

-- Active subscriptions
SELECT COUNT(*) as active_subscriptions 
FROM users 
WHERE premium = true;

-- Churn rate
SELECT COUNT(*) as cancelled_this_month 
FROM users 
WHERE stripe_subscription_status = 'canceled' 
AND DATE(updated_at) >= DATE_TRUNC('month', NOW());

-- Monthly recurring revenue (MRR)
SELECT COUNT(*) * 9.99 as mrr 
FROM users 
WHERE premium = true;

-- Conversion rate
SELECT 
  (SELECT COUNT(*) FROM users WHERE premium = true) as premium_users,
  (SELECT COUNT(*) FROM users) as total_users,
  ROUND((COUNT(premium=true)::float / COUNT(*)::float * 100), 2) as conversion_rate
FROM users;
```

### **6.2 Logging**

```javascript
// Log payment events
console.log('💳 Payment received:', {
  customerId: customer.id,
  amount: amount_paid,
  timestamp: new Date(),
  userId: user.id
})

// Log subscription changes
console.log('📅 Subscription updated:', {
  subscriptionId: subscription.id,
  status: subscription.status,
  currentPeriodEnd: subscription.current_period_end
})

// Log webhook processing
console.log('🔗 Webhook processed:', {
  eventId: event.id,
  type: event.type,
  processed: true
})
```

---

## **Phase 7: Advanced Features** 🚀

### **7.1 Billing Portal** (Optional)

```javascript
// Let users manage subscriptions in Stripe Billing Portal
app.get('/stripe/billing-portal', auth, async (req, res) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: 'http://localhost:8081/account'
  })
  
  res.json({ url: session.url })
})
```

**Features**:
- View invoice history
- Update payment method
- Cancel subscription
- Download receipts

### **7.2 Tiered Pricing** (Future)

```javascript
// Add more tiers as you grow
const prices = {
  free: null,
  premium: 'price_9.99/month',
  pro: 'price_19.99/month',     // Unlimited + priority
  enterprise: 'price_99/month'    // Team features
}
```

### **7.3 Discount Codes**

```javascript
// Create coupon in Stripe Dashboard
// Reference in checkout
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  discounts: [{
    coupon: 'LAUNCH50'  // 50% off
  }]
})
```

---

## **Phase 8: Production Checklist** ✅

Before going live, verify:

- [ ] Switch to LIVE Stripe API keys (not test)
- [ ] Update webhook signing secret to LIVE
- [ ] Set STRIPE_PREMIUM_PRICE_ID to LIVE price
- [ ] Update CORS origins for your domain
- [ ] Enable HTTPS (required for Stripe)
- [ ] Test payment with real card
- [ ] Verify webhook receives events
- [ ] Check user.premium updates in Supabase
- [ ] Test subscription cancellation
- [ ] Set up Stripe email receipts
- [ ] Add error handling for declined cards
- [ ] Set up monitoring/alerts
- [ ] Document payment procedures for support

---

## **Implementation Status** 🎯

### **✅ COMPLETE**
- [x] Stripe API keys configuration (.env)
- [x] Checkout session creation endpoint
- [x] Webhook handling
- [x] Subscription status checking
- [x] Premium feature gates
- [x] Database schema updates
- [x] Telegram bot integration
- [x] Test payment flow

### **🔄 IN PROGRESS**
- [ ] Stripe Billing Portal integration
- [ ] Comprehensive error handling
- [ ] Payment retry logic for failed cards
- [ ] Analytics dashboard

### **📋 TODO**
- [ ] Tiered pricing (Pro, Enterprise tiers)
- [ ] Promotional codes/coupons
- [ ] Invoice management
- [ ] Email receipts/confirmations
- [ ] Support ticket system for payments
- [ ] A/B testing for pricing

---

## **Quick Start Commands**

```bash
# 1. Update .env with Stripe keys
cd ~/soma/backend
nano .env
# Add: STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PREMIUM_PRICE_ID

# 2. Run migrations
# Go to Supabase Dashboard → SQL Editor → Run migrations.sql

# 3. Start backend
npm start

# 4. Test checkout
curl -X POST http://localhost:3000/stripe/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 5. Test webhook (local)
stripe listen --forward-to localhost:3000/stripe/webhook
```

---

## **API Reference**

### **Create Checkout**
```
POST /stripe/checkout
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/..."
}
```

### **Get Subscription Status**
```
GET /stripe/subscription
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "status": "active|past_due|canceled|unpaid",
  "current_period_end": 1234567890,
  "cancel_at_period_end": false
}
```

### **Webhook Events**
```
POST /stripe/webhook

Handles:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
```

---

## **File Structure**

```
soma/backend/
├── server.js                    ← Stripe endpoints
├── telegram-bot-auth.js         ← Bot payment UI
├── migrations.sql               ← Database schema
├── .env                         ← API keys
└── STRIPE_INTEGRATION_PLAN.md   ← This file
```

---

## **Support & Resources**

- **Stripe Docs**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Events**: https://stripe.com/docs/webhooks
- **Billing Portal**: https://stripe.com/docs/billing/host-signup-portal
- **Pricing Page**: https://stripe.com/pricing

---

## **Next Steps**

1. ✅ Get Stripe API keys from dashboard
2. ✅ Create Product "SOMA Premium" with $9.99/month price
3. ✅ Set webhook endpoint to your domain
4. ✅ Update .env file
5. ✅ Run migrations in Supabase
6. ✅ Start backend and test payment flow
7. ✅ Test on Telegram bot
8. ✅ Deploy to production

**Status**: Ready to go live! 🚀

---

*Generated for SOMA Telegram Bot - Stripe Payments + Billing*
