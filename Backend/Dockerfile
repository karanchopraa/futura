FROM node:20-bookworm-slim

WORKDIR /app

# Install openssl for Prisma query engine
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript to JavaScript
RUN npm run build

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

# Start the application pointing to the compiled JS in dist/
CMD ["npm", "run", "start"]
