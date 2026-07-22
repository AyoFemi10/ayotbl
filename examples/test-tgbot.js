require('dotenv').config();
require('./setting/config');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { sleep } = require('./Fluxstore/utils');
const { BOT_TOKEN } = require('./Fluxstore/token');
const { autoLoadPairs } = require('./autoload');

// ayotbl only publishes an ESM build (its README only shows `import`), so we
// load it via dynamic import() inside an async main(). Everything else in
// this file stays CommonJS, untouched from the rest of your project.

const adminFilePath = path.join(__dirname, 'Fluxstore', 'admin.json');
let adminIDs = [];

const userFilePath = path.join(__dirname, 'Fluxstore', 'users.json');
let userIDs = new Set();

const REQUIRED_GROUP = [
  '@saturonewgc1',
  '@saturonewgc2',
  '@saturonewgc3',
  '@saturonewgc4'
];

const REQUIRED_CHANNELS = [
  '@saturo_tech_real1',
  '@saturo_tech_real2',
  '@saturo_tech_real3',
  '@saturo_tech_real4',
];

const SOCIAL_LINKS = {
  whatsapp: 'https://whatsapp.com/channel/0029VbBpPLa4yltGWSKWlC1L',
  telegram_channels: [
    'https://t.me/saturo_tech_real1',
    'https://t.me/saturo_tech_real2',
    'https://t.me/saturo_tech_real3',
    'https://t.me/saturo_tech_real4'
  ],
  telegram_group: ['https://t.me/saturonewgc1'],
  channel1: 'https://t.me/saturo_tech_real1',
  channel2: 'https://t.me/saturo_tech_real2',
  group1: 'https://t.me/saturonewgc1',
  group2: 'https://t.me/saturonewgc2',
  developer: 'https://t.me/saturotech'
};

// ---------- Utility functions ----------

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const loadAdminIDs = async () => {
  const ownerID = '8128578478';
  const defaultAdmins = [ownerID];

  if (!(await exists(adminFilePath))) {
    await fs.writeFile(adminFilePath, JSON.stringify(defaultAdmins, null, 2));
    adminIDs = defaultAdmins;
    console.log('✅ created admin.json with default owner id');
  } else {
    try {
      const raw = await fs.readFile(adminFilePath, 'utf8');
      adminIDs = JSON.parse(raw);
    } catch (err) {
      adminIDs = defaultAdmins;
    }
  }
  console.log('📥 loaded admin ids:', adminIDs);
};

function runtime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

const loadUserIDs = async () => {
  if (await exists(userFilePath)) {
    try {
      const raw = await fs.readFile(userFilePath, 'utf8');
      const users = JSON.parse(raw);
      userIDs = new Set(users);
      console.log(`📥 loaded ${userIDs.size} users`);
    } catch (err) {
      userIDs = new Set();
    }
  }
};

const saveUserIDs = async () => {
  try {
    await fs.writeFile(userFilePath, JSON.stringify([...userIDs], null, 2));
  } catch (err) {}
};

const trackUser = async (userId) => {
  const userIdStr = userId.toString();
  if (!userIDs.has(userIdStr)) {
    userIDs.add(userIdStr);
    await saveUserIDs();
    console.log(`➕ new user tracked: ${userIdStr}`);
  }
};

// ---------- State ----------

let isShuttingDown = false;
let isAutoLoadRunning = false;

const runAutoLoad = async () => {
  if (isAutoLoadRunning || isShuttingDown) return;
  isAutoLoadRunning = true;
  try {
    console.log('⏱️ initializing auto-load');
    await autoLoadPairs();
    console.log('✅ auto-load completed');
  } catch (e) {
  } finally {
    isAutoLoadRunning = false;
  }
};

const startAutoLoadLoop = () => {
  runAutoLoad();
  setInterval(runAutoLoad, 60 * 60 * 1000);
};

