#!/bin/bash

# Digital Ocean / Ubuntu Server Setup Script for WhatsApp Bot
# Run this script with: bash setup-server.sh

echo "🚀 Setting up WhatsApp Bot on Ubuntu Server..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (LTS version)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required system dependencies for Puppeteer/Chrome
echo "📦 Installing Chrome dependencies..."
sudo apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    libgbm-dev \
    libxshmfence1

# Install Google Chrome (stable)
echo "📦 Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create systemd service for auto-start
echo "⚙️ Setting up systemd service..."
sudo tee /etc/systemd/system/whatsapp-bot.service > /dev/null <<EOF
[Unit]
Description=WhatsApp Group Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/bot/whatsapp-bot
Environment=NODE_ENV=production
Environment=CHROME_PATH=/usr/bin/google-chrome-stable
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bot.service

echo "✅ Server setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Navigate to your bot directory: cd /root/bot/whatsapp-bot"
echo "2. Install bot dependencies: npm install"
echo "3. Configure your .env file"
echo "4. Start the bot: sudo systemctl start whatsapp-bot"
echo "5. Check status: sudo systemctl status whatsapp-bot"
echo "6. View logs: sudo journalctl -u whatsapp-bot -f"
echo ""
echo "🌐 Chrome installed at: /usr/bin/google-chrome-stable"
echo "📱 Bot will use this Chrome installation"
