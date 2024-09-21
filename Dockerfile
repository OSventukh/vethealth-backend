FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm run seed:run

CMD [ "npm", "run", "start:prod" ]