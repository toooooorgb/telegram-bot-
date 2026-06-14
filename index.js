const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 1986725582;

const bot = new Telegraf(BOT_TOKEN);

const categories = {
  philosophy: {
    name: '🔵 الفلسفة',
    subs: ['الميتافيزيقا','الأخلاق','نظرية المعرفة','الجماليات','فلسفة الدين','فلسفة اللغة','فلسفة العلوم','الأنثروبولوجيا الفلسفية','الفلسفة السياسية','الفلسفة الإسلامية','الفلسفة اليونانية','الفلسفة الحديثة','الوجودية','العدمية']
  },
  logic: {
    name: '🟡 المنطق',
    subs: ['المنطق الأرسطي','المنطق الصوري','المنطق الرياضي','منطق القضايا','مناهج البحث','المغالطات المنطقية','الاستدلال والبرهان','التفكير النقدي']
  },
  politics: {
    name: '🔴 السياسة',
    subs: ['النظريات السياسية','الأنظمة السياسية','الفلسفة السياسية','العلاقات الدولية','الديمقراطية','الاشتراكية','القومية','السياسة العربية','الجيوسياسة']
  },
  economics: {
    name: '🟢 الاقتصاد',
    subs: ['الاقتصاد الكلي','الاقتصاد الجزئي','الاقتصاد السياسي','تاريخ الفكر الاقتصادي','الرأسمالية','الاشتراكية الاقتصادية','اقتصاديات السوق','الاقتصاد الإسلامي']
  },
  literature: {
    name: '🟠 الأدب',
    subs: ['الشعر العربي','الشعر العالمي','الرواية','القصة القصيرة','المسرحية','النقد الأدبي','الخاطرة','الأدب الجاهلي','الأدب الحديث','الأدب المقارن','البلاغة']
  }
};

const db = { sources: {}, notes: [] };
const userState = {};

function isAdmin(id) { return id === ADMIN_ID; }
function getKey(cat, sub) { return `${cat}_${sub}`; }
function getCatByKey(catKey) { return categories[catKey]; }

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔵 الفلسفة','cat_philosophy')],
    [Markup.button.callback('🟡 المنطق','cat_logic')],
    [Markup.button.callback('🔴 السياسة','cat_politics')],
    [Markup.button.callback('🟢 الاقتصاد','cat_economics')],
    [Markup.button.callback('🟠 الأدب','cat_literature')],
    [Markup.button.callback('📝 إضافة ملاحظة','add_note')],
  ]);
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔵 الفلسفة','cat_philosophy')],
    [Markup.button.callback('🟡 المنطق','cat_logic')],
    [Markup.button.callback('🔴 السياسة','cat_politics')],
    [Markup.button.callback('🟢 الاقتصاد','cat_economics')],
    [Markup.button.callback('🟠 الأدب','cat_literature')],
    [Markup.button.callback('📝 إضافة ملاحظة','add_note')],
    [Markup.button.callback('📬 استعراض الملاحظات','view_notes')],
  ]);
}

function subMenu(catKey) {
  const cat = getCatByKey(catKey);
  const buttons = cat.subs.map(sub => [Markup.button.callback(sub, `sub_${catKey}_${sub}`)]);
  buttons.push([Markup.button.callback('🔙 رجوع','back_main')]);
  return Markup.inlineKeyboard(buttons);
}

function subContentMenu(catKey, sub, userId) {
  const buttons = [
    [Markup.button.callback('📚 المصادر',`sources_${catKey}_${sub}`)],
    [Markup.button.callback('📝 إضافة ملاحظة','add_note')],
  ];
  if (isAdmin(userId)) buttons.push([Markup.button.callback('➕ إضافة مصدر',`addsource_${catKey}_${sub}`)]);
  buttons.push([Markup.button.callback('🔙 رجوع',`cat_${catKey}`)]);
  return Markup.inlineKeyboard(buttons);
}

