# 🏗️ SOMA Telegram Bot Architecture

Complete system design showing how authentication, payments, and features work together.

---

## **System Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                     TELEGRAM USERS                          │
│            (Millions of potential SOMA users)               │
└────────────────────┬────────────────────────────────────────┘
                     │ Telegram API
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  TELEGRAM BOT (Node.js)                     │
│  • Signup/Login flow                                        │
│  • Message routing                                          │
│  • State management                                         │
│  • Inline keyboards (UI)                                    │
│  • Payment flow integration                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌────────┐
   │ Groq   │  │Stripe API│  │Supabase│
   │(Soma   │  │(Payments)│  │(Data)  │
   │ AI)    │  │          │  │        │
   └────────┘  └──────────┘  └────────┘
```

---

## **Data Flow: Complete User Journey**

### **1. FREE TRIAL USER (No Auth)**

```
User: /start
  ↓
Bot: "Welcome to SOMA. Try free or sign up?"
  ↓
User: Clicks "Try Free"
  ↓
State: { telegramUserId: 123, free: true, screen: 'home' }
  ↓
User: Sends "I'm stressed about work"
  ↓
Bot → Groq API: "I'm stressed about work"
  ↓
Groq → Bot: "That sounds tough. Have you..."
  ↓
Bot: "✦ Soma: That sounds tough..."
  ↓
✅ Data is NOT saved (no auth)
✅ Conversation ends when user closes bot
```

### **2. SIGNED UP USER (With Auth)**

```
User: /start
  ↓
Bot: "Let's create your SOMA account"
  ↓
User: "Alex" → "alex@example.com" → "password123"
  ↓
Bot → Supabase:
  {
    name: "Alex",
    email: "alex@example.com",
    password_hash: bcrypt("password123"),
    telegram_id: 12345,
    verified: true
  }
  ↓
Supabase: ✅ User created (id: abc-123)
  ↓
State: { userId: 'abc-123', telegramId: 12345, premium: false }
  ↓
User: Sends "I feel lonely"
  ↓
Bot → Groq: "I feel lonely"
Groq → Bot: "Loneliness is often a signal..."
Bot: Displays response
  ↓
Bot → Supabase: Store message
  - INSERT messages (user_id: 'abc-123', content: "I feel lonely", sender: 'user')
  - INSERT messages (user_id: 'abc-123', content: "Loneliness is...", sender: 'soma')
  - INSERT memories (user_id: 'abc-123', domain: 'mind', content: 'feels lonely')
  ↓
✅ Data is SAVED
✅ Next time user logs in, Soma remembers
```

### **3. PREMIUM USER (With Payment)**

```
Signed up user: Clicks "💎 Premium"
  ↓
Bot: Shows premium features
User: Clicks "💳 Upgrade Now"
  ↓
Bot → Stripe:
  {
    customer_email: "alex@example.com",
    line_items: [{
      price: "price_1234567890",
      quantity: 1
    }],
    mode: "subscription"
  }
  ↓
Stripe: ✅ Creates checkout session
  Returns: https://checkout.stripe.com/pay/cs_test_123
  ↓
Bot: Sends payment link to user
  ↓
User: Clicks link → Enters card "4242 4242..."
  ↓
Stripe: ✅ Payment successful
  ↓
Stripe Webhook → Backend: "customer.subscription.created"
  {
    customer_id: "cus_123abc",
    subscription_id: "sub_123xyz",
    status: "active"
  }
  ↓
Backend → Supabase:
  UPDATE users SET premium=true, stripe_subscription_id='sub_123xyz'
  WHERE stripe_customer_id='cus_123abc'
  ↓
✅ User now has premium features
✅ Unlimited matches, advanced matching, insights
```

---

## **Architecture: Three Layer System**

### **Layer 1: Telegram Bot (Presentation)**

**File**: `telegram-bot-auth.js`

Handles:
- User interactions (buttons, messages)
- State management (what screen is user on?)
- Keyboard generation (inline buttons, menus)
- Input validation (email format, password length)
- Error handling

Example:
```javascript
bot.on('callback_query', async (query) => {
  if (query.data === 'premium_checkout') {
    // Handle premium click
    // Show Stripe payment link
  }
})
```

### **Layer 2: Express Backend (Business Logic)**

**File**: `server.js`

Handles:
- Authentication (signup, login, JWT tokens)
- Database operations (CRUD on Supabase)
- Payment processing (Stripe integration)
- API endpoints for frontend apps
- Webhook handling (Stripe events)

Routes:
```
POST /auth/signup
POST /auth/login
POST /stripe/checkout          ← Create payment
POST /stripe/webhook           ← Handle payment completion
GET  /stripe/subscription      ← Check subscription status
```

### **Layer 3: Databases (Data)**

**Supabase PostgreSQL**:
```
users
├─ id (UUID)
├─ email (TEXT)
├─ name (TEXT)
├─ telegram_id (BIGINT)
├─ premium (BOOLEAN)
├─ stripe_customer_id (TEXT)
└─ stripe_subscription_id (TEXT)

