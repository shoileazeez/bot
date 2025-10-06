const cron = require('node-cron');
const BotHelpers = require('./helpers');

class BotAutomation {
    constructor(client, db) {
        this.client = client;
        this.db = db;
        this.jobs = [];
    }

    startAllJobs() {
        this.startDailyWarningJob();
        this.startSundayFineJob();
        this.startCallReminderJob();
        this.startCallScheduleJob();
        console.log('í´– All automation jobs started');
    }

    // Daily warning for inactive users (runs at 6 PM)
    startDailyWarningJob() {
        const job = cron.schedule('0 18 * * *', async () => {
            console.log('í´ Running daily inactive user check...');
            await this.checkInactiveUsers();
        }, {
            scheduled: true,
            timezone: "Africa/Lagos"
        });
        
        this.jobs.push({ name: 'dailyWarning', job });
    }

    // Sunday fine summary (runs at 9 AM on Sundays)
    startSundayFineJob() {
        const job = cron.schedule('0 9 * * 0', async () => {
            console.log('í³Š Running Sunday fine summary...');
            await this.sendSundayFineSummary();
        }, {
            scheduled: true,
            timezone: "Africa/Lagos"
        });
        
        this.jobs.push({ name: 'sundayFines', job });
    }

    // Call reminder (12:00 PM on Sundays)
    startCallReminderJob() {
        const reminderTime = process.env.REMINDER_TIME || '12:00';
        const [hour, minute] = reminderTime.split(':');
        
        const job = cron.schedule(`${minute} ${hour} * * 0`, async () => {
            console.log('â° Sending call reminders...');
            await this.sendCallReminders();
        }, {
            scheduled: true,
            timezone: "Africa/Lagos"
        });
        
        this.jobs.push({ name: 'callReminder', job });
    }

    // Call schedule notification (12:30 PM on Sundays)
    startCallScheduleJob() {
        const callTime = process.env.CALL_TIME || '12:30';
        const [hour, minute] = callTime.split(':');
        
        const job = cron.schedule(`${minute} ${hour} * * 0`, async () => {
            console.log('í³ž Sending call schedule notifications...');
            await this.sendCallSchedule();
        }, {
            scheduled: true,
            timezone: "Africa/Lagos"
        });
        
        this.jobs.push({ name: 'callSchedule', job });
    }

    async checkInactiveUsers() {
        try {
            // Get all active groups
            const groups = await this.client.getChats();
            const activeGroups = groups.filter(chat => chat.isGroup);

            for (const group of activeGroups) {
                const groupId = group.id._serialized;
                
                // Check if bot is admin in this group
                const botIsAdmin = await BotHelpers.isBotAdmin(group, this.client.info.wid._serialized);
                if (!botIsAdmin) continue;

                // Get inactive users (haven't sent message in the last day)
                const inactiveUsers = await this.db.getInactiveUsers(groupId, 1);
                
                if (inactiveUsers.length > 0) {
                    await this.sendInactiveUserWarning(group, inactiveUsers);
                }
            }
        } catch (error) {
            console.error('Error checking inactive users:', error);
        }
    }

    async sendInactiveUserWarning(group, inactiveUsers) {
        try {
            const fineAmount = process.env.DAILY_FINE_AMOUNT || 500;
            const currency = process.env.CURRENCY || 'â‚¦';

            // Add fines for inactive users
            for (const user of inactiveUsers) {
                await this.db.addFine(user.phone, group.id._serialized, fineAmount, 'Daily inactivity');
            }

            // Create mention string for inactive users
            const mentions = inactiveUsers.map(user => `${user.phone}@c.us`);
            const mentionText = inactiveUsers.map(user => `@${user.phone}`).join(' ');

            const warningMessage = `âš ï¸ *Daily Activity Warning* âš ï¸

The following members have been inactive today and have been fined ${currency}${fineAmount}:

${mentionText}

í²° *Fine Details:*
â€¢ Amount: ${currency}${fineAmount} per day
â€¢ Reason: No messages sent today
â€¢ Payment required by Sunday

*Bank Details:*
Bank: ${process.env.BANK_NAME}
Account: ${process.env.ACCOUNT_NUMBER}
Name: ${process.env.ACCOUNT_HOLDER}

Stay active to avoid daily fines! í²¬`;

            await this.client.sendMessage(group.id._serialized, warningMessage, { mentions });
        } catch (error) {
            console.error('Error sending inactive user warning:', error);
        }
    }

    async sendSundayFineSummary() {
        try {
            const groups = await this.client.getChats();
            const activeGroups = groups.filter(chat => chat.isGroup);

            for (const group of activeGroups) {
                const groupId = group.id._serialized;
                
                // Check if bot is admin
                const botIsAdmin = await BotHelpers.isBotAdmin(group, this.client.info.wid._serialized);
                if (!botIsAdmin) continue;

                await this.sendGroupFineSummary(group);
            }
        } catch (error) {
            console.error('Error sending Sunday fine summary:', error);
        }
    }

