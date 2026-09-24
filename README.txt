MMHVAULT Investment Integrity v4.4.0

Replace only app.html.

Changes:
- Crypto BUY/SELL ledger with remaining cost basis and realized P/L.
- Crypto fee-asset aware accounting when metadata is present.
- Crypto history shows Filled, Net Qty and Fee Asset.
- Gold ledger uses weight_kyattha as authoritative; BUY adds and SELL reduces weight.
- Gold remaining cost basis / unrealized P/L after SELL is handled by average-cost basis.
- Gold history shows Gold Value, Fee, Weight and current value.
- Investment data integrity panel for Crypto and Gold.
- Existing Supabase schema is preserved; order ID / fee asset / filled quantity can be carried in MMH_META note metadata.
- Existing visual/home/navigation pages are not intentionally changed.
