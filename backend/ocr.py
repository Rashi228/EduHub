import os
from typing import List, Dict, Tuple
from io import BytesIO
import logging

# Prefer pytesseract pipeline from provided project; keep PaddleOCR optional fallback
try:
	import pytesseract  # type: ignore
	# Configure executable path if not on PATH
	exe_hint = os.getenv('TESSERACT_EXE') or r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
	if os.path.exists(exe_hint):
		pytesseract.pytesseract.tesseract_cmd = exe_hint  # type: ignore
		logging.getLogger('ocr').info("Using Tesseract exe: %s", exe_hint)
except Exception:
	pytesseract = None  # type: ignore

try:
	from pdf2image import convert_from_path  # type: ignore
except Exception:  # pragma: no cover
	convert_from_path = None  # type: ignore

try:
	import fitz  # PyMuPDF
except Exception:  # pragma: no cover
	fitz = None  # type: ignore

from PIL import Image, ImageEnhance, ImageFilter

# Optional OpenCV / NumPy for preprocessing and zonal crops
try:
	import cv2  # type: ignore
	import numpy as np  # type: ignore
except Exception:  # pragma: no cover
	cv2 = None  # type: ignore
	np = None  # type: ignore

logger = logging.getLogger('ocr')


def preprocess_image_basic(image_path: str) -> Image.Image:
	"""Enhance image for better OCR accuracy (from user's ref)."""
	img = Image.open(image_path)
	img = img.convert("L")
	img = img.filter(ImageFilter.SHARPEN)
	enhancer = ImageEnhance.Contrast(img)
	img = enhancer.enhance(2)
	return img


def _pdf_to_images_pymupdf(path: str) -> List[Image.Image]:
	if fitz is None:
		raise RuntimeError('PyMuPDF not available to render PDF')
	logger.info("Rendering PDF via PyMuPDF: %s", path)
	doc = fitz.open(path)
	imgs: List[Image.Image] = []
	for i, page in enumerate(doc):
		pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
		buf = BytesIO(pix.tobytes("png"))
		im = Image.open(buf).convert('RGB')
		logger.info("Page %d size=%s", i, im.size)
		imgs.append(im)
	doc.close()
	return imgs


def pdf_to_images(path: str) -> List[Image.Image]:
	if convert_from_path is not None:
		try:
			logger.info("Rendering PDF via pdf2image: %s", path)
			imgs = convert_from_path(path, fmt='png')
			for i, im in enumerate(imgs):
				logger.info("pdf2image page %d size=%s", i, im.size)
			return imgs
		except Exception as e:
			logger.warning("pdf2image failed, fallback to PyMuPDF: %s", e)
	return _pdf_to_images_pymupdf(path)


def image_paths_from_upload(path: str) -> List[str]:
	root, ext = os.path.splitext(path.lower())
	if ext == '.pdf':
		images = pdf_to_images(path)
		out_paths = []
		for i, im in enumerate(images):
			out = f"{root}_p{i}.png"
			im.save(out)
			logger.info("Saved page image %s", out)
			out_paths.append(out)
		return out_paths
	else:
		logger.info("Using raster image %s", path)
		return [path]


def ocr_text_from_paths(paths: List[str]) -> str:
	"""Run OCR using pytesseract over provided page/image paths and return text with newlines."""
	text_parts: List[str] = []
	if pytesseract is None:
		logger.warning("pytesseract not available; returning empty text")
		return ''
	for p in paths:
		try:
			# use lightweight preprocessing tuned for OCR
			img = preprocess_image_basic(p)
			text = pytesseract.image_to_string(img)
			logger.info("OCR extracted %d chars from %s", len(text or ''), p)
			text_parts.append(text or '')
		except Exception as e:
			logger.exception("OCR failed on %s: %s", p, e)
			text_parts.append('')
	return '\n'.join(text_parts)


def ocr_zonal_from_image_path(image_path: str, zones: Dict[str, List[int]]) -> Dict[str, str]:
	out: Dict[str, str] = {}
	if pytesseract is None or cv2 is None or np is None:
		return out
	img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
	if img is None:
		return out
	for field, coords in (zones or {}).items():
		try:
			y1, y2, x1, x2 = coords
			crop = img[y1:y2, x1:x2]
			text = pytesseract.image_to_string(crop)
			out[field] = (text or '').strip()
			logger.info("Zonal OCR %s -> '%s'", field, out[field])
		except Exception as e:
			logger.warning("Zonal OCR failed for %s: %s", field, e)
			out[field] = ''
	return out
