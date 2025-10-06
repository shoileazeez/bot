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
        console.log('� All automation jobs started');
    }

    // Daily warning for inactive users (runs at 6 PM)
    startDailyWarningJob() {
        const job = cron.schedule('0 18 * * *', async () => {
            console.log('� Running daily inactive user check...');
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
            console.log('� Running Sunday fine summary...');
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
            console.log('⏰ Sending call reminders...');
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
            console.log('� Sending call schedule notifications...');
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
            const currency = process.env.CURRENCY || '₦';

            // Add fines for inactive users
            for (const user of inactiveUsers) {
                await this.db.addFine(user.phone, group.id._serialized, fineAmount, 'Daily inactivity');
            }

            // Create mention string for inactive users
            const mentions = inactiveUsers.map(user => `${user.phone}@c.us`);
            const mentionText = inactiveUsers.map(user => `@${user.phone}`).join(' ');

            const warningMessage = `⚠️ *Daily Activity Warning* ⚠️

The following members have been inactive today and have been fined ${currency}${fineAmount}:

${mentionText}

� *Fine Details:*
• Amount: ${currency}${fineAmount} per day
• Reason: No messages sent today
• Payment required by Sunday

*Bank Details:*
Bank: ${process.env.BANK_NAME}
Account: ${process.env.ACCOUNT_NUMBER}
Name: ${process.env.ACCOUNT_HOLDER}

Stay active to avoid daily fines! �`;

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

            let summaryMessage = `� *WEEKLY FINE SUMMARY - ${new Date().toLocaleDateString()}*

${allMentionText}

`;

            if (withFines.length > 0) {
                summaryMessage += `� *Members with Outstanding Fines:*\n`;
                withFines.forEach((user, index) => {
                    summaryMessage += `${index + 1}. ${user.name || 'Unknown'} - ${BotHelpers.formatCurrency(user.total_fine)}\n`;
                });
                summaryMessage += `\n`;
            }

            if (withoutFines.length > 0) {
                summaryMessage += `✅ *Members with No Fines:*\n`;
                withoutFines.forEach((user, index) => {
                    summaryMessage += `${index + 1}. ${user.name || 'Unknown'}\n`;
                });
                summaryMessage += `\n`;
            }

            const totalFines = withFines.reduce((sum, user) => sum + user.total_fine, 0);
            summaryMessage += `*TOTAL GROUP FINES: ${BotHelpers.formatCurrency(totalFines)}*\n\n`;

            summaryMessage += `� *PAYMENT DETAILS:*\n`;
            summaryMessage += `� Bank: ${process.env.BANK_NAME}\n`;
            summaryMessage += `� Account: ${process.env.ACCOUNT_NUMBER}\n`;
            summaryMessage += `� Name: ${process.env.ACCOUNT_HOLDER}\n\n`;

            summaryMessage += `⏰ *Payment Deadline: Next Sunday*\n`;
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

                const reminderMessage = `⏰ *CALL REMINDER* ⏰

${mentionText}

� *Group call scheduled in 30 minutes!*
� Time: ${process.env.CALL_TIME || '12:30'} PM
� Today (Sunday)

Please be available for our weekly group discussion.

_Don't miss this important call!_ �`;

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

                const callMessage = `� *GROUP CALL NOW!* �

${mentionText}

� *LIVE: Weekly Group Call*
� Time: NOW (${process.env.CALL_TIME || '12:30'} PM)
� Sunday Discussion

Join the call now! This is our scheduled weekly meeting.

_The call is starting now!_ �`;

                await this.client.sendMessage(group.id._serialized, callMessage, { mentions });
            }
        } catch (error) {
            console.error('Error sending call schedule:', error);
        }
    }

    stopAllJobs() {
        this.jobs.forEach(({ name, job }) => {
            job.destroy();
            console.log(`� Stopped ${name} job`);
        });
        this.jobs = [];
    }

    // Manual triggers for testing
    async triggerDailyWarning() {
        console.log('� Manually triggering daily warning...');
        await this.checkInactiveUsers();
    }

    async triggerSundayFines() {
        console.log('� Manually triggering Sunday fines...');
        await this.sendSundayFineSummary();
    }
}

module.exports = BotAutomation;
