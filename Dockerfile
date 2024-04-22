FROM node:18.17-alpine

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN npm i -g npm@latest
RUN npm ci
RUN npm run build

EXPOSE 5555
CMD ["npm", "start"]