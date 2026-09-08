FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Replaced npm ci with npm install
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
