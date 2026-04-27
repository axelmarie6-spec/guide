# Roadmap — Travel Hub & Oracle

Développement solo. Stack : React 18 + Vite + Tailwind + Supabase + Vercel.

Chaque phase est indépendante et livrable. L'ordre est volontaire : les bases d'abord, le plus complexe après.

---

## Phase 0 — Setup & Infrastructure
**Durée estimée : 1-2 jours**

Objectif : avoir un projet qui tourne localement et se déploie sur Vercel en 5 minutes.

- [ ] Créer le projet avec `npm create vite@latest` (template React)
- [ ] Installer et configurer Tailwind CSS
- [ ] Installer `vite-plugin-pwa` (base du Service Worker, config minimale)
- [ ] Créer le projet Supabase (dashboard web) et noter les clés
- [ ] Créer le fichier `.env.local` et `.env.example`
- [ ] Créer le repo GitHub et connecter à Vercel (déploiement automatique)
- [ ] Vérifier que `npm run dev` et `npm run build` passent sans erreur
- [ ] **Livrable** : URL Vercel fonctionnelle avec une page "Hello World"

---

## Phase 1 — Authentification & Onboarding
**Durée estimée : 3-4 jours**

Objectif : les 5 membres peuvent rejoindre l'app et remplir leur profil.

- [ ] Créer les tables Supabase : `users` (avec les champs profil)
- [ ] Configurer Supabase Auth (email désactivé, auth par pseudo/mdp via `signUp`)
- [ ] Page de connexion : formulaire pseudo + mot de passe
- [ ] Système d'invitation :
  - [ ] L'admin génère un token d'invitation unique (stocké en BDD)
  - [ ] URL d'invitation `/invite/:token` → redirige vers la page d'inscription
  - [ ] Le token est invalidé après utilisation
- [ ] Questionnaire Profil bloquant :
  - [ ] Page dédiée affichée si un champ obligatoire est vide
  - [ ] Formulaire : contacts urgence, allergies, numéro passeport, CEAM
  - [ ] Redirection automatique vers Profil si incomplet (protéger les routes)
- [ ] Bottom Bar de navigation (4 onglets) — visible seulement après onboarding
- [ ] **Livrable** : 5 comptes créés, profils remplis, navigation fonctionnelle

---

## Phase 2 — Coffre-Fort (Offline First)
**Durée estimée : 3-4 jours**

Objectif : le Coffre-Fort fonctionne à 100% sans internet.

- [ ] Créer la table `logistics` dans Supabase
- [ ] Insérer manuellement les données via le dashboard Supabase :
  - Infos Airbnb des 7 villes (adresse, code boîte à clés, instructions)
  - Informations des trajets (7 trains)
  - Numéros d'urgence par pays (BE, NL, DE, CZ, HU, AT, CH) + ambassades françaises
- [ ] UI Coffre-Fort : liste des sections par type, affichage détail
- [ ] Upload des PDFs billets de train (Supabase Storage)
  - [ ] Interface admin pour uploader depuis l'app ou le dashboard
  - [ ] Affichage/téléchargement des PDFs dans l'app
- [ ] Plans de gare : intégrer Leaflet + OpenStreetMap
  - [ ] Carte centrée sur chaque gare à correspondance critique
  - [ ] Bouton "Télécharger pour offline" qui pré-cache les tuiles OSM
- [ ] Configurer Workbox pour cacher agressivement tout l'onglet Coffre-Fort
- [ ] Tester en mode avion (DevTools → Network → Offline)
- [ ] **Livrable** : Coffre-Fort 100% offline, PDFs accessibles, plans de gare

---

## Phase 3 — Explorer : Activités & Votes
**Durée estimée : 5-6 jours**

Objectif : le système de vote fonctionne de A à Z.

