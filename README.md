# VFX Studio

Éditeur web de **VFX pixel art 2D** : création et modification de particules, composition d'effets et export de spritesheets PNG avec mapping JSON.

## Objectif

Créer une boîte à outils autonome pour fabriquer les effets des **37 compétences de NightVenture** (30 compétences d'archétypes et 7 pouvoirs raciaux), mais utilisable également pour d'autres jeux.

## Premier prototype

- Éditeur pixel par pixel (crayon, gomme, pipette, remplissage)
- Palette et résolution personnalisables
- Import PNG et sauvegarde PNG transparent
- Bibliothèque de particules locale (stockage navigateur)
- Animation image par image (ajout, duplication, suppression, lecture)
- Export spritesheet PNG et mapping JSON
- Export/import d'un projet éditable en JSON

## Passe 2 — Outils avancés

Le panneau gauche propose désormais des calques raster indépendants (visibilité, opacité, ordre, duplication), des tracés ligne/rectangle/ellipse, une sélection rectangulaire et son déplacement, la symétrie horizontale/verticale, un pinceau dithering, une palette par projet, la substitution de couleur, un contour et un glow pixelisé simple.

Les projets JSON **v2** incluent les calques, leurs pixels par frame et la palette. Les projets **v1** restent importables. Les spritesheets PNG/JSON exportent toujours l'image **composée**, et non les calques individuels.

La bibliothèque utilise **IndexedDB** lorsque disponible ; elle gère les tags et conserve les versions successives des assets. Le stockage local peut être supprimé par le navigateur : exportez régulièrement les projets et la bibliothèque. Les nouveaux calques et effets ne modifient pas la géométrie réelle des compétences NightVenture.

### Validation

Contrôles réalisés : syntaxe des scripts et 9 scénarios de fumée en DOM simulé (calques, peinture, historique, frames, outline, aller-retour JSON). La validation visuelle dans un navigateur réel reste à faire ; il ne s'agit pas encore d'une version de production.

## Passe 3 — Compositeur VFX

Le **Compositeur VFX** apparaît sous l'éditeur d'assets. Il fonctionne indépendamment des frames de dessin pour éviter de modifier involontairement les sources.

1. Créer une particule dans l'éditeur pixel art, puis cliquer **+ Asset actuel** (ou **+ Depuis bibliothèque**).
2. Ajouter une **instance** statique/animée ou un **émetteur** de particules.
3. Configurer les calques (ordre, visibilité), leur source, position, durée et paramètres.
4. Choisir émission **burst** ou **continuous**, origine **point/circle/line**, vitesse, angle, dispersion, gravité et freinage, trajectoire **linear/wave/spiral**.
5. Régler taille et opacité de début/fin avec interpolation `linear`, `ease-in`, `ease-out` ou `smooth`.
6. Lire ou parcourir l'animation sur la timeline, puis exporter la spritesheet **PNG transparent + JSON de mapping**, ou sauver la **composition JSON** pour la rouvrir.

Les calques incorporent une copie des pixels de leurs assets à l'instant de l'ajout. Une texture modifiée ultérieurement dans la bibliothèque n'altère donc pas une ancienne composition. Les mouvements sont calculés en flottants mais **rasterisés à positions entières** ; tailles entières, orientation par quarts de tour et interpolation nearest-neighbor.

La graine `seed`, le numéro de frame et les paramètres déterminent les mêmes particules à chaque rendu ; aucun appel à `Math.random` n'est utilisé par le moteur. Les paramètres déclarés et la logique d'événements de combat ne sont pas encore connectés à NightVenture. Les déclencheurs gameplay seront traités dans une passe ultérieure.

### Validation technique

`node tests/composer-engine.test.js` exécute 15 contrôles sans dépendance : validation des schemas, reproductibilité, mouvements, émission continue, opacité, atlas PNG/JSON, aller-retour JSON, absence de lissage et sécurité des entrées. Ces tests ont été exécutés et ont réussi dans un environnement JavaScript simulé. **Les tests d'interface dans un navigateur réel restent à effectuer.**

### Limites

- Les VFX sont exportés en séquence unique (pas encore de sous-animations déclenchées par collision).
- Le maximum est de 600 frames par composition et 8 192 pixels par axe d'atlas ; les compositions qui dépassent ces bornes doivent être réduites ou exportées en segments dans une évolution ultérieure.
- Les paramètres d'animation sont des courbes début/fin, pas encore une timeline de keyframes arbitraires.
- Le rendu complet de nombreux grands sprites et particules peut être coûteux sur des appareils modestes.

## Démarrer

Ouvrir `index.html` dans un navigateur moderne. Aucun build ni serveur requis. Les données de la bibliothèque sont enregistrées **localement dans le navigateur** ; elles ne sont pas automatiquement synchronisées avec GitHub. Exportez vos projets JSON pour les conserver et les déplacer.

## Principes

- Pixel art natif : pixels entiers, affichage en nearest-neighbor, pas d'anticrénelage sur le dessin.
- PNG transparents et JSON décrivant explicitement les frames.
- Géométrie de gameplay séparée de l'habillage artistique.
- Événements combat (impact, pulsation, statut) déclenchés par le jeu, pas simulés par la seule durée de la spritesheet.
- Sources éditables et assets réutilisables.

Voir [ROADMAP.md](ROADMAP.md) pour les prochaines passes.
