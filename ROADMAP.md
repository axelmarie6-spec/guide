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

## Phase 3.5 — Refonte UI/UX ✅
**Terminé — toutes les pages alignées sur la DA Claude Design**

Objectif : cohérence visuelle totale entre toutes les pages, basée sur le système warm sand/ink défini dans /claude_design/.

### Fait ✅
- ✅ Palette warm sand/ink appliquée globalement (CSS variables)
- ✅ Fond dégradé + 3 blobs ambiants (ambre, bleu, vert) visibles sur toutes les pages
- ✅ Plus Jakarta Sans partout (font-family déjà en place)
- ✅ BottomBar simplifiée : 4 onglets seulement (Auj. / Explorer / Voyage / Coffre), avatar supprimé de la nav
- ✅ Page Profil : avatar initiales en header, prénom + nom
- ✅ Page Register : champs Prénom + Nom, suppression pseudo côté UI

### Fait ✅ (suite)
- ✅ **Page Coffre-Fort** : refonte complète inspirée claude_design
  - SOS button plein écran → modal sombre avec fiches d'urgence par membre
  - Sections collapsibles glass (Billets de train, Numéros d'urgence)
  - Status PDF par tronçon (PDF ✓ ou À venir), tap pour ouvrir
  - Header 2 lignes : titre + avatar (ligne 1) · badge Offline OK + bouton Ajouter (ligne 2)
  - Upload PDF ouvert à tous les membres (plus réservé à l'admin)
- ✅ **Page Voyage** : refonte inspirée claude_design
  - Cards status-based (past/next/upcoming/active) avec infos essentielles
  - Tap sur la card → TrainDetailSheet / HotelDetailSheet plein écran
  - Correspondances séparées conservées, Urgences déplacées vers Coffre-Fort
- ✅ **Page Explorer** : refonte cards de vote
  - Boutons d'action Match (64px, vert) / Snooze (46px) / Trash (64px, rouge) — SVG
  - Filtre catégories en pills (Tout / Culture / Restos / Soirée / Nature…)
  - Cards avec gradient coloré + blobs par catégorie, badge prix, swipe tint
  - ResultsView en glass cards avec classement numéroté
- ✅ **HeaderAvatar** (composant partagé) : cercle 38px initiales en haut à droite sur chaque page
  - Admin → ouvre AdminPopup (liens vers /admin tabs + /profil)
  - Membre → navigue directement vers /profil
- ✅ **PdfViewer** (composant partagé) : télécharge via `supabase.storage.download()` (auth privée)
  - Bouton "Plein écran ↗" pour ouvrir le PDF natif sur iOS (contourne la limite iframe 1 page)
  - Utilisé dans Voyage et Coffre-Fort
- ✅ **Bugs corrigés** :
  - Double prénom/nom à l'onboarding (formulaire cachait les champs mais les redemandait)
  - PDF inaccessible aux non-admins dans Coffre-Fort (mauvaise URL publique → remplacé par download auth)
  - Viewer PDF mobile n'affichait que la page 1 → lien "Plein écran" vers le viewer natif
  - Fausse erreur de sauvegarde sur mobile (timeout réseau côté client alors que l'UPDATE était committé)

---

## Phase 4 — Dashboard "Aujourd'hui" 🔄
**Structure en place — contenu à finaliser**

Structure de base déployée : salutation, compteur J-X, prochain train (Supabase), devises (Frankfurter API live), météo placeholder.

- ✅ Salutation "Bonjour [Prénom] 👋" + compteur J-X avant le départ
- ✅ Prochain train depuis Supabase (date, gares, horaires, voie)
- ✅ Devises live via Frankfurter API (EUR→CZK, HUF, CHF)
- ✅ Météo : placeholder (card stylisée)
- ⬜ **Météo locale réelle** :
  - Intégrer OpenWeatherMap API (clé gratuite, 1 000 appels/jour)
  - Température, icône météo, conditions
  - Fallback offline sur la valeur cachée
- ⬜ Détection automatique de la ville en cours (from CITY_SCHEDULE)
- ⬜ Devises filtrées selon la ville en cours (pas toujours CZK+HUF+CHF)
- ⬜ **Activités validées du jour** : issues du vote Explorer

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
| 3.5 | Refonte UI/UX (Claude Design) | ✅ Terminé |
| 4 | Dashboard "Aujourd'hui" | 🔄 Structure en place |
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
