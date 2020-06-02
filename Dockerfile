FROM node:12-alpine

LABEL name ""
LABEL version ""
LABEL maintainer ""

WORKDIR /usr/akairo-mongo-ts-template

COPY package.json pnpm-lock.yaml ./

RUN apk add --update \
&& apk add --no-cache ca-certificates \
&& apk add --no-cache --virtual .build-deps git curl build-base python g++ make \
&& curl -L https://unpkg.com/@pnpm/self-installer | node \
&& pnpm install \
&& apk del .build-deps

COPY . .

ENV OWNERS= \
	COLOR= \
	DISCORD_TOKEN= \
	MONGO= \
	PREFIX=

RUN pnpm run build
CMD ["node", "."]