### 3a — Base de données des activités
- [ ] Créer la table `activities` et `votes` dans Supabase
- [ ] Définir les Row Level Security (RLS) Supabase :
  - Tout le monde peut lire les activités de sa ville
  - Tout le monde peut insérer une activité
  - Seul l'admin peut supprimer/désactiver une activité
  - Chaque user peut insérer/lire ses propres votes uniquement
- [ ] Alimenter la base avec ~10-15 activités par ville (admin via dashboard)

### 3b — Interface de swipe
- [ ] Afficher les activités non-votées de la ville en cours, une par une
- [ ] Carte d'activité : nom, catégorie, prix en € et devise locale, tag météo, description
- [ ] 3 boutons d'action : Match (vert), Snooze (orange), Poubelle (rouge)
- [ ] Swipe tactile (bibliothèque `react-swipeable` ou CSS transform)
- [ ] Cacher les activités marquées "Poubelle" (définitivement) ou "Snooze" (jusqu'à minuit)
- [ ] Formulaire "Ajouter une activité" accessible à tous les membres

### 3c — Logique de consensus
- [ ] Calculer le nombre de votes par activité côté serveur (Supabase function ou côté client)
- [ ] Afficher le résultat seulement quand les 5 membres ont voté
- [ ] **3 Match → activité validée** : passe dans le planning de la ville
- [ ] **Égalité** → notification à l'admin (badge ou message)
- [ ] **Snooze** : requête filtrée par `snooze_until < now()` pour réafficher le lendemain
- [ ] **Deuxième Tour** : si activités validées > plafond journalier (défini dans `day_config`) → interface de vote à cases à cocher pour sélectionner les meilleures

- [ ] **Livrable** : cycle complet vote → consensus → planning pour une ville test

---

## Phase 4 — Algorithme de Timeline
**Durée estimée : 3-4 jours**

Objectif : les activités validées sont triées en un itinéraire logique.

- [ ] Créer la table `day_config` (admin y définit max_activities, coords Airbnb, gare de départ)
- [ ] Algorithme de tri géographique :
  - Point de départ fixe = coordonnées GPS de l'Airbnb
  - Point d'arrivée fixe = coordonnées GPS de la gare de départ (si jour de train)
  - Algorithme du "plus proche voisin" : à chaque étape, aller à l'activité non visitée la plus proche
  - Filtrer les activités selon leurs horaires d'ouverture (ne pas programmer un musée fermé)
- [ ] Stocker l'itinéraire généré (ordre des activités) dans Supabase ou en cache local
- [ ] Interface d'affichage de la timeline : liste ordonnée avec heures estimées
- [ ] Interface admin pour modifier manuellement l'ordre si besoin
- [ ] **Livrable** : timeline générée automatiquement pour une journée test à Prague

---

## Phase 5 — Dashboard "Aujourd'hui"
**Durée estimée : 2-3 jours**

Objectif : la page d'accueil donne toutes les infos critiques du jour en un coup d'œil.

- [ ] **Météo** :
  - [ ] Intégrer OpenWeatherMap API (clé gratuite)
  - [ ] Appel API sur la ville en cours (coordonnées GPS depuis `day_config`)
  - [ ] Afficher : température, icône météo, conditions
  - [ ] Cacher la dernière réponse (fallback offline)
- [ ] **Convertisseur de devises** :
  - [ ] Intégrer Frankfurter API (aucune clé requise)
  - [ ] Afficher les taux EUR→CZK, EUR→HUF, EUR→CHF selon la ville en cours
  - [ ] Mise à jour automatique au chargement, valeur cachée si offline
- [ ] **Trajet en cours** :
  - [ ] Lire depuis `logistics` le train de la journée
  - [ ] Afficher : départ, arrivée, durée, heure d'arrivée
- [ ] **Timeline du jour** :
  - [ ] Afficher la liste générée par la Phase 4
  - [ ] Lien rapide vers chaque activité (détail + GPS)
- [ ] **Livrable** : dashboard complet et fonctionnel pour une journée test

---

## Phase 6 — PWA & Offline Hardening
**Durée estimée : 2-3 jours**

Objectif : l'app est installable sur mobile et fonctionne en mode avion pour tout ce qui est critique.

- [ ] Configurer `vite-plugin-pwa` complètement :
  - [ ] `manifest.json` : nom, icône, couleur, `display: standalone`
  - [ ] Stratégie Workbox `CacheFirst` pour le Coffre-Fort et les assets statiques
  - [ ] Stratégie `NetworkFirst` avec fallback pour les données dynamiques (météo, votes)
  - [ ] Précaching des routes critiques au moment de l'installation
- [ ] Tester l'installation sur Android (Chrome → "Ajouter à l'écran d'accueil")
- [ ] Tester l'installation sur iOS (Safari → "Sur l'écran d'accueil")
- [ ] Audit offline complet (mode avion) :
  - [ ] Coffre-Fort ✅ accessible
  - [ ] PDFs billets ✅ accessibles
  - [ ] Plans de gare ✅ accessibles
  - [ ] Timeline de la journée ✅ (version cachée)
  - [ ] Météo ⚠️ (affiche "dernière donnée connue" + timestamp)
- [ ] **Livrable** : app installable sur les 5 téléphones, Coffre-Fort offline validé

---

## Phase 7 — Polish & Déploiement Final
**Durée estimée : 2-3 jours**

Objectif : l'app est prête à partir en voyage.

- [ ] Design final — vérifier la cohérence visuelle sur tous les onglets
- [ ] Tester sur différentes tailles d'écran (petits Android, iPhone SE, grands Android)
- [ ] Vérifier les cas limites :
  - [ ] Que se passe-t-il si un membre n'a pas encore voté ? (affichage "en attente")
  - [ ] Que se passe-t-il si l'admin ne définit pas `day_config` pour une ville ?
  - [ ] Que se passe-t-il si 0 activité est validée ? (affichage gracieux)
- [ ] Alimenter toute la base de données (activités, logistics, day_config pour les 22 jours)
- [ ] Générer les 4 liens d'invitation, les envoyer aux membres
- [ ] S'assurer que les 5 membres complètent leur profil avant le départ
- [ ] **Livrable : app en production sur Vercel, prête pour le voyage**

---

## Récapitulatif des durées

| Phase | Description | Durée estimée |
|---|---|---|
| 0 | Setup & Infrastructure | 1-2 j |
| 1 | Authentification & Onboarding | 3-4 j |
| 2 | Coffre-Fort (offline) | 3-4 j |
| 3 | Explorer : Votes & Consensus | 5-6 j |
| 4 | Algorithme de Timeline | 3-4 j |
| 5 | Dashboard "Aujourd'hui" | 2-3 j |
| 6 | PWA & Offline Hardening | 2-3 j |
| 7 | Polish & Déploiement | 2-3 j |
| **Total** | | **21-29 jours de travail** |

---

## Ordre de priorité si le temps manque

1. **Indispensable avant le départ** : Phases 0, 1, 2 (auth + coffre-fort offline = survie logistique)
2. **Très utile** : Phase 3 sans le Deuxième Tour, Phase 5 sans la météo
3. **Confort** : Phase 4 (timeline automatique), Phase 6 (installation PWA)
4. **Nice-to-have** : Phase 3 Deuxième Tour, Phase 7 polish complet

---

## Décisions techniques à retenir

| Sujet | Décision |
|---|---|
| Framework | React 18 + Vite (pas Next.js — trop complexe pour une PWA one-shot) |
| Votes | Révélés seulement quand les 5 ont voté, online uniquement |
| Égalité | L'admin tranche après discussion |
| Snooze | Reset à minuit heure locale de la ville en cours |
| PDFs | Uploadés par l'admin, accessibles offline via cache |
| Coût | 0 € (Supabase free, Vercel free, APIs gratuites) |
| Langue | Français uniquement |
