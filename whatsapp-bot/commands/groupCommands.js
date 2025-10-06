const BotHelpers = require('../utils/helpers');

class GroupCommands {
    constructor(db) {
        this.db = db;
    }

    async handleCommand(client, message, chat) {
        const { command, args } = BotHelpers.parseCommand(message);
        const senderId = message.author || message.from;
        const groupId = chat.id._serialized;

        console.log(`Command received: ${command} from ${senderId} in group ${groupId}`);

        // Force refresh participants to ensure we have complete data
        try {
            await chat.fetchParticipants();
            console.log(`Refreshed participants. Total: ${chat.participants ? chat.participants.length : 0}`);
        } catch (error) {
            console.error('Error refreshing participants:', error);
        }

        // Check if bot is admin
        const botIsAdmin = await BotHelpers.isBotAdmin(chat, client.info.wid._serialized);
        console.log(`Bot admin status: ${botIsAdmin}`);
        
        if (!botIsAdmin) {
            await message.reply('❌ Bot must be an admin to execute commands.');
            return;
        }

        // Check if sender is admin
        const senderIsAdmin = await BotHelpers.isUserAdmin(chat, senderId);
        console.log(`Sender admin status: ${senderIsAdmin} for user ${senderId}`);
        
        if (!senderIsAdmin) {
            await message.reply('❌ Only group admins can use bot commands.');
            return;
        }

        // Update bot admin status in database
        await this.db.updateBotAdminStatus(groupId, botIsAdmin);

        console.log(`Executing command: ${command}`);

        switch (command) {
            case '!quote':
                await this.handleQuoteCommand(client, message, chat);
                break;
            case '!announce':
                await this.handleAnnounceCommand(client, message, chat, args);
                break;
            case '!tag':
                await this.handleTagCommand(client, message, chat, args);
                break;
            case '!add':
                await this.handleAddCommand(client, message, chat, args);
                break;
            case '!remove':
            case '!kick':
                await this.handleRemoveCommand(client, message, chat, args);
                break;
            case '!roast':
                await this.handleRoastCommand(client, message, chat, args);
                break;
            case '!promote':
                await this.handlePromoteCommand(client, message, chat, args);
                break;
            case '!demote':
                await this.handleDemoteCommand(client, message, chat, args);
                break;
            case '!help':
                await this.handleHelpCommand(message);
                break;
            case '!fine':
                await this.handleFineCommand(message, chat);
                break;
            case '!fines':
                await this.handleFinesCommand(message, chat);
                break;
            case '!debug':
                await this.handleDebugCommand(client, message, chat);
                break;
            default:
                await message.reply('❓ Unknown command. Type !help for available commands.');
        }
    }

    async handleQuoteCommand(client, message, chat) {
        try {
            const quote = await BotHelpers.getRandomQuote();
            const members = await BotHelpers.getGroupMembers(chat);
            const { mentions, mentionText } = BotHelpers.createMentions(members, true, client.info.wid._serialized);

            const quoteMessage = `��� *Good Morning Everyone!* ���

"${quote.text}"

_- ${quote.author}_

${mentionText}

Have a blessed day ahead! ���`;

            await client.sendMessage(chat.id._serialized, quoteMessage, { mentions });
        } catch (error) {
            console.error('Error sending quote:', error);
            await message.reply('❌ Failed to fetch quote. Please try again.');
        }
    }

    async handleAnnounceCommand(client, message, chat, announcement) {
        if (!announcement || announcement.trim() === '') {
            await message.reply('❌ Please provide an announcement message.\nUsage: !announce <your message>');
            return;
        }

        try {
            const members = await BotHelpers.getGroupMembers(chat);
            const { mentions } = BotHelpers.createMentions(members, true, client.info.wid._serialized);

            const announceMessage = `��� *ANNOUNCEMENT* ���

${announcement.trim()}

_This is an important group announcement._`;

            await client.sendMessage(chat.id._serialized, announceMessage, { mentions });
        } catch (error) {
            console.error('Error sending announcement:', error);
            await message.reply('❌ Failed to send announcement. Please try again.');
        }
    }

