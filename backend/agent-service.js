import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

// ============================================================================
// AGENT SERVICE - AI Agent Learning & Matching
// ============================================================================

export const agentService = {
  /**
   * Extract memories from user conversation
   * Uses AI to understand what we learn about the user
   */
  async learnFromConversation(userId, userMessage, aiResponse) {
    try {
      const prompt = `
Analyze this conversation and extract key facts about the user.

User message: "${userMessage}"
AI response: "${aiResponse}"

Extract facts in these domains:
- personality: how they think/feel/express
- interests: what they enjoy or care about
- values: what matters to them
- goals: what they want to achieve
- relationships: how they connect with others
- lifestyle: daily habits, preferences

Return JSON:
{
  "domain": "personality|interests|values|goals|relationships|lifestyle",
  "fact": "specific, concise fact",
  "confidence": 0.0-1.0
}

Return ONLY valid JSON, no other text.
`

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'groq/compound-mini',
        max_tokens: 200,
      })

      const text = response.choices[0]?.message?.content || '{}'
      const memories = []

      // Parse multiple JSON objects from response
      const jsonMatches = text.match(/\{[^{}]*\}/g) || []
      for (const match of jsonMatches) {
        try {
          const memory = JSON.parse(match)
          if (memory.domain && memory.fact) {
            await supabase.from('agent_memory').insert({
              user_id: userId,
              domain: memory.domain,
              fact: memory.fact,
              confidence: memory.confidence || 0.8,
              source: 'conversation',
            })
            memories.push(memory)
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      console.log(`✅ Learned ${memories.length} facts about user ${userId}`)
      return memories
    } catch (err) {
      console.error('❌ Error learning from conversation:', err)
      return []
    }
  },

  /**
   * Build/update agent profile from accumulated memories
   */
  async buildAgentProfile(userId) {
    try {
      // Get all memories for this user
      const { data: memories } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!memories || memories.length === 0) {
        console.log(`ℹ️ No memories to build profile from for user ${userId}`)
        return null
      }

      // Group memories by domain
      const byDomain = {}
      memories.forEach(m => {
        if (!byDomain[m.domain]) byDomain[m.domain] = []
        byDomain[m.domain].push(m.fact)
      })

      // Create summary prompt
      const summaryPrompt = `
Based on these facts learned about a person, create their AI agent profile.

Personality traits: ${byDomain.personality?.join(', ') || 'unknown'}
Interests: ${byDomain.interests?.join(', ') || 'unknown'}
Values: ${byDomain.values?.join(', ') || 'unknown'}
Goals: ${byDomain.goals?.join(', ') || 'unknown'}
Relationships: ${byDomain.relationships?.join(', ') || 'unknown'}
Lifestyle: ${byDomain.lifestyle?.join(', ') || 'unknown'}

Create:
1. 5 personality traits (JSON array of strings)
2. 5 core values (JSON array of strings)
3. 3-4 sentences about this person

Return valid JSON:
{
  "traits": ["trait1", "trait2"],
  "values": ["value1", "value2"],
  "summary": "description"
}
`

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: summaryPrompt }],
        model: 'groq/compound-mini',
        max_tokens: 300,
      })

      const text = response.choices[0]?.message?.content || '{}'
      const profile = JSON.parse(text)

      // Get or create agent profile
      const { data: existing } = await supabase
        .from('agent_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existing) {
        // Update
        await supabase
          .from('agent_profiles')
          .update({
            personality_traits: profile.traits,
            values: profile.values,
            summary: profile.summary,
            learning_score: Math.min(100, (memories.length / 50) * 100), // 0-100
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      } else {
        // Create
        await supabase.from('agent_profiles').insert({
          user_id: userId,
          personality_traits: profile.traits,
          values: profile.values,
          summary: profile.summary,
          learning_score: Math.min(100, (memories.length / 50) * 100),
        })
      }

      console.log(`✅ Built agent profile for user ${userId}`)
      return profile
    } catch (err) {
      console.error('❌ Error building agent profile:', err)
      return null
    }
  },

  /**
   * Find compatible agents for matching
   */
  async findMatchingAgents(userId, limit = 5) {
    try {
      const { data: userAgent } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!userAgent) {
        console.log(`⚠️ No agent profile for user ${userId}`)
        return []
      }

      // Get other agents (excluding self and already matched)
      const { data: otherAgents } = await supabase
        .from('agent_profiles')
        .select('*, users(id, name, age)')
        .neq('user_id', userId)
        .order('learning_score', { ascending: false })
        .limit(limit * 3) // Get more to filter

      if (!otherAgents) return []

      // Score compatibility
      const scored = otherAgents.map(agent => {
        let score = 50 // base score

        // Shared values
        const sharedValues = userAgent.values?.filter(v =>
          agent.values?.includes(v)
        ).length || 0
        score += sharedValues * 15

        // Shared interests
        const sharedInterests = userAgent.interests?.filter(i =>
          agent.interests?.includes(i)
        ).length || 0
        score += sharedInterests * 10

        // Both learning well
        score += (userAgent.learning_score + agent.learning_score) / 4

        return { ...agent, compatibility: Math.min(100, score) }
      })

      // Sort by compatibility
      return scored.sort((a, b) => b.compatibility - a.compatibility).slice(0, limit)
    } catch (err) {
      console.error('❌ Error finding matches:', err)
      return []
    }
  },

  /**
   * Create a match between two agents
   */
  async createMatch(agentAId, agentBId) {
    try {
      // Calculate compatibility
      const { data: agentA } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('id', agentAId)
        .single()

      const { data: agentB } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('id', agentBId)
        .single()

      let score = 50
      const sharedValues = agentA.values?.filter(v => agentB.values?.includes(v)).length || 0
      score += sharedValues * 15
      const sharedInterests = agentA.interests?.filter(i => agentB.interests?.includes(i)).length || 0
      score += sharedInterests * 10
      score += (agentA.learning_score + agentB.learning_score) / 4

      // Create match
      await supabase.from('agent_matches').insert({
        agent_a_id: agentAId,
        agent_b_id: agentBId,
        compatibility_score: Math.min(100, score),
      })

      console.log(`✅ Matched agents ${agentAId} & ${agentBId} (score: ${score})`)
      return Math.min(100, score)
    } catch (err) {
      console.error('❌ Error creating match:', err)
      throw err
    }
  },

  /**
   * Generate agent-to-agent conversation
   */
  async generateAgentConversation(matchId, initiatorAgentId) {
    try {
      const { data: match } = await supabase
        .from('agent_matches')
        .select('*, agent_profiles!agent_a_id(*), agent_profiles!agent_b_id(*)')
        .eq('id', matchId)
        .single()

      if (!match) throw new Error('Match not found')

      const initiator = match.agent_a_id.id === initiatorAgentId ? match.agent_a_id : match.agent_b_id
      const recipient = match.agent_a_id.id === initiatorAgentId ? match.agent_b_id : match.agent_a_id

      // Build context
      const context = `
You are ${initiator.agent_name || 'Soma'}, an AI agent representing this person:
${initiator.summary}

Personality: ${initiator.personality_traits?.join(', ')}
Values: ${initiator.values?.join(', ')}

You're talking to ${recipient.agent_name || 'Soma'}, who is:
${recipient.summary}

Personality: ${recipient.personality_traits?.join(', ')}
Values: ${recipient.values?.join(', ')}

Start a warm, genuine 1-2 sentence greeting. Be authentic to the person you represent.
`

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: context }],
        model: 'groq/compound-mini',
        max_tokens: 150,
      })

      const message = response.choices[0]?.message?.content || "Hi there!"

      // Save conversation
      await supabase.from('agent_conversations').insert({
        match_id: matchId,
        agent_a_id: match.agent_a_id.id,
        agent_b_id: match.agent_b_id.id,
        sender_agent_id: initiatorAgentId,
        content: message,
        reasoning: 'Initial greeting',
      })

      console.log(`✅ Generated agent message for match ${matchId}`)
      return message
    } catch (err) {
      console.error('❌ Error generating conversation:', err)
      throw err
    }
  },

  /**
   * Continue agent conversation
   */
  async continueAgentConversation(matchId, lastMessage) {
    try {
      const { data: match } = await supabase
        .from('agent_matches')
        .select('*, agent_profiles!agent_a_id(*), agent_profiles!agent_b_id(*)')
        .eq('id', matchId)
        .single()

      // Get recent conversation history
      const { data: history } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(5)

      const agentB = match.agent_b_id
      const conversationContext = history.reverse().map(h => `${h.sender_agent_id === match.agent_a_id.id ? match.agent_a_id.agent_name : agentB.agent_name}: ${h.content}`).join('\n')

      const prompt = `
You are ${agentB.agent_name}, representing:
${agentB.summary}

Values: ${agentB.values?.join(', ')}

Recent conversation:
${conversationContext}

Last message from ${match.agent_a_id.agent_name}: "${lastMessage}"

Respond naturally and authentically. 1-2 sentences.
`

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'groq/compound-mini',
        max_tokens: 150,
      })

      const message = response.choices[0]?.message?.content || "That sounds interesting!"

      // Save
      await supabase.from('agent_conversations').insert({
        match_id: matchId,
        agent_a_id: match.agent_a_id.id,
        agent_b_id: agentB.id,
        sender_agent_id: agentB.id,
        content: message,
      })

      return message
    } catch (err) {
      console.error('❌ Error continuing conversation:', err)
      throw err
    }
  },
}

export default agentService
