# KeySuite V5.00.78 upgrade

Overlay this package on a V5.00.77 installation. Preserve the folder structure when extracting files. Reload the application and confirm that the sidebar displays V5.00.78.

- Brand Margin now runs before the existing downstream pricing rules. Each BOM component uses its recorded brand or the existing family brand. An ES Pumpset motor without a separately recorded brand follows its ES pump. The Keylargo Baseplate and Coupling retain their own brand context. The audit shows 0% explicitly.
- The ES, CR and KV selectors keep their current duty points and results when returning within KeySuite. Quick Selection can still initiate a new duty.
- An invalid configured Brand Margin blocks calculated pricing. Explicit manual selling prices and previously saved quotations keep their recorded amounts.

This update needs no database migration or seed.
