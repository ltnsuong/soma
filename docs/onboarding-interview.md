# The First Conversation

Onboarding spec. Replaces the three-question flow, which users told us in interviews was not good.

## The reframe

The app needs about thirty data points: ten Wheel of Life domains, seventeen dating-profile
fields, the people in someone's circle, and a mood baseline. Nobody answers thirty questions.

But nothing here has to be *asked*. `extract()` already pulls memories, people and mood out of
free text, and `deriveDatingProfile` already builds the dating profile from those memories,
server-side, with user-set fields winning. Both are live and working.

So the interview does not collect fields. **It gets someone talking warmly across the ten life
areas, and extraction fills everything in behind them.** That is the whole design, and it is
what makes a friendly interview possible instead of a form.

It is also the product vision already written down: *the user just talks, Soma fills the
indicators, and Soma asks about whatever the user hasn't said yet.*

## What the market actually does

| Product | What it does | What we take |
|---|---|---|
| Hinge | Specific playful prompts instead of a blank bio | Concrete beats abstract. "I'll fall for you if…" gets a real answer; "Your interests" gets a list of nouns. |
| eharmony | ~150 questions, tolerated because the payoff is named first | Long only works when the user believes the reward. Say what you'll do with it, up front. |
| Duolingo, Noom, Headspace | Ask *why you're here* first, personalise within a minute | Motivation first. Payoff early, not at the end. |
| OkCupid | Questions carry weight the user sets | Let people mark what matters. Autonomy raises disclosure. |
| Replika | Relationship-building talk, not intake | Ours should feel like the product, because it *is* the product. |
| Most dating apps | Ask directly for love language, attachment style | **Don't.** People self-report these badly. Infer them from stories instead. |

## What the research says

- **Escalating reciprocal disclosure builds closeness fast.** Aron et al. (1997) — the "36
  questions" study. The mechanism isn't the questions, it's that they escalate gradually and
  both sides share.
- **Disclosure is reciprocal.** People match the depth they're given (Collins & Miller, 1994
  meta-analysis). So *Soma discloses first.* This is the single highest-leverage rule here.
- **Breadth before depth.** Social penetration theory (Altman & Taylor, 1973). Cover many areas
  lightly, then go deep where they lean in.
- **Open questions, reflections, summaries** — motivational interviewing (Miller & Rollnick).
  Evokes far more than interrogation does.
- **Autonomy increases sharing.** Self-determination theory. Every question visibly skippable.
- **The end is what they remember.** Peak–end rule (Kahneman). Close on the payoff, always.

One conflict to manage: reflection raises disclosure, but `SOMA_VOICE` forbids naming emotions
and opening with validation. Resolve it by **reflecting content, never feeling.** "Swimming
twice a week is a lot" — not "it sounds like you're proud of that."

## The conversation

Six movements, roughly ten exchanges, five to eight minutes. The user should never see a
question count.

### 0 — Soma goes first (disclosure, not a question)

> I'm Soma. I'll be straight with you — I'm not much use until I actually know you, so this
> first bit is me getting to know you rather than a form. Skip anything you don't feel like
> answering. I mean that.

Sets reciprocity, grants autonomy, names the payoff. No question yet.

### 1 — Why you're here
> **What made you download this? Even if the answer's just "curious".**

*Feeds:* purpose, connection intent. *Follow-up if thin:* "Was there something specific going
on, or more of a general itch?"

### 2 — The shape of an ordinary day
> **Walk me through yesterday. Not the highlights — the actual shape of it.**

The highest-yield question in the set. One answer typically touches work, health, home, fun and
mood at once. Concrete recall, low stakes, nothing to perform.

*Feeds:* career, health, environment, hobby, mind, work, mood.
*Follow-up:* "Which part of that was actually yours? The bit where nobody needed anything."

### 3 — The body
> **How's your body been treating you lately — sleep, energy, that kind of thing?**

*Feeds:* health, mind. *Follow-up:* "Is that normal for you, or is this a rough patch?"

### 4 — The people
Soma discloses first:
> Lives tend to make sense to me once I know who's in them.

> **Who did you talk to most this week?**
> then: **And who do you wish you'd talked to?**

The second question does more work than the first — it surfaces the neglected relationships the
Circle feature exists for.

*Feeds:* circle (names, relationships, context), family, relationship.
*Follow-up:* "What are they to you?" / "How long's that been?"

### 5 — Love, without the vocabulary test
> **Where are you with love right now?**

Deliberately open — doesn't presume single, partnered, looking, or straight.

> **Think of a time you felt properly loved. What was actually happening?**

This is the load-bearing question. It yields love language *from a story*, which is far more
accurate than asking someone to pick from five labels.

> **What's something you need from a relationship that you've stopped apologising for?**

*Feeds:* relationship, loveLanguage, attachment, relationshipValues, lookingFor, idealPartner.

### 6 — Money, work, and the year ahead
> **What does your work actually look like day to day?**
> **Is money a stress right now, or is that handled?** — asked plainly, no euphemism, easy to skip.
> **What are you trying to get better at at the moment?**
> **If the next year went well, what would be different?**

*Feeds:* career, finance, growth, purpose, work.

### 7 — The close (the payoff)
Show the Wheel of Life filling in with what was heard, then **one genuine observation** — not a
summary, an actual noticing. Then:

> The empty bits I'll ask about as we go. No rush.

Only now, after they've invested: ask for the photo. Never before.

## Mechanics

- **No progress bar with a number.** "3 of 30" turns a conversation into a form. Use the wheel
  filling in as the progress indicator — the payoff *is* the progress.
- **One follow-up maximum per thread**, then move on. Two follow-ups reads as an interrogation.
- **Skip always visible** and never penalised. "Rather not" moves on with no friction.
- **Adaptive stop.** End when 7 of 10 domains hold at least one memory, or at 12 exchanges,
  whichever comes first. A user who talks a lot finishes sooner, not later.
- **Never ask for a field extraction can infer.** No love-language picker, no attachment quiz,
  no interests checklist.
- **One question per message.** Two questions in one bubble and people answer only the second.

## The interview never really ends

After the first conversation, Soma knows exactly which domains are empty. It asks about them
over the following days, one at a time, in ordinary conversation — never as a form, never more
than one gap per session. Finance and family are the ones people skip first; leave them longest.

This is what makes the whole thing work: the first conversation doesn't have to be complete,
which is precisely why it can afford to be short and warm.

## What to measure

- Completion rate of the first conversation (baseline: the current 3-question flow).
- Median domains filled after conversation one — target 7 of 10.
- Median words per user reply — the real signal of whether it feels like an interview or a form.
- Share of users still answering gap questions on day 7.
