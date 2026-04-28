# Travel Hub & Oracle

> **Passeport Numérique de Groupe** pour 5 amis · 22 jours · 7 villes européennes.
> Bruxelles → Amsterdam → Berlin → Prague → Budapest → Vienne → Genève · Août 2026.

L'app ne te demande pas ce que tu veux faire. Elle le décide pour toi.

---

## Développeur

Projet solo développé par un étudiant en **2e année de classe préparatoire aux grandes écoles d'ingénieurs**. Bonnes bases en informatique, pas de formation web professionnelle — ce projet est aussi un apprentissage. Stack choisie pour sa documentation, sa communauté et sa complexité adaptée à un développeur solo.

---

## Pourquoi cette app existe

Cinq amis. Vingt-deux jours de train. Un budget serré à 1 200 €/personne. Des correspondances de 5 minutes à Renens. La fatigue qui s'accumule, les débats interminables "on fait quoi aujourd'hui ?", et le risque que la promiscuité tue l'amitié avant Budapest.

**Travel Hub & Oracle** est un pare-chocs relationnel : il absorbe la charge mentale, impose les décisions par vote, et centralise tout ce qui est critique — même sans internet.

---

## Stack Technique

| Domaine | Outil | Pourquoi |
|---|---|---|
| Frontend | **React 18 + Vite** | Optimal pour PWA offline-first, plus simple que Next.js pour un projet solo |
| Style | **Tailwind CSS v4 + CSS variables** | Mobile-first, design system "Liquid Glass" cohérent |
| PWA & Offline | **vite-plugin-pwa + Workbox** | Service Workers préconfigurés, CacheFirst sur Storage Supabase |
| Backend & Auth | **Supabase** | Auth, BDD PostgreSQL, Storage fichiers, Realtime |
| Hébergement | **Vercel** | Déploiement automatique depuis GitHub, HTTPS, CDN mondial |

**Coût total d'infrastructure : 0 €.**

---

## Architecture — Les Onglets

### Onglet 1 · "Aujourd'hui" — Le Dashboard *(Phase 5, à venir)*

Ce que le groupe voit en ouvrant l'app le matin :

- Météo locale en temps réel (avec fallback offline sur la valeur cachée)
- Convertisseur de devises automatique (CZK, HUF, CHF → EUR)
- Trajet du jour si c'est un jour de train
- Activités validées par le vote de la veille, dans l'ordre géographique

### Onglet 2 · "Explorer" — L'Oracle de Décision ✅

Le moteur anti-friction du groupe. Fonctionne ville par ville.

**Fonctionnement :**

1. L'admin ouvre les votes du jour et fixe le plafond (max. activités à valider)
2. Chaque membre swipe les activités de la ville en cours, une par une :
   - **→ Match** — "On le fait"
   - **↓ Snooze** — Revient demain
   - **← Trash** — Masqué définitivement (confirmation en 2 étapes)
3. Quand tous les membres ont voté, les résultats s'affichent automatiquement
4. **Seuil de validation = majorité** (`ceil(n_membres / 2)`) — s'adapte dynamiquement au nombre d'inscrits
5. Si les validées dépassent le plafond → **Deuxième Tour** : sélection manuelle des meilleures
6. Tout le monde peut proposer une activité (nom, description, catégorie, prix, photo optionnelle)
7. Catégories prédéfinies en français + possibilité d'en créer de nouvelles

**Compteur temps réel** : points colorés indiquant combien de membres ont terminé leur deck (Supabase Realtime).

**Rappel journalier** : 1 vote par jour par ville, le nombre de nuits prévues est affiché dans le sélecteur de ville.

### Onglet 3 · "Voyage" — Logistique Complète ✅

Toutes les infos de déplacement et d'hébergement, accessibles offline.

- **Trains** : liste de tous les tronçons (numéro de leg, date, départ/arrivée, heure, voie, notes), avec lien vers le plan de la gare
- **Billets** : PDFs uploadés par l'admin, accessibles hors-ligne via blob URL (le Service Worker les met en cache au chargement)
- **Airbnbs** : adresse, code d'entrée, instructions, heure de check-in/check-out, lien Maps
- **Urgences** : numéros locaux par pays (police, SAMU, pompiers), numéros des ambassades françaises

### Onglet 4 · "Coffre-Fort" — Documents Sensibles ✅

Coffre dédié aux PDFs : billets de train, assurances, documents de groupe. Upload par l'admin, organisé par tronçon ou en "Document général". 100% accessible offline.

