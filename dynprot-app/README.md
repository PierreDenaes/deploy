# DynProt App - Instructions d'utilisation

## Description du projet

DynProt est une application mobile intelligente et cross-platform de suivi protéique, conçue pour vous aider à atteindre vos objectifs nutritionnels. Elle utilise l'IA pour analyser vos repas et vous fournir des informations précises sur votre apport en protéines.

## Pile technologique

Ce projet est construit avec les technologies suivantes :

- **React Native 0.76**
- **Expo SDK 52**
- **Node.js 20 LTS**
- **TypeScript 5.7**
- **PostgreSQL 15** (pour la base de données)
- **API OpenAI GPT-4o** (pour l'analyse intelligente des repas)
- **Vite** (pour le développement rapide)
- **shadcn-ui** (composants UI)
- **Tailwind CSS** (pour le stylisme)

Tous les composants shadcn/ui ont été téléchargés et sont disponibles sous `@/components/ui`.

## Structure des fichiers

- `index.html` - Point d'entrée HTML
- `vite.config.ts` - Fichier de configuration Vite
- `tailwind.config.js` - Fichier de configuration Tailwind CSS
- `package.json` - Dépendances et scripts NPM
- `src/App.tsx` - Composant racine de l'application
- `src/main.tsx` - Point d'entrée principal du projet
- `src/index.css` - Configuration CSS globale
- `src/components/ui/` - Composants shadcn/ui
- `src/pages/` - Pages de l'application (Dashboard, History, Profile, etc.)
- `src/context/` - Contextes React (AppContext, AuthContext)
- `src/services/` - Services d'API et de logique métier
- `src/utils/` - Fonctions utilitaires

## Composants

- Tous les composants shadcn/ui sont pré-téléchargés et disponibles dans `@/components/ui`.

## Stylisme

- Ajoutez des styles globaux à `src/index.css` ou créez de nouveaux fichiers CSS si nécessaire.
- Utilisez les classes Tailwind pour le stylisme des composants.

## Développement

- Importez les composants depuis `@/components/ui` dans vos composants React.
- Personnalisez l'interface utilisateur en modifiant la configuration Tailwind.

## Note

L'alias de chemin `@/` pointe vers le répertoire `src/`.

# Commandes

**Installer les dépendances**

```shell
pnpm i
```

**Démarrer l'application en mode développement**

```shell
pnpm run dev
```

**Construire l'application pour la production**

```shell
pnpm run build
```