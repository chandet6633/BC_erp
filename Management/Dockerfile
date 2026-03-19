# Build Stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json && npm install
COPY . .
RUN npm run build

# Production Stage
FROM alpine:latest
RUN apk add --no-cache ca-certificates unzip wget

# Install PocketBase
ENV PB_VERSION=0.25.0
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /usr/local/bin/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

WORKDIR /pb
COPY --from=build /app/pb_public ./pb_public

EXPOSE 8092
CMD ["pocketbase", "serve", "--http=0.0.0.0:8092", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public"]
