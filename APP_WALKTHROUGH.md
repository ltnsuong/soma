# 🌟 SOMA App Walkthrough - Complete Feature Guide

**Your AI companion for life, relationships, and growth.**

---

## 🚀 **How to Access the App**

### **Open in Browser**
```
http://localhost:8081
```

### **Or Use Expo Go (Mobile)**
```
1. Download "Expo Go" app on your phone
2. Find the QR code in your terminal (where npm start runs)
3. Scan it
4. Wait 10-15 seconds for app to load
```

---

## 📋 **Complete App Flow**

### **1️⃣ SPLASH SCREEN (First Visit)**
When you first open SOMA, you see:
- ✦ Soma's logo (animated penguin)
- "Talk to Soma." title
- "Before you decide anything, just talk" subtitle
- **"✦ Start talking"** button

**Action**: Click the button to have your first conversation with Soma

---

### **2️⃣ FIRST CONVERSATION WITH SOMA**
#### **What Happens:**
- Soma greets you warmly
- You can type or speak (click 🎙️ mic)
- Soma responds with AI-generated wisdom
- No signup required yet

#### **Features Active:**
- 💭 "Thinking..." indicator while AI responds
- 🎙️ Microphone button for voice input
- 📢 Voice output (Soma speaks back)
- ✦ Soma's orb pulses while speaking

#### **Example Conversation:**
```
You: "I'm feeling overwhelmed at work"
Soma: "Work pressure is real, and the fact that you're 
naming it matters. What's the biggest source right now—
is it the workload itself, or how you're relating to it?"
```

#### **Behind the Scenes:**
- Your message → Groq API (llama-3.1-8b-instant)
- AI generates thoughtful response
- Facts extracted automatically (work stress, emotion)
- Memories stored in database

---

### **3️⃣ SIGN UP / LOGIN**

After talking to Soma, you see:
- **"Keep this forever?"** card
- "Join SOMA and Soma will remember everything..."
- **"Create my SOMA →"** button

#### **Sign Up Process:**
1. Enter **Name**, **Email**, **Password**
2. Click **"Create account"**
3. System sends verification email (or marks as verified for testing)
4. **"I verified my email"** button
5. ✅ Welcome to SOMA!

#### **Or Login if You Have Account:**
- Email + Password
- JWT tokens stored in browser
- Auto-logged in for next session

---

### **4️⃣ HOME SCREEN**

Once logged in, you see:

```
┌─────────────────────────────────┐
│  Hello, [Your Name]             │
│  [Day, Month, Date]             │ ← Time/date
├─────────────────────────────────┤
│  ✦ Talk about anything          │ ← Soma card
│  Remembers X things about you   │
├─────────────────────────────────┤
│  💭 Diary    📊 Insights        │ ← Quick actions
├─────────────────────────────────┤
│  ❤️ HEALTH    💰 FINANCE        │ ← Wheel of Life
│  🎨 HOBBY     👥 RELATIONSHIPS   │   (Life Balance)
│  🎯 PURPOSE   🧘 MIND           │
├─────────────────────────────────┤
│  👨‍👩‍👧 My Circle (people)        │
│  [Avatar] [Avatar] [Avatar]     │
├─────────────────────────────────┤
│  🎲 Meet New People             │ ← Dating/Matching
│  Discover friends or romance    │
└─────────────────────────────────┘
```

### **Key Features on Home:**

#### **A. Talk to Soma**
- Click the main card
- Full conversation interface
- Soma learns about you automatically

#### **B. Diary**
- Daily reflective check-in
- "How was your day?"
- Soma asks thoughtful questions
- Auto-saves summaries

#### **C. Wheel of Life** ⭐ **(NEW DESIGN)**
- Visual octagonal wheel with 6 domains
- Each segment shows: icon, domain name, memory count
- Progress bars for each area
- Click to see detailed breakdown
- Overall life balance score

#### **D. My Circle**
- All your relationships
- 5 types: Therapy, Family, Friend, Work, Romantic
- Direct messaging with each person
- Soma provides relationship-specific guidance

#### **E. Meet New People**
- Browse potential friends/dates
- See profiles with:
  - Name, age, photo
  - Compatibility score
  - Why you match
  - Shared interests
- Like/Pass/Message
- Matches show mutual interest

#### **F. Settings**
- Account info
- Trusted contact (for crisis)
- Privacy settings
- Logout

---

### **5️⃣ SOMA CHAT (Talk about Anything)**

**Full conversation interface:**

```
┌─────────────────────────────────┐
│  ✦ Soma                         │
│  Remembers 23 things about you  │
├─────────────────────────────────┤
│ ✦: "Hi! How are you today?"     │ ← Soma's message
│                                 │
│                      "I'm tired" │ ← Your message
│                                 │
│ ✦: "Tired in what way?..."      │ ← Soma responds
├─────────────────────────────────┤
│ [Type or speak...]           🎙️ │ ← Input bar
│                             → ┃ │
└─────────────────────────────────┘
```

