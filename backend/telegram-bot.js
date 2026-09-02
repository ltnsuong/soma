import TelegramBot from 'node-telegram-bot-api'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const groq = new Groq({ apiKey: process.env.EXPO_PUBLIC_AI_KEY });

// Initialize Telegram Bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Store user state (chatId -> { screen, data })
const userState = new Map();
const userChats = new Map(); // Store active chat sessions

// ============================================================================
// KEYBOARDS & UI HELPERS
// ============================================================================

const mainMenuKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '💬 Talk to Soma', callback_data: 'soma_chat' }],
      [{ text: '👥 My Circle', callback_data: 'circle_view' }],
      [{ text: '🎲 Meet New People', callback_data: 'meet_people' }],
      [{ text: '📊 Life Balance', callback_data: 'life_balance' }],
      [{ text: '📝 Diary', callback_data: 'diary_view' }],
      [{ text: '⚙️ Settings', callback_data: 'settings' }],
    ],
  },
};

const backKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '← Back', callback_data: 'home' }],
    ],
  },
};

const backAndHomeKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '← Back', callback_data: 'home' }, { text: '🏠 Home', callback_data: 'home' }],
    ],
  },
};

// ============================================================================
// BOT START & SETUP
// ============================================================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name || 'Friend';

  userState.set(chatId, { screen: 'home', userId });

  const welcomeMessage = `🧠 *Welcome to SOMA*

Hi ${firstName}! 👋

You're in contact with SOMA - your AI companion for mental health support.

💙 *What SOMA offers:*
• 💬 Chat with Soma anytime - Express yourself safely
• 📊 Track your mood - Understand your patterns
• 👨‍⚨️ Connect with doctors - Share your journey securely
• 🌍 Multilingual support - In your preferred language

✨ *Your mental health matters.*
Whether you're dealing with depression, anxiety, or just need someone to talk to, SOMA is here for you.

🚀 *Get Started:*
Tap the button below to open SOMA and begin your journey.

_Built by someone who survived depression. Here to help you reach out._`;

  const welcomeKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Open SOMA App',
            web_app: { url: 'https://mysoma.site' }
          }
        ],
        [
          { text: '💬 Quick Mood Check', callback_data: 'quick_mood' }
        ],
        [
          { text: '📚 Learn More', callback_data: 'learn_more' },
          { text: '⚙️ Settings', callback_data: 'settings' }
        ],
      ],
    },
  };

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: welcomeKeyboard.reply_markup,
  });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const help = `📚 SOMA Features:\n\n` +
    `💬 Talk to Soma - AI companion that remembers you\n` +
    `👥 My Circle - Manage your relationships\n` +
    `🎲 Meet New People - Find friends or romance\n` +
    `📊 Life Balance - Track 6 life domains\n` +
    `📝 Diary - Daily reflections\n` +
    `⚙️ Settings - Account & preferences\n\n` +
    `Type /start to go back to menu`;

  bot.sendMessage(chatId, help);
});

