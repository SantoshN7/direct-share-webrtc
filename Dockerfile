# Stage 1: Build the Vue.js application
FROM node:20 AS direct-share-client-builder

WORKDIR /app/direct-share-client

# Copy Vue.js app files
COPY ./direct-share-client/package.json ./direct-share-client/package-lock.json ./
RUN npm install

COPY ./direct-share-client .
RUN npm run build

# Stage 2: Set up the Express server
FROM node:20 AS direct-share-server

WORKDIR /app/direct-share-server

# Copy Express app files
COPY ./direct-share-server/package.json ./direct-share-server/package-lock.json ./
RUN npm install

COPY ./direct-share-server .
RUN npm run build

# Copy built Vue.js files from the direct-share-client stage
COPY --from=direct-share-client-builder /app/direct-share-client/dist ./dist/client

# Expose the port for the Express server
EXPOSE 3000

# Start the Express server
CMD ["node", "dist/server.js"]
