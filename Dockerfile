FROM node:14.16.0-alpine

WORKDIR /screener
RUN apk update && apk --no-cache add yarn imagemagick-dev imagemagick librsvg-dev libmount ttf-opensans fontconfig

COPY . .

RUN yarn

EXPOSE 3050
CMD yarn start:prod
