const BotHelpers = require('../utils/helpers');

class GroupCommands {
    constructor(db) {
        this.db = db;
    }

    async handleCommand(client, message, chat) {
        const { command, args } = BotHelpers.parseCommand(message);
        let senderId = message.author || message.from;
        const groupId = chat.id._serialized;

        console.log(`Command received: ${command} from ${senderId} in group ${groupId}`);

        // Try to get the actual contact information
        try {
            const contact = await message.getContact();
            if (contact && contact.id && contact.id._serialized) {
                const contactId = contact.id._serialized;
                console.log(`Contact ID from message: ${contactId}`);
                
                // Use contact ID if it's different from sender ID
                if (contactId !== senderId) {
                    console.log(`Using contact ID instead of sender ID: ${contactId}`);
                    senderId = contactId;
                }
            }
        } catch (error) {
            console.log('Could not get contact info, using original sender ID');
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

            // Add participant to group - with better error handling
            try {
                await chat.addParticipants([participantId]);
                
                // Wait a moment for WhatsApp to update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Force refresh the participant list
                try {
                    await chat.sendSeen();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (refreshError) {
                    console.log('Could not refresh participants after add');
                }
                
                const successMessage = `✅ *User Add Request Sent!*

📱 Phone: +${phoneNumber}
👥 Group: ${chat.name}

_User will be added if they accept the invitation._ 🎉`;

                await message.reply(successMessage);
            } catch (addError) {
                console.error('WhatsApp add participant error:', addError);
                
                let errorMessage = '❌ Failed to add participant.\n\n';
                
                if (addError.message.includes('403') || addError.message.includes('Forbidden')) {
                    errorMessage += '🔒 *Reason:* User privacy settings prevent adding them.\n';
                    errorMessage += '💡 *Solution:* Ask them to join manually or send group invite link.';
                } else if (addError.message.includes('404') || addError.message.includes('Not Found')) {
                    errorMessage += '📱 *Reason:* Phone number not found on WhatsApp.\n';
                    errorMessage += '💡 *Solution:* Verify the number is correct and has WhatsApp.';
                } else if (addError.message.includes('400') || addError.message.includes('Bad Request')) {
                    errorMessage += '⚠️ *Reason:* Invalid phone number or user cannot be added.\n';
                    errorMessage += '💡 *Solution:* Check the phone number format.';
                } else if (addError.message.includes('limit')) {
                    errorMessage += '👥 *Reason:* Group participant limit reached.\n';
                    errorMessage += '💡 *Solution:* Remove inactive members first.';
                } else if (addError.message.includes('Evaluation failed')) {
                    errorMessage += '🔧 *Reason:* WhatsApp Web interface error.\n';
                    errorMessage += '💡 *Possible causes:*\n';
                    errorMessage += '• User has blocked the group admin\n';
                    errorMessage += '• User has strict privacy settings\n';
                    errorMessage += '• WhatsApp temporary restriction\n';
                    errorMessage += '• Try inviting manually via invite link';
                } else if (addError.message.includes('privacy')) {
                    errorMessage += '🔐 *Reason:* User privacy settings are too strict.\n';
                    errorMessage += '💡 *Solution:* User must join manually or change privacy settings.';
                } else {
                    errorMessage += `🔧 *Technical Error:* ${addError.message}\n`;
                    errorMessage += '💡 *Solution:* Try again later or contact support.';
                }
                
                await message.reply(errorMessage);
            }
            
        } catch (error) {
            console.error('Error in add command:', error);
            await message.reply('❌ An unexpected error occurred. Please try again.');
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
            
            // Check if user is in the group - with forced refresh and better matching
            const members = await BotHelpers.getGroupMembers(chat, true);
            console.log(`Remove: Searching for phone ${phoneNumber} among ${members.length} members`);
            
            const targetMember = BotHelpers.findParticipantByPhone(members, phoneNumber);
            
            if (!targetMember) {
                await message.reply(`❌ This user is not in the group.\n\n📱 *Phone searched:* +${phoneNumber}\n📝 *Current members:* ${members.length}`);
                return;
            }

            console.log(`Remove: Found target member: ${targetMember.phone}`);

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

            // Check if user is in the group - with forced refresh and better matching
            const members = await BotHelpers.getGroupMembers(chat, true);
            console.log(`Roast: Searching for phone ${targetPhone} among ${members.length} members`);
            
            const targetMember = BotHelpers.findParticipantByPhone(members, targetPhone);
            
            if (!targetMember) {
                await message.reply(`❌ This user is not in the group.\n\n📱 *Phone searched:* +${targetPhone}\n📝 *Current members:* ${members.length}\n💡 *Tip:* Check the phone number format.`);
                return;
            }

            console.log(`Roast: Found target member: ${targetMember.phone}`);

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

            // Check if user is in the group - with forced refresh and better matching
            const members = await BotHelpers.getGroupMembers(chat, true);
            console.log(`Searching for phone ${targetPhone} among ${members.length} members`);
            
            // Log all member phones for debugging
            members.forEach((member, index) => {
                console.log(`Member ${index + 1}: ${member.phone}, ID: ${member.id}`);
            });
            
            const targetMember = BotHelpers.findParticipantByPhone(members, targetPhone);
            
            if (!targetMember) {
                await message.reply(`❌ User with phone number +${targetPhone} is not in this group.\n\n📝 *Current members:* ${members.length}\n💡 *Tip:* Make sure the phone number format is correct.`);
                return;
            }

            console.log(`Found target member: ${targetMember.phone}, isAdmin: ${targetMember.isAdmin}`);

            // Check if user is already an admin
            if (targetMember.isAdmin) {
                await message.reply('❌ This user is already a group admin.');
                return;
            }

            // Get contact info for name
            try {
                const contact = await client.getContactById(targetMember.id);
                targetName = contact.pushname || contact.name || `+${targetPhone}`;
            } catch (err) {
                console.log('Could not get contact name:', err);
                targetName = `+${targetPhone}`;
            }

            // Promote user to admin with proper error handling
            try {
                await chat.promoteParticipants([targetMember.id]);
                
                const successMessage = `👑 *User Promoted Successfully!*

📱 Phone: +${targetPhone}
👤 Name: ${targetName}
👥 Group: ${chat.name}

✅ *${targetName} is now a group admin!*

_Congratulations on your new role!_ 🎉`;

                await message.reply(successMessage);
                
            } catch (promoteError) {
                console.error('WhatsApp promote error:', promoteError);
                
                let errorMessage = '❌ Failed to promote user.\n\n';
                
                if (promoteError.message.includes('403') || promoteError.message.includes('Forbidden')) {
                    errorMessage += '🔒 *Reason:* Insufficient permissions to promote users.\n';
                    errorMessage += '💡 *Solution:* Ensure bot has admin privileges and try again.';
                } else if (promoteError.message.includes('404') || promoteError.message.includes('Not Found')) {
                    errorMessage += '👤 *Reason:* User not found or no longer in group.\n';
                    errorMessage += '💡 *Solution:* Verify the user is still in the group.';
                } else if (promoteError.message.includes('limit')) {
                    errorMessage += '👥 *Reason:* Maximum number of admins reached.\n';
                    errorMessage += '💡 *Solution:* Demote another admin first.';
                } else if (promoteError.message.includes('Evaluation failed')) {
                    errorMessage += '🔧 *Reason:* WhatsApp Web interface error.\n';
                    errorMessage += '💡 *Solution:* Try again in a few moments.';
                } else {
                    errorMessage += `🔧 *Technical Error:* ${promoteError.message}\n`;
                    errorMessage += '💡 *Solution:* Contact support if issue persists.';
                }
                
                await message.reply(errorMessage);
            }
            
        } catch (error) {
            console.error('Error in promote command:', error);
            await message.reply('❌ An unexpected error occurred while promoting user. Please try again.');
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

            // Check if user is in the group - with forced refresh and better matching
            const members = await BotHelpers.getGroupMembers(chat, true);
            console.log(`Demote: Searching for phone ${targetPhone} among ${members.length} members`);
            
            const targetMember = BotHelpers.findParticipantByPhone(members, targetPhone);
            
            if (!targetMember) {
                await message.reply(`❌ User with phone number +${targetPhone} is not in this group.\n\n📝 *Current members:* ${members.length}\n💡 *Tip:* Make sure the phone number format is correct.`);
                return;
            }

            console.log(`Demote: Found target member: ${targetMember.phone}, isAdmin: ${targetMember.isAdmin}`);

            // Check if user is actually an admin
            if (!targetMember.isAdmin) {
                await message.reply('❌ This user is not a group admin, so cannot be demoted.');
                return;
            }

            // Prevent demoting yourself
            let senderId = message.author || message.from;
            
            // Try to get the real contact ID
            try {
                const contact = await message.getContact();
                if (contact && contact.id && contact.id._serialized) {
                    senderId = contact.id._serialized;
                }
            } catch (error) {
                console.log('Could not get contact info for sender');
            }
            
            if (targetMember.id === senderId) {
                await message.reply('❌ You cannot demote yourself. Ask another admin to demote you.');
                return;
            }

            // Get contact info for name
            try {
                const contact = await client.getContactById(targetMember.id);
                targetName = contact.pushname || contact.name || `+${targetPhone}`;
            } catch (err) {
                console.log('Could not get contact name:', err);
                targetName = `+${targetPhone}`;
            }

            // Demote user from admin with proper error handling
            try {
                await chat.demoteParticipants([targetMember.id]);
                
                const successMessage = `📉 *User Demoted Successfully!*

📱 Phone: +${targetPhone}
👤 Name: ${targetName}
👥 Group: ${chat.name}

⬇️ *${targetName} is no longer a group admin.*

_Admin privileges have been removed._ 📝`;

                await message.reply(successMessage);
                
            } catch (demoteError) {
                console.error('WhatsApp demote error:', demoteError);
                
                let errorMessage = '❌ Failed to demote user.\n\n';
                
                if (demoteError.message.includes('403') || demoteError.message.includes('Forbidden')) {
                    errorMessage += '🔒 *Reason:* Insufficient permissions or user is group creator.\n';
                    errorMessage += '💡 *Solution:* Group creators cannot be demoted by other admins.';
                } else if (demoteError.message.includes('404') || demoteError.message.includes('Not Found')) {
                    errorMessage += '👤 *Reason:* User not found or no longer in group.\n';
                    errorMessage += '💡 *Solution:* Verify the user is still in the group.';
                } else if (demoteError.message.includes('Evaluation failed')) {
                    errorMessage += '🔧 *Reason:* WhatsApp Web interface error.\n';
                    errorMessage += '💡 *Solution:* Try again in a few moments.';
                } else {
                    errorMessage += `🔧 *Technical Error:* ${demoteError.message}\n`;
                    errorMessage += '💡 *Solution:* Contact support if issue persists.';
                }
                
                await message.reply(errorMessage);
            }
            
        } catch (error) {
            console.error('Error in demote command:', error);
            await message.reply('❌ An unexpected error occurred while demoting user. Please try again.');
        }
    }
}

module.exports = GroupCommands;
