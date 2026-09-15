# SOMA Relationship Bot - Deployment Guide

A Telegram bot that helps couples who just met on dating apps understand their compatibility and build better relationships.

## 🎯 What It Does

**3-Phase Flow:**
1. **Profile Creation** (`/start`) - Bot learns about the user
2. **Chat Activation** (`/add_soma_to_chat`) - Bot analyzes relationship compatibility
3. **Coaching** (`/tips`, `/date_ideas`, `/red_flags`, etc) - Real-time relationship advice

## 📋 Prerequisites

You'll need:
- Telegram Bot Token (create with @BotFather)
- Groq API Key (free at https://console.groq.com)
- Supabase Project (free at https://supabase.com)
- Node.js 18+ installed locally
- Render account (free tier available at https://render.com)

## 🚀 Quick Start

### Step 1: Create a Telegram Bot

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow prompts:
   - Bot name: `SOMA` (or your name)
   - Bot username: `soma_bot` or similar (must be unique)
4. Copy the **bot token** - you'll need this

**Example:**
```
Use this token to access the HTTP API:
1234567890:ABCDefghIjklmnopQRStuvwxyzABCDEfg
```

### Step 2: Set Up Supabase

1. Go to https://supabase.com → Sign up/Login
2. Create a new project (name: "soma-bot")
3. Go to **SQL Editor** → Paste the contents of `schema.sql`
4. Click **Run** to create tables
5. Go to **Project Settings** → **API** → Copy:
   - **Project URL**
   - **Anon key** (public key)

### Step 3: Get Groq API Key

1. Go to https://console.groq.com
2. Sign up or login
3. Go to **API keys** → Create new key
4. Copy your **API key**

### Step 4: Deploy to Render

**Option A: Using Render Dashboard (Easier)**

1. Create `render.yaml` in `/soma/bot` (already done)
2. Push code to GitHub (or use Render's Git sync):
   ```bash
   git add bot/
   git commit -m "Add SOMA relationship bot"
   git push origin main
   ```
3. Go to https://dashboard.render.com
4. Click **New** → **Web Service**
5. Connect your GitHub repo
6. Select the `bot` directory (or use `./bot` in build/start commands)
7. Set environment variables in Render dashboard:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `GROQ_API_KEY` = your Groq API key
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_KEY` = your Supabase anon key
8. Click **Deploy**

**Option B: Local Testing First**

1. Install dependencies:
   ```bash
   cd bot
   npm install
   ```

2. Create `.env` file:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GROQ_API_KEY=your_groq_api_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   ```

3. Run locally:
   ```bash
   npm start
   ```

4. Test the bot by messaging it on Telegram:
   - `/start` → Create profile
   - Add bot to a private chat with someone else
   - `/add_soma_to_chat` → Activate analysis
   - `/tips`, `/date_ideas`, `/red_flags` → Get coaching

## 📱 Bot Commands

| Command | Purpose |
|---------|---------|
| `/start` | Create your profile |
| `/add_soma_to_chat` | Activate compatibility analysis in current chat |
| `/tips` | Communication advice |
| `/date_ideas` | Activity suggestions |
| `/understand_them` | Help interpreting partner's messages |
| `/red_flags` | Check for relationship concerns |
| `/progress` | See relationship growth stats |

## 🔧 Environment Variables

Required in `.env` or Render dashboard:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCDefghIjklmnopQRStuvwxyzABCDEfg
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 📊 Database Schema

Tables created automatically by `schema.sql`:

- **user_profiles** - User information and preferences
- **dating_chats** - Chat analysis results
- **chat_messages** - Messages logged for AI analysis
- **coaching_history** - Coaching advice history

## 🧪 Testing the Bot

**Full Flow Test:**

1. Message bot `/start`
2. Select relationship type (romantic/friend/business)
3. Tell bot about yourself
4. Tell bot what you're looking for
5. Create another test account (or have a friend help)
6. Both users do `/start`
7. One user: `/add_soma_to_chat`
8. Bot analyzes and sends compatibility report
9. Try `/tips`, `/date_ideas`, `/red_flags`, `/progress`

**Expected Output:**
```
🎯 COMPATIBILITY ANALYSIS

✨ Match Score: 78%

📊 Breakdown:
- Values Alignment: 80%
- Interests: 72%
- Communication: 85%
- Life Stage: 70%

✅ Your Strengths:
• Great communication
• Shared interests in hiking

⚠️ Something to Watch:
• Different work-life balance preferences

💡 Suggested Activities:
• Outdoor adventure
• Cooking class together
```

## 🚨 Troubleshooting

### Bot not responding
- Check Telegram bot token in `.env` or Render
- Verify polling is working in bot logs
- Make sure bot is invited to chat (for group chats)

### Database connection errors
- Verify Supabase URL and key are correct
- Check if tables were created: Go to Supabase → Tables
- Ensure tables have correct schema from `schema.sql`

### LLM not working
- Check Groq API key is valid and has quota
- Verify `GROQ_API_KEY` in environment
- Check rate limits (free tier has 30 calls/minute)

### Render deployment failing
- Check build logs in Render dashboard
- Verify `render.yaml` is in correct directory
- Ensure all env variables are set in Render dashboard
- Check Node.js version (should be 18+)

## 📈 Monitoring

**View bot logs:**
```bash
# Local
npm start

# Render
Go to Service → Logs in Render dashboard
```

**Monitor database:**
- Supabase → Logs → Query Performance
- Check `dating_chats` table for analysis results
- View `chat_messages` table for logged conversations

## 🔐 Security Notes

- Bot token is sensitive - never commit to Git
- Use environment variables for all secrets
- Supabase has Row Level Security available if needed
- Messages are stored for analysis - add data retention policy as needed

## 📦 What's Included

✅ Full bot implementation (all 3 phases)  
✅ LLM integration with Groq  
✅ Database schema  
✅ Telegram commands  
✅ Compatibility analysis  
✅ Coaching commands  
✅ Render deployment config  

## 🎯 Next Steps

1. ✅ Create Telegram bot with @BotFather
2. ✅ Set up Supabase and create tables
3. ✅ Get Groq API key
4. ✅ Test locally with `npm start`
5. ✅ Deploy to Render
6. ✅ Invite first users and gather feedback
7. ⏳ Iterate based on user feedback

## 💙 Support

For issues or questions:
- Check troubleshooting section above
- Review Render logs
- Verify all environment variables
- Test bot locally first before deploying

**Bot is ready to deploy! 🚀**
