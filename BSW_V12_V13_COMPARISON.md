# BSW baseline versus V1.3 comparison

The requirement refers to V1.2. The supplied V5.00.84 FULL archive actually embeds `004 - BSW 261101 - V1.1.xlsx` and labels it `261101-V1.1`. No V1.2 workbook is available; this comparison therefore uses the actual shipped data, not an invented V1.2 baseline.

| Measure | Result |
|---|---:|
| Shipped unique models | 178 |
| V1.3 unique models | 178 |
| Modified models | 84 |
| Added model names | 0 |
| Removed model names | 0 |
| Complete curves | 5 → 8 |
| Valid phase/float variants | 378 |

BSW 200F1250-4 appears identically on workbook rows 96 and 97 in both the data and price worksheets. One model is emitted; no conflicting value needs choosing.

New curves: BSW 150F500-4, BSW 200F600-4 and BSW 200F750-4. The original five curves are unchanged. Most other changes supply discharge/flange dimensions absent from the baseline.

All four worksheets were read. `Pg 2` supplies presentation/sample technical metadata; its example duty, model and motor values are not copied as universal specifications. `BSW Data` supplies model-specific motor ratings, dimensions and curves. `Price Column` supplies phase/float availability, rarity and prices. The dimension drawing comes from the workbook image.

`Pg 3 BSW Dimension!B2` is `#VALUE!`, outside the model-data columns. It is documented and excluded; model dimensions come from BSW Data G:O. Missing values remain missing.

Prices are all zero or unavailable (`x`). No positive price is invented. Existing user-edited currency price records keep their normal precedence; no database price reset or write occurs. Variant availability and rarity are unchanged from the shipped variant file.

## Modified models

| Model | Changed fields |
|---|---|
| BSW 100F100-2 | connection, dimensions |
| BSW 100F100-4 | connection, dimensions |
| BSW 100F1000-4 | connection, dimensions |
| BSW 100F1250-4 | connection, dimensions |
| BSW 100F150-2 | connection, dimensions |
| BSW 100F150-4 | connection, dimensions |
| BSW 100F1500-4 | connection, dimensions |
| BSW 100F200-2 | connection, dimensions |
| BSW 100F200-4 | connection, dimensions |
| BSW 100F250-2 | connection, dimensions |
| BSW 100F250-4 | connection, dimensions |
| BSW 100F300-2 | connection, dimensions |
| BSW 100F300-4 | connection, dimensions |
| BSW 100F40-2 | connection, dimensions |
| BSW 100F400-4 | connection, dimensions |
| BSW 100F500-4 | connection, dimensions |
| BSW 100F55-2 | connection, dimensions |
| BSW 100F600-4 | connection, dimensions |
| BSW 100F75-2 | connection, dimensions |
| BSW 100F75-4 | connection, dimensions |
| BSW 100F750-4 | connection, dimensions |
| BSW 150F100-2 | connection, dimensions |
| BSW 150F1000-4 | connection, dimensions |
| BSW 150F1250-4 | connection, dimensions |
| BSW 150F150-2 | connection, dimensions |
| BSW 150F150-4 | connection, dimensions |
| BSW 150F1500-4 | connection, dimensions |
| BSW 150F1750-4 | connection, dimensions |
| BSW 150F200-2 | connection, dimensions |
| BSW 150F200-4 | connection, dimensions |
| BSW 150F2150-4 | connection, dimensions |
| BSW 150F250-2 | connection, dimensions |
| BSW 150F250-4 | connection, dimensions |
| BSW 150F2500-4 | connection, dimensions |
| BSW 150F300-2 | connection, dimensions |
| BSW 150F300-4 | connection, dimensions |
| BSW 150F400-4 | connection, dimensions |
| BSW 150F500-4 | weight_kg, connection, dimensions, curve |
| BSW 150F600-4 | connection, dimensions |
| BSW 150F75-2 | connection, dimensions |
| BSW 150F750-4 | connection, dimensions |
| BSW 200F100-4 | connection, dimensions |
| BSW 200F1000-4 | connection, dimensions |
| BSW 200F1250-4 | connection, dimensions |
| BSW 200F150-2 | connection, dimensions |
| BSW 200F150-4 | connection, dimensions |
| BSW 200F1500-4 | connection, dimensions |
| BSW 200F1750-4 | connection, dimensions |
| BSW 200F200-2 | connection, dimensions |
| BSW 200F200-4 | connection, dimensions |
| BSW 200F2150-4 | connection, dimensions |
| BSW 200F250-2 | connection, dimensions |
| BSW 200F250-4 | connection, dimensions |
| BSW 200F2500-4 | connection, dimensions |
| BSW 200F300-2 | connection, dimensions |
| BSW 200F300-4 | connection, dimensions |
| BSW 200F400-4 | connection, dimensions |
| BSW 200F500-4 | connection, dimensions |
| BSW 200F500-4H | connection, dimensions |
| BSW 200F600-4 | weight_kg, connection, dimensions, curve |
| BSW 200F600-4H | connection, dimensions |
| BSW 200F750-4 | weight_kg, connection, dimensions, curve |
| BSW 65F10-2 | dimensions |
| BSW 65F100-2 | dimensions |
| BSW 65F15-2 | dimensions |
| BSW 65F150-2 | dimensions |
| BSW 65F20-2 | dimensions |
| BSW 65F200-2 | dimensions |
| BSW 65F250-2 | dimensions |
| BSW 65F30-2 | dimensions |
| BSW 65F300-2 | dimensions |
| BSW 65F40-2 | dimensions |
| BSW 65F55-2 | dimensions |
| BSW 65F75-2 | dimensions |
| BSW 80F100-2 | connection, dimensions |
| BSW 80F150-2 | connection, dimensions |
| BSW 80F20-2 | connection, dimensions |
| BSW 80F200-2 | connection, dimensions |
| BSW 80F250-2 | connection, dimensions |
| BSW 80F30-2 | connection, dimensions |
| BSW 80F300-2 | connection, dimensions |
| BSW 80F40-2 | connection, dimensions |
| BSW 80F55-2 | connection, dimensions |
| BSW 80F75-2 | connection, dimensions |

The complete before/after field details are in BSW_V13_COMPARISON.json.
