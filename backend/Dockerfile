# deps — installs all npm packages compiled for glibc/Debian
FROM mcr.microsoft.com/playwright:v1.59.1-noble AS deps
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install

# dev — source is mounted via docker-compose volume, node_modules from deps
FROM deps AS dev
CMD ["npm", "start"]

# build — compiles TypeScript to dist/
FROM deps AS build
COPY . .
RUN npx tsc --outDir dist

# prod — compiled output + prod-only dependencies
FROM mcr.microsoft.com/playwright:v1.59.1-noble AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN rm -f package-lock.json && npm install --omit=dev
CMD ["node", "dist/main.js"]
