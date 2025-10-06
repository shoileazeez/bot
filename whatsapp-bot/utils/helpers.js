const axios = require('axios');
require('dotenv').config();

class BotHelpers {
    // Check if user is admin in the group
    static async isUserAdmin(chat, userId) {
        try {
            // Ensure we have the full chat object with participants
            if (!chat.participants) {
                await chat.fetchParticipants();
            }
            
            const participants = chat.participants;
            if (!participants || !Array.isArray(participants)) {
                console.log('No participants found or invalid participants structure');
                return false;
            }
            
            console.log(`Checking admin status for user: ${userId}`);
            console.log(`Total participants: ${participants.length}`);
            
            // Log all participants for debugging
            participants.forEach((p, index) => {
                const participantId = p.id._serialized || p.id;
                console.log(`Participant ${index + 1}: ${participantId}, isAdmin: ${p.isAdmin}`);
            });
            
            const participant = participants.find(p => {
                const participantId = p.id._serialized || p.id;
                console.log(`Comparing: ${participantId} === ${userId}`);
                return participantId === userId;
            });
            
            if (participant) {
                console.log(`Found participant: ${participant.id._serialized || participant.id}, isAdmin: ${participant.isAdmin}`);
                return participant.isAdmin === true;
            } else {
                console.log(`Participant not found for userId: ${userId}`);
                // Try alternative matching - extract phone number and compare
                const userPhone = userId.split('@')[0];
                console.log(`Trying alternative match with phone: ${userPhone}`);
                
                const altParticipant = participants.find(p => {
                    const participantId = p.id._serialized || p.id;
                    const participantPhone = participantId.split('@')[0];
                    return participantPhone === userPhone;
                });
                
                if (altParticipant) {
                    console.log(`Found alternative match: ${altParticipant.id._serialized || altParticipant.id}, isAdmin: ${altParticipant.isAdmin}`);
                    return altParticipant.isAdmin === true;
                }
                
                return false;
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Check if bot is admin in the group
    static async isBotAdmin(chat, botId) {
        try {
            // Ensure we have the full chat object with participants
            if (!chat.participants) {
                await chat.fetchParticipants();
            }
            
            const participants = chat.participants;
            if (!participants || !Array.isArray(participants)) {
                console.log('No participants found for bot admin check');
                return false;
            }
            
            console.log(`Checking bot admin status for: ${botId}`);
            
            const botParticipant = participants.find(p => {
                const participantId = p.id._serialized || p.id;
                return participantId === botId;
            });
            
            if (botParticipant) {
                console.log(`Bot found: ${botParticipant.id._serialized || botParticipant.id}, isAdmin: ${botParticipant.isAdmin}`);
                return botParticipant.isAdmin === true;
            } else {
                console.log(`Bot not found in participants for botId: ${botId}`);
                return false;
            }
        } catch (error) {
            console.error('Error checking bot admin status:', error);
            return false;
        }
    }

    // Get all group members
    static async getGroupMembers(chat) {
        try {
            // Ensure we have the full chat object with participants
            if (!chat.participants) {
                await chat.fetchParticipants();
            }
            
            const participants = chat.participants;
            if (!participants || !Array.isArray(participants)) {
                console.log('No participants found in getGroupMembers');
                return [];
            }
            
            return participants.map(p => ({
                id: p.id._serialized || p.id,
                isAdmin: p.isAdmin === true,
                phone: p.id.user || (p.id._serialized ? p.id._serialized.split('@')[0] : p.id.split('@')[0])
            }));
        } catch (error) {
            console.error('Error getting group members:', error);
            return [];
        }
    }

    // Fetch random quote from API
    static async getRandomQuote() {
        try {
            const response = await axios.get(process.env.QUOTE_API_URL || 'https://api.quotable.io/random');
            return {
                text: response.data.content,
                author: response.data.author
            };
        } catch (error) {
            console.error('Error fetching quote:', error);
            return {
                text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                author: "Winston Churchill"
            };
        }
    }

    // Format phone number
    static formatPhone(phoneNumber) {
        // Remove @ symbols and extract just the number
        return phoneNumber.replace('@c.us', '').replace('@g.us', '');
    }

    // Create mention tags for WhatsApp
    static createMentions(members, excludeBot = true, botId = null) {
        let mentions = [];
        let mentionText = '';

        members.forEach((member, index) => {
            if (excludeBot && botId && member.id === botId) return;
            
            mentions.push(member.id);
            mentionText += `@${member.phone}`;
            if (index < members.length - 1) mentionText += ' ';
        });

        return { mentions, mentionText };
    }

    // Format currency
    static formatCurrency(amount) {
        const currency = process.env.CURRENCY || '₦';
        return `${currency}${amount.toLocaleString()}`;
    }

    // Get day name
    static getDayName(date = new Date()) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    // Check if today is Sunday
    static isSunday() {
        return new Date().getDay() === 0;
    }

    // Get week start date (Monday)
    static getWeekStart() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    }

    // Validate command format
    static isValidCommand(message) {
        return message.body.trim().startsWith('!');
    }

    // Parse command and arguments
    static parseCommand(message) {
        const parts = message.body.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        return { command, args };
    }

    // Bot information for selling
    static getBotInfo() {
        return {
            features: [
                "��� Group Management Commands",
                "��� Daily Morning Quotes",
                "��� Announcement System",
                "��� Member Tagging",
                "��� Fine Tracking System",
                "��� Automated Scheduling",
                "��� Private Assistant",
                "���‍��� Admin Controls"
            ],
            pricing: {
                basic: "₦15,000 - Basic group management",
                premium: "₦25,000 - Full features + customization",
                enterprise: "₦40,000 - Multiple groups + support"
            },
            contact: process.env.ADMIN_CONTACT || "+1234567890"
        };
    }

    static async getRandomRoast() {
        try {
            // Using insult.mattbas.org - free insult API
            const response = await axios.get('https://insult.mattbas.org/api/insult.json');
            return response.data.insult;
        } catch (error) {
            console.error('Error fetching roast:', error);
            // Fallback roasts if API fails
            const fallbackRoasts = [
                "You're like a software update - nobody wants you, but you keep showing up anyway! ���",
                "If you were any slower, you'd be going backwards! ���",
                "You're proof that even evolution makes mistakes sometimes! ���",
                "I'd explain it to you, but I don't have any crayons with me! ���️",
                "You're like a broken pencil - completely pointless! ✏️",
                "If brains were dynamite, you wouldn't have enough to blow your nose! ���",
                "You're so dense, light bends around you! ���",
                "I'm not saying you're stupid, but you have bad luck when thinking! ���"
            ];
            return fallbackRoasts[Math.floor(Math.random() * fallbackRoasts.length)];
        }
    }

    // Validate phone number format
    static validatePhoneNumber(phoneNumber) {
        // Remove spaces, dashes, and plus signs
        const cleaned = phoneNumber.replace(/[\s\-\+]/g, '');
        
        // Check if it's a valid number (8-15 digits)
        const phoneRegex = /^\d{8,15}$/;
        return phoneRegex.test(cleaned) ? cleaned : null;
    }

    // Format phone number for WhatsApp
    static formatPhoneForWhatsApp(phoneNumber) {
        const cleaned = this.validatePhoneNumber(phoneNumber);
        if (!cleaned) return null;
        
        // Add country code if not present
        if (cleaned.length === 10 && !cleaned.startsWith('234')) {
            return '234' + cleaned; // Nigerian country code
        }
        return cleaned;
    }

    // Extract phone number from mention
    static extractPhoneFromMention(mentionText) {
        // Remove @ and any spaces
        return mentionText.replace('@', '').replace(/\s/g, '');
    }

    // Generate help text
    static getHelpText() {
    return `🤖 *WhatsApp Group Bot Commands*

*Group Management:* (Admin Only)
- !quote - Get daily morning quote with member tags
- !announce <message> - Make announcement to all members
- !tag [message] - Tag all members (with optional message)
- !add <phone> - Add member by phone number
- !remove <phone> - Remove member by phone number
- !kick <phone> - Kick member by phone number (same as remove)
- !promote @user - Promote member to admin
- !demote @user - Demote admin to member
- !roast @user - Roast a group member (fun command)

*Information Commands:*
- !fine - Check your fine status
- !fines - View all group fines (Sundays only)
- !help - Show this help message
- !debug - Show debug information (troubleshooting)

*Automated Features:*
- Daily warning for inactive members
- Sunday fine summary with payment details
- Call scheduling and reminders

*Fine System:*
- ${process.env.CURRENCY || '₦'}${process.env.DAILY_FINE_AMOUNT || '500'} per day for inactivity
- Weekly summary every Sunday
- Payment details provided automatically

*Usage Examples:*
- !add +1234567890 or !add 1234567890
- !remove +1234567890 or !kick 1234567890
- !promote @1234567890 or !promote 1234567890
- !demote @1234567890 or !demote 1234567890
- !roast @1234567890
- !tag Good morning everyone!

*Note:* Bot and command sender must be group admins for commands to work.

_Bot developed for group management and automation._`;
}
}

module.exports = BotHelpers;