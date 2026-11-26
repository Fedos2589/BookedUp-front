FROM node:22.23.5-alpine AS build
WORKDIR /app
# TedUI is a github: dependency, npm needs git to fetch it
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# empty by default: Sentry and PostHog stay off unless the workflow passes them
ARG VITE_SENTRY_DSN=
ARG VITE_POSTHOG_KEY=
RUN npm run build

FROM caddy:2.11.9-alpine
# no Caddyfile here: the server mounts the back's one (deploy/)
COPY --from=build /app/dist /srv
