# 🤖 SOMA Telegram Bot Setup Guide

Full-featured SOMA on Telegram with AI companion, relationship management, and psychological matching.

---

## **Step 1: Create Your Telegram Bot**

### Option A: Using BotFather (Recommended)
1. Open Telegram and search for **@BotFather**
2. Start the chat: `/start`
3. Send: `/newbot`
4. Choose a name (e.g., "SOMA AI Companion")
5. Choose a username (e.g., "@SomaAIBot" - must end with `bot`)
6. BotFather will give you a **token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
7. Save this token - you'll need it next

### Option B: Using Telegram Web
1. Go to https://web.telegram.org
2. Login with your phone number
3. Search for @BotFather
4. Follow steps 2-6 above

---

## **Step 2: Update Your Backend Environment**

In `/Users/suongle/soma/backend/.env`, replace:
```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
```

With your actual token from BotFather:
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

**⚠️ Keep this token SECRET - never commit it to git**

---

## **Step 3: Run Database Migrations**

The migrations are already in `backend/migrations.sql` and include:
- ✅ `telegram_id` column on users table
- ✅ `circle` table (relationships: therapy, family, friend, work, romantic)
- ✅ `memories` table (auto-extracted from conversations)
- ✅ `diary_entries` table (daily reflections)
- ✅ `likes` table (for matching system)

### Run Migrations:
1. Go to https://supabase.co/dashboard
2. Select your project (SOMA)
3. Go to **SQL Editor**
4. Create a new query
5. Copy all content from `/Users/suongle/soma/backend/migrations.sql`
6. Paste into SQL Editor
7. Click **RUN**
8. ✅ Migrations complete!

---

## **Step 4: Start the Backend**

```bash
cd ~/soma/backend
npm start
```

You should see:
```
✅ SOMA backend running at http://localhost:3000
🤖 Telegram bot @SomaAIBot is live
```

---

## **Step 5: Test Your Bot**

### On Your Phone:
1. Open Telegram
2. Search for your bot (e.g., **@SomaAIBot**)
3. Click **START**
4. You should see: "🌟 Welcome to SOMA"

### Features Available:
- 💬 **Talk to Soma** - Chat with AI companion
- 👥 **My Circle** - Manage relationships
- 🎲 **Meet New People** - Find friends/partners with psychological matching
- 📊 **Life Balance** - Track 6 life domains (health, finance, hobby, relationships, purpose, mind)
- 📝 **Diary** - Daily reflections
- ⚙️ **Settings** - Account management

---

## **Step 6: Key Features Walkthrough**

### **1. Chat with Soma (AI Companion)**
```
User: Tell me about stress management
✦ Soma: Stress often stems from feeling overwhelmed...
         Have you tried...
```
- Groq AI powers responses
- Automatically extracts memories
- Remembers your life details

### **2. My Circle (Relationships)**
Add people and organize by type:
- 🩺 Therapy
- 👨‍👩‍👧 Family
- 🤝 Friends
- 💼 Work
- 💕 Romantic

For each person:
- Direct messaging
- Relationship-specific advice from Soma
- Invitation system

### **3. Meet New People (Matching)**
Psychology-based matching considers:
- ✅ Attachment style
- ✅ Love language
- ✅ Shared interests
- ✅ Life goals alignment

Shows:
- Profile (name, age, bio, interests)
- Compatibility % score
- Actions: Like / Pass / Message

### **4. Life Balance Wheel**
Track progress across 6 life domains:
```
Health:         ████████░░ (8)
Finance:        ██░░░░░░░░ (2)
Hobby:          ██████████ (10)
Relationships:  ██████░░░░ (6)
Purpose:        ████░░░░░░ (4)
Mind:           ███░░░░░░░ (3)
Total: 33 memories
```

### **5. Diary (Daily Reflections)**
```
User: I had a tough day at work, my boss was critical
✦ Soma: That sounds frustrating. How did you respond?
         [Saves entry + auto-extracts memory]
```

---

## **Step 7: Deploy to Production (Optional)**

To make your bot publicly available:

### Deploy Backend to Railway:
```bash
# 1. Push to GitHub
git add .
git commit -m "Add Telegram bot"
git push origin main

# 2. Go to railway.app
# 3. Connect your GitHub repo
# 4. Set environment variables:
#    - TELEGRAM_BOT_TOKEN=your-token
#    - SUPABASE_URL=...
#    - SUPABASE_SERVICE_KEY=...
#    - All other env vars

# 5. Deploy automatically

# 6. Your bot will be live!
```

Your bot will now work for anyone who finds it on Telegram.

---

## **Step 8: Customize Your Bot**

### Change Bot Display Name:
1. Open Telegram, find **@BotFather**
2. Send: `/mybots`
3. Select your bot
4. Send: `/edit_description` or `/edit_about`
5. Set your description

### Add Bot Commands:
1. Send to @BotFather: `/setcommands`
2. Choose your bot
3. Send:
```
start - Begin using SOMA
help - Show help menu
signup - Create account
login - Login to account
```

---

## **Troubleshooting**

### Bot not responding
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check logs
tail -f backend.log

# Verify token
echo $TELEGRAM_BOT_TOKEN
```

### Migrations failed
- Check Supabase SQL errors in Dashboard
- Verify all SQL syntax
- Check for duplicate table names

### Users can't save data
- Make sure migrations ran successfully
- Check Row Level Security (RLS) policies
- Verify SUPABASE_SERVICE_KEY in .env

### Bot stops responding
- Check backend logs for errors
- Verify Groq API key (EXPO_PUBLIC_AI_KEY)
- Restart backend: `npm start`

---

## **Next Steps**

1. ✅ Invite beta users to test
2. ✅ Collect feedback in Telegram
3. ✅ Iterate on features
4. ✅ Scale to 1000+ users
5. ✅ Use insights to build App Store version
6. ✅ Cross-promote: Telegram ↔️ iOS/Android apps

---

## **Support**

Need help? Check:
- Telegram Bot API docs: https://core.telegram.org/bots
- Supabase docs: https://supabase.io/docs
- SOMA documentation: `/soma/APP_WALKTHROUGH.md`

**Happy bot building! 🚀**
