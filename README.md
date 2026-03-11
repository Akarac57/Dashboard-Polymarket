# 📈 Polymarket Dashboard

Dashboard pour suivre les marchés de prédiction [Polymarket](https://polymarket.com) en temps réel.

## Fonctionnalités

- 🔍 Recherche parmi tous les marchés actifs
- 📊 Affichage des cotes Oui/Non en temps réel
- 🔄 Auto-refresh toutes les 30 secondes
- 📈 Indicateurs de variation de prix
- 🗂️ Badges par catégorie (Politics, Crypto, Sports...)

## Stack

- **React 18** + **Vite**
- **API Polymarket** (publique, sans clé)

## Installation

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173) dans ton navigateur.

## Déploiement

```bash
npm run build
```

Compatible avec Vercel, Netlify, GitHub Pages.

> ⚠️ L'API Polymarket peut bloquer les requêtes CORS selon les environnements. Un proxy peut être nécessaire en production.
