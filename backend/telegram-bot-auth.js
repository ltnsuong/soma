import { Bot } from 'node-telegram-bot-api'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import dotenv from 'dotenv'

dotenv.config()
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import Stripe from 'stripe'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env')
  process.exit(1)
}

let bot
try {
  bot = new Bot(token, { polling: true })
  console.log('🤖 Telegram bot initialized')

  bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error.message)
  })

  bot.on('error', (error) => {
    console.error('❌ Bot error:', error.message)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason)
  })
} catch (error) {
  console.error('❌ Failed to initialize bot:', error.message)
  process.exit(1)
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const userSessions = new Map()
const signupFlows = new Map()
const paymentFlows = new Map()

// ============================================================================
// KEYBOARDS
// ============================================================================

const mainMenuKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '💬 Talk to Soma', callback_data: 'soma_chat' }],
      [{ text: '👥 My Circle', callback_data: 'circle_view' }],
      [{ text: '🎲 Meet New People', callback_data: 'meet_people' }],
      [{ text: '📊 Life Balance', callback_data: 'life_balance' }],
      [{ text: '📝 Diary', callback_data: 'diary_view' }],
      [{ text: '💎 Premium', callback_data: 'premium_view' }],
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

const authKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📝 Sign Up', callback_data: 'signup_start' }],
      [{ text: '🔗 Log In', callback_data: 'login_start' }],
      [{ text: '💬 Try Free (No Login)', callback_data: 'try_free' }],
    ],
  },
};

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text
  const telegramUserId = msg.from.id

  console.log(`📨 Message received: "${text}" from user ${telegramUserId} in chat ${chatId}`)

  if (!text) {
    console.log('⚠️ No text in message, ignoring')
    return
  }

  // Handle /start command
  if (text === '/start') {
    console.log(`📱 /start received from ${telegramUserId} in chat ${chatId}`)
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, premium')
        .eq('telegram_id', telegramUserId)
        .single()

      if (userError) {
        console.log(`ℹ️ User not found for telegram_id ${telegramUserId}, showing signup screen`)
      } else {
        console.log(`✅ User found: ${user?.id}`)
      }

      if (user) {
        userSessions.set(chatId, { userId: user.id, telegramUserId, premium: user.premium })
        const welcome = `🌟 Welcome back to SOMA!\n\n` +
          `${user.premium ? '💎 Premium Member' : '📱 Free User'}\n\n` +
          `Ready to explore?`
        await bot.sendMessage(chatId, welcome, mainMenuKeyboard)
        console.log(`✅ Welcome message sent to ${chatId}`)
      } else {
        const welcome = `🌟 Welcome to SOMA\n\n` +
          `Your AI companion for life, relationships, and growth.\n\n` +
          `What would you like to do?`
        await bot.sendMessage(chatId, welcome, authKeyboard)
        console.log(`✅ Auth screen sent to ${chatId}`)
      }
    } catch (error) {
      console.error('❌ /start error:', error)
      try {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`)
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError.message)
      }
    }
    return
  }

  // Handle /logout command
  if (text === '/logout') {
    userSessions.delete(chatId)
    bot.sendMessage(chatId, `👋 Logged out!\n\n/start to login again`)
    return
  }

  // Handle /help command
  if (text === '/help') {
    const help = `📚 SOMA Features:\n\n` +
      `💬 Chat with Soma - AI conversations\n` +
      `👥 My Circle - Manage relationships\n` +
      `🎲 Meet People - Find friends/romance\n` +
      `📊 Life Balance - Track your growth\n` +
      `📝 Diary - Daily reflections\n` +
      `💎 Premium - Unlimited features\n` +
      `⚙️ Settings - Account options\n\n` +
      `/start - Go to home\n` +
      `/logout - Sign out`
    bot.sendMessage(chatId, help)
    return
  }

  if (text.startsWith('/')) return

  const session = userSessions.get(chatId)

  try {
    // SIGNUP FLOW
    if (session?.screen === 'signup_name') {
      signupFlows.set(chatId, { name: text })
      userSessions.set(chatId, { ...session, screen: 'signup_email' })
      await bot.sendMessage(chatId, `Nice to meet you, ${text}!\n\nNow your email:`)
    }

    else if (session?.screen === 'signup_email') {
      const flow = signupFlows.get(chatId)
      const email = text

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existing) {
        await bot.sendMessage(chatId, `❌ This email is already registered.\n\n/login to sign in`)
        return
      }

      signupFlows.set(chatId, { ...flow, email })
      userSessions.set(chatId, { ...session, screen: 'signup_password' })
      await bot.sendMessage(chatId, `Great! Now choose a password (min 6 characters):`)
    }

    else if (session?.screen === 'signup_password') {
      const flow = signupFlows.get(chatId)

      if (text.length < 6) {
        await bot.sendMessage(chatId, `❌ Password too short (min 6 chars)`)
        return
      }

      try {
        const passwordHash = await bcrypt.hash(text, 10)

        const { data: user, error } = await supabase
          .from('users')
          .insert({
            name: flow.name,
            email: flow.email,
            password_hash: passwordHash,
            telegram_id: telegramUserId,
            verified: true,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error) throw error

        userSessions.set(chatId, {
          userId: user.id,
          telegramUserId,
          screen: 'home',
        })

        signupFlows.delete(chatId)

        await bot.sendMessage(
          chatId,
          `🎉 Account created!\n\n${flow.name}, welcome to SOMA!\n\nLet's start exploring:`,
          mainMenuKeyboard
        )
      } catch (err) {
        console.error('Signup error:', err)
        await bot.sendMessage(chatId, `❌ Error creating account: ${err.message}`)
      }
    }

    // LOGIN FLOW
    else if (session?.screen === 'login_email') {
      const email = text
      userSessions.set(chatId, { ...session, screen: 'login_password', email })
      await bot.sendMessage(chatId, `Now your password:`)
    }

    else if (session?.screen === 'login_password') {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('id, password_hash, premium')
          .eq('email', session.email)
          .single()

        if (!user) {
          await bot.sendMessage(chatId, `❌ User not found.\n\n/signup to create account`)
          return
        }

        const validPassword = await bcrypt.compare(text, user.password_hash)

        if (!validPassword) {
          await bot.sendMessage(chatId, `❌ Wrong password`)
          return
        }

        await supabase
          .from('users')
          .update({ telegram_id: telegramUserId })
          .eq('id', user.id)

        userSessions.set(chatId, {
          userId: user.id,
          telegramUserId,
          screen: 'home',
          premium: user.premium,
        })

        await bot.sendMessage(
          chatId,
          `✅ Logged in!\n\nWelcome back!`,
          mainMenuKeyboard
        )
      } catch (err) {
        console.error('Login error:', err)
        await bot.sendMessage(chatId, `❌ Error logging in`)
      }
    }

    // SOMA CHAT
    else if (session?.screen === 'soma_chat') {
      await bot.sendChatAction(chatId, 'typing')

      if (!groq) {
        await bot.sendMessage(chatId, `❌ AI feature not available (set GROQ_API_KEY in .env)`)
        return
      }

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: text }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
      })

      const somaResponse = response.choices[0]?.message?.content || "I'm thinking..."

      if (session.userId) {
        await supabase.from('messages').insert({
          user_id: session.userId,
          content: text,
          sender: 'user',
          created_at: new Date().toISOString(),
        })

        await supabase.from('messages').insert({
          user_id: session.userId,
          content: somaResponse,
          sender: 'soma',
          created_at: new Date().toISOString(),
        })
      }

      await bot.sendMessage(chatId, `✦ Soma:\n\n${somaResponse}`, mainMenuKeyboard)
    }

    // DIARY
    else if (session?.screen === 'diary' && session.userId) {
      await supabase.from('diary_entries').insert({
        user_id: session.userId,
        content: text,
        created_at: new Date().toISOString(),
      })

      await bot.sendChatAction(chatId, 'typing')

      if (!groq) {
        await bot.sendMessage(chatId, `✦ Soma:\n\nThanks for sharing. Reflection feature requires AI.`)
        return
      }

      const response = await groq.chat.completions.create({
        messages: [
          { role: 'user', content: `My day: ${text}\n\nGive supportive reflection.` }
        ],
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
      })

      const reflection = response.choices[0]?.message?.content || ''
      await bot.sendMessage(chatId, `✦ Soma:\n\n${reflection}`, mainMenuKeyboard)
    }

  } catch (error) {
    console.error('Message error:', error)
    await bot.sendMessage(chatId, '❌ Error processing message')
  }
})

