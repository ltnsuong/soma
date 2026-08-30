# Manual Stripe Setup (2 Parts)

You'll need to do these 2 parts manually in Stripe Dashboard while the webhook listener runs.

---

## **Part 1: Get Webhook Secret** ⚙️

**Time**: 2 minutes (automated via Stripe CLI)

### **Terminal 1: Run this command**

```bash
cd ~/soma/backend
bash setup-stripe.sh
```

This will:
1. Check Stripe CLI is installed
2. Verify you're logged in to Stripe
3. Start listening for webhooks

You'll see output like:
```
> Ready! Your webhook signing secret is: whsec_test_abc123def456ghi789jkl012
> Forwarding to http://localhost:3000/stripe/webhook
```

**Copy the `whsec_test_...` secret and save it.**

**Keep this terminal open!** (Don't close it while testing)

---

## **Part 2: Create Product & Get Price ID** 📦

**Time**: 3 minutes (manual in Stripe Dashboard)

While Terminal 1 is running, open a browser and do this:

### **Step 1: Go to Products**
https://dashboard.stripe.com/products

### **Step 2: Create Product**
- Click **+ Create product**
- **Name**: SOMA Premium
- **Description**: Unlimited matches, advanced matching, weekly insights
- Click **Create product**

### **Step 3: Add Pricing**
- Scroll to **Pricing** section
- Click **+ Add pricing**
- **Billing period**: Monthly
- **Price**: $9.99
- Click **Save price**

### **Step 4: Copy Price ID**
- Look for "Price ID" (format: `price_1ABC2XYZ...`)
- **Copy it**

---

## **What You'll Have**

After completing both parts:

```
✅ Webhook Secret: whsec_test_abc123def456ghi789jkl012
✅ Price ID: price_1ABC2XYZ...
✅ Secret Key: sk_test_51U8O5EIiJNxWNdjAh...
✅ Public Key: pk_test_51U8O5EIiJNxWNdjAJ...
```

---

## **Next Step**

Send me these 2 values:

```
Webhook Secret: whsec_...
Price ID: price_...
```

Then I'll update your `.env` and you'll be ready to test! 🚀
