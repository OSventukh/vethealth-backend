FROM node:22

WORKDIR /app

COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN if [ "$NODE_ENV" = "development" ]; \
  then npm install; \
  else npm ci --only=production; \
  fi

COPY . .

CMD if [ "$NODE_ENV" = "development" ]; \
  then npm run start:dev; \
  else npm run start; \
  fi