    async handleTagCommand(client, message, chat, customMessage) {
        try {
            const members = await BotHelpers.getGroupMembers(chat);
            const { mentions, mentionText } = BotHelpers.createMentions(members, true, client.info.wid._serialized);

            let tagMessage;
            if (customMessage && customMessage.trim() !== '') {
                tagMessage = `��� ${customMessage.trim()}

${mentionText}`;
            } else {
                tagMessage = `��� *Attention Everyone!*

${mentionText}`;
            }

            await client.sendMessage(chat.id._serialized, tagMessage, { mentions });
        } catch (error) {
            console.error('Error tagging members:', error);
            await message.reply('❌ Failed to tag members. Please try again.');
        }
    }

    async handleHelpCommand(message) {
        const helpText = BotHelpers.getHelpText();
        await message.reply(helpText);
    }

    async handleFineCommand(message, chat) {
        try {
            const senderId = message.author || message.from;
            const userPhone = BotHelpers.formatPhone(senderId);
            const groupId = chat.id._serialized;

            const userFines = await this.db.getUserFines(userPhone, groupId);
            const user = await this.db.db.get('SELECT total_fine FROM users WHERE phone = ? AND group_id = ?', [userPhone, groupId]);

            if (!user || user.total_fine === 0) {
                await message.reply('✅ Great! You have no outstanding fines.');
                return;
            }

            const totalFine = BotHelpers.formatCurrency(user.total_fine);
            const fineCount = userFines.length;

            const fineMessage = `��� *Your Fine Status*

Total Outstanding: ${totalFine}
Number of Fines: ${fineCount}

*Payment Details:*
Bank: ${process.env.BANK_NAME}
Account: ${process.env.ACCOUNT_NUMBER}
Name: ${process.env.ACCOUNT_HOLDER}

_Please settle your fines to avoid accumulation._`;

            await message.reply(fineMessage);
        } catch (error) {
            console.error('Error checking fine:', error);
            await message.reply('❌ Failed to check fine status. Please try again.');
        }
    }

    async handleFinesCommand(message, chat) {
        // Only allow on Sundays or for testing
        if (!BotHelpers.isSunday() && process.env.NODE_ENV !== 'development') {
            await message.reply('��� Fine summary is only available on Sundays.');
            return;
        }

        try {
            const groupId = chat.id._serialized;
            const allFines = await this.db.getAllFines(groupId);

            const withFines = allFines.filter(user => user.total_fine > 0);
            const withoutFines = allFines.filter(user => user.total_fine === 0);

            let fineMessage = `��� *Weekly Fine Summary*\n\n`;

            if (withFines.length > 0) {
                fineMessage += `��� *Members with Fines:*\n`;
                withFines.forEach((user, index) => {
                    fineMessage += `${index + 1}. ${user.name || 'Unknown'} - ${BotHelpers.formatCurrency(user.total_fine)}\n`;
                });
                fineMessage += `\n`;
            }

            if (withoutFines.length > 0) {
                fineMessage += `✅ *Members without Fines:*\n`;
                withoutFines.forEach((user, index) => {
                    fineMessage += `${index + 1}. ${user.name || 'Unknown'}\n`;
                });
                fineMessage += `\n`;
            }

            const totalFines = withFines.reduce((sum, user) => sum + user.total_fine, 0);
            fineMessage += `*Total Group Fines: ${BotHelpers.formatCurrency(totalFines)}*\n\n`;

            fineMessage += `*Payment Details:*\n`;
            fineMessage += `Bank: ${process.env.BANK_NAME}\n`;
            fineMessage += `Account: ${process.env.ACCOUNT_NUMBER}\n`;
            fineMessage += `Name: ${process.env.ACCOUNT_HOLDER}`;

            await message.reply(fineMessage);
        } catch (error) {
            console.error('Error generating fines summary:', error);
            await message.reply('❌ Failed to generate fines summary. Please try again.');
        }
    }

