FROM node:14.16.0-alpine

WORKDIR /screener
RUN apk update && apk --no-cache add git yarn g++ make
COPY ../. .

RUN yarn

EXPOSE 3050

CMD yarn start
