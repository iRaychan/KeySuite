# KeySuite V4.29.22

- Removed the artificial rule that forced pump shafts of 24 mm or smaller onto the F flange.
- Evaluates both pump H / motor F and pump F / motor H arrangements whenever the tyre coupling supports distinct flange orientations.
- Applies nominal torque and maximum-speed checks before accepting a coupling.
- Applies both the installed Taper-Lock bush capacity and Fenaflex flange-specific maximum bore, using the smaller limit.
- Correctly resolves ES 32-13 with a 40 HP 4-pole IEC 200L motor to F80, pump H/2012 and motor F/2517.
- Applies the same general algorithm in the KeyBot Telegram workflow.
- Leaves coupling component pricing, quantity, quotation snapshots and BOM assembly behavior unchanged.
- Rotates the service-worker cache and visible release lock to V4.29.22.
