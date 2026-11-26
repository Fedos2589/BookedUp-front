FROM node:22.23.5-alpine AS build
WORKDIR /app
# TedUI is a github: dependency, npm needs git to fetch it
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# unset by default (not "="): an empty env var would mask a .env file's value.
# Sentry and PostHog stay off unless the workflow passes them.
ARG VITE_SENTRY_DSN
ARG VITE_POSTHOG_KEY
RUN npm run build

FROM caddy:2.11.9-alpine
# The caddy image's own OCI labels would describe this image as Caddy, and GHCR
# links a package to the repository in image.source. Every inherited key is
# overridden. The Release workflow passes the commit as REVISION.
ARG REVISION=local
LABEL org.opencontainers.image.source="https://github.com/Fedos2589/BookedUp-front" \
      org.opencontainers.image.url="https://github.com/Fedos2589/BookedUp-front" \
      org.opencontainers.image.documentation="https://github.com/Fedos2589/BookedUp-front" \
      org.opencontainers.image.title="bookedup-web" \
      org.opencontainers.image.description="BookedUp web app: the built SPA served by Caddy" \
      org.opencontainers.image.vendor="" \
      org.opencontainers.image.licenses="" \
      org.opencontainers.image.version="$REVISION" \
      org.opencontainers.image.revision="$REVISION"
# no Caddyfile here: the server mounts the back's one (deploy/)
COPY --from=build /app/dist /srv
