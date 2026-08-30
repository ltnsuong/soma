# 📋 Stripe Implementation Checklist

Complete this checklist to launch payments on your SOMA Telegram bot.

---

## **Phase 1: Setup** (15 minutes)

### **1.1 Stripe Account**
- [ ] Go to https://stripe.com
- [ ] Create account (email + password)
- [ ] Verify email
- [ ] Dashboard loaded

### **1.2 Get API Keys**
- [ ] Navigate to **Developers** (top right)
- [ ] Click **API Keys** tab
- [ ] Copy **Publishable Key** (pk_test_...)
- [ ] Copy **Secret Key** (sk_test_...)
- [ ] Save both temporarily (you'll need them in 5 min)

### **1.3 Create Product**
- [ ] Click **Products** (left sidebar)
- [ ] Click **+ Create product**
- [ ] **Name**: SOMA Premium
- [ ] **Description**: Unlimited matches, advanced matching, weekly insights
- [ ] Click **Create product**
- [ ] Scroll to **Pricing** section
- [ ] Click **+ Add pricing**
- [ ] **Billing period**: Monthly
- [ ] **Price**: $9.99
- [ ] Click **Save price**
- [ ] **Copy Price ID** (price_...)
- [ ] Save it

### **1.4 Create Webhook**
- [ ] Go to **Developers** → **Webhooks** (left sidebar)
- [ ] Click **+ Add endpoint**
- [ ] **URL**: `http://localhost:3000/stripe/webhook`
- [ ] Click **Select events** dropdown
- [ ] Search for and select:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_failed`
- [ ] Click **Add endpoint**
- [ ] Click the endpoint you created
- [ ] Scroll to **Signing secret** section
- [ ] Click **Reveal**
- [ ] **Copy secret** (whsec_...)
- [ ] Save it

**You now have 4 keys:**
```
1. Publishable Key: pk_test_...
2. Secret Key: sk_test_...
3. Price ID: price_...
4. Webhook Secret: whsec_...
```

---

## **Phase 2: Configuration** (5 minutes)

### **2.1 Update .env File**
```bash
cd ~/soma/backend
nano .env
```

- [ ] Find line: `STRIPE_PUBLIC_KEY=pk_test_your_public_key_here`
- [ ] Replace with your actual **Publishable Key**
- [ ] Find line: `STRIPE_SECRET_KEY=sk_test_your_secret_key_here`
- [ ] Replace with your actual **Secret Key**
- [ ] Find line: `STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here`
- [ ] Replace with your actual **Webhook Secret**
- [ ] Find line: `STRIPE_PREMIUM_PRICE_ID=price_1234567890`
- [ ] Replace with your actual **Price ID**
- [ ] Save: `Ctrl+O` → `Enter` → `Ctrl+X`

**Verify .env looks like:**
```env
STRIPE_PUBLIC_KEY=pk_test_51ABC2XYZabcd1234567890abcdef
STRIPE_SECRET_KEY=sk_test_51ABC2XYZabcd1234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_test_abc123def456ghi789jkl012
STRIPE_PREMIUM_PRICE_ID=price_1ABC2XYZabcd1234567890abcdef
```

### **2.2 Verify Dependencies**
```bash
cd ~/soma/backend
npm list stripe
```
- [ ] Should show: `node-telegram-bot-api@2.1.0` ✅
- [ ] Should show: `stripe@latest` ✅

---

## **Phase 3: Database** (5 minutes)

### **3.1 Run Migrations**
- [ ] Go to https://supabase.co/dashboard
- [ ] Select your SOMA project
- [ ] Click **SQL Editor** (left sidebar)
- [ ] Click **New Query**
- [ ] Copy ALL content from `/Users/suongle/soma/backend/migrations.sql`
- [ ] Paste into SQL Editor
- [ ] Click **RUN** button
- [ ] Wait for success message
- [ ] Verify no errors

### **3.2 Verify Tables Updated**
- [ ] Click **Table Editor** (left sidebar)
- [ ] Click **users** table
- [ ] Scroll right to verify these columns exist:
  - [ ] `stripe_customer_id`
  - [ ] `stripe_subscription_id`
  - [ ] `stripe_subscription_status`
  - [ ] `stripe_current_period_end`
  - [ ] `premium` (boolean)

---

## **Phase 4: Backend** (2 minutes)

### **4.1 Start Server**
```bash
cd ~/soma/backend
npm start
```

- [ ] Wait for output:
  ```
  ✅ SOMA backend running at http://localhost:3000
  🤖 Telegram bot is live
  ```

### **4.2 Verify Health**
```bash
curl http://localhost:3000/health
```
- [ ] Should return: `{"status":"ok"}`

### **4.3 Check Bot**
- [ ] Terminal shows no errors
- [ ] No red text (errors)
- [ ] "Telegram bot is live" message

---

## **Phase 5: Testing** (10 minutes)

### **5.1 Test on Telegram**
- [ ] Open Telegram app
- [ ] Search for your bot (username from BotFather)
- [ ] Click **START** button
- [ ] See welcome message: "Welcome to SOMA"

### **5.2 Test Free Trial**
- [ ] Click **💬 Try Free (No Login)**
- [ ] Type: "Hi Soma"
- [ ] See response: "✦ Soma: ..."
- [ ] Type: "I'm feeling great"
- [ ] See response from AI
- [ ] **Result**: ✅ Free chat works (no login required)

### **5.3 Test Signup**
- [ ] Go back: `/start`
- [ ] Click **📝 Sign Up**
- [ ] Type name: "TestUser"
- [ ] Type email: "test@example.com"
- [ ] Type password: "password123"
- [ ] See: "✅ Account created!"
- [ ] **Result**: ✅ User created in Supabase

### **5.4 Test Premium Flow**
- [ ] Click **💎 Premium**
- [ ] See premium benefits listed
- [ ] Click **💳 Upgrade Now**
- [ ] See payment link: "https://checkout.stripe.com/pay/..."
- [ ] Click the link

### **5.5 Test Payment**
In Stripe checkout page:
- [ ] **Card number**: 4242 4242 4242 4242
- [ ] **Expiry**: 12/25
- [ ] **CVC**: 123
- [ ] **Email**: test@example.com
- [ ] Click **Pay**
- [ ] Should see: "Payment successful"
- [ ] Stripe shows test charge

### **5.6 Verify Database Updated**
- [ ] Go to https://supabase.co/dashboard
- [ ] Select SOMA project
- [ ] Click **Table Editor** → **users**
- [ ] Find your test user (test@example.com)
- [ ] Check column **premium** = `true` ✅
- [ ] Check column **stripe_subscription_id** = (has value) ✅

### **5.7 Verify Webhook**
- [ ] In Stripe Dashboard
- [ ] Go to **Developers** → **Webhooks**
- [ ] Click your webhook endpoint
- [ ] Scroll down to **Events**
- [ ] Should see:
  - [ ] `customer.subscription.created` ✅
  - [ ] Other events

---

## **Phase 6: Production** (Later)

### **6.1 Get Live Keys**
When ready to accept real payments:
- [ ] Go to https://stripe.com/dashboard
- [ ] Go to **Developers** → **API Keys**
- [ ] Switch to **Live data** (toggle at top)
- [ ] Copy **Live Secret Key** (starts with `sk_live_`)
- [ ] Copy **Live Publishable Key** (starts with `pk_live_`)

### **6.2 Update .env for Production**
```bash
nano ~/soma/backend/.env
```
- [ ] Replace `sk_test_...` with `sk_live_...`
- [ ] Replace `pk_test_...` with `pk_live_...`
- [ ] Keep `STRIPE_WEBHOOK_SECRET` (get new live one if deploying)
- [ ] Keep `STRIPE_PREMIUM_PRICE_ID`
- [ ] Save changes

### **6.3 Update Live Webhook**
- [ ] Go to Stripe **Developers** → **Webhooks**
- [ ] Edit your webhook endpoint
- [ ] **URL**: Change to your production domain
  - Example: `https://your-api.railway.app/stripe/webhook`
- [ ] Get new **Signing secret** for live endpoint
- [ ] Update .env `STRIPE_WEBHOOK_SECRET`

### **6.4 Deploy Backend**
```bash
git add .
git commit -m "Add Stripe payments integration"
git push origin main
# Then deploy to Railway/Vercel/etc
```
- [ ] Backend deployed to production
- [ ] Health check: curl https://your-api.com/health

### **6.5 Test Live Payment**
- [ ] Create new account on production
- [ ] Click upgrade
- [ ] Use test card 4242... one more time
- [ ] Should process as live test charge
- [ ] Verify Supabase updated

### **6.6 Enable Emails** (Optional)
- [ ] Set `RESEND_API_KEY` in .env
- [ ] Uncomment email sending code
- [ ] Send confirmation emails to users
- [ ] Send receipts for payments

### **6.7 Monitor Production**
- [ ] Set up alerts for failed payments
- [ ] Monitor conversion rate (free → premium)
- [ ] Check MRR (Monthly Recurring Revenue)
- [ ] Track churn rate

---

## **Common Issues & Solutions**

### **Issue: "Webhook Error: Webhook signature verification failed"**
- [ ] Verify `STRIPE_WEBHOOK_SECRET` in .env is correct
- [ ] Check you copied the ENTIRE secret (starts with `whsec_`)
- [ ] Restart backend: `npm start`

### **Issue: "Failed to create checkout: Invalid API Key"**
- [ ] Check `STRIPE_SECRET_KEY` starts with `sk_test_` or `sk_live_`
- [ ] Verify no extra spaces or quotes
- [ ] Restart backend

### **Issue: Payment link doesn't work**
- [ ] Verify `STRIPE_PREMIUM_PRICE_ID` is correct
- [ ] Check price exists in Stripe Dashboard
- [ ] Verify it's a subscription price (not one-time)

### **Issue: User.premium not updating after payment**
- [ ] Check webhook endpoint URL is correct
- [ ] Verify webhook events are being sent (Stripe Dashboard)
- [ ] Check Supabase logs for errors
- [ ] Test webhook with: `stripe trigger customer.subscription.created`

### **Issue: Bot not responding**
- [ ] Verify `TELEGRAM_BOT_TOKEN` is correct
- [ ] Check backend is running: `npm start`
- [ ] Verify no error logs

---

## **Final Checklist**

Before considering launch complete:

### **Technical**
- [ ] All 4 Stripe keys in .env
- [ ] Migrations ran successfully
- [ ] Backend starts without errors
- [ ] Bot responds on Telegram
- [ ] Test payment completes
- [ ] Webhook receives events
- [ ] User.premium updates
- [ ] Premium features unlock

### **Testing**
- [ ] Free trial works (no login)
- [ ] Sign up creates account
- [ ] Login works with email + password
- [ ] Premium button shows benefits
- [ ] Payment link generates
- [ ] Test card charges successfully
- [ ] Cancellation works
- [ ] Failed payment handled

### **Security**
- [ ] .env never committed to git
- [ ] Secret keys never logged
- [ ] Webhook validates signature
- [ ] JWT tokens used for auth
- [ ] Passwords hashed with bcrypt
- [ ] HTTPS enabled on production

### **Monitoring**
- [ ] Logs show payment events
- [ ] Errors logged with timestamps
- [ ] Webhook delivery confirmed
- [ ] Metrics tracked (MRR, conversions)
- [ ] Alerts set for failures

### **Documentation**
- [ ] Users know how to upgrade
- [ ] Users know how to cancel
- [ ] Support procedures documented
- [ ] Refund process documented
- [ ] Troubleshooting guide created

---

## **Success Indicator** ✅

You're successful when:

1. ✅ User clicks "💎 Premium"
2. ✅ Stripe checkout appears
3. ✅ User enters card info
4. ✅ Payment processes
5. ✅ Webhook fires
6. ✅ User.premium = true
7. ✅ Premium features unlock
8. ✅ Invoice created in Stripe
9. ✅ User can cancel anytime

**Total time to completion: ~1 hour**

---

## **Next Steps After Launch**

1. Monitor first payments closely
2. Get user feedback on pricing
3. Track conversion rate
4. Optimize payment messaging
5. Add more tiers (Pro, Enterprise)
6. Implement affiliate program
7. Create referral incentives
8. Build analytics dashboard

---

## **Support**

Stuck? Check:
- [ ] Error message in console
- [ ] Stripe Dashboard → Events/Logs
- [ ] Supabase → Logs
- [ ] Read STRIPE_INTEGRATION_PLAN.md
- [ ] Check Stripe docs: https://stripe.com/docs

---

**You've got this! 🚀**

When all boxes are checked, you're ready to launch and accept real payments.
