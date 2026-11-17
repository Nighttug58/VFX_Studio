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

## Démarrer

Ouvrir `index.html` dans un navigateur moderne. Aucun build ni serveur requis. Les données de la bibliothèque sont enregistrées **localement dans le navigateur** ; elles ne sont pas automatiquement synchronisées avec GitHub. Exportez vos projets JSON pour les conserver et les déplacer.

## Principes

- Pixel art natif : pixels entiers, affichage en nearest-neighbor, pas d'anticrénelage sur le dessin.
- PNG transparents et JSON décrivant explicitement les frames.
- Géométrie de gameplay séparée de l'habillage artistique.
- Événements combat (impact, pulsation, statut) déclenchés par le jeu, pas simulés par la seule durée de la spritesheet.
- Sources éditables et assets réutilisables.

Voir [ROADMAP.md](ROADMAP.md) pour les prochaines passes.