#### **What Soma Knows About You:**
- Everything you've shared (stored as memories)
- Your relationships (circle members)
- Your interests and values
- Your daily reflections (diary)
- Your life domains (health, finance, etc)

#### **Soma's Special Abilities:**
- 🧠 References past conversations
- 📊 Suggests life balance improvements
- 🆘 Detects crisis patterns → offers support
- 🎯 Gives relationship-specific advice based on circle members
- 💭 Asks thoughtful follow-up questions

#### **Example Deep Conversation:**
```
User: "My boss keeps criticizing my work"
Soma: "That sounds frustrating. Is this a recent 
pattern, or has it been ongoing? And when it happens, 
how do you usually respond?"

User: "A few weeks now. I usually just stay quiet."
Soma: "Staying quiet makes sense when you're hurt. 
But over weeks, that can build resentment. Have you 
considered sharing how it's affecting you?"

Soma (internally): 
→ Extracted: "work stress", "communication issue"
→ Stored in memories
→ Updated Work domain
→ Next time will reference this conversation
```

---

### **6️⃣ CIRCLE - Your Relationships**

**Organized by 5 types:**

```
🩺 THERAPY & SUPPORT
├─ Sarah (Therapist)
│  └─ Status: Active
│  └─ Messages: 12
│  └─ Last chat: 2 days ago
│
👨‍👩‍👧 FAMILY
├─ Mom
├─ Dad
└─ Sister
│
🤝 FRIENDS
├─ Alex
├─ Jordan
└─ Casey
│
💼 WORK
├─ Boss - Mark
└─ Colleague - Jamie
│
💕 ROMANTIC
└─ [None yet / Partner name]
```

#### **For Each Person:**
1. **Direct Messaging** - Talk with them through Soma
2. **Relationship-Specific Guidance** - Soma tailors advice based on relationship type
3. **Invitation System** - Invite them to join (or they invite you)
4. **Memory Tracking** - Soma remembers details about them
5. **Conversation History** - See all chats with that person

#### **Example Circle Conversation:**
```
Conversation with Mom:
You: "We haven't talked in a while"
Soma: "How does that feel? And if you reached out, 
what would you want to talk about?"
You: "Guilty, and just life updates"
Soma: "Guilt is common. Would it help to draft 
something warm to send her?"
→ Soma remembers Mom prefers warm, personal messages
→ Next time suggests this approach
```

---

### **7️⃣ MEET NEW PEOPLE - Matching**

**Psychology-based matching:**

```
┌─────────────────────────────────┐
│ 1 of 12 ▶                       │ ← Deck counter
├─────────────────────────────────┤
│                                 │
│  [Large Profile Photo]          │
│                                 │
│  Alex, 28                       │
│  San Francisco, CA              │
│  87% Compatibility ✨           │ ← Match score
│                                 │
│  ❤️ Loves adventure & coffee    │
│  ⭐⭐⭐⭐⭐ Growth-minded      │
│                                 │
│  WHY YOU MATCH:                 │
│  • Secure attachment styles     │
│  • Both value deep conversations│
│  • Aligned life goals           │
│                                 │
├─────────────────────────────────┤
│   ⭕ PASS    💬 MESSAGE    ❤️ LIKE
└─────────────────────────────────┘
```

#### **Matching Algorithm Considers:**
- ✅ Attachment style (secure, anxious, avoidant)
- ✅ Love language (quality time, acts of service, etc)
- ✅ Shared values (growth, honesty, family, etc)
- ✅ Interests overlap (hobbies, activities)
- ✅ Life goals alignment (career, family, etc)

#### **Match Score Breakdown:**
- **90-100**: Highly compatible
- **75-89**: Good potential
- **60-74**: Some compatibility
- **<60**: May face challenges

#### **Actions:**
- **PASS**: Swipe left, see next profile
- **MESSAGE**: Send opening message
- **LIKE**: Express interest (they see you liked them)
- **MATCH**: Mutual interest → can chat

---

### **8️⃣ WHEEL OF LIFE - Life Balance** ⭐ **(NEW)**

**Visual representation of your 6 life domains:**

```
              HEALTH ❤️
              (12 items)
                 |
MIND 🧘 ------  ✦ SOMA  ------ RELATIONSHIPS 👥
(8 items)        /  \        (18 items)
               /      \
           PURPOSE 🎯  FINANCE 💰
           (5 items)    (3 items)
                \      /
                  HOBBY 🎨
                 (14 items)
```

#### **What Each Domain Represents:**

| Domain | Meaning | Examples |
|--------|---------|----------|
| **Health** | Physical & wellness | Exercise, nutrition, sleep, energy |
| **Finance** | Money & stability | Income, savings, investments, budgeting |
| **Hobby** | Creative & fun | Art, music, games, sports, passion projects |
| **Relationships** | People & connection | Family, friends, romantic, communication |
| **Purpose** | Meaning & goals | Career goals, life mission, impact |
| **Mind** | Mental & emotional | Therapy, mindfulness, emotional health |

#### **How Memories Get Extracted:**
```
You tell Soma: "I started doing yoga last week"
↓
Soma extracts: { domain: "health", content: "Yoga practice" }
↓
Stored in database
↓
Memory count increases: Health: 12 → 13
↓
Next time you talk about health, Soma references it
```

