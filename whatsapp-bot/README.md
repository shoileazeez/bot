# WhatsApp Group Management Bot

A comprehensive WhatsApp bot for group management with automated features, fine tracking, and private assistant capabilities.

## ��� Features

### Group Commands (Admin Only)
- **!quote** - Daily morning quotes with member tagging
- **!announce <message>** - Announcements with hidden member tags
- **!tag [message]** - Tag all members (with optional custom message)
- **!add <phone>** - Add member to group by phone number
- **!remove <phone>** - Remove member from group by phone number
- **!kick <phone>** - Kick member from group (same as remove)
- **!promote <phone>** - Promote member to group admin
- **!demote <phone>** - Demote admin to regular member
- **!roast @user** - Roast a group member with funny insults
- **!help** - Display all available commands
- **!fine** - Check individual fine status
- **!fines** - Weekly fine summary (Sundays only)
- **!debug** - Show debug information (troubleshooting)

### Automated Features
- **Daily Warning System** - Track inactive users and apply fines
- **Sunday Fine Reports** - Complete weekly summary with payment details
- **Call Scheduling** - Sunday 12:30 PM group call notifications
- **Call Reminders** - 12:00 PM reminders before scheduled calls

### Private Assistant
- Bot selling inquiry handling
- Pricing information
- Feature descriptions
- Developer contact sharing
- Intelligent conversation flow

### Security Features
- Admin-only command execution
- Bot must have admin privileges
- Group ID validation
- User verification system

## ��� Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- WhatsApp account for bot

### Setup Instructions

1. **Clone or create the project:**
```bash
mkdir whatsapp-bot
cd whatsapp-bot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Edit the `.env` file with your settings:
```env
# Bot Configuration
BOT_NAME=GroupBot
ADMIN_CONTACT=+1234567890

# Fine System
DAILY_FINE_AMOUNT=500
CURRENCY=₦

# Bank Details
BANK_NAME=Your Bank Name
ACCOUNT_NUMBER=1234567890
ACCOUNT_HOLDER=Account Holder Name

# Call Schedule (24-hour format)
CALL_TIME=12:30
REMINDER_TIME=12:00

# Quote API
QUOTE_API_URL=https://api.quotable.io/random
```

4. **Initialize database:**
```bash
npm run init-db
```

5. **Start the bot:**
```bash
npm start
```

6. **Scan QR Code:**
- A QR code will appear in the terminal
- Scan it with your WhatsApp to authenticate
- The bot will be ready once connected

## ��� Usage

### Initial Setup
1. Add the bot to your WhatsApp groups
2. Make the bot an admin in each group
3. The bot will automatically send a welcome message
4. Users can start using commands immediately

### Command Examples

```
!quote
# Sends daily morning quote with member tags

!announce Meeting at 3 PM today
# Sends announcement with hidden member tags

!tag Good morning everyone!
# Tags all members with custom message

!tag
# Tags all members with default message

!add +1234567890
# Adds member to group by phone number

!remove +1234567890
# Removes member from group by phone number

!kick 1234567890
# Kicks member from group (same as remove)

!roast @1234567890
# Roasts the mentioned user with funny insults

!promote +1234567890
# Promotes user to group admin

!demote +1234567890
# Demotes admin to regular member

!help
# Shows all available commands

!fine
# Shows your current fine status

!fines
# Shows weekly fine summary (Sundays only)
```

### Private Chat Features
Users can message the bot privately to:
- Inquire about bot development services
- Get pricing information
- Learn about features
- Get developer contact details

## ��� Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_NAME` | Bot display name | GroupBot |
| `ADMIN_CONTACT` | Your WhatsApp number | +1234567890 |
| `DAILY_FINE_AMOUNT` | Fine amount per day | 500 |
| `CURRENCY` | Currency symbol | ₦ |
| `BANK_NAME` | Payment bank name | First Bank Nigeria |
| `ACCOUNT_NUMBER` | Payment account number | 1234567890 |
| `ACCOUNT_HOLDER` | Account holder name | Group Admin |
| `CALL_TIME` | Sunday call time | 12:30 |
| `REMINDER_TIME` | Call reminder time | 12:00 |
| `QUOTE_API_URL` | Quote API endpoint | https://api.quotable.io/random |

### Automation Schedule

| Feature | Schedule | Description |
|---------|----------|-------------|
| Daily Warning | 6:00 PM daily | Check for inactive users |
| Fine Summary | 9:00 AM Sundays | Send weekly fine report |
| Call Reminder | 12:00 PM Sundays | Send call reminder |
| Call Schedule | 12:30 PM Sundays | Send call notification |

## ��� Fine System

### How It Works
1. **Daily Tracking**: Bot monitors user activity in groups
2. **Inactivity Detection**: Users who don't send messages get fined
3. **Automatic Fines**: ₦500 (configurable) charged per inactive day
4. **Weekly Reports**: Sunday summaries with payment details
5. **Payment Integration**: Bank details provided automatically

### Fine Commands
- `!fine` - Check your personal fine status
- `!fines` - View all group fines (Sundays only)

## ��� Security

### Admin Requirements
- Bot must be group admin
- Command sender must be group admin
- Commands only work in authorized groups

### Privacy
- User data stored locally in SQLite
- No external data sharing
- Activity tracking for fine system only

## ���️ Development

### Project Structure
```
whatsapp-bot/
├── commands/
│   ├── groupCommands.js     # Group command handlers
│   └── privateAssistant.js # Private chat assistant
├── utils/
│   ├── database.js          # Database operations
│   ├── helpers.js           # Utility functions
│   └── automation.js        # Scheduled tasks
├── index.js                 # Main bot file
├── package.json             # Dependencies
├── .env                     # Configuration
└── README.md               # Documentation
```

### Available Scripts
```bash
npm start        # Start the bot
npm run dev      # Start with nodemon (development)
npm run init-db  # Initialize database
```

### Database Schema
- **users**: User information and fine totals
- **fines**: Individual fine records
- **groups**: Group settings and bot status
- **daily_activity**: User activity tracking

## ��� Troubleshooting

### Common Issues

1. **QR Code not scanning:**
   - Clear browser cache
   - Restart the bot
   - Check internet connection

2. **Commands not working:**
   - Ensure bot is group admin
   - Verify sender is group admin
   - Check command format (!command)

3. **Database errors:**
   - Run `npm run init-db`
   - Check file permissions
   - Verify SQLite installation

4. **Automation not working:**
   - Check timezone settings
   - Verify cron job format
   - Ensure bot is admin in groups

### Logs
The bot provides detailed console logs for:
- Authentication status
- Command execution
- Error messages
- Automation triggers

## ��� Support

For issues or custom development:
- WhatsApp: [Your Contact Number]
- Features: Custom commands, integrations, modifications
- Pricing: Available for custom projects

## ��� License

MIT License - Feel free to modify and distribute.

## ��� Updates

Current Version: 1.0.0

### Recent Updates
- Complete automation system
- Private assistant integration
- Enhanced fine tracking
- Improved admin controls
- Better error handling

---

**Note**: This bot requires WhatsApp Web access and may be affected by WhatsApp policy changes. Use responsibly and ensure compliance with WhatsApp Terms of Service.
