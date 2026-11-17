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

Cet extrait sert à comprendre les champs et **ne constitue pas un atlas complet généré**. Les vrais exports incluent également les dimensions logiques, le seed, les métadonnées détaillées et toutes les frames. La génération réelle limite le nombre de pages PNG à 128, le nombre total de frames à 1800 et le budget cumulé des textures d'atlas à 64 Mpx pour éviter des allocations trop importantes. L'export refuse les sprites plus grands que la taille de texture maximale.

**Intégration NightVenture :** la cible ajoute des métadonnées conformes à la convention du studio, mais le jeu doit encore être adapté pour charger le manifeste et émettre lui-même les événements (collision, pulsation, fin). Aucune hitbox ni aucun comportement de compétence ne sont fabriqués par l'exporteur.

### Vérification

```sh
npm test
npm run verify:release
```

Ces commandes exécutent les suites Node du compositeur, de la timeline et de l'exporteur sans dépendance npm. À ce stade, **65 assertions automatisées** sont passées en environnement JavaScript simulé, et le flux UI d'export ZIP a passé un test de simulation. Les tests visuels et end-to-end sur Chromium restent à effectuer.

## Passe 6 — Catalogue des 37 compétences NightVenture

La section **Catalogue NightVenture** permet de rechercher les compétences par archétype ou race, d'afficher leurs fiches source et d'ouvrir directement un projet VFX personnalisable.

### Provenance et types de données

Référence : `NightVenture_Formes_VFX_37_competences.md` (source catalogue Monster_integration au commit `be619f8cf2d34bae2e6e21a0d80691df8138bd27`). Une copie structurée de toutes les fiches est disponible dans `data/nightventure-abilities.json` (source de vérité pour le studio). `nightventure-catalog-data.js` intègre les mêmes données pour fonctionner sans serveur lors de l'ouverture locale de `index.html`.

- **Données de gameplay** : géométrie, rayon/angle/largeur/axe, déplacements, trajectoires de projectiles, timing et cibles. Elles restent en **unités logiques du monde** (`u`), indépendantes de la résolution PNG.
- **Propositions artistiques** : dégradés, description de calques, motifs, halo et viewBox suggéré. Elles ne modifient jamais les collisions.
- **Guide de géométrie** : tracé d'arc circulaire pour les secteurs, capsules arrondies à l'axe exact, disques en vue de dessus, lignes de trajectoire pour les projectiles, itinéraire pour le déplacement. Les supports et pouvoirs raciaux ne produisent aucune zone de dégâts.

Les 37 fiches représentent 6 compétences pour chacun des cinq archétypes (Épéiste, Massier, Lancier, Archer, Mage) et 7 pouvoirs raciaux. Le catalogue fournit des assets de départ **pixel art 32 × 32** modifiables, **pas** les 37 VFX artistiques terminés ni les SVG maîtres dessinés à la main.

### Créer et modifier un VFX

1. Ouvrir le catalogue, filtrer une compétence et consulter la zone exacte de référence.
2. Cliquer **Créer VFX éditable** : les calques décrits par la fiche sont préparés avec des textures pixel art, des séquences et des métadonnées de provenance.
3. Pour retoucher les pixels : choisir une texture dans le compositeur, puis **Modifier l'asset sélectionné**. L'asset s'ouvre dans l'éditeur pixel art en haut de page.
4. Après les retouches, cliquer **Réinjecter l'asset édité** : le compositeur reçoit les nouveaux pixels et frames. **Sauver composition** pour conserver les modifications.
5. Dans l'export de production, la cible NightVenture et l'ID de compétence sont présélectionnés. Vérifier les dimensions logiques du monde avant d'exporter le ZIP ; l'application ne peut pas déduire automatiquement l'échelle finale de ton jeu.

### Cinq scénarios de référence

