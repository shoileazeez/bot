const BotHelpers = require('../utils/helpers');

class PrivateAssistant {
    constructor() {
        this.botInfo = BotHelpers.getBotInfo();
        this.conversationState = new Map(); // Track conversation states
    }

    async handlePrivateMessage(client, message) {
        const senderId = message.from;
        const messageText = message.body.toLowerCase().trim();

        // Keywords that indicate interest in buying a bot
        const buyKeywords = ['bot', 'buy', 'purchase', 'price', 'cost', 'hire', 'develop', 'create', 'whatsapp bot', 'automation'];
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        
        const containsBuyKeyword = buyKeywords.some(keyword => messageText.includes(keyword));
        const containsGreeting = greetings.some(greeting => messageText.includes(greeting));

        // Get or initialize conversation state
        let state = this.conversationState.get(senderId) || { stage: 'initial', interested: false };

        if (containsGreeting && !state.interested) {
            await this.sendGreeting(message);
            state.stage = 'greeted';
        } else if (containsBuyKeyword || state.interested) {
            state.interested = true;
            await this.handleBotInquiry(message, state);
        } else if (state.stage === 'greeted') {
            await this.sendBotIntroduction(message);
            state.stage = 'introduced';
        } else {
            await this.sendGeneralResponse(message);
        }

        this.conversationState.set(senderId, state);
    }

    async sendGreeting(message) {
        const greeting = `í±‹ Hello! Welcome to our bot development service.

I'm your personal assistant for all bot-related inquiries. I can help you with:

í´– WhatsApp Bot Development
í²° Pricing Information  
í³‹ Feature Explanations
í³ž Developer Contact

How can I assist you today?`;

        await message.reply(greeting);
    }

    async sendBotIntroduction(message) {
        const intro = `íº€ *WhatsApp Bot Development Services*

We specialize in creating powerful WhatsApp bots for:

${this.botInfo.features.join('\n')}

Would you like to know more about our pricing or specific features?`;

        await message.reply(intro);
    }

    async handleBotInquiry(message, state) {
        const messageText = message.body.toLowerCase();

        if (messageText.includes('price') || messageText.includes('cost') || messageText.includes('pricing')) {
            await this.sendPricingInfo(message);
            state.stage = 'pricing_shown';
        } else if (messageText.includes('feature') || messageText.includes('what') || messageText.includes('does')) {
            await this.sendFeatureDetails(message);
            state.stage = 'features_shown';
        } else if (messageText.includes('contact') || messageText.includes('developer') || messageText.includes('talk')) {
            await this.sendContactInfo(message);
            state.stage = 'contact_shared';
        } else if (messageText.includes('yes') || messageText.includes('interested') || messageText.includes('want')) {
            if (state.stage === 'pricing_shown' || state.stage === 'features_shown') {
                await this.sendContactInfo(message);
                state.stage = 'contact_shared';
            } else {
                await this.sendFullInfo(message);
                state.stage = 'full_info_shown';
            }
        } else {
            await this.sendFullInfo(message);
            state.stage = 'full_info_shown';
        }
    }

    async sendPricingInfo(message) {
        const pricing = `í²° *Bot Development Pricing*

í³¦ *Basic Package - ${this.botInfo.pricing.basic}*
â€¢ Group management commands
â€¢ Basic automation
â€¢ Standard features

í´¥ *Premium Package - ${this.botInfo.pricing.premium}*
â€¢ All basic features
â€¢ Custom commands
â€¢ Fine tracking system
â€¢ Automated scheduling
â€¢ Priority support

í¿¢ *Enterprise Package - ${this.botInfo.pricing.enterprise}*
â€¢ Multiple group support
â€¢ Advanced customization
â€¢ Dedicated support
â€¢ Training included
â€¢ Source code access

í²³ Payment plans available!

Would you like to discuss your specific requirements?`;

        await message.reply(pricing);
    }

    async sendFeatureDetails(message) {
        const features = `í» ï¸ *Bot Features & Capabilities*

í¾¯ *Group Management:*
â€¢ Admin-only command system
â€¢ Member verification
â€¢ Automated responses

í³ *Content Features:*
â€¢ Daily quotes with API integration
â€¢ Announcement system with hidden tags
â€¢ Member tagging with custom messages

í²° *Fine Management System:*
â€¢ Automatic tracking of inactive users
â€¢ Daily fine calculations
â€¢ Weekly reports with payment details
â€¢ Bank account integration

í³… *Automation:*
â€¢ Scheduled messages and reminders
â€¢ Call scheduling (Sundays 12:30 PM)
â€¢ Daily activity monitoring

ï¿½ï¿½ *AI Assistant:*
â€¢ Private chat handling
â€¢ Sales inquiry management
â€¢ Automated responses

All bots come with complete setup and documentation!

Interested in getting started?`;

        await message.reply(features);
    }

    async sendContactInfo(message) {
        const contact = `í³ž *Ready to Get Your Bot?*

Great! Here's how to proceed:

í±¨â€í²» *Developer Contact:*
í³± WhatsApp: ${this.botInfo.contact}

í³‹ *Next Steps:*
1. Contact the developer on WhatsApp
2. Discuss your specific requirements
3. Choose your package
4. Get your custom bot delivered!

âš¡ *Quick Setup:*
â€¢ Most bots delivered within 24-48 hours
â€¢ Complete installation support
â€¢ Training provided
â€¢ 30-day support included

*Message the developer now to get started!*

_Thank you for choosing our bot development services!_ íº€`;

        await message.reply(contact);
    }

    async sendFullInfo(message) {
        const fullInfo = `í´– *Complete Bot Development Package*

${this.botInfo.features.join('\n')}

í²° *Pricing Options:*
${Object.entries(this.botInfo.pricing).map(([key, value]) => `â€¢ ${value}`).join('\n')}

í³ž *Contact Developer:*
WhatsApp: ${this.botInfo.contact}

í¾¯ *Why Choose Us?*
â€¢ Fast delivery (24-48 hours)
â€¢ Complete customization
â€¢ Ongoing support
â€¢ Professional development
â€¢ Affordable pricing

Ready to automate your WhatsApp groups? Contact us now!`;

        await message.reply(fullInfo);
    }

    async sendGeneralResponse(message) {
        const general = `í´– *Bot Development Assistant*

I'm here to help with WhatsApp bot development inquiries!

Type any of these to get started:
â€¢ "pricing" - View our packages
â€¢ "features" - See what our bots can do  
â€¢ "contact" - Get developer details
â€¢ "bot" - General bot information

How can I help you today?`;

        await message.reply(general);
    }

    // Clean up old conversation states (call periodically)
    cleanupStates() {
        // Remove states older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, value] of this.conversationState.entries()) {
            if (value.timestamp && value.timestamp < oneHourAgo) {
                this.conversationState.delete(key);
            }
        }
    }
}

module.exports = PrivateAssistant;
