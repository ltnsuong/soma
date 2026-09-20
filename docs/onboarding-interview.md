# The First Conversation

Onboarding spec. Replaces the three-question flow, which users told us in interviews was not good.

## What SOMA is, in order

1. **Understand yourself.** The Wheel of Life, memories, mood, what you're becoming.
2. **Build the relationships you already have.** The people in your Circle.
3. **Then find new ones.** And not only romantic — `connectionType` is
   `dating | friends | professional | support`.

That order is the product, so it has to be the order of the conversation. Anything that treats
step 3 as the point makes this a dating app with journaling bolted on, which is not what we're
building. **The first conversation covers 1 and 2. It barely touches 3.**

## The reframe

The app needs about thirty data points: ten Wheel of Life domains, the people in someone's
circle, a mood baseline, and — eventually — connection preferences. Nobody answers thirty
questions.

But nothing here has to be *asked*. `extract()` already pulls memories, people and mood out of
free text, and `deriveDatingProfile` already builds the connection profile from those memories,
server-side, with user-set fields winning. Both are live and working.

So the interview does not collect fields. **It gets someone talking warmly about their own life,
and extraction fills everything in behind them.** That is the whole design, and it is what makes
a friendly interview possible instead of a form.

It is also the vision already written down: *the user just talks, Soma fills the indicators, and
Soma asks about whatever the user hasn't said yet.*

## What we take from the market

| Product | What it does | What we take |
|---|---|---|
| Day One, Reflectly, Stoic | Prompted reflection; the writing is the value | The conversation should already feel useful on its own, before any feature unlocks. |
| Finch, Headspace, Noom | Ask *why you're here* first; personalise inside a minute | Motivation first, payoff early. Never collect-then-reward. |
| Paired, Lasting | Relationship skills through short prompts, not intake forms | Relationship questions can be warm and specific rather than diagnostic. |
| Dex, Clay, Monaru (personal CRMs) | Track the people you already know and when you last spoke | This is the Circle. Most people have never been asked who they're drifting from. |
| Hinge | Specific playful prompts instead of a blank bio | Concrete beats abstract — in every section, not just dating. |
| eharmony, OkCupid | Long forms, tolerated only when the payoff is named upfront | If we ever ask a lot, say why first. In conversation one, we don't. |
| Most dating apps | Ask directly for love language and attachment style | **Don't.** People self-report these badly, and asking them in conversation one tells the user they've joined a dating app. |

## What the research says

- **Writing about your own experience is itself the benefit.** Pennebaker's expressive-writing
  work. This is why conversation one must feel worthwhile even if the user never uses another
  feature.
- **Disclosure is reciprocal.** People match the depth they're given (Collins & Miller, 1994).
  So *Soma discloses first.* Highest-leverage rule in the set.
- **Escalating gradual disclosure builds closeness.** Aron et al. (1997) — here it builds the
  user's relationship with Soma, which is what earns the later questions.
- **Breadth before depth.** Social penetration theory (Altman & Taylor, 1973).
- **Relationships are maintained through small bids for connection, not grand gestures**
  (Gottman). The Circle exists to surface bids — and one question below does exactly that.
- **Open questions, reflections, summaries** — motivational interviewing (Miller & Rollnick).
- **Autonomy increases disclosure.** Self-determination theory. Everything visibly skippable.
- **The end is what they remember.** Peak–end rule. Always close on the payoff.

One conflict to manage: reflection raises disclosure, but `SOMA_VOICE` forbids naming emotions
and opening with validation. Resolve it by **reflecting content, never feeling.** "Swimming
twice a week is a lot" — not "it sounds like you're proud of that."

## The conversation

Three acts, roughly ten exchanges, five to eight minutes. The user never sees a question count.

### 0 — Soma goes first (disclosure, not a question)

> I'm Soma. I'll be straight with you — I'm not much use until I actually know you, so this
> first bit is me getting to know you rather than a form. Skip anything you don't feel like
> answering. I mean that.

Sets reciprocity, grants autonomy, names the payoff. No question yet.

---

### ACT I — You

**1. Why you're here**
> **What made you download this? Even if the answer's just "curious".**

