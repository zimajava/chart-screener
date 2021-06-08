FROM zenika/alpine-chrome:89-with-puppeteer
WORKDIR /screener
RUN apk update && apk --no-cache add git yarn g++ make
COPY ../. .
RUN yarn

EXPOSE 3050
CMD yarn start
