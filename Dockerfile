FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD [ "/bin/sh", "-c", "npm run start:prod && npm run seed:run" ]