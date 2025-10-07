# Digital Ocean Deployment Guide

## Quick Setup Commands

Run these commands on your Digital Ocean droplet:

### 1. Run the setup script
```bash
# Make the script executable
chmod +x setup-server.sh

# Run the setup script
bash setup-server.sh
```

### 2. Install bot dependencies
```bash
cd /root/bot/whatsapp-bot
npm install
```

### 3. Configure environment
```bash
# Edit the .env file with your settings
nano .env
```

### 4. Create logs directory
```bash
mkdir -p logs
```

## Starting the Bot

### Option 1: Using systemd service (Recommended)
```bash
# Start the service
sudo systemctl start whatsapp-bot

# Check status
sudo systemctl status whatsapp-bot

# View logs
sudo journalctl -u whatsapp-bot -f

# Stop the service
sudo systemctl stop whatsapp-bot
```

### Option 2: Using PM2
```bash
# Start with PM2
pm2 start ecosystem.config.json

# Check status
pm2 status

# View logs
pm2 logs whatsapp-bot

# Stop
pm2 stop whatsapp-bot

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Direct run (for testing)
```bash
# Set Chrome path for current session
export CHROME_PATH=/usr/bin/google-chrome-stable

# Run the bot
npm start
```

## Troubleshooting

### Check Chrome installation
```bash
/usr/bin/google-chrome-stable --version
```

### Check dependencies
```bash
ldd /usr/bin/google-chrome-stable | grep "not found"
```

### Monitor logs
```bash
# Systemd logs
sudo journalctl -u whatsapp-bot -f

# PM2 logs
pm2 logs whatsapp-bot --lines 100

# Direct log files
tail -f logs/bot.log
```

### Common Issues

1. **Chrome not found**: Ensure Chrome is installed at `/usr/bin/google-chrome-stable`
2. **Permission denied**: Run with `sudo` or check file permissions
3. **Memory issues**: Consider upgrading your droplet or reducing Chrome flags
4. **Auth issues**: Make sure to scan QR code when prompted

## Auto-restart on reboot

The systemd service is configured to start automatically on boot. If using PM2:

```bash
pm2 startup
pm2 save
```

## Security Notes

- Bot runs as root (change user in systemd service if needed)
- Firewall should allow outbound HTTPS (443) for WhatsApp
- Consider setting up SSH key authentication
- Regular backups of bot.db database recommended