    async sendGroupFineSummary(group) {
        try {
            const groupId = group.id._serialized;
            const allFines = await this.db.getAllFines(groupId);
            const members = await BotHelpers.getGroupMembers(group);

            const withFines = allFines.filter(user => user.total_fine > 0);
            const withoutFines = allFines.filter(user => user.total_fine === 0);

            // Create mentions for all members
            const allMentions = members.map(member => member.id).filter(id => id !== this.client.info.wid._serialized);
            const allMentionText = members.map(member => `@${member.phone}`).filter((phone, index) => 
                members[index].id !== this.client.info.wid._serialized
            ).join(' ');

            let summaryMessage = `í³Š *WEEKLY FINE SUMMARY - ${new Date().toLocaleDateString()}*

${allMentionText}

`;

            if (withFines.length > 0) {
                summaryMessage += `í²¸ *Members with Outstanding Fines:*\n`;
                withFines.forEach((user, index) => {
                    summaryMessage += `${index + 1}. ${user.name || 'Unknown'} - ${BotHelpers.formatCurrency(user.total_fine)}\n`;
                });
                summaryMessage += `\n`;
            }

            if (withoutFines.length > 0) {
                summaryMessage += `âœ… *Members with No Fines:*\n`;
                withoutFines.forEach((user, index) => {
                    summaryMessage += `${index + 1}. ${user.name || 'Unknown'}\n`;
                });
                summaryMessage += `\n`;
            }

            const totalFines = withFines.reduce((sum, user) => sum + user.total_fine, 0);
            summaryMessage += `*TOTAL GROUP FINES: ${BotHelpers.formatCurrency(totalFines)}*\n\n`;

            summaryMessage += `í²³ *PAYMENT DETAILS:*\n`;
            summaryMessage += `í¿¦ Bank: ${process.env.BANK_NAME}\n`;
            summaryMessage += `í´¢ Account: ${process.env.ACCOUNT_NUMBER}\n`;
            summaryMessage += `í±¤ Name: ${process.env.ACCOUNT_HOLDER}\n\n`;

            summaryMessage += `â° *Payment Deadline: Next Sunday*\n`;
            summaryMessage += `_Fine calculations reset weekly._`;

            await this.client.sendMessage(group.id._serialized, summaryMessage, { mentions: allMentions });
        } catch (error) {
            console.error('Error sending group fine summary:', error);
        }
    }

    async sendCallReminders() {
        try {
            const groups = await this.client.getChats();
            const activeGroups = groups.filter(chat => chat.isGroup);

            for (const group of activeGroups) {
                const botIsAdmin = await BotHelpers.isBotAdmin(group, this.client.info.wid._serialized);
                if (!botIsAdmin) continue;

                const members = await BotHelpers.getGroupMembers(group);
                const mentions = members.map(member => member.id).filter(id => id !== this.client.info.wid._serialized);
                const mentionText = members.map(member => `@${member.phone}`).filter((phone, index) => 
                    members[index].id !== this.client.info.wid._serialized
                ).join(' ');

                const reminderMessage = `â° *CALL REMINDER* â°

${mentionText}

í³ž *Group call scheduled in 30 minutes!*
íµ Time: ${process.env.CALL_TIME || '12:30'} PM
í³… Today (Sunday)

Please be available for our weekly group discussion.

_Don't miss this important call!_ í³±`;

                await this.client.sendMessage(group.id._serialized, reminderMessage, { mentions });
            }
        } catch (error) {
            console.error('Error sending call reminders:', error);
        }
    }

    async sendCallSchedule() {
        try {
            const groups = await this.client.getChats();
            const activeGroups = groups.filter(chat => chat.isGroup);

            for (const group of activeGroups) {
                const botIsAdmin = await BotHelpers.isBotAdmin(group, this.client.info.wid._serialized);
                if (!botIsAdmin) continue;

                const members = await BotHelpers.getGroupMembers(group);
                const mentions = members.map(member => member.id).filter(id => id !== this.client.info.wid._serialized);
                const mentionText = members.map(member => `@${member.phone}`).filter((phone, index) => 
                    members[index].id !== this.client.info.wid._serialized
                ).join(' ');

                const callMessage = `í³ž *GROUP CALL NOW!* í³ž

${mentionText}

í´´ *LIVE: Weekly Group Call*
íµ Time: NOW (${process.env.CALL_TIME || '12:30'} PM)
í³… Sunday Discussion

Join the call now! This is our scheduled weekly meeting.

_The call is starting now!_ í¾‰`;

                await this.client.sendMessage(group.id._serialized, callMessage, { mentions });
            }
        } catch (error) {
            console.error('Error sending call schedule:', error);
        }
    }

    stopAllJobs() {
        this.jobs.forEach(({ name, job }) => {
            job.destroy();
            console.log(`í»‘ Stopped ${name} job`);
        });
        this.jobs = [];
    }

    // Manual triggers for testing
    async triggerDailyWarning() {
        console.log('í·ª Manually triggering daily warning...');
        await this.checkInactiveUsers();
    }

    async triggerSundayFines() {
        console.log('í·ª Manually triggering Sunday fines...');
        await this.sendSundayFineSummary();
    }
}

module.exports = BotAutomation;
