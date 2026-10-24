# KeySuite V4.28.67 Upgrade

Upgrade from V4.28.66 by copying this package over the current installation.

## Changes

1. **macOS CR Selector:** removes the CR-only Safari geometry override so CR follows the same responsive scale and breakpoints as the working Windows view.
2. **macOS quotation filename:** the release/version title observer now yields to the locked print filename, preserving `[FirstCompanyWord] - YYMMDD - Last4Ref.pdf` and revision suffixes through Safari's native print/PDF handoff.
3. **macOS Owner CHC series:** Selector navigation now uses only the explicitly selected Dashboard customer as its customer filter. A Safari-restored quotation customer can no longer hide permitted C6 while C4 remains visible.
4. **CR Curve PDF Page 3:** Selector and Product use the pre-cached CR dimension drawing assets and wait for successful image decode after PDF optimization before printing. Existing Page 3 geometry and dimension values are unchanged.
5. **Windows CHC first paint:** C4/C6 generation routing is prepared before the Selector becomes visible, preventing the temporary KeyCHC frame while leaving macOS behavior unchanged.

No database migration is required.