    async handleAddCommand(client, message, chat, phoneArg) {
        if (!phoneArg || phoneArg.trim() === '') {
            await message.reply('❌ Please provide a phone number.\nUsage: !add +1234567890 or !add 1234567890');
            return;
        }

        try {
            const phoneNumber = BotHelpers.formatPhoneForWhatsApp(phoneArg.trim());
            if (!phoneNumber) {
                await message.reply('❌ Invalid phone number format. Please use: +1234567890 or 1234567890');
                return;
            }

            const participantId = `${phoneNumber}@c.us`;
            
            // Check if user is already in the group
            const members = await BotHelpers.getGroupMembers(chat);
            const existingMember = members.find(member => member.phone === phoneNumber);
            
            if (existingMember) {
                await message.reply('❌ This user is already in the group.');
                return;
            }

            // Add participant to group
            await chat.addParticipants([participantId]);
            
            const successMessage = `✅ *User Added Successfully!*

📱 Phone: +${phoneNumber}
👥 Added to: ${chat.name}

_Welcome to the group!_ 🎉`;

            await message.reply(successMessage);
            
        } catch (error) {
            console.error('Error adding participant:', error);
            
            let errorMessage = '❌ Failed to add participant. ';
            if (error.message.includes('403')) {
                errorMessage += 'User privacy settings may prevent adding them.';
            } else if (error.message.includes('404')) {
                errorMessage += 'Phone number not found on WhatsApp.';
            } else {
                errorMessage += 'Please check the phone number and try again.';
            }
            
            await message.reply(errorMessage);
        }
    }

