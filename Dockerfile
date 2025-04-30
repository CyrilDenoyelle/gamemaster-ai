# Utiliser une image Node.js officielle comme base
FROM node:18

# Créer le répertoire de l'application
WORKDIR /app

# Copier uniquement les fichiers de configuration nécessaires
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Installer les dépendances
RUN npm install

# Compiler TypeScript
RUN npm run build

# Exposer le port
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["npm", "run", "start"] 
