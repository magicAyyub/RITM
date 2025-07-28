# Refactoring - Weekly Patterns Component

## Résumé des changements

### Problème initial
- Duplication de logique entre `weekly_patterns` et `weekly_patterns_in_app`
- Deux endpoints séparés dans le backend
- Deux sections dupliquées dans le frontend
- Code difficile à maintenir et peu évolutif

### Solution implémentée

#### 1. Backend - API unifiée
- **Fichier modifié**: `/backend/src/app/api/v1/endpoints/operators.py`
- **Changement**: Fusion des endpoints en un seul `/weekly-patterns` avec paramètre `in_app_only`
- **Suppression**: Endpoint `/weekly-patterns-in-app` 

#### 2. SQL optimisé
- **Fichier modifié**: `/backend/src/app/sql/weekly-patterns.sql`
- **Changement**: Ajout d'une condition dynamique basée sur le paramètre
- **Suppression**: `/backend/src/app/sql/weekly-patterns-in-app.sql`

#### 3. Hook custom pour la logique métier
- **Nouveau fichier**: `/frontend/src/hooks/useWeeklyPatterns.ts`
- **Fonctionnalités**:
  - Gestion centralisée des états
  - Fonctions utilitaires pour formater les données
  - Logique de fetch optimisée

#### 4. Composant réutilisable
- **Nouveau fichier**: `/frontend/src/components/charts/WeeklyPatternsChart.tsx`
- **Fonctionnalités**:
  - Toggle élégant entre "Toutes les connexions" et "IN App uniquement"
  - Export dynamique selon le mode sélectionné
  - Interface unifiée et cohérente

#### 5. Frontend simplifié
- **Fichier modifié**: `/frontend/src/app/page.tsx`
- **Changements**:
  - Suppression des duplications de code
  - Utilisation du nouveau composant
  - État simplifié (suppression de `weekly_patterns` et `weekly_patterns_in_app`)

## Avantages de la nouvelle approche

### 🚀 Performance
- Réduction du nombre d'appels API (logique centralisée dans le hook)
- Chargement optimisé des données

### 🧹 Maintenabilité
- Code plus DRY (Don't Repeat Yourself)
- Logique centralisée dans des composants réutilisables
- Séparation claire des responsabilités

### 🎨 UX améliorée
- Interface plus intuitive avec toggle
- Transition fluide entre les modes
- Export adaptatif selon le contexte

### 🔧 Évolutivité
- Facile d'ajouter de nouveaux filtres
- Composant réutilisable pour d'autres sections
- Architecture modulaire

## Usage

```tsx
import { WeeklyPatternsChart } from '@/components/charts/WeeklyPatternsChart'

function Dashboard() {
  const [showInAppOnly, setShowInAppOnly] = useState(false)
  
  return (
    <WeeklyPatternsChart 
      showInAppOnly={showInAppOnly}
      onModeChange={setShowInAppOnly}
    />
  )
}
```

## API Backend

```typescript
GET /api/v1/operators/weekly-patterns?in_app_only=false  // Toutes les connexions
GET /api/v1/operators/weekly-patterns?in_app_only=true   // IN App uniquement
```

## Prochaines étapes possibles

1. **Généralisation**: Appliquer le même pattern à d'autres sections dupliquées
2. **Filtres avancés**: Ajouter d'autres critères de filtrage (dates, opérateurs, etc.)
3. **Tests**: Ajouter des tests unitaires pour le hook et le composant
4. **Performance**: Implémenter la mise en cache des données
