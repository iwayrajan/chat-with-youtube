# Personal order tracker

`Student_Order_Tracker.xlsx` — a workbook for tracking who's ordered which project,
what they paid, and where each delivery stands.

This version adds a **Product** column so a single tracker covers both
`PDF RAG Chat` and `Chat with YouTube` (and any future project you add to the
dropdown in `build_tracker.py`), rather than keeping a separate spreadsheet per
product. Recommendation: treat *this* copy (in the `chat-with-youtube` repo) as
the one you actually keep using day to day, and either delete or archive the
older single-product tracker in `pdf-rag-chat/tracker/` to avoid updating two
files and losing track of which one is current.

## Sheets

**Orders Tracker** — one row per order. Yellow cells are for you to fill in;
gray cells (Balance Due, Payment Status) calculate automatically from what you
enter in Price Charged and Amount Paid. Summary totals (orders, revenue, collected,
pending) are at the top and update automatically as you add rows. The Product
column is a dropdown — add a third product to it by editing the `dv_product`
list in `build_tracker.py`.

**Delivery Checklist** — the same 13 steps every order needs, from confirming
price through to the post-viva follow-up. Mark each "Done?" column as you go;
use Notes for anything specific to that order. The checklist steps mention
`student_config.json` and `scripts/generate_all.sh`, which are per-product —
run them from whichever product's repo the order is for.

## Regenerating

If you want to tweak columns, colors, the product list, or the checklist steps,
edit `build_tracker.py` and rerun:
```bash
pip install openpyxl --break-system-packages   # if not already installed
python3 build_tracker.py
```
Opening the regenerated file in Excel or LibreOffice recalculates the formulas
automatically — no extra step needed on your end.

This will overwrite `Student_Order_Tracker.xlsx` — copy your existing data out
first if you've already been using it, since regenerating starts from the
example row again.
