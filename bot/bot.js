const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const WebSocket = require('ws');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: {
    transport: WebSocket
  }
});

// User state tracking
const userState = new Map(); // telegram_id -> {stage, data, chatId}

// ============================================================================
// PHASE 1: PROFILE CREATION
// ============================================================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    // Check if user already has profile
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (existing && existing.profile_complete) {
      return bot.sendMessage(chatId,
        `Welcome back, ${msg.from.first_name}! 💙\n\n` +
        `Your profile is complete.\n\n` +
        `When you add me to a chat with someone you matched with, ` +
        `I'll analyze your compatibility and help you build your relationship.\n\n` +
        `Use /add_soma_to_chat when ready!`
      );
    }

    // Start profile creation
    userState.set(telegramId, { stage: 'relationship_type', data: {}, chatId });

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💑 Romantic', callback_data: 'rel_romantic' }],
          [{ text: '👥 Friend', callback_data: 'rel_friend' }],
          [{ text: '🤝 Business', callback_data: 'rel_business' }]
        ]
      }
    };

    bot.sendMessage(chatId,
      `Hi ${msg.from.first_name}! 👋 I'm SOMA, your relationship coach.\n\n` +
      `Before I help you with your match, I need to understand what you're looking for.\n\n` +
      `What type of relationship are you seeking?`,
      keyboard
    );
  } catch (err) {
    console.error('Error in /start:', err);
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

// Handle relationship type selection
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;
  const data = query.data;

  const state = userState.get(telegramId) || { stage: 'start', data: {} };

  if (data.startsWith('rel_')) {
    const relType = data.split('_')[1]; // romantic, friend, business
    state.data.relationship_type = relType;
    state.stage = 'about_yourself';
    userState.set(telegramId, state);

    bot.editMessageText(
      `Great! You're looking for a ${relType} relationship. 💙\n\n` +
      `Now, tell me about yourself. ` +
      `Who are you? What makes you unique? ` +
      `Share anything you think is important (personality, hobbies, values, etc).`,
      { chat_id: chatId, message_id: query.message.message_id }
    );

    bot.answerCallbackQuery(query.id);
  }
});

// Handle text input for profile creation
bot.on('message', async (msg) => {
  const telegramId = msg.from.id;
  const chatId = msg.chat.id;
  const state = userState.get(telegramId);

  // Ignore commands
  if (msg.text && msg.text.startsWith('/')) return;
  if (!state || !msg.text) return;

  try {
    if (state.stage === 'about_yourself') {
      state.data.self_description = msg.text;
      state.stage = 'what_they_need';
      userState.set(telegramId, state);

      bot.sendMessage(chatId,
        `I see! That sounds great. ✨\n\n` +
        `Now, what do you need in a ${state.data.relationship_type} partner? ` +
        `What qualities, values, or traits matter most to you?`
      );
    } else if (state.stage === 'what_they_need') {
      state.data.what_they_need = msg.text;
      state.stage = 'analyzing';
      userState.set(telegramId, state);

      await bot.sendMessage(chatId, `✨ Analyzing your profile...`);

      // Extract profile via LLM
      await extractAndSaveProfile(telegramId, msg.from.first_name, state.data, chatId);
    }
  } catch (err) {
    console.error('Error in message handler:', err);
  }
});

// ============================================================================
// LLM: Extract Profile from Text
// ============================================================================

