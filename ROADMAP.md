# ROADMAP — VFX Studio Pixel Art

## Passe 1 — Prototype éditeur pixel art (en cours)
- [x] Initialiser le dépôt et documenter l'objectif
- [x] Édition raster au pixel (crayon, gomme, pipette, pot de peinture)
- [x] Import PNG avec rasterisation nearest-neighbor
- [x] Frames individuelles, prévisualisation et export PNG + JSON
- [x] Bibliothèque persistante locale et export/import du projet
- [ ] Tests automatisés, gestion avancée de l'historique et raccourcis

## Passe 2 — Éditeur d'assets (implémentée ; validation navigateur manuelle restante)
- [x] Calques raster : création, duplication, suppression, visibilité, opacité, ordre et renommage
- [x] Dessin et édition du calque actif : ligne, rectangle, ellipse, sélection rectangulaire et déplacement
- [x] Symétrie X/Y et pinceau dithering
- [x] Palette par projet, remappage des couleurs, contour 1 px et glow pixelisé simple
- [x] Bibliothèque IndexedDB, tags, miniatures et versions successives des assets
- [x] Projet JSON v2 (calques et palette), lecture des anciens projets v1
- [x] Historique undo/redo tenant compte des calques ; les PNG et spritesheets restent composites
- [x] Contrôles automatiques : analyse syntaxique + tests de fumée (9 scénarios)
- [ ] Vérification visuelle dans un navigateur réel et tests de régression complets (avant diffusion production)
- [ ] Améliorations futures : sélection libre, déplacement multi-calques, glow multicouche, navigation clavier et opérations de palette indexée

## Passe 3 — Compositeur VFX (implémentée, QA navigateur à compléter)
- [x] Instances d'assets raster issus de l'éditeur ou de la bibliothèque, copies embarquées dans les compositions
- [x] Calques VFX indépendants, visibilité, ordre et paramètres par calque
- [x] Émetteurs burst/continu, formes point/ligne/cercle, dispersion, vitesse, gravité, freinage et durée de vie
- [x] Trajectoires linéaires, sinusoïdales et spiralées, paramètres amplitude/fréquence
- [x] Graine (seed) fixée, calcul déterministe image par image et positions entières
- [x] Animation de taille/opacité avec interpolation linéaire, ease-in, ease-out et smooth
- [x] Prévisualisation frame par frame, lecture, PNG/JSON atlas et composition JSON rééditable
- [x] Tests moteur automatisés sans dépendances, 15 scénarios réussis dans environnement JavaScript simulé
- [ ] Tests end-to-end dans un vrai navigateur et capture visuelle avant livraison production
- [ ] Évolutions réservées aux passes suivantes : keyframes multiples, événements synchronisés gameplay et atlas multi-tags

## Passe 4 — Timeline et événements (implémentée ; QA navigateur réel à compléter)
- [x] Pistes de keyframes par calque : position X/Y, rotation, échelle, alpha et teinte RGB
- [x] Interpolations linéaire, ease-in, ease-out, smooth, step ; positions arrondies au pixel, rotations discrétisées par quarts de tour
- [x] Séquences nommées : main, activation, projectile, impact, maintain, pulse, status, end
- [x] Déclenchement par événement explicite avec horodatage et décalage X/Y indépendants du démarrage de la timeline
- [x] Événements multiples / répétés ; séquences à lecture unique ou bouclées jusqu'au retrait du déclenchement
- [x] Panneau d'édition des images clés et séquences ; prévisualisation des déclenchements
- [x] Export PNG/JSON séparé par séquence, métadonnées trigger/seed/loop ; projet source incluant les keyframes
- [x] Compatibilité des compositions des passes 1–3 sans keyframes ni séquences
- [x] Tests moteur : 25 scénarios réussis dans un environnement JavaScript simulé et un scénario UI intégré (assets → clés → événement)
- [ ] Vérification visuelle automatisée en navigateur réel sur la branche main
- [ ] Synchronisation gameplay directement dans NightVenture non incluse : le jeu doit émettre les événements lui-même

## Passe 5 — Export production (implémentée ; QA navigateur réel à compléter)
- [x] Atlas multi-animations : timeline principale et séquences événementielles dans un seul manifeste JSON
- [x] Répartition automatique des frames en pages PNG lorsque la capacité texture est dépassée
- [x] Padding transparent et extrusion des pixels de bord, coins compris, sans changer le rectangle utile du sprite
- [x] Pivot X/Y normalisé et en pixels pour chaque frame ; taille logique mondiale indépendante des pixels d'export
- [x] Profils strict pixel (nearest-neighbor, échelle entière) et hybride (échelle fractionnaire, lissage optionnel)
- [x] Contrôle des résolutions (256–8192), 1800 frames maximum, 128 pages PNG maximum et budget total de 64 Mpx
- [x] JSON version 3 avec pages, frames, animations, déclencheurs, pivot, FPS, boucle, seed et tailles logiques
- [x] Métadonnées cibles générique / NightVenture : identifiant de compétence ASCII et collisions explicitement externes
- [x] Export ZIP sans dépendance contenant atlas.json et toutes les pages PNG
- [x] Tests automatisés : 25 scénarios production + 15 compositeur + 25 timeline (65 verts) en runtime JS simulé
- [x] Test de flux export UI simulé (configuration → planification → PNG → ZIP) réussi
- [ ] Tests visuels et tests end-to-end dans un navigateur réel avant usage production
- [ ] Adaptateur de chargement de ces atlas dans NightVenture (hors de cette passe)