### Onglet 5 · "Profil" — Onboarding Bloquant ✅

À la première connexion, l'accès est verrouillé jusqu'à ce que le membre complète :
- Contact d'urgence familial (nom + téléphone)
- Numéro de passeport / carte d'identité
- Numéro de Carte Européenne d'Assurance Maladie (CEAM)

### Onglet Admin · "Administration" ✅ *(visible uniquement pour l'admin)*

- **Utilisateurs** : liste des membres, supprimer un compte, basculer le rôle admin/membre
- **Activités** : par ville — masquer/réactiver/supprimer une activité
- **Votes** : visualiser tous les votes par ville, reset complet si besoin

---

## Modèle de Données Réel (Supabase)

### `profiles`
```
id              uuid        PK — lié à auth.users
pseudo          text        UNIQUE
role            text        'admin' | 'member'
emergency_name  text        obligatoire (bloquant)
emergency_phone text        obligatoire (bloquant)
passport_number text        obligatoire (bloquant)
ceam_number     text        obligatoire (bloquant)
created_at      timestamptz
```

### `trains`
```
id              uuid        PK
leg_order       integer     UNIQUE — ordre du tronçon (1 à 10)
date            date
from_station    text
to_station      text
departure_time  text
arrival_time    text
platform        text        nullable
notes           text        nullable
```

### `airbnbs`
```
id              uuid        PK
city            text        UNIQUE
address         text        nullable
entry_code      text        nullable
instructions    text        nullable  -- markdown
checkin_time    text
checkout_time   text
```

### `ticket_pdfs`
```
id              uuid        PK
leg_order       integer     0 = document général, 1-10 = tronçon spécifique
label           text
storage_path    text        -- chemin dans le bucket Supabase "tickets"
created_at      timestamptz
```

### `activities`
```
id              uuid        PK
city            text        'bruxelles' | 'amsterdam' | 'berlin' | 'prague' | 'budapest' | 'vienne' | 'geneve'
name            text
description     text        nullable
category        text        libre (culture, nature, food, nightlife, shopping, sport, other, ou custom)
price_eur       numeric     nullable
photo_url       text        nullable  -- URL publique bucket Supabase "activities"
added_by        uuid        FK → profiles.id
is_active       boolean     default true
created_at      timestamptz
```

### `votes`
```
id              uuid        PK
activity_id     uuid        FK → activities.id ON DELETE CASCADE
user_id         uuid        FK → profiles.id
vote            text        'match' | 'snooze' | 'trash'
snooze_date     date        nullable  -- date de réapparition (snooze)
voted_at        timestamptz
UNIQUE (activity_id, user_id)
```

### `day_config`
```
id              uuid        PK
city            text
date            date
max_activities  integer     -- plafond journalier défini par l'admin
votes_open      boolean     -- l'admin ouvre/ferme le deck
created_by      uuid        FK → profiles.id
created_at      timestamptz
UNIQUE (city, date)
```

---

## Storage Supabase

| Bucket | Visibilité | Usage |
|---|---|---|
| `tickets` | Privé (auth requis) | PDFs des billets de train |
| `activities` | Public | Photos des activités |

---

## Variables d'Environnement

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Installation locale

```bash
git clone https://github.com/axelmarie6-spec/guide.git
cd travel-hub
npm install
cp .env.example .env.local
# Remplir les clés Supabase
npm run dev
```

---

## Déploiement (Vercel)

Chaque `git push` sur `main` déclenche un déploiement automatique. Variables d'environnement à configurer dans les settings Vercel.

---

## Accès pour les membres du groupe

1. L'admin génère un lien d'invitation depuis son profil
2. Chaque membre clique sur le lien, choisit un pseudo + mot de passe
3. L'onboarding bloquant (Profil) s'affiche avant toute autre chose
4. Une fois le profil complété, accès complet à tous les onglets

---

## Contraintes Offline

| Fonctionnalité | Online | Offline |
|---|---|---|
| Coffre-Fort — PDFs billets | ✅ | ✅ (blob URL via SW, précaché au chargement) |
| Voyage — trains & airbnbs | ✅ | ✅ (données Supabase en cache) |
| Plans de gare (liens externes) | ✅ | ❌ |
| Météo | ✅ | ⚠️ Phase 5 — fallback valeur cachée |
| Taux de change | ✅ | ⚠️ Phase 5 — fallback valeur cachée |
| Explorer / Votes | ✅ | ❌ (online uniquement) |
| Admin | ✅ | ❌ (online uniquement) |