bot.start((ctx) => {
  const name = ctx.from.first_name || 'صديقي';
  const admin = isAdmin(ctx.from.id);
  ctx.reply(admin ? `أهلاً ${name} 👋\nمرحباً بك يا مشرف!\n\nاختر قسماً:` : `أهلاً ${name} 👋\nمرحباً بك في بوت المعرفة!\n\nاختر قسماً:`, admin ? adminMenu() : mainMenu());
});

Object.keys(categories).forEach(catKey => {
  bot.action(`cat_${catKey}`, (ctx) => {
    ctx.answerCbQuery();
    const cat = getCatByKey(catKey);
    ctx.editMessageText(`${cat.name}\n\nاختر القسم الفرعي:`, subMenu(catKey));
  });
});

bot.action(/^sub_(.+)_(.+)$/, (ctx) => {
  ctx.answerCbQuery();
  const [, catKey, sub] = ctx.match;
  ctx.editMessageText(`${getCatByKey(catKey).name} › ${sub}\n\nماذا تريد؟`, subContentMenu(catKey, sub, ctx.from.id));
});

bot.action(/^sources_(.+)_(.+)$/, (ctx) => {
  ctx.answerCbQuery();
  const [, catKey, sub] = ctx.match;
  const sources = db.sources[getKey(catKey, sub)] || [];
  let text = `📚 مصادر: ${getCatByKey(catKey).name} › ${sub}\n\n`;
  text += sources.length === 0 ? 'لا توجد مصادر حتى الآن.' : sources.map((s,i) => `${i+1}. ${s}`).join('\n');
  ctx.editMessageText(text, Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع',`sub_${catKey}_${sub}`)]]));
});

bot.action(/^addsource_(.+)_(.+)$/, (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('⛔ غير مصرح لك');
  ctx.answerCbQuery();
  const [, catKey, sub] = ctx.match;
  userState[ctx.from.id] = { action: 'adding_source', catKey, sub };
  ctx.reply(`✏️ أرسل المصدر للإضافة إلى: ${sub}`);
});

bot.action('add_note', (ctx) => {
  ctx.answerCbQuery();
  userState[ctx.from.id] = { action: 'adding_note' };
  ctx.reply('✏️ اكتب ملاحظتك وسأرسلها للمشرف:');
});

bot.action('view_notes', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('⛔ غير مصرح لك');
  ctx.answerCbQuery();
  if (db.notes.length === 0) return ctx.reply('📭 لا توجد ملاحظات حتى الآن.');
  let text = '📬 الملاحظات الواردة:\n\n';
  db.notes.forEach((n,i) => { text += `${i+1}. من: ${n.name}\n   "${n.text}"\n   🕐 ${n.time}\n\n`; });
  ctx.reply(text);
});

bot.action('back_main', (ctx) => {
  ctx.answerCbQuery();
  const admin = isAdmin(ctx.from.id);
  ctx.editMessageText('اختر قسماً من القائمة:', admin ? adminMenu() : mainMenu());
});

bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state) return ctx.reply('اختر قسماً:', isAdmin(userId) ? adminMenu() : mainMenu());
  if (state.action === 'adding_source') {
    const key = getKey(state.catKey, state.sub);
    if (!db.sources[key]) db.sources[key] = [];
    db.sources[key].push(ctx.message.text);
    delete userState[userId];
    ctx.reply(`✅ تم إضافة المصدر إلى "${state.sub}"!`);
  }
  if (state.action === 'adding_note') {
    const note = { from: userId, name: ctx.from.first_name || 'مجهول', text: ctx.message.text, time: new Date().toLocaleString('ar-EG') };
    db.notes.push(note);
    delete userState[userId];
    ctx.reply('✅ تم إرسال ملاحظتك للمشرف!');
    bot.telegram.sendMessage(ADMIN_ID, `📬 ملاحظة من ${note.name}:\n\n"${note.text}"`).catch(()=>{});
  }
});

bot.launch().then(() => console.log('✅ البوت شغال!')).catch(err => console.error('❌ خطأ:', err));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
