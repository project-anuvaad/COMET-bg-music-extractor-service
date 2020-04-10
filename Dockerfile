FROM hassanamin994/node_ffmpeg_spleeter:1

WORKDIR /bg-music-extractor-service

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "docker:prod"]