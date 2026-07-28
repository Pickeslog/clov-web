# 빌드 스테이지 — Vite build까지만. node_modules는 최종 이미지에 안 남는다.
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

# .env.production 이 함께 복사돼야 한다. Vite build는 기본이 production 모드라
# 그 파일의 VITE_API_BASE_URL을 자동으로 굽는다. 빠지면 client.js의 개발 기본값
# (localhost:8080)이 박혀서 배포 후 API를 못 찾는다(#160). .dockerignore 주석 참고.
COPY . .
RUN npm run build

# 서빙 스테이지 — 정적 파일 + SPA fallback
FROM nginx:alpine
# 기본 설정에는 try_files fallback이 없어 /login·/rooms/24·/join/<code>가 전부 404다.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
