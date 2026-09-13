/**
 * One-time script: set localized bot name, description, and short description
 * for all languages SOMA supports.
 *
 * Run once:  node backend/setup-bot-descriptions.js
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN not set'); process.exit(1); }

async function call(method, params) {
  const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json();
  if (!json.ok) console.error(`  ✗ ${method} [${params.language_code || 'default'}]`, json.description);
  else console.log(`  ✓ ${method} [${params.language_code || 'default'}]`);
}

// ── Copy ─────────────────────────────────────────────────────────────────────
// Each entry: [language_code, description (long), short_description]
// language_code = undefined → default fallback for unlisted languages

const LANGS = [
  [undefined,
    '🌱 SOMA — Your AI life companion.\n\nSoma helps you understand yourself deeply — your emotions, your patterns, your growth — so you can build a life and connections that actually mean something.\n\n✨ Daily check-ins & mood tracking\n🧠 AI reflection that listens\n💞 Meet people who share your values\n\nOpen the app to begin.',
    'Your AI companion for self-knowledge, growth, and meaningful connections.'],

  ['en',
    '🌱 SOMA — Your AI life companion.\n\nSoma helps you understand yourself deeply — your emotions, your patterns, your growth — so you can build a life and connections that actually mean something.\n\n✨ Daily check-ins & mood tracking\n🧠 AI reflection that listens\n💞 Meet people who share your values\n\nOpen the app to begin.',
    'Your AI companion for self-knowledge, growth, and meaningful connections.'],

  ['ru',
    '🌱 SOMA — твой ИИ-компаньон по жизни.\n\nSoma помогает глубже понять себя — свои эмоции, паттерны, рост — чтобы выстраивать жизнь и отношения, которые действительно важны.\n\n✨ Ежедневные чекины и отслеживание настроения\n🧠 ИИ-рефлексия, которая слушает\n💞 Знакомства с людьми, разделяющими твои ценности\n\nОткрой приложение, чтобы начать.',
    'ИИ-компаньон для самопознания, роста и настоящих связей.'],

  ['vi',
    '🌱 SOMA — người bạn đồng hành AI trong cuộc sống.\n\nSoma giúp bạn hiểu sâu về bản thân — cảm xúc, thói quen, sự trưởng thành — để xây dựng cuộc sống và các mối quan hệ thực sự có ý nghĩa.\n\n✨ Check-in hàng ngày & theo dõi tâm trạng\n🧠 AI phản chiếu lắng nghe bạn\n💞 Kết nối với người cùng giá trị\n\nMở ứng dụng để bắt đầu.',
    'Người bạn AI cho hành trình tự khám phá, phát triển và kết nối ý nghĩa.'],

  ['es',
    '🌱 SOMA — tu compañero de vida con IA.\n\nSoma te ayuda a entenderte profundamente — tus emociones, patrones y crecimiento — para construir una vida y conexiones que realmente importen.\n\n✨ Check-ins diarios y seguimiento del estado de ánimo\n🧠 Reflexión con IA que te escucha\n💞 Conoce personas que comparten tus valores\n\nAbre la app para comenzar.',
    'Tu compañero IA para el autoconocimiento, el crecimiento y las conexiones que importan.'],

  ['fr',
    '🌱 SOMA — ton compagnon de vie IA.\n\nSoma t\'aide à te comprendre en profondeur — tes émotions, tes schémas, ta croissance — pour bâtir une vie et des liens qui ont vraiment du sens.\n\n✨ Check-ins quotidiens et suivi de l\'humeur\n🧠 Réflexion IA qui t\'écoute\n💞 Rencontre des personnes qui partagent tes valeurs\n\nOuvre l\'app pour commencer.',
    'Ton compagnon IA pour la connaissance de soi, la croissance et des liens authentiques.'],

  ['de',
    '🌱 SOMA — dein KI-Lebensbegleiter.\n\nSoma hilft dir, dich selbst tiefer zu verstehen — deine Emotionen, Muster und Entwicklung — um ein Leben und Beziehungen aufzubauen, die wirklich bedeutsam sind.\n\n✨ Tägliche Check-ins & Stimmungsverfolgung\n🧠 KI-Reflexion, die zuhört\n💞 Menschen kennenlernen, die deine Werte teilen\n\nÖffne die App, um zu beginnen.',
    'Dein KI-Begleiter für Selbsterkenntnis, Wachstum und bedeutungsvolle Verbindungen.'],

  ['it',
    '🌱 SOMA — il tuo compagno di vita IA.\n\nSoma ti aiuta a capire te stesso in profondità — le tue emozioni, i tuoi schemi, la tua crescita — per costruire una vita e connessioni che abbiano davvero senso.\n\n✨ Check-in quotidiani e monitoraggio dell\'umore\n🧠 Riflessione IA che ti ascolta\n💞 Incontra persone che condividono i tuoi valori\n\nApri l\'app per iniziare.',
    'Il tuo compagno IA per la conoscenza di sé, la crescita e le connessioni autentiche.'],

  ['pt',
    '🌱 SOMA — seu companheiro de vida com IA.\n\nSoma ajuda você a se entender profundamente — suas emoções, padrões e crescimento — para construir uma vida e conexões que realmente importam.\n\n✨ Check-ins diários e acompanhamento do humor\n🧠 Reflexão com IA que te escuta\n💞 Conheça pessoas que compartilham seus valores\n\nAbra o app para começar.',
    'Seu companheiro IA para autoconhecimento, crescimento e conexões significativas.'],

  ['zh',
    '🌱 SOMA — 你的 AI 人生伴侣。\n\nSoma 帮助你深入了解自己——你的情绪、模式和成长——让你建立真正有意义的生活和连接。\n\n✨ 每日签到与情绪追踪\n🧠 倾听你的 AI 反思\n💞 遇见与你价值观相符的人\n\n打开应用，开始你的旅程。',
    '你的 AI 伴侣，助你自我认知、成长与建立真实连接。'],

  ['ja',
    '🌱 SOMA — あなたのAIライフコンパニオン。\n\nSomaは自分自身を深く理解する手助けをします——感情、パターン、成長——本当に意味のある人生とつながりを築くために。\n\n✨ 毎日のチェックインと気分トラッキング\n🧠 聴いてくれるAIリフレクション\n💞 あなたの価値観を共有する人との出会い\n\nアプリを開いて始めましょう。',
    '自己理解、成長、そして意味あるつながりのためのAIコンパニオン。'],

  ['ar',
    '🌱 SOMA — رفيقك الذكي في الحياة.\n\nيساعدك سوما على فهم نفسك بعمق — مشاعرك وأنماطك ونموك — لبناء حياة وعلاقات ذات معنى حقيقي.\n\n✨ تسجيلات يومية ومتابعة الحالة المزاجية\n🧠 تأمل بمساعدة الذكاء الاصطناعي يسمعك\n💞 تعرّف على أشخاص يشاركونك قيمك\n\nافتح التطبيق للبدء.',
    'رفيقك الذكي للمعرفة الذاتية والنمو والتواصل الحقيقي.'],
];

// ── Run ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Setting bot descriptions for all languages...\n');
  for (const [lang, desc, shortDesc] of LANGS) {
    const params = lang ? { language_code: lang } : {};
    await call('setMyDescription', { ...params, description: desc });
    await call('setMyShortDescription', { ...params, short_description: shortDesc });
  }
  console.log('\nDone. Changes take effect immediately in Telegram.');
}

main().catch(console.error);