// ============================================================================
// CALLBACK QUERY HANDLER
// ============================================================================

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id
  const data = query.data
  const telegramUserId = query.from.id
  const session = userSessions.get(chatId) || {}

  try {
    if (data === 'signup_start') {
      userSessions.set(chatId, { ...session, screen: 'signup_name' })
      await bot.editMessageText(
        `What's your name?`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      )
    }

    else if (data === 'login_start') {
      userSessions.set(chatId, { ...session, screen: 'login_email' })
      await bot.editMessageText(
        `What's your email?`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      )
    }

    else if (data === 'try_free') {
      userSessions.set(chatId, { screen: 'home', premium: false })
      await bot.editMessageText(
        `Welcome to SOMA! You're in trial mode.`,
        { chat_id: chatId, message_id: query.message.message_id, ...mainMenuKeyboard }
      )
    }

    else if (data === 'home') {
      await bot.editMessageText(
        `🌟 Main Menu`,
        { chat_id: chatId, message_id: query.message.message_id, ...mainMenuKeyboard }
      )
    }

    else if (data === 'soma_chat') {
      userSessions.set(chatId, { ...session, screen: 'soma_chat' })
      await bot.editMessageText(
        `💬 Chat with Soma\n\nTell me what's on your mind...`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      )
    }

    else if (data === 'diary_view') {
      if (!session.userId) {
        await bot.editMessageText(
          `Please sign up to use diary`,
          { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
        )
        return
      }
      userSessions.set(chatId, { ...session, screen: 'diary' })
      await bot.editMessageText(
        `📝 Diary\n\nShare your thoughts for today...`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      )
    }

    else if (data === 'premium_view') {
      if (session.premium) {
        await bot.editMessageText(
          `✨ You're already premium!\n\nEnjoy unlimited features.`,
          { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
        )
      } else {
        const premiumText = `💎 Premium Membership\n\n` +
          `$9.99/month\n\n` +
          `✓ Unlimited matches\n` +
          `✓ Advanced matching\n` +
          `✓ Life balance reports\n` +
          `✓ Priority support`

        await bot.editMessageText(premiumText, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Upgrade to Premium', callback_data: 'premium_upgrade' }],
              [{ text: '← Back', callback_data: 'home' }],
            ],
          },
        })
      }
    }

    else if (data === 'premium_upgrade') {
      await bot.sendMessage(chatId, `🔗 Open in browser: https://mysoma.site/premium`)
      await bot.answerCallbackQuery(query.id, { text: 'Premium link sent', show_alert: true })
    }

    else if (data === 'settings') {
      let settingsText = `⚙️ Settings\n\n`
      if (session.userId) {
        settingsText += `Logged in\n\n` +
          `❓ /help - Help & FAQ\n` +
          `📱 /support - Contact support`
      } else {
        settingsText += `Not logged in\n\n/start to login`
      }

      await bot.editMessageText(settingsText, {
        chat_id: chatId,
        message_id: query.message.message_id,
        ...backKeyboard
      })
    }

    else if (data === 'meet_people') {
      if (!session.userId) {
        await bot.editMessageText(
          `Please sign up to see matches`,
          { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
        )
      } else {
        await showMatch(chatId, session.userId, 0, query.message.message_id)
      }
    }

    else if (data.startsWith('pass_') || data.startsWith('like_') || data.startsWith('msg_')) {
      const [action, id] = data.split('_')
      const index = parseInt(id)

      if (action === 'pass') {
        await showMatch(chatId, session.userId, index + 1, query.message.message_id)
      } else if (action === 'like') {
        await bot.answerCallbackQuery(query.id, { text: '❤️ Liked!', show_alert: false })
      } else if (action === 'msg') {
        await bot.editMessageText(
          `Send a message to this person...`,
          { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
        )
      }
    }

    else if (data === 'circle_view') {
      await bot.editMessageText(
        `👥 My Circle\n\nYour close relationships`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      )
    }

    else if (data === 'life_balance') {
      await bot.editMessageText(
        `📊 Life Balance\n\nTrack your growth across 8 life domains`,
        { chat_id: chatId, message_id: query.message.message_id, ...backKeyboard }
      )
    }

    await bot.answerCallbackQuery(query.id)
  } catch (error) {
    console.error('Callback error:', error)
    await bot.answerCallbackQuery(query.id, { text: '❌ Error', show_alert: true })
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function showMatch(chatId, userId, index, messageId) {
  try {
    if (!userId) {
      await bot.editMessageText(
        `Please sign up to see matches`,
        { chat_id: chatId, message_id: messageId, ...backKeyboard }
      )
      return
    }

    const { data: profiles } = await supabase
      .from('users')
      .select('id, name, age, bio, interests')
      .neq('id', userId)
      .range(index, index)

    if (!profiles || profiles.length === 0) {
      await bot.editMessageText(
        `🎲 No more profiles!\n\nCome back later`,
        { chat_id: chatId, message_id: messageId, ...backKeyboard }
      )
      return
    }

    const profile = profiles[0]
    const text = `💫 ${profile.name}, ${profile.age}\n\n` +
      `${profile.bio || 'No bio'}\n\n` +
      `Interests: ${(profile.interests || []).join(', ') || 'N/A'}`

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭕ Pass', callback_data: `pass_${index}` },
            { text: '💬 Message', callback_data: `msg_${profile.id}` },
            { text: '❤️ Like', callback_data: `like_${profile.id}` },
          ],
          [{ text: '← Back', callback_data: 'home' }],
        ],
      },
    })
  } catch (error) {
    console.error('Match error:', error)
  }
}

export { bot }
