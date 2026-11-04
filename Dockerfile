# Demo web integrada: frontend Vite + API Express no mesmo serviço.
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
ENV MODO_DEMO=true
ENV PORT=10000
EXPOSE 10000
CMD ["npm", "run", "start"]