// ============================================================================
// CALLBACK QUERY HANDLERS (Button Clicks)
// ============================================================================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const state = userState.get(chatId) || { screen: 'home' };

  try {
    if (data === 'home') {
      userState.set(chatId, { screen: 'home' });
      await bot.editMessageText(
        `🌟 Welcome to SOMA\n\nWhat would you like to do?`,
        { chat_id: chatId, message_id: query.message.message_id, ...mainMenuKeyboard }
      );
    }

    // QUICK MOOD CHECK
    else if (data === 'quick_mood') {
      const moodKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '😢 Very Bad', callback_data: 'mood_1' },
              { text: '😟 Bad', callback_data: 'mood_2' },
            ],
            [
              { text: '😐 Okay', callback_data: 'mood_3' },
              { text: '🙂 Good', callback_data: 'mood_4' },
            ],
            [
              { text: '😄 Great', callback_data: 'mood_5' },
            ],
            [
              { text: '← Back', callback_data: 'home' },
            ],
          ],
        },
      };

      await bot.editMessageText(
        `📊 *How are you feeling right now?*\n\nYour mood matters. Track it to understand your patterns.`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: moodKeyboard.reply_markup,
        }
      );
    }

    // MOOD SELECTION
    else if (data.startsWith('mood_')) {
      const moodLevel = data.split('_')[1];
      const moodEmojis = ['😢', '😟', '😐', '🙂', '😄'];
      const moodTexts = ['Very Bad', 'Bad', 'Okay', 'Good', 'Great'];

      await supabase.from('mood_logs').insert({
        telegram_id: query.from.id,
        mood_level: parseInt(moodLevel),
        created_at: new Date(),
      });

      await bot.editMessageText(
        `✅ *Mood Logged!*\n\n${moodEmojis[moodLevel - 1]} ${moodTexts[moodLevel - 1]}\n\nGreat job tracking your mental health! 💙\n\n_Open SOMA to see your mood trends and chat with Soma._`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Open SOMA App',
                  web_app: { url: 'https://mysoma.site' }
                }
              ],
              [
                { text: '← Back', callback_data: 'home' },
              ],
            ],
          },
        }
      );
    }

    // LEARN MORE
    else if (data === 'learn_more') {
      const learnKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Soma Chat', callback_data: 'learn_chat' },
              { text: '📊 Mood Tracker', callback_data: 'learn_mood' },
            ],
            [
              { text: '👨‍⚕️ Doctor Connect', callback_data: 'learn_doctor' },
            ],
            [
              { text: '← Back', callback_data: 'home' },
            ],
          ],
        },
      };

      const learnText = `📚 *SOMA Features*\n\n` +
        `🧠 *What is SOMA?*\n` +
        `SOMA is your personal mental health companion built on Telegram. We help you:\n\n` +
        `• Talk to an AI that listens and supports you\n` +
        `• Track your mood to understand patterns\n` +
        `• Connect securely with your doctor\n` +
        `• Access support 24/7, anywhere\n\n` +
        `*Tap below to learn more about each feature.*`;

      await bot.editMessageText(learnText, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: learnKeyboard.reply_markup,
      });
    }

    // LEARN CHAT
    else if (data === 'learn_chat') {
      await bot.editMessageText(
        `💬 *Chat with Soma*\n\n` +
        `Express yourself safely without judgment.\n\n` +
        `Soma is an AI that:\n` +
        `• Listens without judgment\n` +
        `• Remembers your preferences\n` +
        `• Offers support anytime\n` +
        `• Helps you understand yourself\n\n` +
        `🚀 Open SOMA to start chatting now!`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '💬 Open Soma Chat',
                  web_app: { url: 'https://mysoma.site' }
                }
              ],
              [
                { text: '← Back', callback_data: 'learn_more' },
              ],
            ],
          },
        }
      );
    }

    // LEARN MOOD
    else if (data === 'learn_mood') {
      await bot.editMessageText(
        `📊 *Track Your Mood*\n\n` +
        `Understand your emotional patterns over time.\n\n` +
        `Benefits:\n` +
        `• See mood trends\n` +
        `• Identify triggers\n` +
        `• Track progress\n` +
        `• Share with doctor\n\n` +
        `_Track daily for best insights!_`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Open SOMA',
                  web_app: { url: 'https://mysoma.site' }
                }
              ],
              [
                { text: '← Back', callback_data: 'learn_more' },
              ],
            ],
          },
        }
      );
    }

    // LEARN DOCTOR
    else if (data === 'learn_doctor') {
      await bot.editMessageText(
        `👨‍⚕️ *Connect with Your Doctor*\n\n` +
        `Share your mental health data securely.\n\n` +
        `Features:\n` +
        `• Share mood reports\n` +
        `• Two-way messaging\n` +
        `• Privacy controlled\n` +
        `• HIPAA compliant\n\n` +
        `_Your doctor gets a QR code to join._`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Open SOMA',
                  web_app: { url: 'https://mysoma.site' }
                }
              ],
              [
                { text: '← Back', callback_data: 'learn_more' },
              ],
            ],
          },
        }
      );
    }

    // SOMA CHAT
    else if (data === 'soma_chat') {
      userState.set(chatId, { screen: 'soma_chat' });
      await bot.editMessageText(
        `💬 Chat with Soma\n\nTell me something on your mind. I'm here to listen.\n\nType your message below:`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      );
    }

    // CIRCLE
    else if (data === 'circle_view') {
      const state = userState.get(chatId);
      const user = await supabase.from('users').select('*').eq('telegram_id', query.from.id).single();

      if (!user.data) {
        await bot.editMessageText(
          `👥 My Circle\n\nYou haven't added anyone yet.\n\n/add_person to add someone`,
          { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
        );
      } else {
        const people = await supabase
          .from('circle')
          .select('*')
          .eq('user_id', user.data.id)
          .limit(5);

        let text = `👥 My Circle\n\n`;
        if (people.data && people.data.length > 0) {
          people.data.forEach((p, i) => {
            text += `${i + 1}. ${p.name} (${p.relationship_type})\n`;
          });
          text += `\n/add_person to add more`;
        } else {
          text += `No one in your circle yet.\n\n/add_person to add someone`;
        }

        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: query.message.message_id,
          ...backKeyboard
        });
      }
    }

    // MEET PEOPLE (MATCHING)
    else if (data === 'meet_people') {
      userState.set(chatId, { screen: 'meet_people', matchIndex: 0 });
      await showMatchCard(chatId, query.from.id, 0, query.message.message_id);
    }

    // NEXT MATCH
    else if (data.startsWith('next_match_')) {
      const index = parseInt(data.split('_')[2]) + 1;
      await showMatchCard(chatId, query.from.id, index, query.message.message_id);
    }

    // PREVIOUS MATCH
    else if (data.startsWith('prev_match_')) {
      const index = Math.max(0, parseInt(data.split('_')[2]) - 1);
      await showMatchCard(chatId, query.from.id, index, query.message.message_id);
    }

    // LIKE MATCH
    else if (data.startsWith('like_')) {
      const profileId = data.split('_')[1];
      const userId = query.from.id;

      await supabase.from('likes').insert({
        liker_id: userId,
        liked_id: profileId,
        created_at: new Date(),
      });

      await bot.answerCallbackQuery(query.id, { text: '❤️ Liked!' });

      const index = userState.get(chatId)?.matchIndex || 0;
      await showMatchCard(chatId, userId, index + 1, query.message.message_id);
    }

    // PASS MATCH
    else if (data.startsWith('pass_')) {
      const index = userState.get(chatId)?.matchIndex || 0;
      await showMatchCard(chatId, query.from.id, index + 1, query.message.message_id);
    }

    // MESSAGE MATCH
    else if (data.startsWith('msg_')) {
      const profileId = data.split('_')[1];
      userState.set(chatId, { screen: 'messaging', targetUserId: profileId });

      await bot.editMessageText(
        `💬 Send a message to this person\n\nType your opening message:`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      );
    }

    // LIFE BALANCE
    else if (data === 'life_balance') {
      userState.set(chatId, { screen: 'life_balance' });
      const user = await supabase.from('users').select('*').eq('telegram_id', query.from.id).single();

      if (!user.data) {
        await bot.editMessageText(
          `📊 Life Balance\n\nPlease sign up first to track your life balance.`,
          { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
        );
        return;
      }

      const memories = await supabase
        .from('memories')
        .select('domain, COUNT(*)')
        .eq('user_id', user.data.id)
        .group_by('domain');

      let text = `📊 Wheel of Life\n\n`;
      const domains = ['health', 'finance', 'hobby', 'relationships', 'purpose', 'mind'];

      domains.forEach(d => {
        const count = memories.data?.find(m => m.domain === d)?.count || 0;
        text += `${d.charAt(0).toUpperCase() + d.slice(1)}: ${'█'.repeat(Math.min(count, 10))} (${count})\n`;
      });

      text += `\nTotal memories: ${memories.data?.reduce((sum, m) => sum + m.count, 0) || 0}`;

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message.message_id,
        ...backKeyboard
      });
    }

    // DIARY
    else if (data === 'diary_view') {
      userState.set(chatId, { screen: 'diary' });
      await bot.editMessageText(
        `📝 Daily Diary\n\nHow was your day today? Share your thoughts and feelings:`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      );
    }

    // SETTINGS
    else if (data === 'settings') {
      userState.set(chatId, { screen: 'settings' });
      const settingsText = `⚙️ Settings\n\n` +
        `🔗 /login - Login to your account\n` +
        `📱 /signup - Create new account\n` +
        `🚪 /logout - Logout\n` +
        `❓ /help - Help & FAQ`;

      await bot.editMessageText(settingsText, {
        chat_id: chatId,
        message_id: query.message.message_id,
        ...backKeyboard
      });
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Callback error:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ Error', show_alert: true });
  }
});

