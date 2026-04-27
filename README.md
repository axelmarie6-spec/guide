# Travel Hub & Oracle

> **Passeport Numérique de Groupe** pour 5 amis · 22 jours · 7 villes européennes.
> Bruxelles → Amsterdam → Berlin → Prague → Budapest → Vienne → Genève.

L'app ne te demande pas ce que tu veux faire. Elle le décide pour toi.

---

## Développeur

Projet solo développé par un étudiant en **2e année de classe préparatoire aux grandes écoles d'ingénieurs**. Bonnes bases en informatique, mais pas de formation web professionnelle — ce projet est aussi un apprentissage. La stack a été choisie en conséquence : des outils bien documentés, une communauté large, et une complexité adaptée à un développeur solo autodidacte.

---

## Pourquoi cette app existe

Cinq amis. Vingt-deux jours de train. Un budget serré à 1 200 €/personne. Des correspondances de 5 minutes à Renens. La fatigue qui s'accumule, les débats interminables "on fait quoi aujourd'hui ?", et le risque que la promiscuité tue l'amitié avant Budapest.

**Travel Hub & Oracle** est un pare-chocs relationnel : il absorbe la charge mentale, impose les décisions, et centralise tout ce qui est critique pour avancer — même sans internet.

---

## Concept

Deux idées simples soudées ensemble :

1. **Passeport Numérique de Groupe** — un coffre-fort offline qui centralise tout ce dont le groupe a besoin pour survivre : adresses Airbnb, codes d'entrée, billets de train, plans de gare, numéros d'urgence.

2. **Oracle de Décision** — un moteur de vote par swipe qui impose les choix à la majorité (3/5), génère un itinéraire géographiquement logique, et empêche les allers-retours inutiles dans la ville.

---

## Stack Technique

| Domaine | Outil | Pourquoi ce choix |
|---|---|---|
| Frontend | **React 18 + Vite** | Optimal pour une PWA offline-first, plus simple que Next.js pour un projet solo |
| Style | **Tailwind CSS** | Mobile-first par défaut, prototypage rapide |
| PWA & Offline | **vite-plugin-pwa + Workbox** | Service Workers préconfigurés, cache agressif automatique |
| Backend & Auth | **Supabase** | Auth, base de données, stockage PDF — tout en gratuit |
| Hébergement | **Vercel** | Déploiement automatique depuis GitHub, HTTPS, CDN mondial |
| Météo | **OpenWeatherMap API** (free tier) | 1 000 appels/jour, largement suffisant pour 5 utilisateurs |
| Taux de change | **Frankfurter API** | 100 % gratuit, sans clé API, données Banque Centrale Européenne |
| Cartographie | **Leaflet + OpenStreetMap** | Gratuit, open-source, tuiles cachables offline |

**Coût total d'infrastructure : 0 €.**

---

## Architecture — Les 4 Onglets

### Onglet 1 · "Aujourd'hui" — Le Dashboard

Ce que le groupe voit en ouvrant l'app le matin :

- **Météo locale** en temps réel (OpenWeatherMap, avec fallback sur la valeur cachée si offline)
- **Convertisseur de devises** automatique (CZK, HUF, CHF → EUR via Frankfurter API)
- **Trajet en cours** : ville de départ, gare d'arrivée, heure d'arrivée
- **Timeline de la journée** : l'itinéraire généré par l'onglet Explorer, dans l'ordre géographique

### Onglet 2 · "Explorer" — L'Oracle de Décision

Le moteur anti-friction du groupe.

**Fonctionnement :**

1. L'admin (et les membres si souhaité) alimentent une base d'activités dans Supabase avant et pendant le voyage. Chaque activité contient : ville, nom, description, prix en devise locale, catégorie, tag météo (intérieur/extérieur), coordonnées GPS, horaires d'ouverture.

2. Chaque membre swipe les activités de la ville en cours, **un par un**, avec 3 choix :
   - **Match** — "On le fait"
   - **Poubelle** — Masqué définitivement pour tout le monde
   - **Snooze** — Masqué jusqu'à minuit heure locale, puis revient dans le deck

