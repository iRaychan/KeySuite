# Free Hybrid 01 — asset sources and licenses

Verified 29 October 2026. Total asset cost: **RM 0**. No purchases, subscriptions, trials or paid Source edition used.

## Assets used

| Component | Original source and creator | License | Modification / commercial distribution | Changes in this study |
|---|---|---|---|---|
| Integrated stylized head and eyeballs | [Human Base Meshes v1.4.1](https://www.blender.org/download/demo-files/#assets), Blender Studio/community; head collection credited to Julien Kaspar | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Permitted; no attribution obligation under CC0 | Adjusted proportions and neck; new simple skin/eye materials; static subdivision |
| Hair_SimpleParted and Eyebrows_Regular | [Universal Base Characters, Standard](https://quaternius.com/packs/universalbasecharacters.html), Quaternius; [download page](https://quaternius.itch.io/universal-base-characters) | CC0 1.0 | Permitted; no attribution obligation under CC0 | Fitted/scaled hair; fitted brows; dark material; no source rig retained |
| Arms/hands, shirt, trousers and shoes | [Snow v4](https://studio.blender.org/characters/snow/v4/), Blender Foundation | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Permitted with attribution, license link and notice of changes | Excluded Snow head/hair; removed rig, facial shapes and unused body areas; adjusted static arm pose; recolored clothes and skin |
| Collar panels and white neck tabs | Created for this local prototype | Original project additions | No third-party asset charge | Simple clothing mesh panels |
| Browser renderer | Three.js 0.170.0; license included in preview/vendor/THREE-LICENSE.txt | MIT | Permitted with license notice | Embedded in standalone local HTML viewer |

Required Snow credit: **Snow Rig (CC) Blender Foundation | studio.blender.org**. This is an adapted static assembly, not an endorsed Blender Foundation or Quaternius product. Preserve the source links, CC BY 4.0 link and modification notice when redistributing the derivative. CC licenses do not waive unrelated trademark/personality rights.

## Evidence retained

- `research/demo-license.html`: official Blender download listing labels this bundle CC0.
- Bundle's embedded README states all provided assets are CC0. A separate legacy text block mentions the Rain Rig's CC BY license; it is recorded in `review/base-inventory.log`. We are using the base-mesh bundle as expressly licensed by its asset-wide README and official listing, not redistributing a Rain rig.
- `source/Universal Base Characters[Standard]/License_Standard.txt`: explicitly identifies the free Standard edition and CC0 1.0.
- `research/quaternius-official.html`: original asset page's CC0 statement.
- `research/snow-source.html`: original Snow page links CC BY 4.0 and specifies attribution.
- `review/asset-hashes.json`: checksums of the source files used.

## Other researched candidates — not incorporated

- [Boy — A Rigged Character, zickkie](https://blendswap.com/blend/27209): listing and download page state CC-BY; sign-in required for download. Version and source-file terms not inspected, so not treated as cleared for this package.
- [Stylized Boy, Miran Osman](https://sketchfab.com/3d-models/stylized-boy-da90c25bafb44b8aa6dfba1eb800c985): indexed as CC Attribution; source page access returned 403. License/file not fully verified; excluded.
- [Stylized Head & Hair, Ameer Studio](https://sketchfab.com/3d-models/stylized-head-hair-3c442d22eb974173b77f11a6995477bf): indexed as CC Attribution; downloadable source/license not obtained; excluded.
- [Plewr rigged character](https://plewr.itch.io/3d-rigged-character): creator page states CC0, but the low-poly style is less suited to the approved face; not downloaded or used.
- Quaternius free Standard contains the superhero bases and a subset of hair, not all six advertised base variants. The extra source content is paid and was not obtained. The superhero head proportions were not selected as the facial foundation.

## V5.00.11 derivative
Added compatible body skin weights and existing KeyHQ body animation clips. Facial sculpt and original prototype files are unchanged. No endorsement implied.
