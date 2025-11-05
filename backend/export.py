import pandas as pd
from typing import Dict, Any, List
from rapidfuzz import fuzz
from io import StringIO
import logging

logger = logging.getLogger('export')


def compare_and_fix_for_export(po_data: Dict[str, Any], inv_data: Dict[str, Any]) -> tuple[pd.DataFrame, pd.DataFrame]:
	"""
	Compare PO and Invoice, correct discrepancies, return corrected DataFrame and report DataFrame.
	Based on user's provided code structure.
	"""
	corrected_items = []
	mismatches = []
	matched_inv_indices = set()

	# Convert line_items to Items format
	po_items = []
	for item_tuple in po_data.get("line_items", []):
		if len(item_tuple) >= 4:
			po_items.append({
				"Item": item_tuple[0],
				"Quantity": item_tuple[1],
				"Price": item_tuple[2],
				"Total": item_tuple[3]
			})

	inv_items = []
	for item_tuple in inv_data.get("line_items", []):
		if len(item_tuple) >= 4:
			inv_items.append({
				"Item": item_tuple[0],
				"Quantity": item_tuple[1],
				"Price": item_tuple[2],
				"Total": item_tuple[3]
			})

	# Vendor check
	vendor_po = po_data.get("vendor", "") or ""
	vendor_inv = inv_data.get("vendor", "") or ""
	if vendor_po or vendor_inv:
		if fuzz.ratio(vendor_po.lower(), vendor_inv.lower()) < 90:
			mismatches.append(["Vendor Info", "Vendor", vendor_inv, vendor_po])

	# Compare PO items with Invoice items
	for po_item in po_items:
		matched = False
		for idx, inv_item in enumerate(inv_items):
			if fuzz.ratio(str(po_item["Item"]), str(inv_item["Item"])) > 85:
				matched = True
				matched_inv_indices.add(idx)
				status = "Matched"

				# Compare values and correct
				for key in ["Quantity", "Price", "Total"]:
					if abs((po_item.get(key) or 0) - (inv_item.get(key) or 0)) > 0.01:
						mismatches.append([po_item["Item"], key, inv_item.get(key), po_item.get(key)])
						inv_item[key] = po_item[key]
						status = "Corrected"

				inv_item["Status"] = status
				corrected_items.append(inv_item)
				break

		if not matched:
			po_item["Status"] = "Missing in Invoice (Added)"
			mismatches.append([po_item["Item"], "Missing", "Not in Invoice", "Added"])
			corrected_items.append(po_item)

	# Add extra invoice-only items
	for idx, inv_item in enumerate(inv_items):
		if idx not in matched_inv_indices:
			inv_item["Status"] = "Extra in Invoice (Kept)"
			mismatches.append([inv_item["Item"], "Extra Item", "Exists only in Invoice", "Kept as-is"])
			corrected_items.append(inv_item)

	if not corrected_items:
		return pd.DataFrame(), pd.DataFrame(columns=["Segment", "Attribute", "Invoice_Value", "Corrected_Value"])

	corrected_df = pd.DataFrame(corrected_items)
	corrected_df["Quantity"] = pd.to_numeric(corrected_df["Quantity"], errors="coerce").fillna(0).astype(int)
	corrected_df["Price"] = pd.to_numeric(corrected_df["Price"], errors="coerce").fillna(0.0)
	corrected_df["Total"] = pd.to_numeric(corrected_df["Total"], errors="coerce").fillna(0.0)
	grand_total = round(corrected_df["Total"].sum(), 2)
	
	po_order_id = po_data.get("orderId") or po_data.get("Order_ID") or ""
	po_vendor = po_data.get("vendor") or po_data.get("Vendor") or ""
	
	corrected_df["Order_ID"] = po_order_id
	corrected_df["Vendor"] = po_vendor
	corrected_df["Grand_Total"] = grand_total

	# Add summary row
	summary = {
		"Item": "GRAND TOTAL",
		"Quantity": "",
		"Price": "",
		"Total": grand_total,
		"Status": "",
		"Order_ID": po_order_id,
		"Vendor": po_vendor,
		"Grand_Total": grand_total
	}
	corrected_df = pd.concat([corrected_df, pd.DataFrame([summary])], ignore_index=True)
	
	report_df = pd.DataFrame(mismatches, columns=["Segment", "Attribute", "Invoice_Value", "Corrected_Value"])
	return corrected_df, report_df


def generate_csv_from_records(records: List[Dict[str, Any]], export_type: str = "corrected") -> str:
	"""
	Generate CSV from list of verification records.
	export_type: "corrected" (default) or "report"
	"""
	if not records:
		return ""

	all_corrected = []
	all_reports = []

	for rec in records:
		inv = rec.get("invoice", {})
		po = rec.get("po", {})
		if not inv or not po:
			continue
		
		try:
			corrected_df, report_df = compare_and_fix_for_export(po, inv)
			if not corrected_df.empty:
				all_corrected.append(corrected_df)
			if not report_df.empty:
				all_reports.append(report_df)
		except Exception as e:
			logger.warning("Export failed for record %s: %s", rec.get("_id"), e)

	if export_type == "report":
		if not all_reports:
			return ""
		combined = pd.concat(all_reports, ignore_index=True)
	else:
		if not all_corrected:
			return ""
		combined = pd.concat(all_corrected, ignore_index=True)

	output = StringIO()
	combined.to_csv(output, index=False)
	return output.getvalue()