circle (relationships)
├─ user_id
├─ name
└─ relationship_type

memories (auto-extracted)
├─ user_id
├─ domain (health, finance, hobby, etc)
└─ content

diary_entries
├─ user_id
├─ content
└─ mood

messages (conversation history)
├─ user_id
├─ content
└─ sender (user / soma)
```

**Stripe** (Payment Provider):
```
Customers
├─ email
├─ metadata { supabase_user_id }
└─ subscriptions

Subscriptions
├─ customer_id
├─ status (active, canceled, etc)
└─ current_period_end
```

---

## **Authentication Flow**

### **Sign Up**

```
Telegram Bot                    Express Backend              Supabase
    │                                 │                          │
    │─ /signup ──────────────────────>│                          │
    │                                 │─ bcrypt.hash() ─────────>│
    │                                 │ (Hash password)          │
    │                                 │<────────────────────────│
    │                                 │                          │
    │                                 │─ INSERT user ───────────>│
    │                                 │   { email, name,         │
    │                                 │     password_hash }      │
    │                                 │<───────── user.id ──────│
    │<────── ✅ Account Created ──────│                          │
```

### **Login**

```
User sends email & password
    │
    ├─ Bot validates email format
    ├─ Bot sends to backend
    │
    Backend:
    ├─ Query user by email
    ├─ bcrypt.compare(password, password_hash)
    ├─ Create JWT token
    │
    ├─ Return JWT to bot
    │
    Bot:
    ├─ Store JWT in session
    ├─ Show "Logged in!" message
    └─ User can now save data
```

### **Session Management**

```javascript
// In Bot
userSessions.set(chatId, {
  userId: 'abc-123',
  telegramUserId: 12345,
  email: 'alex@example.com',
  premium: true
})

// When user sends message
const session = userSessions.get(chatId)
if (session.userId) {
  // Save message to Supabase
  supabase.from('messages').insert({
    user_id: session.userId,
    content: text
  })
}
```

---

## **Payment Flow**

### **Step 1: User Clicks Upgrade**

```
User → Bot: "💳 Upgrade Now"
Bot → Backend: POST /stripe/checkout { userId }
```

### **Step 2: Backend Creates Checkout Session**

```javascript
// In server.js
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: STRIPE_PREMIUM_PRICE_ID }],
  mode: 'subscription',
  success_url: 'https://t.me/SomaAIBot?start=premium_success',
  cancel_url: 'https://t.me/SomaAIBot?start=premium_cancel'
})

// Returns checkout URL to bot
```

### **Step 3: User Pays**

```
Bot → User: "Click to pay: https://checkout.stripe.com/pay/cs_..."
User: Clicks → Enters card → Stripe processes
```

### **Step 4: Stripe Webhook**

```
Stripe → Backend: POST /stripe/webhook
{
  type: 'customer.subscription.created',
  data: {
    subscription: {
      customer: 'cus_123',
      id: 'sub_456',
      status: 'active'
    }
  }
}

Backend:
├─ Verify webhook signature
├─ Extract customer_id from subscription
├─ Look up Supabase user via stripe_customer_id
├─ UPDATE user.premium = true
└─ Return 200 OK

Stripe:
└─ Marks webhook as delivered
```

### **Step 5: User Gets Premium Access**

```
Next time user opens bot or refreshes:
├─ Bot loads session
├─ Checks user.premium = true
└─ Unlocks premium features
```

---

## **Feature Access Control**

### **Free Features** (All Users)

```
- Talk to Soma (unlimited)
- View My Circle (if has relationships)
- Basic Life Balance (if created)
- Daily Diary (if created)
- See 5 matches/day
```

### **Premium Features** (Paid Users Only)

```
- Unlimited matches (no daily limit)
- See who liked you (likers list)
- Advanced matching (detailed compatibility)
- Weekly insights (growth reports)
- Priority support
```

### **Implementation**

```javascript
// In telegram bot
if (data === 'meet_people') {
  const session = userSessions.get(chatId)
  
  if (session.premium) {
    // Show unlimited matches
    showMatches(chatId, 50) // 50 matches
  } else {
    // Show limited matches
    showMatches(chatId, 5)  // 5 matches
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
  
  // Return insights
})
```

---

## **Data Safety & Privacy**

### **Encryption**

```
Passwords: bcrypt (one-way hash)
Sensitive data: Supabase RLS (Row Level Security)
Transit: HTTPS only
```

### **Row Level Security (RLS)**

```sql
-- Users can only see their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Supabase enforces this at database level
-- No bypassing via backend
```

### **Data Ownership**

```
messages → belongs to user_id
memories → belongs to user_id
diary_entries → belongs to user_id
circle → belongs to user_id