*Feeds:* purpose, intent. *Follow-up if thin:* "Was something specific going on, or more of a
general itch?"

**2. The shape of an ordinary day**
> **Walk me through yesterday. Not the highlights — the actual shape of it.**

The highest-yield question in the set. One answer usually touches work, health, home, fun and
mood at once. Concrete recall, low stakes, nothing to perform.

*Feeds:* career, health, environment, hobby, mind, work, mood.
*Follow-up:* "Which part of that was actually yours? The bit where nobody needed anything."

**3. The body**
> **How's your body been treating you lately — sleep, energy, that kind of thing?**

*Feeds:* health, mind. *Follow-up:* "Is that normal for you, or is this a rough patch?"

**4. Where you're headed**
> **What are you trying to get better at at the moment?**
> **If the next year went well, what would be different?**

*Feeds:* growth, purpose, career, finance.
Money is asked plainly if it hasn't come up: *"Is money a stress right now, or is that handled?"*

---

### ACT II — Your people

Soma discloses first:
> Lives tend to make sense to me once I know who's in them.

**5. Who's around**
> **Who did you talk to most this week?**

*Follow-up:* "What are they to you?" / "How long's that been?"

**6. The bid** — the most important question in Act II
> **And who do you wish you'd talked to?**

This surfaces the drifting relationship the Circle exists to repair. Most people have never been
asked it, and it is the question that makes SOMA feel like it is about their actual life.

**7. Being known**
> **Think of a time you felt really understood by someone. What were they actually doing?**

Deliberately not romance-coded — the answer can be a friend, a parent, a partner, a colleague.
It yields how this person receives care *from a story*, which is far more accurate than a
five-option love-language picker, and it works for someone who isn't dating at all.

*Feeds:* circle (names, relationships, context), family, relationship, loveLanguage,
attachment, relationshipValues.

---

### ACT III — What's missing (one question, lightly)

> **Is there a kind of connection you're missing right now? Could be a friend, could be
> someone who gets a particular part of your life, could be more than that. Or nothing —
> that's a real answer too.**

One question. Maps to `connectionType` without ever using the word "dating". If they say
nothing's missing, that is a complete answer and Soma moves on without pushing.

**Everything else on the connection profile — age, work details, children, pets, ideal partner,
intimacy — is never asked here.** It is derived later from ordinary conversation, or asked only
if and when the user actually opens the Explore side of the app. Asking a person who came to
understand themselves whether they want kids is precisely how this starts feeling like a dating
app.

---

### Close — the payoff

Show the Wheel of Life filling in with what was heard, then **one genuine observation** — not a
summary, an actual noticing. Then:

> The empty bits I'll ask about as we go. No rush.

Only now, after they've invested, ask for the photo. Never before.

## Mechanics

- **No progress bar with a number.** "3 of 30" turns a conversation into a form. The wheel
  filling in is the progress indicator — the payoff and the progress are the same thing.
- **One follow-up maximum per thread**, then move on. Two reads as an interrogation.
- **Skip always visible** and never penalised.
- **Adaptive stop.** End when 7 of 10 domains hold at least one memory, or at 12 exchanges,
  whichever comes first. Someone who talks a lot finishes sooner, not later.
- **Never ask for a field extraction can infer.** No love-language picker, no attachment quiz,
  no interests checklist.
- **One question per message.** Two in one bubble and people answer only the second.

## The interview never really ends

After the first conversation, Soma knows exactly which domains are empty and asks about them
over the following days, one at a time, in ordinary talk — never as a form, never more than one
gap per session. Finance and family are the ones people skip first; leave them longest.

Connection preferences are the last thing to fill, and only for users who show interest in
meeting people. For everyone else the app is complete without them.

This is what makes the whole thing work: the first conversation doesn't have to be complete,
which is precisely why it can afford to be short and warm.

## What to measure

- Median words per user reply — the real signal of whether it feels like a conversation or a
  form. Watch this before anything else.
- Completion rate of the first conversation, against the current 3-question baseline.
- Median domains filled after conversation one — target 7 of 10.
- Share of users who name someone in answer to "who do you wish you'd talked to", and how many
  of those actually reach out within a week. That pair is the whole second pillar of the product.
- Share still answering gap questions on day 7.
