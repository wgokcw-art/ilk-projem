FROM node:20-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install

# Tüm proje dosyalarını aktar
COPY . .

# Next.js geliştirme sunucusunu dışarıya aç
EXPOSE 3000

CMD ["npm", "run", "dev"]