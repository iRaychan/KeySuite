# KeySuite V4.23.18 Upgrade

## Reversible global PDF optimization
- Adds **Optimized PDF** control, enabled by default and stored locally.
- When enabled, raster logos and dimension/outline drawings are downsampled and JPEG-compressed only in the temporary print/export document. Original source assets are unchanged.
- Text, tables, lines and SVG pump curves remain vector/sharp.
- When disabled, the previous full-quality export path is used.
- Applies to CHC C4/C6, BFI and ES selector/product PDF exports and quotation PDF printing.
- KeyBot PDF assets use smaller optimized report assets by default while retaining the original assets in source.

No database migration is required. The Telegram function must be redeployed because KeyBot PDF generation changes.
