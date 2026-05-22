FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY ["Brand Assets", "./Brand Assets"]

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