    async handleRemoveCommand(client, message, chat, phoneArg) {
        if (!phoneArg || phoneArg.trim() === '') {
            await message.reply('❌ Please provide a phone number.\nUsage: !remove +1234567890 or !kick 1234567890');
            return;
        }

        try {
            const phoneNumber = BotHelpers.formatPhoneForWhatsApp(phoneArg.trim());
            if (!phoneNumber) {
                await message.reply('❌ Invalid phone number format. Please use: +1234567890 or 1234567890');
                return;
            }

            const participantId = `${phoneNumber}@c.us`;
            
            // Check if user is in the group
            const members = await BotHelpers.getGroupMembers(chat);
            const targetMember = members.find(member => member.phone === phoneNumber);
            
            if (!targetMember) {
                await message.reply('❌ This user is not in the group.');
                return;
            }

            // Check if trying to remove an admin (additional protection)
            if (targetMember.isAdmin) {
                await message.reply('❌ Cannot remove group admins. Please demote them first.');
                return;
            }

            // Remove participant from group
            await chat.removeParticipants([participantId]);
            
            const successMessage = `✅ *User Removed Successfully!*

📱 Phone: +${phoneNumber}
👥 Removed from: ${chat.name}

_User has been kicked from the group._ 🚪`;

            await message.reply(successMessage);
            
        } catch (error) {
            console.error('Error removing participant:', error);
            
            let errorMessage = '❌ Failed to remove participant. ';
            if (error.message.includes('403')) {
                errorMessage += 'Bot may not have sufficient permissions.';
            } else if (error.message.includes('404')) {
                errorMessage += 'User not found in the group.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            await message.reply(errorMessage);
        }
    }

    async handleRoastCommand(client, message, chat, args) {
        if (!args || args.trim() === '') {
            await message.reply('❌ Please mention someone to roast.\nUsage: !roast @username or !roast +1234567890');
            return;
        }

        try {
            let targetPhone = null;
            let targetName = 'Someone';
            
            // Check if it's a mention (@username format)
            if (args.includes('@')) {
                // Extract phone from mention
                const mentionMatch = args.match(/@(\d+)/);
                if (mentionMatch) {
                    targetPhone = mentionMatch[1];
                } else {
                    await message.reply('❌ Invalid mention format. Use @phonenumber or just the phone number.');
                    return;
                }
            } else {
                // Direct phone number
                targetPhone = BotHelpers.formatPhoneForWhatsApp(args.trim());
                if (!targetPhone) {
                    await message.reply('❌ Invalid phone number format. Use: @1234567890 or +1234567890');
                    return;
                }
            }

            // Check if user is in the group
            const members = await BotHelpers.getGroupMembers(chat);
            const targetMember = members.find(member => member.phone === targetPhone);
            
            if (!targetMember) {
                await message.reply('❌ This user is not in the group.');
                return;
            }

            // Don't roast admins (optional protection)
            if (targetMember.isAdmin) {
                await message.reply('😅 I dare not roast an admin! They have the power to kick me out! 👑');
                return;
            }

            // Get contact info for name
            try {
                const contact = await client.getContactById(targetMember.id);
                targetName = contact.pushname || contact.name || 'Unknown';
            } catch (err) {
                console.log('Could not get contact name:', err);
            }

            // Get a random roast
            const roast = await BotHelpers.getRandomRoast();
            
            const roastMessage = `🔥 *ROAST TIME!* 🔥

@${targetPhone} ${roast}

😂 *Roasted by ${process.env.BOT_NAME || 'GroupBot'}!*

_It's all fun and games! Don't take it seriously!_ 😄`;

            // Send with mention
            await client.sendMessage(chat.id._serialized, roastMessage, { 
                mentions: [targetMember.id] 
            });
            
        } catch (error) {
            console.error('Error sending roast:', error);
            await message.reply('❌ Failed to roast. The target escaped! 🏃‍♂️💨');
        }
    }

    async handleDebugCommand(client, message, chat) {
        try {
            const senderId = message.author || message.from;
            const botId = client.info.wid._serialized;
            
            // Get all participants
            if (!chat.participants) {
                await chat.fetchParticipants();
            }
            
            const participants = chat.participants || [];
            
            let debugInfo = `🔍 *Debug Information*\n\n`;
            debugInfo += `📱 *Your ID:* ${senderId}\n`;
            debugInfo += `🤖 *Bot ID:* ${botId}\n`;
            debugInfo += `👥 *Total Participants:* ${participants.length}\n\n`;
            
            debugInfo += `👑 *Group Admins:*\n`;
            const admins = participants.filter(p => p.isAdmin);
            admins.forEach((admin, index) => {
                const adminId = admin.id._serialized || admin.id;
                const isYou = adminId === senderId ? ' (YOU)' : '';
                const isBot = adminId === botId ? ' (BOT)' : '';
                debugInfo += `${index + 1}. ${adminId}${isYou}${isBot}\n`;
            });
            
            debugInfo += `\n🔧 *Status Checks:*\n`;
            debugInfo += `• You are admin: ${await BotHelpers.isUserAdmin(chat, senderId)}\n`;
            debugInfo += `• Bot is admin: ${await BotHelpers.isBotAdmin(chat, botId)}\n`;
            
            await message.reply(debugInfo);
        } catch (error) {
            console.error('Error in debug command:', error);
            await message.reply('❌ Debug command failed: ' + error.message);
        }
    }

    async handlePromoteCommand(client, message, chat, args) {
        if (!args || args.trim() === '') {
            await message.reply('❌ Please mention someone to promote.\nUsage: !promote @username or !promote +1234567890');
            return;
        }

        try {
            let targetPhone = null;
            let targetName = 'Someone';
            
            // Check if it's a mention (@username format)
            if (args.includes('@')) {
                // Extract phone from mention
                const mentionMatch = args.match(/@(\d+)/);
                if (mentionMatch) {
                    targetPhone = mentionMatch[1];
                } else {
                    await message.reply('❌ Invalid mention format. Use @phonenumber or just the phone number.');
                    return;
                }
            } else {
                // Direct phone number
                targetPhone = BotHelpers.formatPhoneForWhatsApp(args.trim());
                if (!targetPhone) {
                    await message.reply('❌ Invalid phone number format. Use: @1234567890 or +1234567890');
                    return;
                }
            }

            // Check if user is in the group
            const members = await BotHelpers.getGroupMembers(chat);
            const targetMember = members.find(member => member.phone === targetPhone);
            
            if (!targetMember) {
                await message.reply('❌ This user is not in the group.');
                return;
            }

            // Check if user is already an admin
            if (targetMember.isAdmin) {
                await message.reply('❌ This user is already a group admin.');
                return;
            }

            // Get contact info for name
            try {
                const contact = await client.getContactById(targetMember.id);
                targetName = contact.pushname || contact.name || 'Unknown';
            } catch (err) {
                console.log('Could not get contact name:', err);
            }

            // Promote user to admin
            await chat.promoteParticipants([targetMember.id]);
            
            const successMessage = `👑 *User Promoted Successfully!*

📱 Phone: +${targetPhone}
👤 Name: ${targetName}
👥 Group: ${chat.name}

✅ *${targetName} is now a group admin!*

_Congratulations on your new role!_ 🎉`;

            await message.reply(successMessage);
            
        } catch (error) {
            console.error('Error promoting user:', error);
            
            let errorMessage = '❌ Failed to promote user. ';
            if (error.message.includes('403')) {
                errorMessage += 'Bot may not have sufficient permissions.';
            } else if (error.message.includes('404')) {
                errorMessage += 'User not found in the group.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            await message.reply(errorMessage);
        }
    }

    async handleDemoteCommand(client, message, chat, args) {
        if (!args || args.trim() === '') {
            await message.reply('❌ Please mention someone to demote.\nUsage: !demote @username or !demote +1234567890');
            return;
        }

        try {
            let targetPhone = null;
            let targetName = 'Someone';
            
            // Check if it's a mention (@username format)
            if (args.includes('@')) {
                // Extract phone from mention
                const mentionMatch = args.match(/@(\d+)/);
                if (mentionMatch) {
                    targetPhone = mentionMatch[1];
                } else {
                    await message.reply('❌ Invalid mention format. Use @phonenumber or just the phone number.');
                    return;
                }
            } else {
                // Direct phone number
                targetPhone = BotHelpers.formatPhoneForWhatsApp(args.trim());
                if (!targetPhone) {
                    await message.reply('❌ Invalid phone number format. Use: @1234567890 or +1234567890');
                    return;
                }
            }

            // Check if user is in the group
            const members = await BotHelpers.getGroupMembers(chat);
            const targetMember = members.find(member => member.phone === targetPhone);
            
            if (!targetMember) {
                await message.reply('❌ This user is not in the group.');
                return;
            }

            // Check if user is actually an admin
            if (!targetMember.isAdmin) {
                await message.reply('❌ This user is not a group admin.');
                return;
            }

            // Prevent demoting the group creator (if possible to detect)
            // Note: This is a basic check, WhatsApp doesn't always provide creator info
            const senderId = message.author || message.from;
            if (targetMember.id === senderId) {
                await message.reply('❌ You cannot demote yourself.');
                return;
            }

            // Get contact info for name
            try {
                const contact = await client.getContactById(targetMember.id);
                targetName = contact.pushname || contact.name || 'Unknown';
            } catch (err) {
                console.log('Could not get contact name:', err);
            }

            // Demote user from admin
            await chat.demoteParticipants([targetMember.id]);
            
            const successMessage = `📉 *User Demoted Successfully!*

📱 Phone: +${targetPhone}
👤 Name: ${targetName}
👥 Group: ${chat.name}

⬇️ *${targetName} is no longer a group admin.*

_Admin privileges have been removed._ 📝`;

            await message.reply(successMessage);
            
        } catch (error) {
            console.error('Error demoting user:', error);
            
            let errorMessage = '❌ Failed to demote user. ';
            if (error.message.includes('403')) {
                errorMessage += 'Bot may not have sufficient permissions or user is group creator.';
            } else if (error.message.includes('404')) {
                errorMessage += 'User not found in the group.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            await message.reply(errorMessage);
        }
    }
}

module.exports = GroupCommands;
