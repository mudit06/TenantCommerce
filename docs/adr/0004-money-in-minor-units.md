# ADR 0004: Money in integer minor units

- Status: accepted (3 October 2026)
- Context: prices, GST splits, delivery charges, COD fees, refunds and invoice totals must add up to
  the paisa on GST invoices and in GSTR-1 exports. Floating point numbers can't represent most
  rupee-and-paise amounts exactly, and JavaScript numbers are floats.
- Decision: every amount is an integer number of minor units (paise for INR) stored as
  `{ amountMinor, currency }` through the shared `moneyField()` (docs/06). All arithmetic goes
  through `src/lib/money` (`fromRupees`, `add`, `multiply`, `allocate`, `formatINR`); allocation
  across lines uses largest remainder so totals never drift. Rupees appear only at the edges:
  CSV import, admin input, display, and providers that want rupees (Shiprocket), converted inside
  the connector (docs/09).
- Consequences: no floats for money anywhere, enforced by review and lint; tax is computed per line
  in paise and rounded once per line (docs/11); multi-currency later only needs a currency table
  with each currency's minor-unit size.
