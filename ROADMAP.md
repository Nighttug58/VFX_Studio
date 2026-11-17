# ROADMAP — VFX Studio Pixel Art

## Passe 1 — Prototype éditeur pixel art (en cours)
- [x] Initialiser le dépôt et documenter l'objectif
- [x] Édition raster au pixel (crayon, gomme, pipette, pot de peinture)
- [x] Import PNG avec rasterisation nearest-neighbor
- [x] Frames individuelles, prévisualisation et export PNG + JSON
- [x] Bibliothèque persistante locale et export/import du projet
- [ ] Tests automatisés, gestion avancée de l'historique et raccourcis

## Passe 2 — Éditeur d'assets
- Calques raster, sélection, déplacement, formes géométriques, symétries, dithering
- Palette par projet, remappage de couleurs, outline et glow pixelisé
- Bibliothèque indexée (IndexedDB), tags, vignettes et contrôle de version des assets

## Passe 3 — Compositeur VFX
- Instances d'assets, calques VFX et rendu déterministe
- Émetteurs : burst/continu, trajectoires, gravité, durée de vie, random seed
- Courbes de paramètres et interpolation adaptée au pixel art

## Passe 4 — Timeline et événements
- Keyframes position/rotation/échelle/alpha/couleur
- Séquences activation, projectile, impact, maintien, pulsation, statut, fin
- Déclenchement événementiel (collision, tick, expiration) distinct de la timeline

## Passe 5 — Export production
- Atlases multi-animations, padding/extrusion, limites de texture, pivots
- Métadonnées JSON versionnées, validations et exports NightVenture
- Profil de rendu strict pixel / hybride

## Passe 6 — Catalogue NightVenture
- 37 modèles de compétences documentés depuis le cahier de formes
- Géométries exactes : secteurs, capsules, disques, projectiles et auras
- Cinq cas de validation : Pas du duelliste, Impact sismique, Forêt de pointes, Verdict du prédateur, Convergence élémentaire
- Conservation des unités logiques indépendamment des pixels d'export

## Architecture proposée
Application HTML/CSS/JS sans build au début, modules ES lors de la croissance. Canvas 2D avec raster pixel exact. Projet JSON éditable, bibliothèques sauvegardées localement, exports PNG + JSON. Pas d'écriture implicite dans le dépôt du jeu.

## Critères de qualité
- Aucune interpolation bilinéaire dans les textures exportées
- Rendu répétable à seed identique
- Export/import JSON sans perte de frames ni de pivot
- Une frame pixel-art source = une cellule d'atlas de dimensions explicites
- Absence de dépendances externes nécessaires pour lancer l'éditeur
