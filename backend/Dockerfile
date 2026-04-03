FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .
RUN mkdir -p uploads

EXPOSE 8000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm start"]