#### **Overall Life Balance Score:**
```
Score = (total memories / 30) × 100
Example: 40 memories across 6 domains = 
  40 / 30 × 100 = 133% (well-balanced!)
```

---

### **9️⃣ CRISIS SUPPORT** 🆘

**If Soma detects crisis patterns:**

```
Patterns Detected:
- "I don't want to live"
- "Can't go on"
- "Everyone would be better off without me"
- Multiple mentions of hopelessness
```

**Soma's Response:**
1. Takes it seriously (never minimizes)
2. Offers warmth & comfort
3. Provides crisis resources:
   - **National Suicide Prevention Lifeline**: 988
   - **Crisis Text Line**: Text HOME to 741741
   - **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

4. Suggests connecting with trusted contact
5. Encourages professional help

**Your Profile Has:**
- Trusted contact name & phone
- Crisis support resources
- Professional therapist info (if added)

---

### **🔟 PREMIUM FEATURES** 💎

**Unlock with Premium ($9.99/month):**

#### **See Who Liked You**
```
❤️ 15 people liked you this week!
[Alex] [Jordan] [Casey]
...view all
```

#### **Unlimited Matches**
- Free: 5 new profiles/day
- Premium: Unlimited browsing

#### **Advanced Matching**
- AI-powered personality matching
- Career goal alignment
- Lifestyle compatibility scores

#### **Weekly Insights**
```
📊 YOUR WEEK
- Conversations: 12
- Memories built: 8
- Top domain: Relationships
- Growth score: ↑ 12%
```

#### **Life Balance Reports**
- Visual charts per domain
- Personalized suggestions
- Growth recommendations

#### **Voice Calls**
- Call matches (coming soon)
- Video calls (coming soon)

**Premium Button:**
- Located on "Who Liked You" screen
- Shows **"Upgrade to Premium"** card
- Simple upgrade flow

---

## 🎮 **Try These Actions**

### **Action 1: Have Your First Deep Conversation**
```
1. Click "Talk about anything"
2. Share something real: "I've been struggling with..."
3. Watch Soma respond thoughtfully
4. Have a natural, multi-turn conversation
5. Notice how Soma remembers what you share
```

### **Action 2: Build Your Wheel of Life**
```
1. Click "Life Balance" 
2. Talk to Soma about different areas:
   - Health: "I've been doing yoga"
   - Finance: "Looking to save more"
   - Relationships: "Quality time with my partner"
3. Watch memories accumulate
4. See your wheel fill up with colors
5. Notice the overall balance score
```

### **Action 3: Add People to Your Circle**
```
1. Click "My Circle"
2. Click "Add person"
3. Enter name, relationship type
4. Choose: invite them or they invite you
5. Send them invitation code
6. Once accepted, start messaging
7. Get Soma's relationship-specific guidance
```

### **Action 4: Browse Matches**
```
1. Click "Meet New People"
2. Swipe through profiles
3. Check compatibility scores
4. See why you match
5. Like someone → see if mutual
6. Message to start conversation
7. Move to chat once they reply
```

### **Action 5: Daily Diary Check-in**
```
1. Click "Diary"
2. Soma asks: "How was your day?"
3. Share your feelings
4. Have a reflective conversation
5. Soma saves summary automatically
6. Click "Save" to complete entry
7. Browse past entries anytime
```

---

## 🔧 **Behind the Scenes Tech**

### **When You Message Soma:**
1. Your message sent to **Groq API**
2. Groq returns **AI response** (2-3 seconds)
3. Your message analyzed for **facts** (separate API call)
4. Facts stored in **Supabase database**
5. Response stored in **chat history**
6. Typing indicator shown while waiting
7. Response read aloud via **Web Speech API**
8. Next time you chat, Soma has **context** from memories

### **Real-Time Updates:**
- Messages stored immediately
- Memories extracted & saved
- Circle members notified (if messaging)
- Matches notified (if you liked them)
- Push notifications (if premium)

### **Data Privacy:**
- Only YOU see your data (Row Level Security)
- Encrypted database
- No third parties see messages
- Groq API calls anonymous (no user ID in request)

---

## 📞 **Support & Help**

### **In-App Help:**
- Settings → Help & FAQ
- Soma can answer questions about features
- Crisis hotlines available

### **Reset Account:**
- Settings → "Reset account" (long-press)
- Wipes all data, starts fresh
- Use with caution

### **Report Issue:**
- Settings → Contact support
- Email: support@soma-app.com

---

## 🎊 **You're Ready to Explore!**

**Start with:**
1. ✅ Have a deep conversation with Soma
2. ✅ Let Soma learn about you (3-5 messages)
3. ✅ Watch your memories accumulate
4. ✅ Check your Wheel of Life
5. ✅ Explore other features

**Soma gets better the more you use it.**

Each conversation teaches her more about you. Each memory builds your profile. Each day strengthens your journey.

---

**🌟 Welcome to SOMA. You've got this.** 💫