3. Les votes sont **révélés seulement quand les 5 membres ont voté** sur une activité (évite les biais d'influence). Le vote se fait uniquement en ligne.

4. **Consensus automatique à 3 Match sur 5** → l'activité passe dans le planning.

5. **Égalité** (ex : 2 Match, 2 Poubelle, 1 Snooze) → l'admin tranche après discussion de groupe.

6. **Plafond journalier** : l'admin définit le nombre max d'activités par jour (réduit à 1-2 les jours de train). Si les activités validées dépassent ce plafond → **Deuxième Tour** : vote par cases à cocher pour sélectionner les meilleures.

7. **Algorithme de timeline** : le code trie les activités validées en minimisant les distances (point de départ = adresse Airbnb, point d'arrivée = gare de départ). Tient compte des horaires d'ouverture.

### Onglet 3 · "Coffre-Fort" — La Survie Logistique

Le seul onglet qui doit fonctionner **même avec 0 octet de connexion** (roaming Suisse, zones blanches en gare).

Contenu :
- **Airbnb** : adresse complète, code de la boîte à clés, instructions d'arrivée
- **Billets de train** : PDFs uploadés par l'admin, stockés dans Supabase Storage et mis en cache offline
- **Plans de gare** : cartes interactives (Leaflet/OSM) des gares à correspondances critiques, tuiles précachées
- **Urgences** : numéros d'urgence locaux par pays, géolocalisation des ambassades françaises

### Onglet 4 · "Profil" — L'Onboarding Bloquant

À la première connexion, l'accès à l'app est **verrouillé** jusqu'à ce que l'utilisateur complète :

- Contacts d'urgence familiaux (nom + téléphone)
- Allergies et restrictions alimentaires
- Numéro de passeport / carte d'identité
- Numéro de Carte Européenne d'Assurance Maladie (CEAM)

Optionnel après l'onboarding :
- **Checklist de départ** interactive (cocher les affaires avant de quitter l'Airbnb)

---

## Modèle de Données (Supabase)

### `users`
```
id              uuid        PK, géré par Supabase Auth
pseudo          text        UNIQUE, affiché dans l'app
role            text        'admin' | 'user'
invited_at      timestamp
-- Profil obligatoire (bloquant si null)
emergency_name  text
emergency_phone text
allergies       text        nullable
passport_number text
ceam_number     text
```

### `activities`
```
id              uuid        PK
created_by      uuid        FK → users.id
city            text        'bruxelles' | 'amsterdam' | 'berlin' | 'prague' | 'budapest' | 'vienne' | 'geneve'
name            text
description     text        nullable
address         text
gps_lat         float
gps_lng         float
price_local     decimal
currency        text        'EUR' | 'CZK' | 'HUF' | 'CHF'
category        text        'musée' | 'resto' | 'bar' | 'parc' | 'marché' | 'visite' | ...
weather_tag     text        'indoor' | 'outdoor' | 'both'
opening_hours   jsonb       nullable  -- { "lun": "10:00-18:00", ... }
is_active       boolean     default true
created_at      timestamp
```

### `votes`
```
id              uuid        PK
user_id         uuid        FK → users.id
activity_id     uuid        FK → activities.id
vote            text        'match' | 'poubelle' | 'snooze'
voted_at        timestamp
snooze_until    date        nullable  -- minuit heure locale, rempli si vote = 'snooze'
```

### `logistics`
```
id              uuid        PK
city            text
type            text        'airbnb' | 'train' | 'station_plan' | 'emergency'
title           text
content         text        nullable  -- texte libre, markdown
file_url        text        nullable  -- URL Supabase Storage (PDF, image)
city_from       text        nullable  -- pour les trajets
city_to         text        nullable
departure_at    timestamp   nullable
arrival_at      timestamp   nullable
```

### `day_config`
```
city            text        PK
date            date        PK
max_activities  integer     défini par l'admin
airbnb_lat      float
airbnb_lng      float
departure_station text
departure_at    timestamp
```

---

## Variables d'Environnement

Copie `.env.example` → `.env.local` et remplis :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_OPENWEATHER_API_KEY=xxxxxxxxxxxx
# Frankfurter API ne nécessite pas de clé
```

---

## Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/TON_PSEUDO/travel-hub.git
cd travel-hub

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# (remplir les clés)

# 4. Lancer en développement
npm run dev
```

---

## Déploiement (Vercel)

1. Importer le repo GitHub dans [vercel.com](https://vercel.com)
2. Ajouter les variables d'environnement dans les settings Vercel
3. Chaque `git push` sur `main` déclenche un déploiement automatique

---

## Accès pour les membres du groupe

1. L'admin génère un lien d'invitation depuis son profil
2. Chaque membre clique sur le lien, choisit un pseudo et un mot de passe
3. L'onboarding bloquant (Profil) s'affiche avant toute autre chose
4. Une fois le profil complété, accès complet à l'app

---

## Contraintes Offline — Ce qui fonctionne sans internet

| Fonctionnalité | Online | Offline |
|---|---|---|
| Coffre-Fort complet | ✅ | ✅ (cache agressif) |
| Plans de gare | ✅ | ✅ (tuiles précachées) |
| PDFs des billets | ✅ | ✅ (mis en cache au téléchargement) |
| Timeline de la journée | ✅ | ✅ (dernière version cachée) |
| Météo | ✅ | ⚠️ (dernière valeur connue) |
| Taux de change | ✅ | ⚠️ (dernier taux connu) |
| Votes / Explorer | ✅ | ❌ (online uniquement) |
