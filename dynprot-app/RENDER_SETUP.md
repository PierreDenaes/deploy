# 🚀 Configuration Render pour DynProt

Ce guide vous aide à configurer les variables d'environnement nécessaires dans votre dashboard Render.

## 📋 Variables d'environnement requises

### 🔐 Authentification JWT
Ces variables sont **critiques** pour la sécurité. Générez des chaînes aléatoirement sécurisées :

```bash
JWT_SECRET=your-64-character-random-string-here
JWT_REFRESH_SECRET=your-different-64-character-random-string-here
```

**Générateur en ligne :** https://generate-secret.vercel.app/64

### 🤖 OpenAI API
Obtenez votre clé API depuis : https://platform.openai.com/api-keys

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### ☁️ Cloudinary (Upload d'images)
Obtenez ces valeurs depuis votre dashboard Cloudinary :

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 🗄️ Base de données
Cette variable est automatiquement configurée par Render :

```bash
DATABASE_URL=postgresql://... (auto-configuré par Render)
```

## ⚙️ Configuration dans Render

### 1. Backend (dynprot-backend)
Dans votre service backend Render :

1. Allez dans **Environment** 
2. Ajoutez chaque variable avec sa valeur
3. Marquez les secrets comme **Secret** (JWT_SECRET, JWT_REFRESH_SECRET, OPENAI_API_KEY, CLOUDINARY_API_SECRET)
4. Cliquez **Save Changes**

### 2. Frontend (dynprot-frontend)
Les variables frontend sont déjà configurées dans `render.yaml` :

```bash
VITE_API_URL=https://dynprot-backend.onrender.com/api
```

## 🔍 Vérification

### Option 1 : Script de diagnostic
Depuis votre machine locale avec les bonnes variables :

```bash
cd dynprot-app/dynprot-backend
node scripts/check-env.js
```

### Option 2 : Logs Render
Dans les logs de votre service backend, vérifiez :

```
✅ Database connected successfully
🚀 Server is running on port 10000
```

Si vous voyez des warnings JWT, ajoutez les variables manquantes.

## 🐛 Résolution des problèmes

### Erreur 500 sur l'inscription
- ✅ Vérifiez que JWT_SECRET et JWT_REFRESH_SECRET sont configurés
- ✅ Vérifiez que DATABASE_URL est connecté
- ✅ Consultez les logs backend pour les détails

### 404 au rafraîchissement de page
- ✅ Vérifiez que le fichier `_redirects` est présent dans `/public`
- ✅ Redéployez le frontend après modification

### Base de données inaccessible
- ✅ Vérifiez que la base de données Render est en cours d'exécution
- ✅ Vérifiez la connexion dans l'onglet Database de Render
- ✅ Relancez le service backend si nécessaire

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Render pour des erreurs spécifiques
2. Exécutez le script de diagnostic
3. Assurez-vous que toutes les variables requises sont configurées
4. Redéployez les services après modification des variables

---

💡 **Astuce :** Gardez vos secrets JWT en sécurité et ne les partagez jamais !