// ============================================================================
// MESSAGE HANDLERS (User Text Input)
// ============================================================================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip command messages (handled by onText)
  if (text && text.startsWith('/')) return;

  const state = userState.get(chatId);
  if (!state) return;

  try {
    // SOMA CHAT - Send to Groq AI
    if (state.screen === 'soma_chat') {
      await bot.sendChatAction(chatId, 'typing');

      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
        model: 'groq/compound-mini',
        max_tokens: 200,
      });

      const somaResponse = response.choices[0]?.message?.content || "I'm thinking...";

      // Store message in database if user is logged in
      const user = await supabase.from('users').select('id').eq('telegram_id', msg.from.id).single();
      if (user.data) {
        await supabase.from('messages').insert({
          user_id: user.data.id,
          content: text,
          sender: 'user',
          created_at: new Date(),
        });

        await supabase.from('messages').insert({
          user_id: user.data.id,
          content: somaResponse,
          sender: 'soma',
          created_at: new Date(),
        });
      }

      await bot.sendMessage(chatId, `✦ Soma:\n\n${somaResponse}`, mainMenuKeyboard);
    }

    // DIARY - Save diary entry
    else if (state.screen === 'diary') {
      const user = await supabase.from('users').select('id').eq('telegram_id', msg.from.id).single();

      if (user.data) {
        await supabase.from('diary_entries').insert({
          user_id: user.data.id,
          content: text,
          created_at: new Date(),
        });

        // Get AI response
        await bot.sendChatAction(chatId, 'typing');
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: `I want to reflect on my day. Here's what happened: ${text}\n\nGive me a thoughtful, supportive response.`,
            },
          ],
          model: 'groq/compound-mini',
          max_tokens: 200,
        });

        const reflection = response.choices[0]?.message?.content || '';
        await bot.sendMessage(chatId, `✦ Soma:\n\n${reflection}`, mainMenuKeyboard);
      } else {
        await bot.sendMessage(chatId, `Please sign up first to save diary entries.\n\n/signup`, mainMenuKeyboard);
      }
    }

    // MESSAGING - Send message to matched person
    else if (state.screen === 'messaging') {
      const user = await supabase.from('users').select('id').eq('telegram_id', msg.from.id).single();

      if (user.data && state.targetUserId) {
        await supabase.from('messages').insert({
          user_id: user.data.id,
          recipient_id: state.targetUserId,
          content: text,
          sender: 'user',
          created_at: new Date(),
        });

        await bot.sendMessage(chatId, `✅ Message sent!\n\nLet's see if they reply...`, mainMenuKeyboard);
        userState.set(chatId, { screen: 'home' });
      }
    }
  } catch (error) {
    console.error('Message error:', error);
    await bot.sendMessage(chatId, '❌ Error processing message. Try again.');
  }
});

