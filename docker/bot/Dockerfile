FROM node:12-alpine

LABEL name "bot"

WORKDIR /usr/src/imgdl-bot/bot

COPY packages/bot/package.json packages/bot/pnpm-lock.yaml packages/bot/tsconfig.json ./

RUN apk add --update 
RUN apk add --no-cache ca-certificates 
RUN apk add --no-cache --virtual .build-deps git curl build-base python g++ make 
RUN curl -L https://unpkg.com/@pnpm/self-installer | node 
RUN pnpm i --frozen-lockfile 
RUN pnpm config set store-dir ~/.pnpm-store
RUN apk del .build-deps

COPY packages/bot/. .

RUN pnpm run build \
&& pnpm prune --prod

CMD ["node", "."]

