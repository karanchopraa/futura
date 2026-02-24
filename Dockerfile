FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY Backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY Backend/ ./

# Generate Prisma client
ENV DATABASE_URL="file:./dev.db"
ENV PORT=4000
RUN npx prisma generate

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Set the command to run the application
CMD ["npm", "start"]
