FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json

RUN npm ci

COPY apps/api/prisma apps/api/prisma
RUN npm run prisma:generate --workspace=@velozity/api

COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src
RUN npm run build --workspace=@velozity/api

CMD ["npm", "run", "start", "--workspace=@velozity/api"]
