# Production image for the NestJS API. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t coffeecat-api .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @coffeecat/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @coffeecat/shared build && pnpm --filter @coffeecat/api build
# Self-contained folder with only production dependencies.
RUN pnpm --filter @coffeecat/api deploy --prod --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/drizzle ./drizzle
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/main.js"]
