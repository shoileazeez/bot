const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// Import our modules
const Database = require('./utils/database');
const BotHelpers = require('./utils/helpers');
const GroupCommands = require('./commands/groupCommands');
const PrivateAssistant = require('./commands/privateAssistant');
const BotAutomation = require('./utils/automation');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        this.db = new Database();
        this.groupCommands = new GroupCommands(this.db);
        this.privateAssistant = new PrivateAssistant();
        this.automation = null; // Will be initialized after client is ready

        this.initializeEventHandlers();
    }

    initializeEventHandlers() {
        // QR Code for authentication
        this.client.on('qr', (qr) => {
            console.log('í´„ Scan this QR code with your WhatsApp:');
            qrcode.generate(qr, { small: true });
        });

        // Client ready
        this.client.on('ready', async () => {
            console.log('âœ… WhatsApp Bot is ready!');
            console.log(`í³± Bot number: ${this.client.info.wid.user}`);
            
            // Initialize automation after client is ready
            this.automation = new BotAutomation(this.client, this.db);
            this.automation.startAllJobs();
        });

        // Authentication failure
        this.client.on('auth_failure', (msg) => {
            console.error('âŒ Authentication failed:', msg);
        });

        // Client disconnected
        this.client.on('disconnected', (reason) => {
            console.log('í³´ Client was logged out:', reason);
        });

        // Message received
        this.client.on('message_create', async (message) => {
            // Skip if message is from status broadcast
            if (message.from === 'status@broadcast') return;
            
            // Skip if message is from bot itself
            if (message.fromMe) return;

            try {
                await this.handleMessage(message);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Group join event
        this.client.on('group_join', async (notification) => {
            try {
                await this.handleGroupJoin(notification);
            } catch (error) {
                console.error('Error handling group join:', error);
            }
        });

        // Group update event (admin changes, etc.)
        this.client.on('group_update', async (notification) => {
            try {
                await this.handleGroupUpdate(notification);
            } catch (error) {
                console.error('Error handling group update:', error);
            }
        });
    }

    async handleMessage(message) {
        const chat = await message.getChat();
        
        if (chat.isGroup) {
            await this.handleGroupMessage(message, chat);
        } else {
            await this.handlePrivateMessage(message);
        }
    }

    async handleGroupMessage(message, chat) {
        const senderId = message.author || message.from;
        const senderPhone = BotHelpers.formatPhone(senderId);
        const groupId = chat.id._serialized;

        // Update user activity in database
        const contact = await message.getContact();
        await this.db.addUser(senderPhone, contact.pushname || contact.name, groupId);
        await this.db.updateUserActivity(senderPhone, groupId);

        // Handle commands
        if (BotHelpers.isValidCommand(message)) {
            await this.groupCommands.handleCommand(this.client, message, chat);
        }
    }

    async handlePrivateMessage(message) {
        // Handle private messages with the assistant
        await this.privateAssistant.handlePrivateMessage(this.client, message);
    }

    async handleGroupJoin(notification) {
        const chat = await this.client.getChatById(notification.chatId);
        const groupId = chat.id._serialized;
        
        // Add group to database
        await this.db.addGroup(groupId, chat.name);

        // Check if bot is admin and update status
        const botIsAdmin = await BotHelpers.isBotAdmin(chat, this.client.info.wid._serialized);
        await this.db.updateBotAdminStatus(groupId, botIsAdmin);

        // Send welcome message if bot is admin
        if (botIsAdmin) {
            const welcomeMessage = `í´– *${process.env.BOT_NAME || 'GroupBot'} Activated!*

Thanks for adding me to the group! I'm here to help with:

í³ Group management commands
í¼… Daily morning quotes  
ï¿½ï¿½ Announcements
í±¥ Member tagging
í²° Fine tracking system
í³… Automated scheduling

Type !help to see all available commands.

_Note: I need admin privileges to work properly!_ âš¡`;

            await this.client.sendMessage(groupId, welcomeMessage);
        }
    }

    async handleGroupUpdate(notification) {
        if (notification.type === 'promote' || notification.type === 'demote') {
            const chat = await this.client.getChatById(notification.chatId);
            const groupId = chat.id._serialized;
            
            // Check if bot admin status changed
            const botIsAdmin = await BotHelpers.isBotAdmin(chat, this.client.info.wid._serialized);
            await this.db.updateBotAdminStatus(groupId, botIsAdmin);

            // If bot was promoted to admin
            if (notification.type === 'promote' && 
                notification.participants.includes(this.client.info.wid._serialized)) {
                
                const promotedMessage = `í¾‰ *Admin Privileges Granted!*

Great! I now have admin privileges and can provide full functionality:

âœ… All commands are now active
âœ… Automation features enabled
âœ… Fine tracking system active

Type !help to see all available commands.`;

                await this.client.sendMessage(groupId, promotedMessage);
            }
        }
    }

    async start() {
        console.log('íº€ Starting WhatsApp Bot...');
        await this.client.initialize();
    }

    async stop() {
        console.log('í»‘ Stopping WhatsApp Bot...');
        if (this.automation) {
            this.automation.stopAllJobs();
        }
        await this.client.destroy();
        this.db.close();
    }
}

// Create and start the bot
const bot = new WhatsAppBot();

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\ní´„ Shutting down bot gracefully...');
    await bot.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\ní´„ Received SIGTERM, shutting down...');
    await bot.stop();
    process.exit(0);
});

// Start the bot
bot.start().catch(console.error);

module.exports = WhatsAppBot;