| Compétence | Géométrie et timing source | Démonstration d'événements |
| --- | --- | --- |
| Pas du duelliste | Déplacement de 72 u, pas de 220 ms, évitement au plus 160 ms, riposte au plus 1,5 s | Activation et statut seulement si les conditions réelles sont satisfaites |
| Impact sismique | Secteur rayon 68 u, 96° ; préparation 420 ms, impact à 420 ms, récupération 300 ms | Impact distinct déclenché par le combat |
| Forêt de pointes | Secteur rayon 142 u, 34° ; estocs à 120 / 360 / 600 ms, fenêtre 80 ms | Trois événements de pulsation de 80 ms |
| Verdict du prédateur | Projectile rayon de collision 6 u, portée 390 u, jusqu'à 488 u en pleine charge ; charge 200–1 000 ms | Départ et impact indépendants ; démo non prescriptive pour la collision |
| Convergence élémentaire | Disque rayon 70 u, préparation 300 ms, zone 3 s, quatre pulsations aux offsets 0 / 750 / 1500 / 2250 ms | Zone persistante et quatre pulses événementiels |

Ces scénarios de **prévisualisation** illustrent les instants du cahier. Ils ne créent pas de calcul de dégâts ni de scripts combat. Les autres compétences sont personnalisables via leurs calques et leurs champs source, sans inventer de séquences de gameplay absentes du cahier.

### Export NightVenture

Le manifeste `atlas.json` v3 contient désormais `integration.catalog` avec la géométrie source, l'identifiant de compétence, le SVG maître, la révision de provenance et les calques de référence, **uniquement lorsque le projet vient du catalogue et que la cible NightVenture est sélectionnée**. `integration.hitboxes` reste `external` : les collisions appartiennent au jeu. Les contours de référence ne sont **pas** dessinés dans les PNG exportés.

### Validation

La commande `npm run verify:release` exécute les trois suites existantes et les 31 tests du catalogue : cardinalité des 37 fiches, géométries exactes, cinq scénarios, cohérence des templates, rétrocompatibilité JSON et planification des atlas. Les quatre suites couvrent 96 assertions (15 + 25 + 25 + 31) ; un test de simulation de l'interface ajoute 11 contrôles. Ces tests JavaScript simulés ne remplacent pas une validation visuelle dans Chromium.

**Dépôt NightVenture_Legacy non modifié.**

## Stabilisation et tests de navigateur

La passe de stabilisation consolide les six modules, corrige trois régressions concrètes (sélection de calque après chargement, pinceau dithering et cache de bibliothèque non-array) et corrige l'allocation des IDs de nouveaux assets après import. Les régressions disposent maintenant de tests automatiques.

```sh
npm run verify:release
```

La suite sans dépendance couvre **130 vérifications** : 15 compositeur, 25 timeline, 25 atlas ZIP, 31 catalogue, 11 interface catalogue, 10 éditeur raster et 13 pipeline complet simulé.

Pour la **vraie validation Chromium**, installer Playwright facultativement :

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

Le script ouvre le logiciel depuis un serveur HTTP local et vérifie le dessin, l'ajout d'une particule, l'émetteur, les keyframes, le téléchargement ZIP et les métadonnées NightVenture. Il ne touche ni au dépôt ni au runtime `NightVenture_Legacy`. Il n'a **pas encore pu être exécuté sur la version GitHub** depuis cet environnement, car les accès réseau à GitHub Pages y sont interdits ; ce test doit être lancé sur un poste disposant d'une copie locale du dépôt.

Voir [STABILIZATION_REPORT.md](STABILIZATION_REPORT.md) pour l'audit et les limites de validation.

## Démarrer

Ouvrir `index.html` dans un navigateur moderne. Aucun build ni serveur requis. Les données de la bibliothèque sont enregistrées **localement dans le navigateur** ; elles ne sont pas automatiquement synchronisées avec GitHub. Exportez vos projets JSON pour les conserver et les déplacer.

## Principes

- Pixel art natif : pixels entiers, affichage en nearest-neighbor, pas d'anticrénelage sur le dessin.
- PNG transparents et JSON décrivant explicitement les frames.
- Géométrie de gameplay séparée de l'habillage artistique.
- Événements combat (impact, pulsation, statut) déclenchés par le jeu, pas simulés par la seule durée de la spritesheet.
- Sources éditables et assets réutilisables.

Voir [ROADMAP.md](ROADMAP.md) pour les prochaines passes.