User A cannot access User B's data
```

---

## **Error Handling**

### **Signup Errors**

```
User enters: "alex@example.com" (already exists)
  ↓
Supabase: ❌ Unique constraint violation
  ↓
Backend: Catches error
  ↓
Bot: "❌ Email already registered"
  ↓
User: Can try different email or login
```

### **Payment Errors**

```
User's card is declined
  ↓
Stripe: ❌ Payment failed
  ↓
Stripe Webhook: NOT sent (not successful)
  ↓
Backend: User.premium remains false
  ↓
Bot: Still shows "💳 Upgrade Now"
  ↓
User: Can try different card
```

### **Auth Errors**

```
User enters wrong password
  ↓
bcrypt.compare() returns false
  ↓
Backend: Rejects login
  ↓
Bot: "❌ Wrong password"
  ↓
User: Can try again
```

---

## **Deployment Architecture**

### **Local Development**

```
Localhost:3000
├─ Express backend
├─ Telegram bot (polling)
└─ Supabase (cloud)

Localhost:8081
└─ React Native frontend (Expo)
```

### **Production**

```
Railway.app (backend)
├─ Express server
├─ Telegram bot (polling)
└─ Stripe webhooks

Supabase (cloud database)
├─ PostgreSQL
├─ RLS policies
└─ Real-time

Stripe (payment processor)
├─ Checkout
├─ Subscriptions
└─ Webhooks

Vercel (frontend - optional)
├─ React Native Web
└─ Web version of app
```

---

## **Scaling Strategy**

### **Phase 1: Beta (1K users)**
```
✅ Telegram bot (MVP)
✅ Stripe payments (basic)
✅ Supabase (free tier)
✅ Local testing
```

### **Phase 2: Growth (10K users)**
```
✅ Deploy backend to Railway
✅ Upgrade Supabase (paid plan)
✅ Enable webhook retry logic
✅ Add Redis for caching
```

### **Phase 3: Scale (100K users)**
```
✅ Multiple backend instances (load balancer)
✅ Database replicas (read scaling)
✅ CDN for assets
✅ Dedicated Groq API account
✅ Advanced analytics
```

### **Phase 4: Enterprise (1M+ users)**
```
✅ Kubernetes orchestration
✅ Multi-region deployment
✅ Custom AI model fine-tuning
✅ Premium support team
✅ Advanced security (SOC 2)
```

---

## **Monitoring & Debugging**

### **Logs to Watch**

```bash
# Backend logs
npm start

# Telegram bot issues
console.log('Telegram bot started')
console.error('Callback error:', error)

# Database queries
supabase.from('users').insert(...)

# Payment issues
console.error('Stripe error:', err)
```

### **Debugging Commands**

```bash
# Test backend health
curl http://localhost:3000/health

# Test Telegram bot
curl https://api.telegram.org/bot[TOKEN]/getMe

# Test Stripe
curl https://api.stripe.com/v1/charges \
  -H "Authorization: Bearer sk_test_..."

# Check database
SELECT * FROM users WHERE email = 'test@example.com';
```

---

## **Summary**

**Three components working together:**

1. **Telegram Bot** - User interface, conversation flow
2. **Express Backend** - Logic, auth, payments
3. **Supabase** - Data storage, security

**Two payment flows:**

1. **Free** - Sign up, access all features
2. **Premium** - $9.99/month via Stripe

**Complete user journey:**
- User finds bot on Telegram
- Tries free conversation
- Signs up to save data
- Upgrades to premium for unlimited features
- Enjoys SOMA for life growth and connections

---

**Ready to launch? Check [TELEGRAM_AUTH_PAYMENTS.md](./TELEGRAM_AUTH_PAYMENTS.md) for setup instructions!** 🚀
