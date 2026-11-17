# VFX Studio — Rapport de stabilisation transversal

Date : 17 novembre 2026  
Dépôt audité : `Nighttug58/VFX_Studio`, branche `main` à l'ouverture de la passe, modifications sur `fix/stabilization-regression-pass`  
Portée : six passes (édition raster, calques, compositeur, timeline, export de production, catalogue NightVenture). **Le dépôt `NightVenture_Legacy` n'a pas été modifié.**

## Résultat de l'audit

| Passe | Fonction inspectée | Contrôle et résultat |
| --- | --- | --- |
| 1 — Éditeur | Peinture pixel par pixel, undo/redo, frames et JSON éditable | Peinture, historique et sauvegarde/relecture vérifiés dans les tests simulés |
| 2 — Assets | Calques visibles/invisibles, dithering, bibliothèque | Correction du dithering : les pixels de la grille alternée ne doivent plus être recouverts par une ligne continue |
| 3 — Compositeur | Import d'une source, émetteurs et déterminisme | Import depuis l'éditeur puis création d'émetteur et preview répétable testés |
| 4 — Timeline | Keyframes, interpolations, événementiel | Deux clés posées, prévisualisation contrôlée, suites de régression existantes conservées |
| 5 — Export | Atlas, padding, extrusion, JSON v3 et ZIP | ZIP généré dans le simulateur ; ses entrées et son manifeste JSON v3 sont relus, les PNG référencés sont présents |
| 6 — NightVenture | 37 modèles, guides géométriques et modification de particules | Modèle chargé, géométrie conservée, asset modifié puis réinjecté ; 37 modèles vérifiés par tests existants |

## Anomalies corrigées

1. **Sélection obsolète dans le compositeur** : le chargement d'une autre composition pouvait conserver l'index du calque précédemment sélectionné, parfois hors limites. La sélection revient désormais au premier calque. Test de changement entre compositions de tailles différentes ajouté.
2. **Collision possible des identifiants de textures** : après import d'un projet contenant des `asset-35`, un ajout pouvait réutiliser un identifiant inférieur déjà existant. Le prochain numéro est désormais dérivé des IDs importés.
3. **Pinceau dithering incorrect** : la trace pleine était dessinée avant le damier, produisant une ligne pleine. Le pinceau effectue maintenant son tracé Bresenham en ne peignant que les pixels alternés.
4. **Cache local JSON mal formé structurellement** : si `localStorage` contenait un objet JSON au lieu d'un tableau de bibliothèque, l'initialisation pouvait échouer. Les structures non-tableau reviennent désormais à une bibliothèque vide.

## Validation effectuée

Les scripts Node existants et les nouveaux tests sont orchestrés par `npm run verify:release` sans dépendance externe obligatoire.

| Suite | Vérifications |
| --- | ---: |
| Compositeur | 15 |
| Timeline | 25 |
| Export de production | 25 |
| Catalogue des compétences | 31 |
| Interface catalogue simulée | 11 |
| Éditeur pixel art simulé | 10 |
| Parcours complet simulé (dont ZIP et collisions d'IDs) | 13 |
| **Total** | **130** |

Les scénarios ont été évalués dans le runtime JavaScript de validation avec des substituts DOM/Canvas. Les tests de pipeline exercent les scripts réels du dépôt dans l'ordre de chargement HTML ; le ZIP produit dans le simulateur est inspecté, mais **le mock PNG ne prouve pas la qualité ni la validité d'un rendu PNG issu de Chromium**. La syntaxe JavaScript est vérifiée.

Un échantillon du ZIP produit par le moteur `zip-store.js` a également été reconnu et lu par Python `zipfile` (signature, entrées et CRC).

## Test en vrai navigateur — disponible, non exécuté

L'environnement dispose du binaire Chromium et de Playwright Python, mais interdit la navigation vers `github.io` (`ERR_BLOCKED_BY_ADMINISTRATOR`) et la récupération du dépôt par `git` (GitHub inaccessible). La version distante **n'a donc pas pu être ouverte ni testée dans Chromium** ici.

Un test réel optionnel `tests/browser-smoke.cjs` a été ajouté : il crée un serveur HTTP local, ouvre Chromium via Playwright, vérifie l'initialisation sans erreur de page, la peinture pixel art, l'émetteur, les keyframes, le téléchargement d'un ZIP et le chargement d'une compétence NightVenture.

Exécution sur une machine disposant d'une copie du dépôt :

```bash
npm run verify:release
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

La version n'est pas considérée comme **certifiée visuellement pour production** avant l'exécution du test réel et le contrôle humain du rendu.

## Risques et priorités après la stabilisation

1. **P0 — Exécution Chromium réelle** : relever toute erreur de chargement, de conversion PNG, de choix des fichiers et d'export ZIP ; corriger avant de publier l'outil comme prêt pour la production.
2. **P1 — Fidélité pixel art** : inspecter à plusieurs échelles (1×, 2×, 4×) le nearest-neighbor, le dithering, l'opacité, les contours, l'extrusion et les palettes, avec comparaison d'images.
3. **P1 — Performance** : profiler les exportations maximales et les compositions riches en particules ; introduire cache de rendu et exécution séquencée si nécessaire.
4. **P2 — Sauvegardes IndexedDB** : tester en conditions réelles les navigateurs en mode privé, les quotas saturés, les migrations et la restauration après un échec d'écriture.
5. **P2 — Contrat NightVenture** : documenter et tester ultérieurement l'adaptateur côté jeu, sans confondre contours décoratifs, spritesheets et hitboxes réelles.

La correction de ces points ne justifie aucune modification implicite du dépôt `NightVenture_Legacy`.