// ============================================================================
// AUTHENTICATION HANDLERS
// ============================================================================

bot.onText(/\/signup/, async (msg) => {
  const chatId = msg.chat.id;
  userState.set(chatId, { screen: 'signup_name' });

  await bot.sendMessage(
    chatId,
    `📝 Let's create your SOMA account\n\nFirst, what's your name?`
  );
});

bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `🔗 Login\n\nSend your email to login`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '← Back', callback_data: 'home' }],
        ],
      },
    }
  );
});

bot.onText(/\/logout/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  await supabase.from('users').update({ telegram_id: null }).eq('telegram_id', userId);

  await bot.sendMessage(
    chatId,
    `👋 Logged out successfully\n\n/login to login again`
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function showMatchCard(chatId, telegramUserId, index, messageId) {
  try {
    // Get user
    const userResult = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramUserId)
      .single();

    if (!userResult.data) {
      await bot.editMessageText(
        `Please sign up first to see matches.\n\n/signup`,
        { chat_id: chatId, message_id: messageId, ...backKeyboard }
      );
      return;
    }

    // Get random profile
    const profiles = await supabase
      .from('users')
      .select('id, name, age, bio, attachment_style, love_languages, interests')
      .neq('id', userResult.data.id)
      .range(index, index);

    if (!profiles.data || profiles.data.length === 0) {
      await bot.editMessageText(
        `🎲 No more profiles to show\n\nCome back later for more matches!`,
        { chat_id: chatId, message_id: messageId, ...backKeyboard }
      );
      return;
    }

    const profile = profiles.data[0];
    const matchScore = calculateMatchScore(userResult.data, profile);

    const text = `💫 ${profile.name}, ${profile.age}\n\n` +
      `✨ ${matchScore}% Compatibility\n\n` +
      `${profile.bio || 'No bio yet'}\n\n` +
      `Interests: ${profile.interests?.join(', ') || 'Not specified'}`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭕ Pass', callback_data: `pass_${profile.id}` },
            { text: '💬 Message', callback_data: `msg_${profile.id}` },
            { text: '❤️ Like', callback_data: `like_${profile.id}` },
          ],
          [
            { text: '◀️ Prev', callback_data: `prev_match_${index}` },
            { text: '▶️ Next', callback_data: `next_match_${index}` },
          ],
          [{ text: '← Back', callback_data: 'home' }],
        ],
      },
    });

    userState.set(chatId, { screen: 'meet_people', matchIndex: index });
  } catch (error) {
    console.error('Match card error:', error);
    await bot.sendMessage(chatId, '❌ Error loading profile');
  }
}

function calculateMatchScore(user1, user2) {
  let score = 50;

  if (user1.attachment_style === user2.attachment_style) score += 15;

  const commonInterests = (user1.interests || []).filter(i =>
    (user2.interests || []).includes(i)
  ).length;
  score += Math.min(commonInterests * 5, 20);

  if (user1.love_languages && user2.love_languages) {
    const commonLanguages = user1.love_languages.filter(l =>
      user2.love_languages.includes(l)
    ).length;
    score += Math.min(commonLanguages * 8, 15);
  }

  return Math.min(100, score);
}

// ============================================================================
// BOT READY
// ============================================================================

console.log('🤖 Telegram Bot is running...');

export { bot };
