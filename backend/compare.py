from typing import Dict, Any, List
from rapidfuzz import fuzz


def compare_docs(inv: Dict[str, Any], po: Dict[str, Any]) -> Dict[str, Any]:
	"""Mimic compare_and_fix logic from provided folder for status and mismatches."""
	mismatches: List[Dict[str, Any]] = []

	# Vendor check (>=90 treated as match)
	vendor_po = (po.get("vendor") or "").strip()
	vendor_inv = (inv.get("vendor") or "").strip()
	if vendor_po or vendor_inv:
		score = fuzz.ratio(vendor_po.lower(), vendor_inv.lower())
		if score < 90:
			mismatches.append({"segment": "Vendor Info", "attribute": "Vendor", "invoice": vendor_inv, "expected": vendor_po, "similarity": score})

	# Items comparison (by name >=85)
	po_items = po.get("line_items") or []  # [(name, qty, price, subtotal)]
	inv_items = inv.get("line_items") or []

	matched_inv_indices = set()
	qty_only_issue = True

	for po_name, po_qty, po_price, po_sub in po_items:
		matched = False
		for idx, (in_name, in_qty, in_price, in_sub) in enumerate(inv_items):
			score = fuzz.ratio(str(po_name), str(in_name))
			if score > 85:
				matched = True
				matched_inv_indices.add(idx)
				if po_qty != in_qty:
					mismatches.append({"segment": po_name, "attribute": "Quantity", "invoice": in_qty, "expected": po_qty})
				if abs((po_price or 0) - (in_price or 0)) > 0.01:
					mismatches.append({"segment": po_name, "attribute": "Price", "invoice": in_price, "expected": po_price})
				if abs((po_sub or 0) - (in_sub or 0)) > 0.01:
					mismatches.append({"segment": po_name, "attribute": "Total", "invoice": in_sub, "expected": po_sub})
				break
		if not matched:
			qty_only_issue = False
			mismatches.append({"segment": po_name, "attribute": "Missing", "invoice": "Not in Invoice", "expected": "Present"})

	# Extra invoice-only items
	for idx, (in_name, *_rest) in enumerate(inv_items):
		if idx not in matched_inv_indices:
			qty_only_issue = False
			mismatches.append({"segment": in_name, "attribute": "Extra Item", "invoice": "Exists only in Invoice", "expected": "-"})

	# Determine status
	status = "matched" if not mismatches else ("partial" if qty_only_issue else "mismatch")
	return {"status": status, "discrepancies": mismatches}
