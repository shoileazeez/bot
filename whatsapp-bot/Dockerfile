# 1️⃣ Use an official lightweight Node.js image
FROM node:18-alpine

# 2️⃣ Create working directory inside container
WORKDIR /app

# 3️⃣ Copy dependency files first (for layer caching)
COPY package*.json ./

# 4️⃣ Install dependencies
RUN npm install --production

# 5️⃣ Copy the rest of the app
COPY . .

# 6️⃣ Set environment variable (optional)
ENV NODE_ENV=production

# 7️⃣ Expose a port (only if you have a web server)
# EXPOSE 3000

# 8️⃣ Start the bot
CMD ["npm", "start"]