async function main() {
  const { Bot, Keyboard } = await import('ayotbl');

  // ---------- Reusable keyboards, built with ayotbl's fluent Keyboard.inline() ----------

  const kb = {
    privateOnly: () => Keyboard.inline().url('Server 𝟣', 'https://t.me/Flux_s1bot').build(),

    joinRequirement: () =>
      Keyboard.inline()
        .url('ᴄʜᴀɴɴᴇʟ 𝟣', 'https://t.me/saturo_tech_real1').url('ɢʀᴏᴜᴘ 𝟣', 'https://t.me/saturonewgc1').row()
        .url('ᴄʜᴀɴɴᴇʟ 2', 'https://t.me/saturo_tech_real2').url('ɢʀᴏᴜᴘ 2', 'https://t.me/saturonewgc2').row()
        .url('ᴄʜᴀɴɴᴇʟ 3', 'https://t.me/saturo_tech_real3').url('ɢʀᴏᴜᴘ 3', 'https://t.me/saturonewgc3').row()
        .url('ᴄʜᴀɴɴᴇʟ 4', 'https://t.me/saturo_tech_real4').url('ɢʀᴏᴜᴘ 4', 'https://t.me/saturonewgc4').row()
        .button('Verify ✅', 'check_membership')
        .build(),

    channelOnly: (url = 'https://t.me/saturo_tech_real1') => Keyboard.inline().url('ᴄʜᴀɴɴᴇʟ', url).build(),

    devOnly: () => Keyboard.inline().url('Dev', 'https://t.me/saturotech').build(),

    ownerOnly: () => Keyboard.inline().url('ᴏᴡɴᴇʀ', 'https://t.me/saturotech').build(),

    pairSuccess: () => Keyboard.inline().url('Group', 'https://t.me/saturonewgc2').build(),

    delpairSuccess: () => Keyboard.inline().url('ᴅᴇᴠ', 't.me/saturotech').build(),

    helpAndChannel: () =>
      Keyboard.inline()
        .button('ʜᴇʟᴘ', 'help_msg').row()
        .url('ᴄʜᴀɴɴᴇʟ', 't.me/saturo_tech_real1')
        .build(),

    reportGuide: () =>
      Keyboard.inline()
        .url('ᴄʜᴀɴɴᴇʟ', 't.me/saturo_tech_real1').row()
        .button('ʜᴇʟᴘ', 'help_msg').row()
        .button('ᴍᴀɪɴ ᴍᴇɴᴜ', 'start_bot')
        .build(),

    reportSent: () => Keyboard.inline().url('🗨 ᴄʜᴀɴɴᴇʟ', 't.me/saturo_tech_real1').build(),

    adminReplyLink: () => Keyboard.inline().url('👨‍💻 ᴏᴡɴᴇʀ ', SOCIAL_LINKS.developer).build(),

    membershipVerified: () =>
      Keyboard.inline()
        .url('ᴄʜᴀɴɴᴇʟ', 't.me/saturo_tech_real1').url('ᴄʜᴀɴɴᴇʟ 2', 't.me/saturo_tech_real2')
        .build(),

    membershipIncomplete: () =>
      Keyboard.inline()
        .url('ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ', 't.me/saturo_tech_real2').row()
        .url('ᴊᴏɪɴ ᴄʜᴀɴɴᴇʟ', 't.me/saturo_tech_real1').row()
        .url('ɢʀᴏᴜᴘ', 't.me/saturonewgc1').row()
        .url('ɢʀᴏᴜᴘ', 't.me/saturonewgc2').row()
        .button('ᴀᴜᴛʜᴏʀɪᴢᴇ', 'check_membership')
        .build(),

    replyToUser: (userId) => Keyboard.inline().button('ʀᴇᴘʟʏ ᴛᴏ ᴜsᴇʀ', `reply_${userId}`).build(),

    broadcastLink: () => Keyboard.inline().url('ᴄʜᴀɴɴᴇʟ', 'https://t.me/saturo_tech_real1').build(),
  };

  const bot = new Bot(BOT_TOKEN, {
    floodControl: { maxRetries: 3 },
  });

  // ---------- Membership check (needs bot.api, so defined after bot exists) ----------

  const checkMembership = async (userId) => {
    try {
      const groupChecks = await Promise.all(
        REQUIRED_GROUP.map((group) =>
          bot.api.getChatMember({ chat_id: group, user_id: userId }).catch(() => null)
        )
      );
      const channelChecks = await Promise.all(
        REQUIRED_CHANNELS.map((channel) =>
          bot.api.getChatMember({ chat_id: channel, user_id: userId }).catch(() => null)
        )
      );

      const validStatuses = ['member', 'administrator', 'creator'];
      const hasJoinedGroup = groupChecks.some((m) => m && validStatuses.includes(m.status));
      const hasJoinedAllChannels = channelChecks.every((m) => m && validStatuses.includes(m.status));

      return {
        hasJoinedGroup,
        hasJoinedAllChannels,
        hasJoinedAll: hasJoinedGroup && hasJoinedAllChannels
      };
    } catch (error) {
      return { hasJoinedGroup: false, hasJoinedAllChannels: false, hasJoinedAll: false };
    }
  };

  const sendJoinRequirement = (chatId) => {
    return bot.api.sendMessage({
      chat_id: chatId,
      text: '🚫 ᴀᴄᴄᴇꜱꜱ ᴅᴇɴɪᴇᴅ\nғᴏʟʟᴏᴡ ᴀʟʟ ᴛʜᴇ ʀᴇᴏ̨ᴜɪʀᴇᴅ ᴄʜᴀɴɴᴇʟꜱ ʙᴇʟᴏᴡ ᴛᴏ ᴘʀᴏᴄᴇᴇᴅ',
      reply_markup: kb.joinRequirement()
    });
  };

  // ---------- Middleware (higher-order wrappers around a ctx handler) ----------

  const requirePrivateChat = (handler) => async (ctx) => {
    if (ctx.chat?.type !== 'private') {
      return ctx.reply(
        "⚠️ *Access Denied:*\nFor security and anti-spam reasons, I only work in Direct Messages (DMs).\n\nPlease click my profile and send me a private message to use commands.",
        {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: ctx.message.message_id },
          reply_markup: kb.privateOnly()
        }
      );
    }
    return handler(ctx);
  };

  const requireMembership = (handler) => async (ctx) => {
    const userId = ctx.from.id;
    await trackUser(userId);

    if (adminIDs.includes(userId.toString())) return handler(ctx);

    const membership = await checkMembership(userId);
    if (!membership.hasJoinedAll) return sendJoinRequirement(ctx.chatId);

    return handler(ctx);
  };

  // ---------- Commands ----------

  bot.command('runtime', async (ctx) => {
    try {
      const caption = `ʙᴏᴛ ɪs ᴀᴄᴛɪᴠᴇ ᴀɴᴅ ʀᴜɴɴɪɴɢ ғᴏʀ ${runtime(process.uptime())}`;
      await ctx.reply(caption, {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    } catch (err) {
      try {
        await ctx.reply('⚠️ Failed to get runtime info.');
      } catch (e) {}
    }
  });

  bot.command('start', requirePrivateChat(async (ctx) => {
    await ctx.replyWithPhoto('https://ibb.co/TBj1mM54', {
      caption: `
╭━━〔 ꜰʟᴜx xᴅ ʙᴏᴛ 〕━━╮
   
  々 𝖮𝗐𝗇𝖾𝗋 : @saturotech
  々 𝖲𝗍𝖺𝗍𝗎𝗌 : Online
    
╰━━━━━━━ • ━━━━━━━╯

┏━━━〔 ᴄᴏᴍᴍᴀɴᴅꜱ 〕━━━┓
┃ 
┃ ⚝ /pair
┃ ⚝ /delpair
┃ ⚝ /runtime
┃ ⚝ /ping
┃ ⚝ /report
┃
┃   〔 ᴀᴅᴍɪɴ ᴏɴʟʏ 〕
┃ ⚝ /broadcast
┃ ⚝ /clean
┃ ⚝ /listpair
┗━━━━━━━━━━━━━━━━━━┛`,
      reply_markup: kb.devOnly()
    });
  }));

  // /pair — bare shows usage, /pair 234xxxxxxxx runs the flow (ctx.match[1] holds args, "" if none)
  bot.command('pair', requirePrivateChat(requireMembership(async (ctx) => {
    const text = (ctx.match?.[1] ?? '').trim();

    if (!text) {
      return ctx.reply('To proceed enter a phone number in the format: `/pair 234xxxxxxxx`', {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    }

    try {
      if (/[a-z]/i.test(text)) {
        return ctx.reply('To proceed enter a phone number in the format: `/pair 234xxxxxxxx`', { parse_mode: 'Markdown' });
      }

      if (!/^\d{7,15}(\|\d{1,10})?$/.test(text)) {
        return ctx.reply('Use a valid phone number format [ 9 digits ]');
      }

      const countryCode = text.slice(0, 3);
      if (['0'].includes(countryCode)) {
        return ctx.reply('Numbers with this country code are not supported.');
      }

      const pairingFolder = path.join(__dirname, 'Fluxstore', 'pairing');
      if (!(await exists(pairingFolder))) {
        await fs.mkdir(pairingFolder, { recursive: true });
      }

      const files = await fs.readdir(pairingFolder);
      const pairedCount = files.filter((file) => file.endsWith('@s.whatsapp.net')).length;

      if (pairedCount >= 50) {
        return ctx.reply('This Bot server limit is full kindly use other server or contact the owner to create more servers', {
          parse_mode: 'Markdown',
          reply_markup: kb.ownerOnly()
        });
      }

      const startpairing = require('./pair.js');
      const Xreturn = text.split('|')[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';

      await startpairing(Xreturn);
      await sleep(4000);

      const pairingFile = path.join(pairingFolder, 'pairing.json');
      const cu = await fs.readFile(pairingFile, 'utf-8');
      const cuObj = JSON.parse(cu);
      delete require.cache[require.resolve('./pair.js')];

      const senderNumber = text.split('|')[0].replace(/[^0-9]/g, '');
      const whatsappFormat = senderNumber + '@s.whatsapp.net';
      const lidFormat = senderNumber + '@lid';

      const ownerPath = path.join(__dirname, 'allfunc', 'owner.json');
      let ownerData = [];

      try {
        const ownerFile = await fs.readFile(ownerPath, 'utf-8');
        ownerData = JSON.parse(ownerFile);
      } catch (err) {
        console.log('⚠️ Creating new owner.json file');
        ownerData = [];
      }

      let isNew = false;
      if (!ownerData.includes(whatsappFormat)) {
        ownerData.push(whatsappFormat);
        isNew = true;
      }
      if (!ownerData.includes(lidFormat)) {
        ownerData.push(lidFormat);
        isNew = true;
      }

      if (isNew) {
        await fs.writeFile(ownerPath, JSON.stringify(ownerData, null, 2));
        console.log('✅ Saved new owner (both formats):', senderNumber);
      } else {
        console.log('ℹ️ User already in owner list:', senderNumber);
      }

      await ctx.reply(
        `Sucess ✅  Pairing Code Set!\n\n📱 Number: \`${senderNumber}\`\n🔑 Code: \`${cuObj.code}\`\n\nInstructions:\n1. Tap the code to copy\n2. Open WhatsApp on your phone\n3. Go to Settings > Linked Devices\n4. Tap "Link a Device"\n5. Enter the code you coppied\n\n⏰ Code expires in 3 minutes`,
        {
          parse_mode: 'Markdown',
          reply_markup: kb.pairSuccess()
        }
      );
    } catch (error) {
      await ctx.reply(`┃◈ ᴄᴏɴɴᴇᴄᴛɪᴏɴ ғᴀɪʟᴇᴅ: ${error.message}`);
    }
  })));

  // /delpair — bare shows usage, /delpair 234xxxxxxxx deletes
  bot.command('delpair', requirePrivateChat(requireMembership(async (ctx) => {
    const input = (ctx.match?.[1] ?? '').trim();

    if (!input) {
      return ctx.reply('To proceed enter a phone number in the format: /delpair 234xxxxxxxx', {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    }

    try {
      if (/[a-z]/i.test(input) || !/^\d{7,15}$/.test(input) || input.startsWith('0')) {
        return ctx.reply('Your whatsapp number cannot start with 0', { parse_mode: 'Markdown' });
      }

      const jidSuffix = `${input}@s.whatsapp.net`;
      const pairingPath = path.join(__dirname, 'Fluxstore', 'pairing');

      if (!(await exists(pairingPath))) {
        return ctx.reply('The session you are trying to delete does bot exist in the bot database', {
          parse_mode: 'Markdown',
          reply_markup: kb.channelOnly()
        });
      }

      const entries = await fs.readdir(pairingPath, { withFileTypes: true });
      const matched = entries.find((entry) => entry.isDirectory() && entry.name.endsWith(jidSuffix));

      if (!matched) {
        return ctx.reply(`${input} is not found in the bot database`, {
          parse_mode: 'Markdown',
          reply_markup: kb.channelOnly()
        });
      }

      const targetPath = path.join(pairingPath, matched.name);
      await fs.rm(targetPath, { recursive: true, force: true });

      await ctx.reply(`${input} ʜᴀs ʙᴇᴇɴ ᴅᴇʟᴇᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ`, {
        parse_mode: 'Markdown',
        reply_markup: kb.delpairSuccess()
      });
    } catch (err) {
      await ctx.reply('opps, i have failed to delete session', {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    }
  })));

  // /listpair — admin only, requires "confirm" arg
  bot.command('listpair', async (ctx) => {
    const userId = ctx.from.id.toString();
    const confirmation = (ctx.match?.[1] ?? '').trim().toLowerCase();

    if (!adminIDs.includes(userId)) {
      return ctx.reply('This command is restricted to bot owner only', {
        parse_mode: 'Markdown',
        reply_markup: kb.delpairSuccess()
      });
    }

    if (confirmation !== 'confirm') {
      return ctx.reply('ᴜsᴀɢᴇ: /listpair confirm', {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    }

    try {
      const pairingPath = path.join(__dirname, 'Fluxstore', 'pairing');

      if (!(await exists(pairingPath))) {
        return ctx.reply('⚄︎═══════════════════⚄︎\n┃ \n┃ No paired device found \n┃ \n⚄︎═══════════════════⚄︎', { parse_mode: 'Markdown' });
      }

      const entries = await fs.readdir(pairingPath, { withFileTypes: true });
      const pairedDevices = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      if (pairedDevices.length === 0) {
        return ctx.reply('⚄︎═══════════════════⚄︎\n┃ \n┃ No paired device found \n┃ \n⚄︎═══════════════════⚄', { parse_mode: 'Markdown' });
      }

      const deviceList = pairedDevices
        .map((device, index) => `┃ ${index + 1}. ${device.split('@')[0]}`)
        .join('\n');

      await ctx.reply(
        `⚄︎═══════════════════⚄︎\n┃ Total: ${pairedDevices.length}\n┃Devices: ${deviceList}\n┃ \n⚄︎═══════════════════⚄︎`,
        {
          parse_mode: 'Markdown',
          reply_markup: kb.helpAndChannel()
        }
      );
    } catch (err) {
      await ctx.reply('╭━━〔 ᴇʀʀᴏʀ 〕━━┈⊷\n┃◈ ғᴀɪʟᴇᴅ ᴛᴏ ʀᴇᴛʀɪᴇᴠᴇ\n╰━━━━━━━━━━━━━━━┈⊷', {
        parse_mode: 'Markdown',
        reply_markup: kb.helpAndChannel()
      });
    }
  });

  // /autoload confirm — admin only
  bot.command('autoload', async (ctx) => {
    const userId = ctx.from.id.toString();
    const confirmation = (ctx.match?.[1] ?? '').trim().toLowerCase();

    if (!adminIDs.includes(userId)) {
      return ctx.reply('This command is restricted to owner only', {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    }

    if (confirmation !== 'confirm') {
      return ctx.reply('⚄︎═══════════════════⚄︎\n┃ \n┃ Usage: /autoload confirm\n┃ \n⚄︎═══════════════════⚄', {
        parse_mode: 'Markdown',
        reply_markup: kb.channelOnly()
      });
    }

    console.log('manual auto-load triggered');
    autoLoadPairs()
      .then(() => ctx.reply('╭⚄︎═══════════════════⚄︎\n┃ \n┃ Autoload completed \n┃ \n⚄︎═══════════════════⚄'))
      .catch((e) => ctx.reply(`╭━━〔 ᴇʀʀᴏʀ 〕━━┈⊷\n┃◈ ${e.message}\n╰━━━━━━━━━━━━━━━┈⊷`));
  });

  // /report — bare shows guide, /report <message> sends it to admins
  bot.command('report', requireMembership(async (ctx) => {
    const reportMessage = (ctx.match?.[1] ?? '').trim();

    if (!reportMessage) {
      return ctx.reply(
        `**🛠️ Report Guide*\n\nUse the command below to report issues or bugs:\n\`/report <your message>\`\n\n**Example:**  \n\`/report bot has errors\`\n\n✅ Keep it clear and brief  \n✅ Only report real issues  \n✅ Use English if possible\n\nYour feedback helps us improve!`,
        {
          parse_mode: 'Markdown',
          reply_markup: kb.reportGuide()
        }
      );
    }

    const userId = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : 'ɴᴏ ᴜsᴇʀɴᴀᴍᴇ';
    const firstName = ctx.from.first_name || 'ᴜsᴇʀ';

    try {
      const reportText =
        `╭━━〔 ɴᴇᴡ ʀᴇᴘᴏʀᴛ 〕━━┈⊷\n` +
        `┃◈ ғʀᴏᴍ: ${firstName}\n` +
        `┃◈ ᴜsᴇʀɴᴀᴍᴇ: ${username}\n` +
        `┃◈ ᴜsᴇʀ ɪᴅ: ${userId}\n` +
        `┃\n` +
        `┃◈ ᴍᴇssᴀɢᴇ:\n` +
        `┃${reportMessage}\n` +
        `╰━━━━━━━━━━━━━━━┈⊷`;

      let sentCount = 0;
      for (const adminId of adminIDs) {
        try {
          await bot.api.sendMessage({
            chat_id: adminId,
            text: reportText,
            reply_markup: kb.replyToUser(userId)
          });
          sentCount++;
        } catch (e) {}
      }

      if (sentCount > 0) {
        await ctx.reply('**✅ Your report has been sent to the admins.** \nThey’ll review it and respond soon.\nThanks for your feedback!', {
          parse_mode: 'Markdown',
          reply_markup: kb.reportSent()
        });
        console.log(chalk.green(`📨 Report from ${userId} sent to ${sentCount} admins`));
      } else {
        await ctx.reply(' ғᴀɪʟᴇᴅ ᴛᴏ sᴇɴᴅ ʀᴇᴘᴏʀᴛ');
      }
    } catch (error) {
      await ctx.reply('╭━━〔 ᴇʀʀᴏʀ 〕━━┈⊷\n┃◈ ғᴀɪʟᴇᴅ ᴛᴏ sᴇɴᴅ ʀᴇᴘᴏʀᴛ\n╰━━━━━━━━━━━━━━━┈⊷', {
        parse_mode: 'Markdown',
        reply_markup: kb.reportSent()
      });
    }
  }));

  // /clean — admin only
  bot.command('clean', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!adminIDs.includes(userId)) {
      return ctx.reply('This command is restricted to owner only', {
        parse_mode: 'Markdown',
        reply_markup: kb.helpAndChannel()
      });
    }

    try {
      const pairingPath = path.join(__dirname, 'Fluxstore', 'pairing');

      if (!(await exists(pairingPath))) {
        return ctx.reply('╭━━〔 ɴᴏ sᴇssɪᴏɴs 〕━━┈⊷\n┃◈ ɴᴏ sᴇssɪᴏɴs ᴛᴏ ᴄʟᴇᴀɴ\n╰━━━━━━━━━━━━━━━┈⊷', {
          parse_mode: 'Markdown',
          reply_markup: kb.channelOnly()
        });
      }

      const entries = await fs.readdir(pairingPath, { withFileTypes: true });
      let cleaned = 0;
      let kept = 0;

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'pairing.json') continue;

        const sessionPath = path.join(pairingPath, entry.name);
        const credsPath = path.join(sessionPath, 'creds.json');

        let isValid = false;
        if (await exists(credsPath)) {
          try {
            const creds = JSON.parse(await fs.readFile(credsPath, 'utf8'));
            isValid = !!(creds.me && creds.me.id && creds.registered);
          } catch (e) {
            isValid = false;
          }
        }

        if (!isValid) {
          await fs.rm(sessionPath, { recursive: true, force: true });
          console.log(`🗑️ Cleaned invalid session: ${entry.name}`);
          cleaned++;
        } else {
          kept++;
        }
      }

      await ctx.reply(
        `⚄︎═══════════════════⚄︎\n┃  ᴄʟᴇᴀɴ ᴜᴘ ᴄᴏᴍᴘʟᴇᴛᴇ\n┃  ᴄʟᴇᴀɴᴇᴅ: ${cleaned}\n┃ ᴋᴇᴘᴛ: ${kept}\n⚄︎═══════════════════⚄︎`,
        {
          parse_mode: 'Markdown',
          reply_markup: kb.helpAndChannel()
        }
      );
    } catch (err) {
      await ctx.reply('╭━━〔 ᴇʀʀᴏʀ 〕━━┈⊷\n┃◈ ᴄʟᴇᴀɴᴜᴘ ғᴀɪʟᴇᴅ\n╰━━━━━━━━━━━━━━━┈⊷');
    }
  });

  // /broadcast — admin only, bare shows usage, /broadcast <message> sends to all tracked users
  bot.command('broadcast', async (ctx) => {
    const userId = ctx.from.id.toString();
    const message = (ctx.match?.[1] ?? '').trim();

    if (!adminIDs.includes(userId)) {
      return ctx.reply('Only owner can use this command');
    }

    if (!message) {
      return ctx.reply(
        `⚄︎═══════════════════⚄︎\n┃ ʙʀᴏᴀᴅᴄᴀsᴛ ɢᴜɪᴅᴇ\n┃/broadcast <message>\n┃ ᴛᴏᴛᴀʟ ᴜsᴇʀs ${userIDs.size}\n⚄︎═══════════════════⚄︎`,
        {
          parse_mode: 'Markdown',
          reply_markup: kb.broadcastLink()
        }
      );
    }

    const totalUsers = userIDs.size;
    if (totalUsers === 0) {
      return ctx.reply('╭━━〔 ɴᴏ ᴜsᴇʀs 〕━━┈⊷\n┃◈ ɴᴏ ᴜsᴇʀs ᴛᴏ ʙʀᴏᴀᴅᴄᴀsᴛ ᴛᴏ\n╰━━━━━━━━━━━━━━━┈⊷');
    }

    const statusMsg = await ctx.reply(
      '╭━━〔 ʙʀᴏᴀᴅᴄᴀsᴛɪɴɢ 〕━━┈⊷\n' +
      '┃◈ sᴛᴀʀᴛɪɴɢ ʙʀᴏᴀᴅᴄᴀsᴛ...\n' +
      `┃◈ ᴛᴏᴛᴀʟ ᴜsᴇʀs: ${totalUsers}\n` +
      '┃◈ sᴇɴᴛ: 0\n' +
      '┃◈ ғᴀɪʟᴇᴅ: 0\n' +
      '╰━━━━━━━━━━━━━━━┈⊷'
    );

    let sent = 0;
    let failed = 0;
    const users = [...userIDs];

    for (let i = 0; i < users.length; i++) {
      try {
        await bot.api.sendMessage({
          chat_id: users[i],
          text: `⚄︎═══════════════════⚄︎\n┃ ᴀᴅᴍɪɴ ʙʀᴏᴀᴅᴄᴀsᴛ:\n┃ ${message}\n┃ \n⚄︎═══════════════════⚄︎`,
          reply_markup: kb.broadcastLink()
        });
        sent++;

        if (i % 10 === 0 || i === users.length - 1) {
          try {
            await bot.api.editMessageText({
              chat_id: ctx.chatId,
              message_id: statusMsg.message_id,
              text:
                '╭━━〔 ʙʀᴏᴀᴅᴄᴀsᴛɪɴɢ 〕━━┈⊷\n' +
                '┃◈ ɪɴ ᴘʀᴏɢʀᴇss...\n' +
                `┃◈ ᴛᴏᴛᴀʟ ᴜsᴇʀs: ${totalUsers}\n` +
                `┃◈ sᴇɴᴛ: ${sent}\n` +
                `┃◈ ғᴀɪʟᴇᴅ: ${failed}\n` +
                `┃◈ ᴘʀᴏɢʀᴇss: ${Math.round(((i + 1) / users.length) * 100)}%\n` +
                '╰━━━━━━━━━━━━━━━┈⊷'
            });
          } catch (e) {}
        }

        await sleep(100);
      } catch (error) {
        failed++;
        console.log(`Failed to send to ${users[i]}: ${error.message}`);

        // ayotbl surfaces Telegram's error as a TelegramApiError with errorCode
        if (error && error.errorCode === 403) {
          userIDs.delete(users[i]);
          await saveUserIDs();
        }
      }
    }

    await bot.api.editMessageText({
      chat_id: ctx.chatId,
      message_id: statusMsg.message_id,
      text:
        '╭━━〔 ʙʀᴏᴀᴅᴄᴀsᴛ ᴄᴏᴍᴘʟᴇᴛᴇᴅ 〕━━┈⊷\n' +
        `┃◈ ᴛᴏᴛᴀʟ ᴜsᴇʀs: ${totalUsers}\n` +
        `┃◈ sᴜᴄᴄᴇssғᴜʟ: ${sent}\n` +
        `┃◈ ғᴀɪʟᴇᴅ: ${failed}\n` +
        `┃◈ sᴜᴄᴄᴇss ʀᴀᴛᴇ: ${Math.round((sent / totalUsers) * 100)}%\n` +
        '╰━━━━━━━━━━━━━━━┈⊷'
    });

    console.log(chalk.green(`✅ Broadcast completed: ${sent}/${totalUsers} sent, ${failed} failed`));
  });

  bot.command('ping', async (ctx) => {
    const start = Date.now();
    const message = await ctx.reply('Checking speed...');
    const ping = Date.now() - start;

    const pingResult = `╭─  ✨ 𝗙𝗟𝗨𝗫 𝗫𝗗 𝗦𝗧𝗔𝗧𝗨𝗦 ─╮
│
│  〔 PERFORMANCE 〕
│  • Response ➜ ${ping}ms
│  • Status ➜ Online
│  
│  〔 SERVER 〕
│  • Mode ➜ Telegram Bot
│  • Region ➜ Global
│
╰───────────────╯
Powered by Saturo Tech`;

    await bot.api.editMessageText({
      chat_id: ctx.chatId,
      message_id: message.message_id,
      text: pingResult,
      reply_markup: kb.channelOnly()
    });
  });

  bot.command('help', async (ctx) => {
    await trackUser(ctx.from.id);

    const caption = `✨ ──── 『 𝗙𝗟𝗨𝗫 𝗫𝗗 𝗛𝗘𝗟𝗣 』 ──── ✨

⚄︎═══════════════════⚄︎
┃┌─〔 ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ 〕
┃
┃ ⚝ /pair
┃   • ᴛᴏ ᴘᴀɪʀ ᴛʜᴇ ʙᴏᴛ
┃
┃ ⚝ /delpair
┃   • ᴛᴏ ᴜɴᴘᴀɪʀ ᴛʜᴇ ʙᴏᴛ
┃
┃ ⚝ /runtime
┃   • ᴛᴏ ᴄʜᴇᴄᴋ ʙᴏᴛ ᴜᴘᴛɪᴍᴇ
┃
┃ ⚝ /ping
┃   • ꜰᴏʀ ʟᴀᴛᴇɴᴄʏ ᴄʜᴇᴄᴋ
┃
┃ ⚝ /report
┃   • ᴛᴏ ʀᴇᴘᴏʀᴛ ᴀɴʏ ᴘʀᴏʙʟᴇᴍ
┃└────────────
⚄︎═══════════════════⚄︎`;

    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: kb.channelOnly()
    });
  });

  // ---------- Admin replying to a report (plain text message, not a command) ----------

  bot.on('message', async (ctx) => {
    const userId = ctx.from.id.toString();
    const msg = ctx.message;

    if (adminIDs.includes(userId) && msg.reply_to_message) {
      const replyToText = msg.reply_to_message.text;

      if (replyToText && replyToText.includes('ɴᴇᴡ ʀᴇᴘᴏʀᴛ')) {
        const userIdMatch = replyToText.match(/ᴜsᴇʀ ɪᴅ: (\d+)/);

        if (userIdMatch && userIdMatch[1]) {
          const targetUserId = userIdMatch[1];
          const adminReply = msg.text;

          try {
            await bot.api.sendMessage({
              chat_id: targetUserId,
              text: `ᴀᴅᴍɪɴ ʀᴇᴘʟʏ\n\n${adminReply}\n\n`,
              reply_markup: kb.adminReplyLink()
            });

            await ctx.reply('╭━━〔 sᴇɴᴛ 〕━━┈⊷\n┃◈ ʀᴇᴘʟʏ sᴇɴᴛ ᴛᴏ ᴜsᴇʀ\n╰━━━━━━━━━━━━━━━┈⊷');
            console.log(chalk.green(`📬 Admin ${userId} replied to user ${targetUserId}`));
          } catch (error) {
            await ctx.reply('╭━━〔 ᴇʀʀᴏʀ 〕━━┈⊷\n┃◈ ғᴀɪʟᴇᴅ ᴛᴏ sᴇɴᴅ ʀᴇᴘʟʏ\n╰━━━━━━━━━━━━━━━┈⊷');
          }
        }
      }
    }
  });

  // ---------- Callback queries ----------

  // Track every callback_query user, then fall through to the specific action() handlers below.
  bot.on('callback_query', async (ctx, next) => {
    await trackUser(ctx.from.id);
    return next();
  });

  bot.action('check_membership', async (ctx) => {
    try {
      await ctx.answerCbQuery('Authorising Members...');
      const membership = await checkMembership(ctx.from.id);

      if (membership.hasJoinedAll) {
        await bot.api.editMessageText({
          chat_id: ctx.chatId,
          message_id: ctx.callbackQuery.message.message_id,
          text:
            '⚄︎═══════════════════⚄︎\n' +
            '┃ ᴀᴜᴛʜᴏʀɪᴢᴀᴛɪᴏɴ ᴄᴏᴍᴘʟᴇᴛᴇ\n' +
            '┃ ɢʀᴏᴜᴘ ᴊᴏɪɴᴇᴅ\n' +
            '┃ ᴄʜᴀɴɴᴇʟ ᴊᴏɪɴᴇᴅ\n' +
            '┃ ᴄʟɪᴄᴋ ᴏɴ sᴛᴀʀᴛ ʙᴏᴛ ᴛᴏ ʙᴇɢɪɴ\n' +
            '⚄︎═══════════════════⚄︎',
          reply_markup: kb.membershipVerified()
        });
      } else {
        let missingText = '';
        if (!membership.hasJoinedGroup && !membership.hasJoinedAllChannels) {
          missingText = '┃ ❌ ᴍᴀɪɴ ɢʀᴏᴜᴘ\n┃ ❌ ʙᴀᴄᴋᴜᴘ ᴄʜᴀɴɴᴇʟ';
        } else if (!membership.hasJoinedGroup) {
          missingText = '┃ ❌ ʙᴀᴄᴋᴜᴘ ɢʀᴏᴜᴘ\n┃ ✅ ᴀʟʟ ᴄʜᴀɴɴᴇʟs';
        } else {
          missingText = '┃ ✅ ᴀʟʟ ɢʀᴏᴜᴘ\n┃ ❌ ᴍᴀɪɴ ᴄʜᴀɴɴᴇʟ';
        }

        await bot.api.editMessageText({
          chat_id: ctx.chatId,
          message_id: ctx.callbackQuery.message.message_id,
          text:
            '⚄︎═══════════════════⚄︎\n' +
            '┃ ᴀᴜᴛʜᴏʀɪᴢᴀᴛɪᴏɴ ɪɴᴄᴏᴍᴘʟᴇᴛᴇ\n' +
            '┃ ᴘʟᴇᴀsᴇ ᴊᴏɪɴ:\n' +
            '┃\n' +
            missingText + '\n' +
            '┃\n' +
            '┃\n' +
            '┃ ᴛʜᴇɴ ᴀᴜᴛʜᴏʀɪᴢᴇ ᴀɢᴀɪɴ\n' +
            '⚄︎═══════════════════⚄︎',
          reply_markup: kb.membershipIncomplete()
        });
      }
    } catch (error) {
      await ctx.answerCbQuery('⚠️ ᴇʀʀᴏʀ ᴄʜᴇᴄᴋɪɴɢ ᴍᴇᴍʙᴇʀsʜɪᴘ', { show_alert: true });
    }
  });

  bot.action('start_bot', async (ctx) => {
    await ctx.answerCbQuery();
    const caption = `  
╭━━〔 ꜰʟᴜx xᴅ ʙᴏᴛ 〕━━╮
   
  々 𝖮𝗐𝗇𝖾𝗋 : @saturotech
  々 𝖲𝗍𝖺𝗍𝗎𝗌 : Online
    
╰━━━━━━━ • ━━━━━━━╯

┏━━━〔 ᴄᴏᴍᴍᴀɴᴅꜱ 〕━━━┓
┃ 
┃ ⚝ /pair
┃ ⚝ /delpair
┃ ⚝ /runtime
┃ ⚝ /ping
┃ ⚝ /report
┃
┃   〔 ᴀᴅᴍɪɴ ᴏɴʟʏ 〕
┃ ⚝ /broadcast
┃ ⚝ /clean
┃ ⚝ /listpair
┗━━━━━━━━━━━━━━━━━━┛`;

    await ctx.reply(caption, {
      reply_markup: kb.channelOnly()
    });
  });

  bot.action(/^reply_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('ʀᴇᴘʟʏ ᴛᴏ ᴛʜᴇ ʀᴇᴘᴏʀᴛ ᴍᴇssᴀɢᴇ', { show_alert: true });

    await bot.api.sendMessage({
      chat_id: ctx.chatId,
      text:
        `╭━━〔 ʀᴇᴘʟʏ ᴍᴏᴅᴇ 〕━━┈⊷\n` +
        `┃◈ ʀᴇᴘʟʏ ᴛᴏ ᴛʜᴇ ʀᴇᴘᴏʀᴛ ᴍᴇssᴀɢᴇ\n` +
        `┃◈ ᴀʙᴏᴠᴇ ᴛᴏ sᴇɴᴅ ʏᴏᴜʀ\n` +
        `┃◈ ʀᴇsᴘᴏɴsᴇ ᴛᴏ ᴛʜᴇ ᴜsᴇʀ\n` +
        `╰━━━━━━━━━━━━━━━┈⊷`,
      reply_parameters: { message_id: ctx.callbackQuery.message.message_id }
    });
  });

  bot.action('help_msg', async (ctx) => {
    await ctx.answerCbQuery();
    const caption = `
⚄︎═══════════════════⚄︎
┃┌─〔 ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ 〕
┃
┃ ⚝ /pair
┃   • ᴛᴏ ᴘᴀɪʀ ᴛʜᴇ ʙᴏᴛ
┃
┃ ⚝ /delpair
┃   • ᴛᴏ ᴜɴᴘᴀɪʀ ᴛʜᴇ ʙᴏᴛ
┃
┃ ⚝ /runtime
┃   • ᴛᴏ ᴄʜᴇᴄᴋ ʙᴏᴛ ᴜᴘᴛɪᴍᴇ
┃
┃ ⚝ /ping
┃   • ꜰᴏʀ ʟᴀᴛᴇɴᴄʏ ᴄʜᴇᴄᴋ
┃
┃ ⚝ /report
┃   • ᴛᴏ ʀᴇᴘᴏʀᴛ ᴀɴʏ ᴘʀᴏʙʟᴇᴍ
┃└────────────
⚄︎═══════════════════⚄︎`;

    await ctx.reply(caption, {
      reply_markup: kb.channelOnly()
    });
  });

  // ---------- Startup ----------

  await loadAdminIDs();
  await loadUserIDs();
  // startAutoLoadLoop(); // Uncomment if you want auto-load

  const restartCount = parseInt(process.env.RESTART_COUNT || '0', 10);
  console.log(`♻️ restart #${restartCount + 1}`);
  process.env.RESTART_COUNT = String(restartCount + 1);

  await bot.launch();

  console.log(chalk.magenta('🤖 bot is running...'));
  console.log(chalk.green('✅ Membership checking: ENABLED'));
  console.log(chalk.green('✅ Report system: ENABLED'));
  console.log(chalk.yellow('⚠️  Make sure bot is admin in group and channels!'));

  // ---------- Shutdown ----------

  const gracefulShutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`🛑 received ${signal}. shutting down gracefully...`);
    bot.stop();
    console.log('✅ bot stopped successfully');
    process.exit(0);
  };

  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('message', (msg) => {
    if (msg === 'shutdown') gracefulShutdown('PM2_SHUTDOWN');
  });
}

main().catch((err) => {
  console.error('Fatal error starting bot:', err);
  process.exit(1);
});