const { connect, StringCodec } = require('nats');
const axios = require('axios');

const natsUrl = process.env.NATS_URL || 'nats://nats:4222';
const externalServiceUrl = process.env.EXTERNAL_SERVICE_URL || 'http://localhost:3001/messages';
const externalServiceType = process.env.EXTERNAL_SERVICE_TYPE || 'generic'; // 'discord', 'telegram', 'slack', 'generic'
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';

let natsConnection = null;
const sc = StringCodec();

// Track processed messages to avoid duplicates (broadcaster can run with multiple replicas)
// Use a queue subscription to ensure only one instance processes each message
const processedMessages = new Set();
const messageTimeout = 60000; // 1 minute timeout for message tracking

async function connectNATS() {
  try {
    natsConnection = await connect({ servers: natsUrl });
    console.log('[NATS] Connected to NATS server:', natsUrl);
  } catch (err) {
    console.error('[NATS] Failed to connect:', err.message);
    setTimeout(connectNATS, 5000);
  }
}

function formatMessage(todo, event) {
  const status = todo.done ? '✅ Completado' : '📝 Pendiente';
  return {
    title: event === 'created' ? '📌 Nuevo TODO' : event === 'updated' ? '🔄 TODO Actualizado' : '🗑️ TODO Eliminado',
    content: `**TODO #${todo.id}**: ${todo.content}\n**Estado**: ${status}`,
    timestamp: new Date().toISOString(),
  };
}

async function sendToDiscord(message, todo, event) {
  if (!discordWebhookUrl) {
    console.warn('[Discord] No webhook URL configured');
    return;
  }

  const payload = {
    embeds: [
      {
        title: message.title,
        description: message.content,
        color: todo.done ? 65280 : 16776960, // Green if done, yellow if pending
        timestamp: message.timestamp,
        footer: { text: 'TODO Broadcaster' },
      },
    ],
  };

  try {
    await axios.post(discordWebhookUrl, payload);
    console.log('[Discord] Message sent successfully');
  } catch (err) {
    console.error('[Discord] Failed to send message:', err.message);
  }
}

async function sendToTelegram(message, todo, event) {
  if (!telegramBotToken || !telegramChatId) {
    console.warn('[Telegram] No bot token or chat ID configured');
    return;
  }

  const text = `${message.title}\n\n${message.content}`;
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: telegramChatId,
      text: text,
      parse_mode: 'HTML',
    });
    console.log('[Telegram] Message sent successfully');
  } catch (err) {
    console.error('[Telegram] Failed to send message:', err.message);
  }
}

async function sendToSlack(message, todo, event) {
  if (!slackWebhookUrl) {
    console.warn('[Slack] No webhook URL configured');
    return;
  }

  const payload = {
    text: message.title,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${message.title}*\n${message.content}`,
        },
      },
    ],
  };

  try {
    await axios.post(slackWebhookUrl, payload);
    console.log('[Slack] Message sent successfully');
  } catch (err) {
    console.error('[Slack] Failed to send message:', err.message);
  }
}

async function sendToGenericService(message, todo, event) {
  const payload = {
    user: 'broadcaster-bot',
    event: event,
    message: message.title,
    todo: todo,
    timestamp: message.timestamp,
  };

  try {
    await axios.post(externalServiceUrl, payload);
    console.log('[Generic] Message sent successfully to', externalServiceUrl);
  } catch (err) {
    console.error('[Generic] Failed to send message:', err.message);
  }
}

async function sendMessage(eventData) {
  const { event, todo } = eventData;
  const message = formatMessage(todo, event);

  console.log(`[Broadcaster] Processing ${event} event for TODO #${todo.id}`);

  switch (externalServiceType.toLowerCase()) {
    case 'discord':
      await sendToDiscord(message, todo, event);
      break;
    case 'telegram':
      await sendToTelegram(message, todo, event);
      break;
    case 'slack':
      await sendToSlack(message, todo, event);
      break;
    case 'generic':
    default:
      await sendToGenericService(message, todo, event);
      break;
  }
}

async function subscribeToEvents() {
  if (!natsConnection) {
    console.error('[Broadcaster] NATS connection not available');
    setTimeout(subscribeToEvents, 5000);
    return;
  }

  try {
    // Use queue group subscription to ensure only one instance handles each message
    // when running multiple replicas
    const sub = natsConnection.subscribe('todo_events', { queue: 'broadcasters' });

    console.log('[Broadcaster] Subscribed to todo_events (queue: broadcasters)');

    // Process messages
    (async () => {
      for await (const msg of sub) {
        try {
          const eventData = JSON.parse(sc.decode(msg.data));
          console.log('[Message] Received:', eventData.event, 'for TODO #' + eventData.todo.id);

          // Send to external service
          await sendMessage(eventData);
        } catch (err) {
          console.error('[Message] Error processing message:', err.message);
        }
      }
    })();
  } catch (err) {
    console.error('[Broadcaster] Failed to subscribe:', err.message);
    setTimeout(subscribeToEvents, 5000);
  }
}

async function start() {
  console.log('[Broadcaster] Starting TODO Broadcaster Service');
  console.log('[Config] External Service Type:', externalServiceType);
  console.log('[Config] NATS URL:', natsUrl);

  await connectNATS();
  await subscribeToEvents();

  // Keep the process alive
  setInterval(() => {
    console.log('[Broadcaster] Still running... (NATS connection:', natsConnection ? 'connected' : 'disconnected', ')');
  }, 30000);
}

start().catch(err => {
  console.error('[Start] Error:', err);
  process.exit(1);
});
