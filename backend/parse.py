import re
from typing import Dict, Any, List, Tuple
from datetime import datetime
import logging

logger = logging.getLogger('parse')

# --- helpers from user style ---

def _safe_float(v: Any) -> float | None:
	try:
		return float(str(v).replace(',', '').strip())
	except Exception:
		return None


def _normalize_date_str(s: str) -> str:
	s = s.strip()
	m = re.match(r"([A-Za-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})", s)
	if m:
		mon = m.group(1)[:3].lower()
		day = m.group(2)
		year = m.group(3)
		months = {'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06','jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12'}
		mm = months.get(mon)
		if mm:
			return f"{day.zfill(2)}/{mm}/{year}"
	for fmt in ["%d/%m/%Y","%Y/%m/%d","%d-%m-%Y"]:
		try:
			return datetime.strptime(s.replace('-', '/'), fmt).strftime('%d/%m/%Y')
		except Exception:
			pass
	return ''


def _clean_line(line: str) -> str:
	line = re.sub(r"([A-Za-z])(\[?\d)", r"\1 \2", line)
	line = re.sub(r"[^A-Za-z0-9\s\.\-\(\)]", "", line)
	return line.strip()


def _parse_items(text: str) -> List[Tuple[str,int,float,float]]:
	items: List[Tuple[str,int,float,float]] = []
	lines = [_clean_line(l) for l in text.splitlines() if l.strip()]
	pat = re.compile(r"^(?:\d+\s+)?([A-Za-z0-9\s\-\(\)]+?)\s+(\d+)\s+([\d,]*\.?\d+)\s+([\d,]*\.?\d+)\s*$")
	for ln in lines:
		m = pat.search(ln)
		if not m:
			continue
		item = m.group(1).strip()
		qty = int(m.group(2))
		price = _safe_float(m.group(3)) or 0.0
		sub = _safe_float(m.group(4)) or 0.0
		items.append((item, qty, price, sub))
	return items


# --- main parse ---

def parse_fields(text: str) -> Dict[str, Any]:
	if not text:
		return {"vendor":"","invoiceNo":"","orderId":"","date":"","total":None,"quantities":[],"line_items":[],"raw":text}

	vendor = ''
	m = re.search(r"\bVendor\s*[:\-]\s*(.+)", text, re.I)
	if m:
		vendor = m.group(1).strip()

	invoice_no = ''
	m = re.search(r"\bInvoice\s*number\s*[:\-]\s*([A-Za-z0-9\-_/\.]+)", text, re.I)
	if m:
		invoice_no = m.group(1).strip()

	order_id = ''
	m = re.search(r"\bPO\s*number\s*[:\-]\s*([A-Za-z0-9\-_/\.]+)", text, re.I)
	if m:
		order_id = m.group(1).strip()

	date = ''
	m = re.search(r"\b(Invoice\s*date|date\s*issued)\s*[:\-]\s*([A-Za-z]+\s+\d{1,2}\s*,?\s*\d{4}|\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})", text, re.I)
	if m:
		date = _normalize_date_str(m.group(2))

	items = _parse_items(text)
	quantities = [q for _, q, _, _ in items]
	total = None
	if items:
		total = round(sum(sub for *_, sub in items), 2)

	result = {
		"vendor": vendor,
		"invoiceNo": invoice_no,
		"orderId": order_id,
		"date": date,
		"total": total,
		"quantities": quantities,
		"line_items": items,
		"raw": text,
	}
	logger.info("parse_fields -> vendor=%s invoiceNo=%s orderId=%s date=%s total=%s items=%d", result['vendor'], result['invoiceNo'], result['orderId'], result['date'], result['total'], len(items))
	return result