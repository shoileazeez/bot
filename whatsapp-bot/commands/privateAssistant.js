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
        const greeting = `� Hello! Welcome to our bot development service.

I'm your personal assistant for all bot-related inquiries. I can help you with:

� WhatsApp Bot Development
� Pricing Information  
� Feature Explanations
� Developer Contact

How can I assist you today?`;

        await message.reply(greeting);
    }

    async sendBotIntroduction(message) {
        const intro = `� *WhatsApp Bot Development Services*

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
        const pricing = `� *Bot Development Pricing*

� *Basic Package - ${this.botInfo.pricing.basic}*
• Group management commands
• Basic automation
• Standard features

� *Premium Package - ${this.botInfo.pricing.premium}*
• All basic features
• Custom commands
• Fine tracking system
• Automated scheduling
• Priority support

� *Enterprise Package - ${this.botInfo.pricing.enterprise}*
• Multiple group support
• Advanced customization
• Dedicated support
• Training included
• Source code access

� Payment plans available!

Would you like to discuss your specific requirements?`;

        await message.reply(pricing);
    }

    async sendFeatureDetails(message) {
        const features = `�️ *Bot Features & Capabilities*

� *Group Management:*
• Admin-only command system
• Member verification
• Automated responses

� *Content Features:*
• Daily quotes with API integration
• Announcement system with hidden tags
• Member tagging with custom messages

� *Fine Management System:*
• Automatic tracking of inactive users
• Daily fine calculations
• Weekly reports with payment details
• Bank account integration

� *Automation:*
• Scheduled messages and reminders
• Call scheduling (Sundays 12:30 PM)
• Daily activity monitoring

�� *AI Assistant:*
• Private chat handling
• Sales inquiry management
• Automated responses

All bots come with complete setup and documentation!

Interested in getting started?`;

        await message.reply(features);
    }

    async sendContactInfo(message) {
        const contact = `� *Ready to Get Your Bot?*

Great! Here's how to proceed:

�‍� *Developer Contact:*
� WhatsApp: ${this.botInfo.contact}

� *Next Steps:*
1. Contact the developer on WhatsApp
2. Discuss your specific requirements
3. Choose your package
4. Get your custom bot delivered!

⚡ *Quick Setup:*
• Most bots delivered within 24-48 hours
• Complete installation support
• Training provided
• 30-day support included

*Message the developer now to get started!*

_Thank you for choosing our bot development services!_ �`;

        await message.reply(contact);
    }

    async sendFullInfo(message) {
        const fullInfo = `� *Complete Bot Development Package*

${this.botInfo.features.join('\n')}

� *Pricing Options:*
${Object.entries(this.botInfo.pricing).map(([key, value]) => `• ${value}`).join('\n')}

� *Contact Developer:*
WhatsApp: ${this.botInfo.contact}

� *Why Choose Us?*
• Fast delivery (24-48 hours)
• Complete customization
• Ongoing support
• Professional development
• Affordable pricing

Ready to automate your WhatsApp groups? Contact us now!`;

        await message.reply(fullInfo);
    }

    async sendGeneralResponse(message) {
        const general = `� *Bot Development Assistant*

I'm here to help with WhatsApp bot development inquiries!

Type any of these to get started:
• "pricing" - View our packages
• "features" - See what our bots can do  
• "contact" - Get developer details
• "bot" - General bot information

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
