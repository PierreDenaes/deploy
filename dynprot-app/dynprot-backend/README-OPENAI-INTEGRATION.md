# 🤖 Intégration OpenAI et Vision API

Ce document décrit l'intégration complète d'OpenAI GPT-4o et Vision API dans l'application DynProt.

## 🚀 Fonctionnalités Implémentées

### ✅ Analyse de Texte (GPT-4o)
- **Endpoint**: `POST /api/meals/analyze`
- **Modèle**: GPT-4o
- **Fonctionnalités**:
  - Analyse nutritionnelle des descriptions de repas
  - Estimation des protéines, calories, glucides, lipides, fibres
  - Détection automatique des aliments
  - Scoring de confiance
  - Suggestions d'amélioration

### ✅ Analyse d'Images (Vision API)
- **Endpoint**: `POST /api/meals/analyze` (avec photo_data)
- **Modèle**: GPT-4o Vision
- **Fonctionnalités**:
  - Reconnaissance visuelle des aliments
  - Estimation des portions par analyse visuelle
  - Scoring de qualité d'image
  - Détection des éléments avec coordonnées
  - Fallback automatique vers analyse texte

### ✅ Stockage d'Images (Cloudinary)
- **Service**: Cloudinary CDN
- **Endpoints**: `/api/upload/*`
- **Fonctionnalités**:
  - Upload sécurisé d'images
  - Génération automatique de miniatures
  - Optimisation et compression
  - URLs signées pour sécurité
  - Suppression automatique

## 🔧 Configuration

### Variables d'Environnement Requises

```bash
# OpenAI
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o"
OPENAI_VISION_MODEL="gpt-4o"
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.3

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# AI Configuration
AI_CONFIDENCE_THRESHOLD=0.7
AI_MAX_RETRIES=2
AI_TIMEOUT_MS=30000
```

### Installation des Dépendances

```bash
cd dynprot-backend
npm install openai cloudinary
```

## 📋 Architecture

### Services Principaux

1. **AIService** (`/src/services/ai.service.ts`)
   - Intégration OpenAI GPT-4o et Vision
   - Gestion des retry et timeouts
   - Scoring de confiance automatique
   - Fallback intelligent

2. **ImageService** (`/src/config/cloudinary.ts`)
   - Upload et stockage Cloudinary
   - Optimisation automatique
   - Génération de miniatures
   - Gestion des URLs sécurisées

3. **UploadController** (`/src/controllers/upload.controller.ts`)
   - Endpoints d'upload sécurisés
   - Validation des fichiers
   - Rate limiting

### Rate Limiting

- **Analyse IA**: 10 requêtes/minute
- **Analyse Vision**: 5 requêtes/minute (plus coûteuse)
- **Upload Images**: 20 uploads/5 minutes
- **Protection automatique**: Skip en développement

## 🔄 Flux d'Analyse

### 1. Analyse Texte Simple
```
Description → GPT-4o → Résultat Nutritionnel
```

### 2. Analyse Image Complète
```
Image → Upload Cloudinary → Vision API → Résultat + Qualité
```

### 3. Analyse Hybride (Recommandée)
```
Description + Image → Vision API (avec contexte) → Résultat Optimal
```

### 4. Fallback Automatique
```
Échec Vision → Analyse Texte → Résultat + Flag "Manual Review"
```

## 📊 Scoring et Qualité

### Niveaux de Confiance
- **High** (≥ 0.8): Résultat fiable, utilisation directe
- **Medium** (0.6-0.8): Bon résultat, vérification recommandée  
- **Low** (< 0.6): Révision manuelle requise

### Qualité d'Image
- **Excellent**: Image claire, bonne lumière, aliments identifiables
- **Good**: Image correcte, analyse possible
- **Fair**: Image acceptable, confiance réduite
- **Poor**: Image de mauvaise qualité, fallback vers texte

## 🛡️ Sécurité et Performance

### Validation et Sécurité
- Validation des types de fichiers (JPG, PNG, WebP)
- Limite de taille: 5MB maximum
- Validation du contenu (détection de nourriture)
- URLs signées Cloudinary
- Rate limiting par utilisateur

### Optimisation Performance
- Compression automatique des images
- Miniatures générées automatiquement
- Cache CDN Cloudinary
- Retry intelligent avec backoff exponentiel
- Timeout configurable (30s par défaut)

### Monitoring et Logs
- Logs détaillés de chaque analyse
- Tracking du temps de traitement
- Statistiques de confiance
- Monitoring des erreurs

## 🧪 Testing

### Test Manuel API

```bash
# Test analyse texte
curl -X POST http://localhost:3001/api/meals/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input_text": "100g de poulet grillé avec du riz",
    "input_type": "text"
  }'

# Test upload image
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@photo_repas.jpg"
```

### Frontend Integration

```typescript
import { AnalysisService } from './services/api.analysis';
import { UploadService } from './services/api.upload';

// Analyse complète avec image
const result = await AnalysisService.analyzeCompleteMeal(
  "Salade de quinoa aux légumes",
  imageUrl
);

// Upload et analyse
const uploadResult = await UploadService.uploadImageFile(file);
const analysis = await AnalysisService.analyzeImageMeal(
  uploadResult.url,
  "Description optionnelle"
);
```

## 📈 Métriques et KPIs

### Métriques Techniques
- Temps de réponse moyen: < 3s (texte), < 8s (vision)
- Taux de succès: > 95%
- Confiance moyenne: > 0.8
- Utilisation tokens OpenAI

### Métriques Business
- Analyses par utilisateur/jour
- Taux d'adoption des suggestions IA
- Précision des estimations (feedback utilisateur)
- Conversion manuel → automatique

## 🚨 Troubleshooting

### Erreurs Communes

1. **"OpenAI API key not configured"**
   - Vérifier la variable `OPENAI_API_KEY`
   - Redémarrer le serveur après modification

2. **"Rate limit exceeded"**
   - Attendre la fin de la fenêtre de limitation
   - Ajuster les limites en développement

3. **"Image ne contient pas de nourriture"**
   - Validation automatique échouée
   - Fallback vers analyse texte activé

4. **"Cloudinary upload failed"**
   - Vérifier les credentials Cloudinary
   - Vérifier la taille/format du fichier

### Debug Mode

```bash
# Activer les logs détaillés
NODE_ENV=development npm run dev

# Bypass rate limiting
AI_RATE_LIMIT_BYPASS=true npm run dev
```

## 🔮 Évolutions Futures

### À Court Terme
- [ ] Cache des analyses fréquentes
- [ ] Batch processing pour plusieurs images
- [ ] Analytics détaillées utilisateur

### À Moyen Terme
- [ ] Fine-tuning modèle personnalisé
- [ ] Recognition de plats spécifiques français
- [ ] Intégration nutritionnelle CIQUAL

### À Long Terme
- [ ] IA prédictive des préférences
- [ ] Recommandations personnalisées
- [ ] Détection automatique des allergènes

## 📞 Support

- **Issues techniques**: Voir les logs dans `/var/log/dynprot/`
- **Performance**: Monitorer avec `/api/health`
- **Coûts OpenAI**: Dashboard OpenAI Usage
- **Stockage**: Dashboard Cloudinary

---

**🎯 L'intégration OpenAI transforme DynProt en un assistant nutritionnel intelligent, capable d'analyser automatiquement les repas avec une précision élevée tout en conservant la flexibilité de correction manuelle.**