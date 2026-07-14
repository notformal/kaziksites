FROM node:24-alpine AS build
WORKDIR /workspace
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GAME_ORIGIN
ENV VITE_GAME_ORIGIN=$VITE_GAME_ORIGIN
COPY package.json package-lock.json ./
COPY apps/lobby/package.json apps/lobby/package.json
COPY apps/api/package.json apps/api/package.json
COPY games/slots-classic/package.json games/slots-classic/package.json
COPY games/slots-studio/package.json games/slots-studio/package.json
COPY games/crash/package.json games/crash/package.json
COPY games/plinko/package.json games/plinko/package.json
COPY games/roulette/package.json games/roulette/package.json
COPY games/keno/package.json games/keno/package.json
COPY packages/game-sdk/package.json packages/game-sdk/package.json
RUN npm ci
COPY apps/lobby apps/lobby
COPY games games
COPY packages packages
RUN npm run build

FROM nginx:1.29-alpine
COPY infra/nginx/lobby.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/lobby/dist /usr/share/nginx/html
COPY --from=build /workspace/games/slots-classic/dist /usr/share/nginx/html/games/slots-classic
COPY --from=build /workspace/games/slots-studio/dist /usr/share/nginx/html/games/slots-studio
COPY --from=build /workspace/games/crash/dist /usr/share/nginx/html/games/crash
COPY --from=build /workspace/games/plinko/dist /usr/share/nginx/html/games/plinko
COPY --from=build /workspace/games/roulette/dist /usr/share/nginx/html/games/roulette
COPY --from=build /workspace/games/keno/dist /usr/share/nginx/html/games/keno
RUN chown -R nginx:nginx /usr/share/nginx/html \
 && find /usr/share/nginx/html -type d -exec chmod 755 {} \; \
 && find /usr/share/nginx/html -type f -exec chmod 644 {} \;
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
