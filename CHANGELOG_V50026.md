# KeySuite V5.00.26 — BUG 001–010

- **001** KV NPSHr is a continuous cubic sampled at 221 points; exact source-point substitution was removed from NPSHr, Efficiency and Power after inspection confirmed the same discontinuity path.
- **002** KV connection and the KV/KVC/KVN material descriptions are corrected.
- **003** Selection → KV material options are exactly KV, KVC and KVN.
- **004** KV PDF material presentation follows the selected KV/KVC/KVN mapping.
- **005** Product → KV navigation is generated from complete verified source groups in logical order; incomplete/unverified later groups remain hidden.
- **006** Product → KV now has the matching material selector and propagates it through Curve, Assembly and Quote.
- **007** BGF is hosted in the Standard Selector Responsive Layout with CR-style duty, multi-duty, display, system, orifice, ranking, curve and output functions.
- **008** Product → BGF model loading now uses both load and ready handshakes, with a retry for cached/early iframe readiness.
- **009** BGF motor descriptions include the actual HP and `(415V / 3Ph / 50Hz)`.
- **010** Selection → BGF defaults to Motor and switches to the corresponding Engine model without duplicating hydraulic data; Engine output omits motor electrical specifications.
