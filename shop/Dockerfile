FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/shop.db
WORKDIR /app
# Zero npm dependencies, so there is nothing to install.
COPY package.json store.config.json server.js ./
COPY lib ./lib
COPY public ./public
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "--no-warnings", "server.js"]
