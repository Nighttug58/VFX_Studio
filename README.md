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

## Passe 4 — Timeline avancée et événements gameplay

La section **Timeline avancée** (sous le compositeur VFX) permet de placer et modifier des keyframes sur un calque VFX sélectionné.

### Keyframes et rendu pixel art

Pistes disponibles : `x`, `y`, `rotation` (degrés), `scale` (multiplicateur), `alpha` (0 à 1) et `color` (teinte hexadécimale multiplicative). Chaque image clé contient un `timeMs`, une `value` et une interpolation de sortie `ease` : `linear`, `ease-in`, `ease-out`, `smooth` ou `step`.

Les clés sont évaluées **à l'instant local de la séquence**. Position et taille sont arrondies aux pixels entiers ; une rotation est quantifiée au quart de tour le plus proche (pas de flou de rotation). La palette source et les calques d'assets restent éditables dans la première section du studio.

### Séquences et événements

Choisir la séquence du calque dans l'éditeur : `main` est la lecture normale ; `activation`, `projectile`, `impact`, `maintain`, `pulse`, `status` et `end` attendent un déclenchement explicite. Chaque séquence événementielle possède sa durée (50–10 000 ms, 600 frames max) et son mode `once` ou `loop`. Un événement contient `{type, atMs, x?, y?, id?}` : les coordonnées facultatives décalent l'effet.

Exemple d'utilisation du moteur côté runtime, sans lier NightVenture :
```js
const event = { type: 'impact', atMs: 850, x: 12, y: -3, id: 'enemy-42' };
const events = [event];
const canvas = VFXTimeline.render(composition, 1000, undefined, events);
// Pas d'événement = aucune animation de la séquence impact.
```

Plusieurs événements du même type peuvent coexister. Les séquences en boucle continuent tant que l'événement est conservé dans le tableau `events`; pour arrêter l'effet, retirer l'événement. Dans l'application, **Déclencher maintenant** et **Effacer les déclenchements** servent à tester ce comportement ; cet historique de tests n'est pas sauvegardé comme une règle de gameplay.

### Exports

**Exporter la séquence PNG + JSON** crée un atlas séparé pour la séquence choisie, avec `trigger`, `sequence`, `seed`, `loop`, FPS et coordonnées des frames. **Sauver composition** conserve les pistes, les sources et les paramètres des séquences dans le JSON éditable. L'export classique du compositeur représente la timeline `main` uniquement.

**Limite importante :** produire les atlas ne branche pas automatiquement les collisions ou ticks réels de NightVenture ; ce sera une étape d'intégration distincte. Les tests JavaScript et le parcours UI simulé ont été exécutés, mais la vérification visuelle Chromium reste en attente.

### Tests

```sh
node tests/composer-engine.test.js
node tests/timeline-engine.test.js
```

## Passe 5 — Export d'atlas de production

Une nouvelle section **Export production** permet de regrouper toutes les animations de la composition dans un unique **ZIP** : `atlas.json` (schéma `vfx-studio-atlas`, version 3) et un ou plusieurs PNG transparents `vfx-atlas-00.png`, `vfx-atlas-01.png`, etc. L'éditeur et les anciens exports PNG + JSON restent disponibles.

### Options

| Paramètre | Comportement |
| --- | --- |
| Profil strict | Échelles entières (1–4×), rendu nearest-neighbor sans lissage |
| Profil hybride | Échelle fractionnaire (0,5–4×), lissage lors du redimensionnement final |
| Padding | 0 à 16 pixels transparents autour de chaque frame |
| Extrusion | 0 à 16 pixels de duplication des bords et des coins |
| Texture maximale | 256 / 512 / 1024 / 2048 / 4096 / 8192 px par côté |
| Pivot | `pivotX`, `pivotY` normalisés entre 0 et 1, inclus aussi en pixels dans chaque frame |
| Taille logique | Largeur/hauteur exprimées en unités de monde (`u`), **indépendantes** des pixels |
| Cible | `generic` ou `nightventure`, avec identifiant de compétence ASCII facultatif |

Le rectangle d'une frame dans `atlas.json` (`x,y,w,h`) désigne **uniquement le contenu utile**, sans padding ni extrusion. `cell` désigne la cellule complète incluant la marge. Les références `frames[].page` pointent vers `pages[].image`. `animations` contient le nom de chaque séquence, son déclencheur `trigger`, le mode `loop`, les FPS et les index des frames associées.

### Exemple de manifeste (extrait illustratif)

```json
{
  "schema": "vfx-studio-atlas",
  "version": 3,
  "render": { "profile": "strict", "padding": 2, "extrusion": 1, "nearestNeighbor": true },
  "integration": { "target": "nightventure", "abilityId": "magic_elemental_nova", "triggerMode": "gameplay-events", "hitboxes": "external" },
  "pages": [{ "index": 0, "image": "vfx-atlas-00.png", "width": 256, "height": 256 }],
  "animations": { "impact": { "trigger": "impact", "loop": false, "fps": 24, "frameCount": 1, "frames": [0] } },
  "frames": [{ "id": "impact/0000", "sequence": "impact", "page": 0, "x": 3, "y": 3, "w": 32, "h": 32, "pivot": { "x": 0.5, "y": 0.5 } }]
}
```

Cet extrait sert à comprendre les champs et **ne constitue pas un atlas complet généré**. Les vrais exports incluent également les dimensions logiques, le seed, les métadonnées détaillées et toutes les frames. La génération réelle limite le nombre total de frames à 1800 et le budget cumulé des textures d'atlas à 64 Mpx pour éviter des allocations trop importantes. L'export refuse les sprites plus grands que la taille de texture maximale.

**Intégration NightVenture :** la cible ajoute des métadonnées conformes à la convention du studio, mais le jeu doit encore être adapté pour charger le manifeste et émettre lui-même les événements (collision, pulsation, fin). Aucune hitbox ni aucun comportement de compétence ne sont fabriqués par l'exporteur.

### Vérification

```sh
npm test
npm run verify:release
```

Ces commandes exécutent les suites Node du compositeur, de la timeline et de l'exporteur sans dépendance npm. À ce stade, **64 assertions automatisées** sont passées en environnement JavaScript simulé, et le flux UI d'export ZIP a passé un test de simulation. Les tests visuels et end-to-end sur Chromium restent à effectuer.

## Démarrer

Ouvrir `index.html` dans un navigateur moderne. Aucun build ni serveur requis. Les données de la bibliothèque sont enregistrées **localement dans le navigateur** ; elles ne sont pas automatiquement synchronisées avec GitHub. Exportez vos projets JSON pour les conserver et les déplacer.

## Principes

- Pixel art natif : pixels entiers, affichage en nearest-neighbor, pas d'anticrénelage sur le dessin.
- PNG transparents et JSON décrivant explicitement les frames.
- Géométrie de gameplay séparée de l'habillage artistique.
- Événements combat (impact, pulsation, statut) déclenchés par le jeu, pas simulés par la seule durée de la spritesheet.
- Sources éditables et assets réutilisables.

Voir [ROADMAP.md](ROADMAP.md) pour les prochaines passes.
