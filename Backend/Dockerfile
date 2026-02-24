FROM node:20-alpine

WORKDIR /app

# Install python and build tools for Prisma/bcrypt native dependencies if needed
RUN apk add --no-cache python3 make g++ 

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
