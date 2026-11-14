# Listify

Listify est une application de liste de courses collaborative réalisée avec Nuxt 4 et Vue 3. Chaque liste est conservée dans un fichier Markdown, ce qui rend les données faciles à lire, à exporter et à sauvegarder.

## Fonctionnalités

- Création et import de listes Markdown
- Organisation des articles par section
- Cocher des articles, modifier leur quantité, leur texte ou leur responsable
- Ajout et suppression d’articles
- Export simple au format Markdown

## Stack

- Nuxt 4 / Vue 3
- API Nitro
- Persistance sur disque au format Markdown
- Fonts auto-hébergées, sans service externe

## Démarrage en développement

```bash
npm ci
npm run dev
```

L’application est ensuite disponible sur [http://localhost:3000](http://localhost:3000).

> Le code actuel écrit les listes dans `/app/data/lists`. En développement local, ce dossier doit être accessible en écriture, ou l’application doit être lancée avec Docker.

## Lancer avec Docker

Le réseau externe utilisé par `docker-compose.yml` doit exister :

```bash
docker network create arr-network
docker compose up --build -d
```

L’application est disponible sur [http://localhost:3000](http://localhost:3000). Les listes sont persistées dans le volume Docker `listify_data`.

Pour arrêter le service :

```bash
docker compose down
```

## Format Markdown

```markdown
# Courses du week-end

## Apéro
- [ ] Bières × 2 packs de 24 ← Alex
- [x] Glaçons × 2 sacs
```

- `[ ]` : article à acheter
- `[x]` : article déjà acheté
- `× …` : quantité facultative
- `← …` : responsable facultatif

## Construction

```bash
npm run build
npm start
```

La commande `npm run build` génère le serveur Nuxt dans `output/`.
