const axios = require('axios');
require('dotenv').config();

class BotHelpers {
    // Check if user is admin in the group
    static async isUserAdmin(chat, userId) {
        try {
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
            
            // Extract the phone number from userId (remove @lid, @c.us, etc.)
            const userPhone = userId.replace(/@.*$/, ''); // Remove everything after @
            console.log(`Extracted user phone: ${userPhone}`);
            
            // Find participant by matching phone numbers
            const participant = participants.find(p => {
                const participantId = p.id._serialized || p.id;
                const participantPhone = participantId.replace(/@.*$/, ''); // Remove everything after @
                console.log(`Comparing phones: ${participantPhone} === ${userPhone}`);
                return participantPhone === userPhone;
            });
            
            if (participant) {
                console.log(`Found participant: ${participant.id._serialized || participant.id}, isAdmin: ${participant.isAdmin}`);
                return participant.isAdmin === true;
            } else {
                console.log(`Participant not found for userId: ${userId} (phone: ${userPhone})`);
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

    // Get all group members with forced refresh
    static async getGroupMembers(chat, forceRefresh = false) {
        try {
            // Force refresh participants if requested
            if (forceRefresh) {
                try {
                    // Force WhatsApp to reload participants
                    await chat.sendSeen();
                    // Wait a moment for WhatsApp to update
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (refreshError) {
                    console.log('Could not force refresh participants:', refreshError.message);
                }
            }
            
            const participants = chat.participants;
            if (!participants || !Array.isArray(participants)) {
                console.log('No participants found in getGroupMembers');
                return [];
            }
            
            console.log(`Found ${participants.length} participants in group`);
            
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
        // Array of quote APIs to try (in order)
        const quoteAPIs = [
            {
                name: 'ZenQuotes',
                url: 'https://zenquotes.io/api/random',
                parser: (data) => ({
                    text: data[0].q,
                    author: data[0].a
                })
            },
            {
                name: 'QuoteGarden',
                url: 'https://quotegarden.herokuapp.com/api/v3/quotes/random',
                parser: (data) => ({
                    text: data.data.quoteText.replace(/["""]/g, ''),
                    author: data.data.quoteAuthor || 'Unknown'
                })
            },
            {
                name: 'Quotable (HTTP)',
                url: 'http://api.quotable.io/random',
                parser: (data) => ({
                    text: data.content,
                    author: data.author
                })
            }
        ];

        // Try each API until one works
        for (const api of quoteAPIs) {
            try {
                console.log(`Trying ${api.name} API...`);
                const response = await axios.get(api.url, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'WhatsApp Bot/1.0'
                    }
                });
                
                const quote = api.parser(response.data);
                console.log(`Successfully got quote from ${api.name}`);
                return quote;
            } catch (error) {
                console.error(`${api.name} API failed:`, error.message);
                continue; // Try next API
            }
        }

        // If all APIs fail, use fallback quotes
        console.log('All quote APIs failed, using fallback quotes');
        const fallbackQuotes = [
            {
                text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                author: "Winston Churchill"
            },
            {
                text: "The only way to do great work is to love what you do.",
                author: "Steve Jobs"
            },
            {
                text: "Innovation distinguishes between a leader and a follower.",
                author: "Steve Jobs"
            },
            {
                text: "Life is what happens to you while you're busy making other plans.",
                author: "John Lennon"
            },
            {
                text: "The future belongs to those who believe in the beauty of their dreams.",
                author: "Eleanor Roosevelt"
            },
            {
                text: "It is during our darkest moments that we must focus to see the light.",
                author: "Aristotle"
            },
            {
                text: "The way to get started is to quit talking and begin doing.",
                author: "Walt Disney"
            },
            {
                text: "Don't let yesterday take up too much of today.",
                author: "Will Rogers"
            },
            {
                text: "You learn more from failure than from success. Don't let it stop you. Failure builds character.",
                author: "Unknown"
            },
            {
                text: "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you.",
                author: "Steve Jobs"
            }
        ];
        
        return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
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
        // Remove spaces, dashes, plus signs, and parentheses
        const cleaned = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
        
        // Check if it's a valid number (8-15 digits)
        const phoneRegex = /^\d{8,15}$/;
        return phoneRegex.test(cleaned) ? cleaned : null;
    }

    // Format phone number for WhatsApp
    static formatPhoneForWhatsApp(phoneNumber) {
        const cleaned = this.validatePhoneNumber(phoneNumber);
        if (!cleaned) return null;
        
        // Add country code if not present (assuming Nigerian numbers)
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            // Convert 0XXXXXXXXX to 234XXXXXXXXX
            return '234' + cleaned.substring(1);
        } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
            // Convert 0XXXXXXXXXXX to 234XXXXXXXXXXX  
            return '234' + cleaned.substring(1);
        } else if (cleaned.length === 10 && !cleaned.startsWith('234')) {
            // Add 234 prefix for 10-digit numbers
            return '234' + cleaned;
        } else if (cleaned.length === 11 && !cleaned.startsWith('234')) {
            // Add 234 prefix for 11-digit numbers
            return '234' + cleaned;
        }
        
        return cleaned;
    }

    // Extract phone number from mention or format it
    static extractPhoneFromMention(mentionText) {
        // Remove @ and any spaces
        const cleaned = mentionText.replace('@', '').replace(/\s/g, '');
        return this.formatPhoneForWhatsApp(cleaned);
    }

    // Better phone matching for participant lookup
    static findParticipantByPhone(participants, targetPhone) {
        // First try exact match
        let participant = participants.find(p => {
            const participantPhone = p.id.user || (p.id._serialized ? p.id._serialized.split('@')[0] : p.id.split('@')[0]);
            return participantPhone === targetPhone;
        });
        
        if (participant) return participant;
        
        // Try with different formatting
        const alternativeFormats = [
            targetPhone.startsWith('234') ? targetPhone.substring(3) : '234' + targetPhone,
            targetPhone.startsWith('0') ? '234' + targetPhone.substring(1) : '0' + targetPhone,
            targetPhone.length === 10 ? '234' + targetPhone : targetPhone.substring(3)
        ];
        
        for (const altPhone of alternativeFormats) {
            participant = participants.find(p => {
                const participantPhone = p.id.user || (p.id._serialized ? p.id._serialized.split('@')[0] : p.id.split('@')[0]);
                return participantPhone === altPhone;
            });
            
            if (participant) {
                console.log(`Found participant with alternative format: ${altPhone}`);
                return participant;
            }
        }
        
        return null;
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