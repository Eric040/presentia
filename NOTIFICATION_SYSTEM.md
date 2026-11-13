# Système de Notifications - Presentia

## Vue d'ensemble

Le système de notifications de Presentia est maintenant **complètement opérationnel** avec :
- ✅ Backend automatisé (création, rappels, API)
- ✅ Interface frontend professionnelle avec icônes Lucide
- ✅ Page dédiée `/notifications` avec filtres et statistiques
- ✅ Bell dropdown dans le header avec badge de notifications non lues

## Architecture

### Backend

#### Service de Notifications
**Fichier:** `app/Services/NotificationService.php`

Méthodes disponibles :
- `sendResumeReminder($employee, $date)` - Rappel de reprise à 14h30
- `notifyAnomalyCreated($anomaly)` - Nouvelle anomalie créée
- `notifyAnomalyPending($anomaly)` - Anomalie en attente de traitement
- `notifyAnomalyProcessed($anomaly, $status)` - Anomalie traitée (approuvée/rejetée)

#### Commande Scheduler
**Fichier:** `app/Console/Commands/SendResumeReminders.php`
**Schedule:** Tous les jours à 14h30 (configuré dans `app/Console/Kernel.php`)

```bash
# Test manuel
php artisan attendance:send-resume-reminders
```

#### API Controller
**Fichier:** `app/Http/Controllers/NotificationController.php`

Routes disponibles :
```php
GET    /api/notifications              // Liste pour le bell (50 dernières)
GET    /notifications                  // Page dédiée avec pagination
PATCH  /notifications/{id}/read        // Marquer comme lue
PATCH  /notifications/mark-all-read    // Tout marquer lu
DELETE /notifications/{id}             // Supprimer
```

#### Intégration automatique
Les notifications sont créées automatiquement dans :
- `AttendanceController::store()` - Anomalies d'absence et retard
- `AnomalyController::update()` - Changement statut anomalie
- Commande scheduler - Rappels de reprise à 14h30

### Frontend

#### Composant Bell (Header)
**Fichier:** `resources/js/components/notifications-bell.tsx`

Fonctionnalités :
- Badge avec nombre de notifications non lues (max "9+")
- Dropdown affichant les 5 dernières notifications
- Icônes professionnelles Lucide (Clock, AlertTriangle, Bell, CheckCircle2)
- Actions : marquer lu, supprimer, accéder à l'action
- Bouton "Voir tout" redirigeant vers `/notifications`
- Rafraîchissement auto toutes les 30 secondes

#### Page Dédiée
**Fichier:** `resources/js/pages/notifications/index.tsx`

Fonctionnalités :
- Statistiques en cartes (Total, Non lues)
- Filtres : Toutes / Non lues / Lues
- Liste paginée (20 par page)
- Actions par notification : Voir détail, Marquer lu, Supprimer
- Action globale : Tout marquer lu
- Design responsive avec hover states

## Design System

### Icônes et Couleurs

| Type                  | Icône           | Couleur     | Background  |
|-----------------------|-----------------|-------------|-------------|
| `resume_reminder`     | Clock           | blue-600    | blue-50     |
| `anomaly_created`     | AlertTriangle   | orange-600  | orange-50   |
| `anomaly_pending`     | Bell            | purple-600  | purple-50   |
| `anomaly_processed`   | CheckCircle2    | green-600   | green-50    |

### Buttons Hover States
- **Marquer lu** : `hover:bg-primary/10 hover:text-primary`
- **Supprimer** : `hover:bg-destructive/10 hover:text-destructive`
- **Action principale** : `hover:bg-primary hover:text-primary-foreground`

### Affichage du temps
Format relatif intelligent :
- < 1 min : "À l'instant"
- < 1h : "Il y a X min"
- < 24h : "Il y a Xh"
- 1 jour : "Hier"
- < 7 jours : "Il y a Xj"
- Plus : "12 janv." (format court)

## Modèle de Données

**Table:** `internal_notifications`

```php
[
    'id'           => int,
    'recipient_id' => int,              // foreign key users.id
    'type'         => string,           // resume_reminder, anomaly_created, etc.
    'minimal_content' => string,        // Texte principal
    'data'         => json,             // { action_url, action_label, anomaly_id, date }
    'read_at'      => timestamp|null,
    'created_at'   => timestamp,
    'updated_at'   => timestamp,
]
```

## Utilisation

### Créer une notification manuelle

```php
use App\Services\NotificationService;

$service = new NotificationService();

// Rappel de reprise
$service->sendResumeReminder($employee, '2024-01-15');

// Anomalie créée
$service->notifyAnomalyCreated($anomaly);

// Anomalie en attente
$service->notifyAnomalyPending($anomaly);

// Anomalie traitée
$service->notifyAnomalyProcessed($anomaly, 'approved'); // ou 'rejected'
```

### Tester le système

1. **Créer une absence** (pointage après 8h30)
   ```bash
   # Via l'interface : pointer à 17h34
   # Résultat : notification "anomaly_created" créée
   ```

2. **Tester le rappel de reprise**
   ```bash
   php artisan attendance:send-resume-reminders
   # Résultat : notifications "resume_reminder" pour employés sans reprise à 14h30
   ```

3. **Traiter une anomalie**
   ```bash
   # Via l'interface : approuver/rejeter une justification
   # Résultat : notification "anomaly_processed" créée
   ```

4. **Vérifier l'interface**
   - Ouvrir le dropdown bell dans le header
   - Cliquer sur "Voir tout" pour accéder à `/notifications`
   - Tester les filtres et actions

## Build

```bash
cd presentia-app
npm run build
```

Build réussi : **18.79s** (dernier build)

## État du Système

✅ **Backend**
- NotificationService opérationnel
- Commande scheduler configurée (14h30)
- API Controller avec 5 endpoints
- Intégration automatique dans AttendanceController et AnomalyController

✅ **Frontend**
- Bell component avec icônes professionnelles Lucide
- Page `/notifications` complète avec filtres et stats
- Design system cohérent (couleurs, hover states)
- Formatage temps relatif en français
- Build compilé et prêt

✅ **Database**
- Table `internal_notifications` créée
- Migrations exécutées
- Modèle `InternalNotification` avec relations

## Notes Techniques

### Sécurité
- CSRF token inclus dans toutes les requêtes PATCH/DELETE
- Vérification `recipient_id === Auth::id()` dans le controller
- Policy d'autorisation respectée

### Performance
- Pagination côté serveur (20 items par page)
- Index sur `recipient_id` et `read_at` dans la table
- Rafraîchissement optimisé (30s pour le bell, on-demand pour la page)

### Accessibilité
- Badges avec contraste suffisant
- Buttons avec états hover/focus
- Lecteur d'écran compatible (aria-labels implicites via Lucide icons)

---

**Dernière mise à jour:** $(Get-Date -Format "yyyy-MM-dd HH:mm")
**Version:** 1.0.0 - Production Ready ✅
