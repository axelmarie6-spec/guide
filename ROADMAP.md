# Roadmap — Travel Hub & Oracle

Développement solo. Stack : React 18 + Vite + Tailwind CSS v4 + Supabase + Vercel.

Légende : ✅ Terminé · 🔄 Partiel · ⬜ À faire

---

## Phase 0 — Setup & Infrastructure ✅
**Terminé**

- ✅ Projet Vite + React 18
- ✅ Tailwind CSS v4
- ✅ vite-plugin-pwa + Workbox (Service Worker, précache, CacheFirst Storage)
- ✅ Supabase (Auth, BDD, Storage)
- ✅ Repo GitHub + déploiement Vercel automatique
- ✅ Variables d'environnement `.env.local` / `.env.example`

---

## Phase 1 — Authentification & Onboarding ✅
**Terminé**

- ✅ Table `profiles` (pseudo, rôle, champs profil obligatoires)
- ✅ Auth Supabase email/mot de passe
- ✅ Page Login
- ✅ Système d'invitation par token (`/invite/:token`) — token usage unique
- ✅ Page Register depuis lien d'invitation
- ✅ Onboarding bloquant : Profil verrouille l'app si champs obligatoires manquants
  - Contact d'urgence, numéro de passeport, CEAM
- ✅ Routes protégées (`ProtectedRoute`, `AuthRoute`, `GuestRoute`, `AdminRoute`)
- ✅ Bottom Bar 5 onglets + onglet Admin conditionnel (admin seulement)

---

## Phase 2 — Voyage & Coffre-Fort ✅
**Terminé — architecture scindée en deux onglets**

### Onglet "Voyage" (trains + airbnbs + urgences)
- ✅ Table `trains` : 10 tronçons (leg_order, date, gare départ/arrivée, horaires, quai, notes)
- ✅ Table `airbnbs` : adresse, code entrée, instructions, horaires
- ✅ TrainCards avec upload PDF inline (billets par tronçon)
- ✅ Liens vers plans de gare (STATION_MAP)
- ✅ Section Airbnb avec mode édition admin (toutes les propriétés éditables in-app)
- ✅ Section Urgences : numéros locaux BE/NL/DE/CZ/HU/AT/CH + ambassades françaises
- ✅ PDFs accessibles offline via fetch → blob URL (intercepté par le Service Worker)
- ✅ Précachage automatique de tous les PDFs au chargement de la page

### Onglet "Coffre-Fort" (documents PDF uniquement)
- ✅ Table `ticket_pdfs` (leg_order, label, storage_path)
- ✅ Bucket Supabase Storage `tickets` (privé, RLS auth)
- ✅ Upload admin par tronçon ou "Document général" (leg_order = 0)
- ✅ Suppression admin avec confirmation
- ✅ Ouverture offline via fetch → blob URL

---

## Phase 3 — Explorer : Activités & Votes ✅
**Terminé**

### Base de données
- ✅ Tables `activities`, `votes`, `day_config` avec RLS complet
- ✅ ~40 activités seed sur les 7 villes
- ✅ Bucket Supabase Storage `activities` (public, photos optionnelles)
- ✅ Contrainte CHECK sur `category` supprimée → catégories libres

### Interface de vote
- ✅ Deck de cartes swipeable (touch + boutons)
  - → droite = Match, ↓ bas = Snooze, ← gauche = Trash
  - Tint visuel coloré pendant le swipe (vert/orange/rouge)
  - Stack de cartes animé (aperçu des 2 cartes suivantes)
- ✅ Confirmation 2 étapes pour Trash
- ✅ 3 boutons d'action sous la carte (🗑️ ⏱️ ✅)
- ✅ Sélecteur de ville avec nuits prévues (`Bruxelles · 2n`)
- ✅ Rappel "1 vote par jour · X nuits prévues"

### Logique de consensus
- ✅ Seuil dynamique : `ceil(n_inscrits / 2)` — fetché depuis `profiles`
- ✅ Résultats affichés automatiquement quand tous les membres ont voté
- ✅ Vue "Résultats" avec activités validées triées par score
- ✅ Deuxième Tour si validées > plafond (sélection manuelle des X meilleures)
- ✅ Admin : ouvrir les votes + fixer le plafond journalier
- ✅ Admin : fermer les votes manuellement

### Temps réel
- ✅ Supabase Realtime sur `votes` et `day_config`
- ✅ Compteur "X/N ont terminé" avec points colorés (mise à jour live)

### Ajout d'activité
- ✅ Modal bottom-sheet z-index 100 (au-dessus de la nav bar)
- ✅ Champs : nom, description, catégorie, prix, photo optionnelle
- ✅ Catégories en français (Culture, Resto & Bar, Soirée…)
- ✅ Option "Nouvelle catégorie…" → champ texte libre

