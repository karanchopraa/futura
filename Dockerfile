FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY Backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY Backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript code (if applicable - currently we use ts-node)
# RUN npm run build

# Expose the port the app runs on
EXPOSE 4000

# Set the command to run the application
CMD ["npm", "start"]