## Passe 6 — Catalogue NightVenture (implémentée ; QA navigateur réel restante)
- [x] Intégration des 37 fiches source : 30 compétences des 5 archétypes et 7 pouvoirs raciaux, avec textes, calques, SVG de référence et révision du cahier
- [x] Géométrie réelle conservée séparément des visuels : 6 secteurs à arc circulaire, 3 capsules à bouts arrondis, 6 disques, 5 projectiles, 1 déplacement et 16 soutiens personnels sans hitbox
- [x] Paramètres numériques de gameplay (rayons, angles, axes, dimensions, portée, collisions, vitesse, délais) conservés sans extrapolation ; indicateur des propositions purement artistiques
- [x] Catalogue HTML : filtres par archétype, recherche, fiches détaillées, calques, guide géométrique distinct de l'image exportée
- [x] Compositions VFX personnalisables à partir de chaque fiche : assets pixel art de départ modifiables, calques, séquences et métadonnées source
- [x] Aller-retour d'un asset du compositeur vers l'éditeur pixel art et réinjection des pixels modifiés
- [x] Cinq scénarios prioritaires : Pas du duelliste, Impact sismique, Forêt de pointes (3 fenêtres de 80 ms), Verdict du prédateur et Convergence élémentaire (4 pulsations)
- [x] JSON de production avec références géométriques exactes, SVG maître, identifiant et révision de source ; événements et hitboxes restent externes au VFX
- [x] Compatibilité des unités du monde et des pixels exportés ; cadre de référence indépendant
- [x] 31 tests du catalogue + 11 contrôles d'intégration UI ; total de 96 assertions de moteur/catalogue (15 + 25 + 25 + 31), les 11 contrôles UI en supplément
- [ ] Validation visuelle et interactive dans un véritable navigateur avant usage production
- [ ] Dessin artistique final des 37 effets (les textures générées sont des placeholders pixel art éditables)
- [ ] Adaptateur d'intégration directe dans NightVenture_Legacy (explicitement hors de cette passe)

## Architecture proposée
Application HTML/CSS/JS sans build au début, modules ES lors de la croissance. Canvas 2D avec raster pixel exact. Projet JSON éditable, bibliothèques sauvegardées localement, exports PNG + JSON. Pas d'écriture implicite dans le dépôt du jeu.

## Critères de qualité
- Aucune interpolation bilinéaire dans les textures exportées
- Rendu répétable à seed identique
- Export/import JSON sans perte de frames ni de pivot
- Une frame pixel-art source = une cellule d'atlas de dimensions explicites
- Absence de dépendances externes nécessaires pour lancer l'éditeur

## Stabilisation transversale — six passes (novembre 2026)

- [x] Passe 1 : régression crayon, undo/redo, export de projet et frames
- [x] Passe 2 : calques, visibilité, historique, dithering alterné sans surpeinture
- [x] Passe 3 : création d'émetteur depuis un sprite et vérification du déterminisme
- [x] Passe 4 : deux keyframes interpolées et conservation des événements
- [x] Passe 5 : export ZIP et validation du manifeste v3 et de ses PNG référencés
- [x] Passe 6 : chargement d'une compétence, édition de particule et géométrie inchangée
- [x] Correction du calque sélectionné qui pouvait pointer vers l'ancien projet après chargement d'une composition
- [x] Correction d'IDs potentiellement dupliqués après réimport de projets contenant des IDs `asset-N`
- [x] Correction du pinceau de dithering (anciennement une ligne continue)
- [x] Résilience face à un cache local de bibliothèque contenant un JSON valide mais non-array
- [x] Suite complète sans dépendances : 96 tests moteurs/catalogue + 11 tests UI catalogue + 9 tests éditeur + 13 tests de pipeline simulé
- [x] Test Playwright facultatif ajouté pour Chromium réel (commande `npm run test:browser`)
- [ ] **À exécuter sur poste avec dépôt local :** Chromium E2E (accès GitHub Pages bloqué dans l'environnement de validation)
- [ ] Contrôler visuellement les sprites pixel art, les animations fluides et les téléchargements réels selon les navigateurs
- [ ] Tests de charge : centaines de particules, textures 4K/8K et stockage local saturé

Voir `STABILIZATION_REPORT.md` pour les résultats, limites et prochaines recommandations.