### Panel Admin
- ✅ Page `/admin` protégée par AdminRoute
- ✅ Onglet Admin dans la nav bar (visible admin seulement)
- ✅ Gestion utilisateurs : supprimer, basculer rôle admin/membre
- ✅ Gestion activités par ville : masquer/réactiver/supprimer
- ✅ Gestion votes par ville : visualisation + reset

---

## Phase 4 — Dashboard "Aujourd'hui" ⬜
**À faire**

Objectif : la page d'accueil donne toutes les infos critiques du jour en un coup d'œil.

- ⬜ Détecter la ville en cours (à partir de la date et du calendrier des trains)
- ⬜ **Météo locale** :
  - Intégrer OpenWeatherMap API (clé gratuite, 1 000 appels/jour)
  - Température, icône météo, conditions
  - Fallback offline sur la valeur cachée
- ⬜ **Convertisseur de devises** :
  - Intégrer Frankfurter API (sans clé, données BCE)
  - EUR → CZK, HUF, CHF selon la ville en cours
  - Valeur cachée si offline
- ⬜ **Trajet du jour** : afficher le train de la journée si applicable
- ⬜ **Activités validées** : liste des activités du jour issues du vote Explorer

---

## Phase 5 — Algorithme de Timeline ⬜
**À faire (optionnel pour le voyage)**

Objectif : les activités validées sont triées en un itinéraire géographiquement logique.

- ⬜ Ajouter coordonnées GPS aux activités
- ⬜ Algorithme du "plus proche voisin" :
  - Point de départ = adresse Airbnb
  - Point d'arrivée = gare de départ (si jour de train)
- ⬜ Afficher la timeline ordonnée dans "Aujourd'hui"
- ⬜ Interface admin pour ajuster l'ordre manuellement

---

## Phase 6 — PWA & Offline Hardening 🔄
**Partiellement terminé**

- ✅ Service Worker actif (vite-plugin-pwa + Workbox)
- ✅ CacheFirst sur Supabase Storage (PDFs accessibles offline)
- ✅ Précachage des assets statiques
- ✅ App installable sur Android/iOS
- ⬜ Tester mode avion complet sur les 5 téléphones
- ⬜ Audit Lighthouse PWA (score cible > 90)
- ⬜ Fallback UI explicite quand offline (bannière ou indicateur)

---

## Phase 7 — Contenu & Déploiement Final ⬜
**À faire avant le départ (août 2026)**

- ⬜ Compléter les adresses Airbnb manquantes (Amsterdam en attente de confirmation)
- ⬜ Uploader tous les billets de train en PDF
- ⬜ Alimenter les activités des 7 villes (compléter les 40 seeds)
- ⬜ Tester l'app sur les 5 téléphones (iOS + Android)
- ⬜ Générer les 4 liens d'invitation, les envoyer aux membres
- ⬜ S'assurer que les 5 membres complètent leur profil avant le départ
- ⬜ **Livrable : app en production, prête pour le voyage**

---

## Récapitulatif

| Phase | Description | Statut |
|---|---|---|
| 0 | Setup & Infrastructure | ✅ Terminé |
| 1 | Authentification & Onboarding | ✅ Terminé |
| 2 | Voyage & Coffre-Fort (offline) | ✅ Terminé |
| 3 | Explorer : Votes & Oracle | ✅ Terminé |
| 4 | Dashboard "Aujourd'hui" | ⬜ À faire |
| 5 | Algorithme de Timeline | ⬜ À faire (optionnel) |
| 6 | PWA & Offline Hardening | 🔄 Partiel |
| 7 | Contenu & Déploiement Final | ⬜ À faire avant août 2026 |

---

## Décisions techniques prises

| Sujet | Décision | Raison |
|---|---|---|
| Architecture | 5 onglets + Admin conditionnel | Voyage et Coffre-Fort séparés pour clarté |
| Votes | Révélés automatiquement quand tout le monde a voté | Évite de bloquer sur la fermeture manuelle |
| Seuil consensus | `ceil(n_inscrits / 2)` dynamique | S'adapte si un ami ne rejoint pas |
| Catégories | Texte libre (contrainte CHECK supprimée) | Flexibilité pour ajouter des catégories custom |
| PDFs offline | fetch → blob URL (pas window.open) | window.open est une navigation, pas interceptée par le SW |
| Snooze | Personnel uniquement, revient le lendemain | Ne pollue pas le deck des autres |
| Trash | 2 étapes de confirmation | Irréversible — évite les erreurs de swipe |
| Admin | Page dédiée + onglet nav conditionnel | Séparation claire admin/membre |
| Votes multiples | 1 deck par jour par ville, X nuits = X votes possibles | Adapté au rythme du voyage |
| Coût | 0 € | Supabase free, Vercel free |
