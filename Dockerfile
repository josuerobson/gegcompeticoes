# Estágio de Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instala todas as dependências (incluindo devDependencies)
COPY package*.json ./
RUN npm ci

# Copia o código-fonte e executa o build (compila frontend e backend)
COPY . .
RUN npm run build

# Estágio de Produção (Runner)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copia apenas os arquivos compilados do estágio de build
COPY --from=builder /app/dist ./dist

# Expõe a porta que o express usa (definida como 3000 no server.ts)
EXPOSE 3000

# Executa o servidor Express compilado
CMD ["node", "dist/server.cjs"]