async function extractAndSaveProfile(telegramId, firstName, data, chatId) {
  const prompt = `
Extract profile information from these two inputs and return ONLY valid JSON:

About themselves: "${data.self_description}"
What they need: "${data.what_they_need}"

Return this exact JSON structure (no markdown, no extra text):
{
  "personality_traits": ["trait1", "trait2", "trait3"],
  "values": ["value1", "value2", "value3"],
  "interests": ["interest1", "interest2", "interest3"],
  "lifestyle": {
    "work_focused": true,
    "adventurous": true,
    "social": true,
    "homebody": false
  },
  "communication_style": "warm",
  "deal_breakers": ["deal_breaker1"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = response.content[0].text;
    console.log('Raw LLM response:', content.substring(0, 200));

    // Extract JSON if wrapped in markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    const extracted = JSON.parse(content);

    // Save to database
    const { error: insertError } = await supabase
      .from('user_profiles')
      .upsert({
        telegram_id: telegramId,
        username: firstName,
        self_description: data.self_description,
        relationship_type: data.relationship_type,
        what_they_need: data.what_they_need,
        personality_traits: extracted.personality_traits,
        values: extracted.values,
        interests: extracted.interests,
        lifestyle: extracted.lifestyle,
        communication_style: extracted.communication_style,
        deal_breakers: extracted.deal_breakers,
        profile_complete: true,
        updated_at: new Date()
      }, { onConflict: 'telegram_id' });

    if (insertError) throw insertError;

    // Notify user
    await bot.sendMessage(
      chatId,
      `✅ Your profile is ready!\n\n` +
      `📋 Profile Summary:\n` +
      `• Type: ${data.relationship_type}\n` +
      `• Traits: ${extracted.personality_traits.join(', ')}\n` +
      `• Values: ${extracted.values.join(', ')}\n` +
      `• Interests: ${extracted.interests.join(', ')}\n\n` +
      `Now, when you add me to a chat with someone you matched with, ` +
      `I'll tell you if you're compatible and how to build your relationship. 💙\n\n` +
      `Use: /add_soma_to_chat`
    );

    userState.delete(telegramId);

  } catch (err) {
    console.error('=== PROFILE EXTRACTION ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Full error:', JSON.stringify(err, null, 2));
    console.error('Response status:', err.response?.status);
    console.error('Response data:', err.response?.data);
    console.error('===============================');
    bot.sendMessage(chatId, '❌ Error analyzing profile. Please try again with /start');
    userState.delete(telegramId);
  }
}

// ============================================================================
// PHASE 2: CHAT ACTIVATION
// ============================================================================

bot.onText(/\/add_soma_to_chat/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    // Get user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (profileError || !userProfile || !userProfile.profile_complete) {
      return bot.sendMessage(chatId,
        `You need to create your profile first! Use /start`
      );
    }

    // Check if this is a private chat (2-person)
    if (msg.chat.type !== 'private') {
      return bot.sendMessage(chatId, '⚠️ This command works best in private chats (1-on-1). Make sure both people have used /start first.');
    }

    bot.sendMessage(chatId,
      `✨ Analyzing your connection...\n\n` +
      `This may take a moment as I read your conversation.`
    );

    // Since we don't have the second person's profile easily accessible in a private chat,
    // we'll analyze based on the user's profile and what we can extract from messages
    await analyzeAndReport(chatId, userProfile, telegramId);

  } catch (err) {
    console.error('Error in /add_soma_to_chat:', err);
    bot.sendMessage(chatId, 'Error activating chat analysis. Please try again.');
  }
});

// ============================================================================
// PHASE 2: Analyze Compatibility
// ============================================================================

async function analyzeAndReport(chatId, userProfile, userTelegramId) {
  try {
    // Get recent messages from this chat
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (msgError) {
      console.error('Message fetch error:', msgError);
      messages = [];
    }

    // Extract what we can from chat
    const messageTexts = (messages || []).map(m => m.message_text).join('\n');

    const prompt = `
Analyze a relationship based on one person's profile and their recent chat messages.

Profile:
- Traits: ${JSON.stringify(userProfile.personality_traits)}
- Values: ${JSON.stringify(userProfile.values)}
- Interests: ${JSON.stringify(userProfile.interests)}
- Lifestyle: ${JSON.stringify(userProfile.lifestyle)}
- Communication style: ${userProfile.communication_style}
- Looking for: ${userProfile.what_they_need}

Recent chat messages: ${messageTexts || 'No messages yet.'}

Provide compatibility analysis and return ONLY valid JSON:
{
  "compatibility_score": 75,
  "compatibility_breakdown": {
    "values_match": 80,
    "interests_match": 65,
    "communication": 75,
    "life_stage": 70
  },
  "strengths": ["strength1", "strength2"],
  "watch_out": ["potential_issue1"],
  "suggested_dates": ["activity1", "activity2"],
  "red_flags": []
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = response.content[0].text;
    console.log('Raw compatibility analysis response:', content.substring(0, 200));

    // Extract JSON if wrapped in markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    const analysis = JSON.parse(content);

    // Save analysis
    const { error: insertError } = await supabase
      .from('dating_chats')
      .insert({
        user_a_id: userProfile.id,
        telegram_chat_id: chatId,
        compatibility_score: analysis.compatibility_score,
        compatibility_data: analysis.compatibility_breakdown,
        red_flags: analysis.red_flags,
        suggested_dates: analysis.suggested_dates,
        messages_analyzed: (messages || []).length
      });

    if (insertError) throw insertError;

    // Send report
    const report = `🎯 COMPATIBILITY ANALYSIS

✨ Match Score: ${analysis.compatibility_score}%

📊 Breakdown:
- Values Alignment: ${analysis.compatibility_breakdown.values_match}%
- Interests: ${analysis.compatibility_breakdown.interests_match}%
- Communication: ${analysis.compatibility_breakdown.communication}%
- Life Stage: ${analysis.compatibility_breakdown.life_stage}%

✅ Your Strengths:
${analysis.strengths.map(s => `• ${s}`).join('\n')}

⚠️ Something to Watch:
${analysis.watch_out.map(w => `• ${w}`).join('\n')}

💡 Suggested Activities:
${analysis.suggested_dates.map(d => `• ${d}`).join('\n')}

Available commands:
/tips - Communication advice
/date_ideas - More activity suggestions
/red_flags - Check for concerns
/progress - See relationship growth`;

    await bot.sendMessage(chatId, report);

  } catch (err) {
    console.error('Analysis error:', err);
    bot.sendMessage(chatId, '❌ Error analyzing compatibility. Please try again.');
  }
}

// ============================================================================
// PHASE 3: COACHING COMMANDS
// ============================================================================

