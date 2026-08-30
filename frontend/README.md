# SOMA - AI Agent Dating Telegram Mini App

A cutting-edge Telegram Mini App where AI agents learn about users and match them with compatible partners.

## 🚀 Features

### 1. **AI Learning System**
- Chat with Soma daily
- AI learns about your personality, values, and interests
- Automatic memory extraction from conversations
- Agent profile builds over time

### 2. **Agent Matching**
- Discover other users' AI agents
- Compatibility scoring based on learned traits
- Swipe interface (Pass/Like)
- Create matches with compatible agents

### 3. **Agent Chemistry**
- Watch your AI agent talk to matched agents
- AI agents represent you authentically
- Natural, generated conversations
- No predetermined responses

### 4. **Premium Features**
- Unlimited agent matches
- Advanced analytics
- Priority matching
- Stripe integration for payments

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Telegram**: WebApp SDK
- **Backend**: Node.js + Express
- **Database**: Supabase PostgreSQL
- **AI**: Groq API (Llama 3.1)
- **Payments**: Stripe

## 📦 Installation

### Backend Setup
```bash
cd ~/soma/backend

# Install dependencies
npm install

# Run migrations
psql -U postgres -h localhost -d soma < migrations-agents.sql

# Start server
npm start
```

### Frontend Setup
```bash
cd ~/soma/frontend

# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build
```

## 🌐 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel deploy
```

Update `.env` with production backend URL.

### Backend (Railway)
```bash
# Push to Railway
railway up
```

### Telegram Bot Setup
1. Go to [@BotFather](https://t.me/BotFather) on Telegram
2. Create new bot: `/newbot`
3. Get bot token and set it in `.env`
4. Set Mini App URL:
   ```
   /setmenubutton
   → Select bot
   → Web App
   → URL: https://your-frontend-url
   ```

## 📝 API Endpoints

### Agent Endpoints
- `POST /agent/learn` - Extract memory from conversation
- `POST /agent/build-profile` - Build/update agent profile
- `GET /agent/profile` - Get user's agent
- `GET /agent/discover` - Find agents to match
- `POST /agent/match` - Create match
- `GET /agent/matches` - Get all matches
- `GET /agent/chat/:matchId` - Get conversation
- `POST /agent/chat/:matchId/continue` - Continue agent chat

### Auth Endpoints
- `POST /auth/signup` - Register
- `POST /auth/login` - Login
- `POST /auth/social` - Telegram login

### Payments
- `POST /stripe/checkout` - Create checkout session
- `GET /premium/status` - Check premium status

## 🎮 Usage Flow

1. **User opens bot in Telegram**
   - Auto-login via Telegram ID or manual signup

2. **Chat with Soma**
   - Share thoughts, feelings, goals
   - AI learns about them with each message

3. **Agent Profile Builds**
   - Personality traits extracted
   - Values and interests identified
   - Compatibility scoring prepared

4. **Discover Agents**
   - Browse other users' AI agents
   - See compatibility score
   - Swipe Pass or Like

5. **Matches & Chemistry**
   - When matched, AI agents start talking
   - Users watch their agents connect
   - Can upgrade to premium to see more

## 🔧 Configuration

### `.env` (Backend)
```
TELEGRAM_BOT_TOKEN=your_bot_token
STRIPE_SECRET_KEY=your_stripe_key
GROQ_API_KEY=your_groq_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### `.env` (Frontend)
```
VITE_API_URL=http://localhost:3000  # Dev
VITE_API_URL=https://your-api.com   # Prod
```

## 📊 Agent Profile Schema

```
{
  "agent_name": "Soma",
  "personality_traits": ["empathetic", "curious", "adventurous"],
  "values": ["authenticity", "growth", "connection"],
  "summary": "Multi-paragraph description of the person",
  "learning_score": 85,  // 0-100
  "compatibility": 78    // With matched agents
}
```

## 🎯 Next Steps

1. ✅ Database schema
2. ✅ Agent learning service
3. ✅ API endpoints
4. ✅ React Mini App
5. ⏳ Deploy backend to Railway
6. ⏳ Deploy frontend to Vercel
7. ⏳ Configure Telegram bot
8. ⏳ Launch!

## 📄 License

Private - SOMA Inc
