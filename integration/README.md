# Existing KeySuite Integration

Load these scripts after the current KeySuite application files:

```html
<script src="data/master-data.js"></script>
<script src="integration/keysuite-pricing-engine.js"></script>
```

Create the pricing service:

```js
const pricing = KeySuitePricing.create(window.KEYSUITE_MASTER_DATA);
const company = pricing.companyById('COID00001');
const category = pricing.categoryForCompany(company.id);
const result = pricing.priceProduct('CHC 15-50', 'CHC', category.id);
```

`result.finalPrice` is the V1.00 price to place into the quotation item unit-price field.