bot.onText(/\/tips/, async (msg) => {
  const chatId = msg.chat.id;

  const tips = `💡 COMMUNICATION TIPS

1. Active Listening
   - Ask follow-up questions
   - Show you understand their perspective
   - Avoid interrupting

2. Be Authentic
   - Share your real thoughts and feelings
   - Don't play games or hide who you are
   - Be vulnerable when appropriate

3. Show Interest
   - Ask about their day
   - Remember details they mention
   - Follow up on topics they care about

4. Respect Boundaries
   - Don't push for commitment too fast
   - Honor their communication style
   - Respect their pace

5. Have Fun!
   - Share jokes and laughs
   - Try new things together
   - Keep it light and enjoyable`;

  await bot.sendMessage(chatId, tips);
});

bot.onText(/\/date_ideas/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Get stored suggestions from database
    const { data: chat } = await supabase
      .from('dating_chats')
      .select('suggested_dates')
      .eq('telegram_chat_id', chatId)
      .single();

    let ideas = `📅 DATE IDEAS\n\n`;
    if (chat?.suggested_dates && chat.suggested_dates.length > 0) {
      ideas += chat.suggested_dates.map((d, i) => `${i + 1}. ${d}`).join('\n');
    } else {
      ideas += `• Coffee & conversation\n• Hiking or outdoor activity\n• Movie night at home\n• Cooking together\n• Travel somewhere new`;
    }

    await bot.sendMessage(chatId, ideas);
  } catch (err) {
    console.error('Error in /date_ideas:', err);
    bot.sendMessage(chatId, 'Error fetching suggestions. Try again later.');
  }
});

bot.onText(/\/red_flags/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const { data: chat } = await supabase
      .from('dating_chats')
      .select('red_flags')
      .eq('telegram_chat_id', chatId)
      .single();

    let message = `🚨 RED FLAG CHECK\n\n`;

    if (chat?.red_flags && chat.red_flags.length > 0) {
      message += `I noticed some potential concerns:\n\n`;
      chat.red_flags.forEach(flag => {
        message += `• ${flag}\n`;
      });
      message += `\nThink about whether these align with your values.`;
    } else {
      message += `No major red flags detected! ✅\n\nYour relationship looks healthy.`;
    }

    await bot.sendMessage(chatId, message);
  } catch (err) {
    console.error('Error in /red_flags:', err);
    bot.sendMessage(chatId, 'Error checking flags. Try again later.');
  }
});

bot.onText(/\/progress/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const { data: chat } = await supabase
      .from('dating_chats')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .single();

    const hoursAgo = chat?.created_at
      ? Math.round((Date.now() - new Date(chat.created_at)) / (1000 * 60 * 60))
      : 'N/A';

    const message = `📈 RELATIONSHIP PROGRESS

📊 Match Score: ${chat?.compatibility_score || 'N/A'}%
📝 Messages Analyzed: ${chat?.messages_analyzed || 0}
⏰ Since Added: ${hoursAgo === 'N/A' ? hoursAgo : hoursAgo + ' hours'}

✨ Looking good! Keep building on what's working. 💙`;

    await bot.sendMessage(chatId, message);
  } catch (err) {
    console.error('Error in /progress:', err);
    bot.sendMessage(chatId, 'Error fetching progress. Try again later.');
  }
});

bot.onText(/\/understand_them/, async (msg) => {
  const chatId = msg.chat.id;

  const advice = `💭 UNDERSTANDING YOUR MATCH

1. Ask What They Mean
   - When confused, ask clarifying questions
   - Don't assume negative intent
   - Seek to understand, not win

2. Look for Patterns
   - How do they respond to challenges?
   - What topics light them up?
   - How do they show care?

3. Notice Communication Signals
   - Response time = interest level
   - Emoji/tone = emotional state
   - Topics they bring up = values

4. Ask Directly
   - "When you said X, did you mean Y?"
   - "How are you feeling about us?"
   - "What do you need right now?"

5. Listen Between the Lines
   - What do they worry about?
   - What makes them happy?
   - What are they avoiding?`;

  await bot.sendMessage(chatId, advice);
});

// ============================================================================
// MESSAGE LISTENER: Log messages for analysis
// ============================================================================

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  if (msg.chat.type !== 'private') return;

  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    // Check if this chat has been activated
    const { data: chat } = await supabase
      .from('dating_chats')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .single();

    if (chat) {
      // Log message for analysis
      await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat.id,
          sender_telegram_id: telegramId,
          message_text: msg.text,
          analyzed: false
        });
    }
  } catch (err) {
    // Silently fail if chat not found - it's not activated
  }
});

// ============================================================================
// Error handling
// ============================================================================

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});

console.log('🚀 SOMA Relationship Bot is running! 💙');
console.log('Environment:', {
  botToken: !!process.env.TELEGRAM_BOT_TOKEN,
  anthropicKey: !!process.env.ANTHROPIC_API_KEY,
  supabaseUrl: !!process.env.SUPABASE_URL,
  supabaseKey: !!process.env.SUPABASE_KEY
});
