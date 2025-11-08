import os
from datetime import datetime, timedelta, timezone
import time
import traceback
import logging
import json
import google.generativeai as genai

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING, ASCENDING
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from dotenv import load_dotenv
from bson import ObjectId

# InvoSync imports (disabled for EduHub)
# from ocr import image_paths_from_upload, ocr_text_from_paths
# from parse import parse_fields
# from compare import compare_docs
# from export import generate_csv_from_records
from ml_models import (
	get_recommendation_engine, get_task_prioritizer, 
	get_mood_predictor, get_note_classifier,
	get_task_scheduler,
)

# Logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger('backend')

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/futurix')
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-me')
JWT_EXP_MIN = int(os.getenv('JWT_EXP_MIN', '60'))
UPLOAD_DIR = os.getenv('UPLOAD_DIR', os.path.join(os.path.dirname(__file__), 'uploads'))
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# Initialize Gemini AI
gemini_model = None  # Initialize before try block

if GEMINI_API_KEY:
	try:
		genai.configure(api_key=GEMINI_API_KEY)
		
		# Try to list available models first
		available_models = []
		try:
			for model in genai.list_models():
				if 'generateContent' in model.supported_generation_methods:
					available_models.append(model.name)
			logger.info(f"Available models: {available_models[:5]}...")  # Log first 5
		except Exception as list_err:
			logger.warning(f"Could not list models: {list_err}")
		
		# Try different model names - prioritize newer models that are available
		model_names = [
			'gemini-2.5-flash',           # Latest Flash (from your available models)
			'gemini-2.5-pro-preview-05-06',  # Latest Pro preview
			'gemini-1.5-pro-latest',     # 1.5 Pro latest
			'gemini-1.5-pro',             # 1.5 Pro
			'gemini-1.5-flash-latest',    # 1.5 Flash latest
			'gemini-1.5-flash',            # 1.5 Flash
			'gemini-pro',                  # Pro (fallback)
		]
		
		# If we found available models, use the first one that matches
		if available_models:
			for model_name in model_names:
				full_model_name = f"models/{model_name}"
				if full_model_name in available_models:
					try:
						logger.info(f"Using available model: {model_name}")
						gemini_model = genai.GenerativeModel(model_name)
						logger.info(f"Gemini AI initialized successfully with {model_name}")
						break
					except Exception as model_err:
						logger.debug(f"Model {model_name} failed: {model_err}")
						continue
		
		# If no model found from available list, try direct initialization
		if not gemini_model:
			for model_name in model_names:
				try:
					logger.info(f"Trying to initialize model: {model_name}")
					gemini_model = genai.GenerativeModel(model_name)
					# Test the model with a simple request
					test_response = gemini_model.generate_content("Hi")
					logger.info(f"Gemini AI initialized successfully with {model_name}")
					break
				except Exception as model_err:
					logger.debug(f"Model {model_name} failed: {model_err}")
					continue
		
		if not gemini_model:
			error_msg = "All Gemini model attempts failed. Please check your API key and available models."
			if available_models:
				error_msg += f" Available models: {available_models[:5]}"
			raise Exception(error_msg)
			
	except Exception as e:
		logger.exception("Failed to initialize Gemini AI: %s", e)
		gemini_model = None
else:
	logger.warning("GEMINI_API_KEY not found, AI features disabled")
	gemini_model = None

os.makedirs(UPLOAD_DIR, exist_ok=True)

client = MongoClient(MONGO_URI)
db = client.get_default_database()
users = db['users']
# InvoSync collections (disabled for EduHub)
# verifications = db['verifications']
# exports = db['exports']
# EduHub collections
resources = db['resources']
streaks = db['streaks']
focus_sessions = db['focus_sessions']
todos = db['todos']
moods = db['moods']
medications = db['medications']
opportunities = db['opportunities']

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv('CORS_ORIGIN', '*')}}, supports_credentials=True, allow_headers=["*"], methods=["GET","POST","OPTIONS"], expose_headers=["*"])


def create_token(user_id: str):
	now = datetime.now(timezone.utc)
	payload = {
		"sub": str(user_id),
		"exp": now + timedelta(minutes=JWT_EXP_MIN),
		"iat": now,
	}
	return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str):
	return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])  # raises on error


# ==================== Authentication Endpoints (DISABLED) ====================
# Authentication is disabled - app works without login/signup
# All users use a demo user ID: "demo_user_123"

# @app.post('/api/auth/signup')
# def signup():
# 	try:
# 		data = request.get_json(force=True) or {}
# 		email = (data.get('email') or '').strip().lower()
# 		name = (data.get('name') or '').strip()
# 		password = data.get('password') or ''
# 		if not email or not password:
# 			return jsonify({"error": "email and password required"}), 400
# 		if users.find_one({"email": email}):
# 			return jsonify({"error": "email already registered"}), 409
# 		hash_ = generate_password_hash(password)
# 		res = users.insert_one({
# 			"email": email,
# 			"name": name,
# 			"password": hash_,
# 			"createdAt": datetime.now(timezone.utc),
# 		})
# 		token = create_token(res.inserted_id)
# 		logger.info("User signup: email=%s", email)
# 		return jsonify({"token": token, "user": {"id": str(res.inserted_id), "email": email, "name": name}}), 200
# 	except Exception as e:
# 		logger.exception("Signup error: %s", e)
# 		return jsonify({"error": "signup_failed"}), 500

# @app.post('/api/auth/login')
# def login():
# 	try:
# 		data = request.get_json(force=True) or {}
# 		email = (data.get('email') or '').strip().lower()
# 		password = data.get('password') or ''
# 		if not email or not password:
# 			return jsonify({"error": "email and password required"}), 400
# 		user = users.find_one({"email": email})
# 		if not user or not check_password_hash(user.get('password', ''), password):
# 			logger.warning("Login failed for email=%s", email)
# 			return jsonify({"error": "invalid credentials"}), 401
# 		token = create_token(user['_id'])
# 		logger.info("User login: email=%s", email)
# 		return jsonify({"token": token, "user": {"id": str(user['_id']), "email": user['email'], "name": user.get('name', '')}}), 200
# 	except Exception as e:
# 		logger.exception("Login error: %s", e)
# 		return jsonify({"error": "login_failed"}), 500

@app.get('/api/auth/me')
def me():
	"""Return demo user info (authentication disabled)."""
	return jsonify({
		"user": {
			"id": "demo_user_123",
			"email": "demo@eduhub.com",
			"name": "Demo User"
		}
	}), 200


# ==================== InvoSync Endpoints (DISABLED - EduHub project only) ====================
# These endpoints are from the InvoSync project and are not used in EduHub
# Uncomment if you need invoice verification features

# @app.post('/api/verify')
# def verify():
# 	"""Accepts multipart/form-data with fields invoice and po. Returns extraction and comparison."""
# 	debug = request.args.get('debug') == '1'
# 	stage = {}
# 	try:
# 		stage['t0'] = time.perf_counter()
# 		if 'invoice' not in request.files or 'po' not in request.files:
# 			return jsonify({"error": "Both 'invoice' and 'po' files are required"}), 400
#
# 		invoice_file = request.files['invoice']
# 		po_file = request.files['po']
# 		logger.info("/verify received files invoice=%s po=%s", invoice_file.filename, po_file.filename)
#
# 		allowed = {'.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff'}
# 		def _save(file):
# 			name = file.filename or 'upload'
# 			ext = os.path.splitext(name)[1].lower()
# 			if ext not in allowed:
# 				raise ValueError('Unsupported file type: ' + ext)
# 			path = os.path.join(UPLOAD_DIR, f"{datetime.now(timezone.utc).timestamp()}_{name}")
# 			file.save(path)
# 			return path
#
# 		inv_path = _save(invoice_file)
# 		po_path = _save(po_file)
# 		logger.info("Saved uploads to inv_path=%s po_path=%s", inv_path, po_path)
# 		stage['t_saved'] = time.perf_counter()
#
# 		inv_imgs = image_paths_from_upload(inv_path)
# 		po_imgs = image_paths_from_upload(po_path)
# 		logger.info("Image paths expanded inv=%s po=%s", inv_imgs, po_imgs)
# 		stage['t_images'] = time.perf_counter()
#
# 		inv_text = ocr_text_from_paths(inv_imgs)
# 		po_text = ocr_text_from_paths(po_imgs)
# 		logger.info("OCR text lens inv=%d po=%d", len(inv_text or ''), len(po_text or ''))
# 		logger.info("OCR inv head: %s", (inv_text or '').splitlines()[:5])
# 		logger.info("OCR po head: %s", (po_text or '').splitlines()[:5])
# 		stage['t_ocr'] = time.perf_counter()
#
# 		inv_data = parse_fields(inv_text)
# 		po_data = parse_fields(po_text)
# 		logger.info("Parsed invoice fields: %s", {k: inv_data.get(k) for k in ['vendor','invoiceNo','orderId','date','total']})
# 		logger.info("Parsed PO fields: %s", {k: po_data.get(k) for k in ['vendor','invoiceNo','orderId','date','total']})
# 		stage['t_parse'] = time.perf_counter()
#
# 		import re as _re
# 		def _from_name(name: str, pats):
# 			for p in pats:
# 				m = _re.search(p, name, _re.I)
# 				if m:
# 					return m.group(1)
# 			return ''
# 		inv_name = invoice_file.filename or ''
# 		po_name = po_file.filename or ''
# 		if not inv_data.get('invoiceNo'):
# 			inv_data['invoiceNo'] = _from_name(inv_name, [r"inv(?:oice)?[_-]?([A-Za-z0-9-_/]+)", r"([A-Za-z]{2,}-?\d+)"])
# 		if not inv_data.get('orderId'):
# 			inv_data['orderId'] = _from_name(inv_name, [r"po[_-]?([A-Za-z0-9-_/]+)"])
# 		if not po_data.get('orderId'):
# 			po_data['orderId'] = _from_name(po_name, [r"po[_-]?([A-Za-z0-9-_/]+)", r"order[_-]?id[_-]?([A-Za-z0-9-_/]+)"])
# 		if not po_data.get('invoiceNo'):
# 			po_data['invoiceNo'] = _from_name(po_name, [r"inv(?:oice)?[_-]?([A-Za-z0-9-_/]+)"])
#
# 		result = compare_docs(inv_data, po_data)
# 		logger.info("Compare result: status=%s, discrepancies=%d", result.get('status'), len(result.get('discrepancies', [])))
# 		stage['t_compare'] = time.perf_counter()
#
# 		created = datetime.now(timezone.utc)
# 		doc = {
# 			"invoice": inv_data,
# 			"po": po_data,
# 			"result": result,
# 			"createdAt": created,
# 		}
# 		res = verifications.insert_one(doc)
# 		logger.info("Saved verification id=%s", res.inserted_id)
# 		stage['t_saved_db'] = time.perf_counter()
#
# 		payload = {
# 			"id": str(res.inserted_id),
# 			"invoice": inv_data,
# 			"po": po_data,
# 			"result": result,
# 			"createdAt": created.isoformat()
# 		}
# 		if debug:
# 			payload["debug"] = {
# 				"invoiceTextLen": len(inv_text or ''),
# 				"poTextLen": len(po_text or ''),
# 				"invoiceTextHead": '\n'.join((inv_text or '').splitlines()[:15]),
# 				"poTextHead": '\n'.join((po_text or '').splitlines()[:15]),
# 				"invoiceParsed": inv_data,
# 				"poParsed": po_data,
# 				"timingsMs": {
# 					"save": int((stage['t_saved']-stage['t0'])*1000),
# 					"images": int((stage['t_images']-stage['t_saved'])*1000),
# 					"ocr": int((stage['t_ocr']-stage['t_images'])*1000),
# 					"parse": int((stage['t_parse']-stage['t_ocr'])*1000),
# 					"compare": int((stage['t_compare']-stage['t_parse'])*1000),
# 					"db": int((stage['t_saved_db']-stage['t_compare'])*1000),
# 				},
# 			}
# 		return jsonify(payload)
# 	except Exception as e:
# 		logger.exception("/verify error: %s", e)
# 		if debug:
# 			return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
# 		return jsonify({"error": "verification_failed"}), 500


# @app.get('/api/stats')
# def stats():
# 	matched = verifications.count_documents({"result.status": "matched"})
# 	partial = verifications.count_documents({"result.status": "partial"})
# 	mismatch = verifications.count_documents({"result.status": "mismatch"})
# 	pending = 0
# 	last_doc = verifications.find_one(sort=[("createdAt", DESCENDING)])
# 	last_export = last_doc.get('createdAt') if last_doc else None
# 	return jsonify({
# 		"matched": matched,
# 		"discrepancies": partial + mismatch,
# 		"pending": pending,
# 		"lastExport": last_export.isoformat() if last_export else None,
# 	})


# @app.get('/api/records')
# def records():
# 	limit = int(request.args.get('limit', '20'))
# 	items = []
# 	for d in verifications.find().sort("createdAt", DESCENDING).limit(limit):
# 		inv = d.get("invoice", {})
# 		po = d.get("po", {})
# 		items.append({
# 			"id": str(d["_id"]),
# 			"vendor": (inv.get("vendor") or po.get("vendor") or ""),
# 			"invoiceNo": inv.get("invoiceNo") or po.get("invoiceNo"),
# 			"orderId": inv.get("orderId") or po.get("orderId"),
# 			"invoiceDate": inv.get("date"),
# 			"amount": inv.get("total"),
# 			"status": d.get("result", {}).get("status"),
# 			"createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
# 		})
# 	return jsonify({"items": items})


# @app.get('/api/records/<rid>')
# def record_detail(rid: str):
# 	try:
# 		obj_id = ObjectId(rid)
# 	except Exception:
# 		return jsonify({"error": "invalid id"}), 400
# 	d = verifications.find_one({"_id": obj_id})
# 	if not d:
# 		return jsonify({"error": "not found"}), 404
# 	return jsonify({
# 		"id": str(d["_id"]),
# 		"invoice": d.get("invoice"),
# 		"po": d.get("po"),
# 		"result": d.get("result"),
# 		"createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
# 	})


# @app.post('/api/export/csv')
# def export_csv():
# 	"""Generate corrected invoice CSV from selected records."""
# 	try:
# 		data = request.get_json(force=True) or {}
# 		record_ids = data.get('recordIds', [])
# 		date_from = data.get('dateFrom')
# 		date_to = data.get('dateTo')
# 		status_filter = data.get('status')
#
# 		query = {}
# 		if record_ids:
# 			query['_id'] = {'$in': [ObjectId(rid) for rid in record_ids]}
# 		if date_from or date_to:
# 			date_q = {}
# 			if date_from:
# 				date_q['$gte'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
# 			if date_to:
# 				date_q['$lte'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
# 			if date_q:
# 				query['createdAt'] = date_q
# 		if status_filter:
# 			query['result.status'] = status_filter
#
# 		records = list(verifications.find(query).sort("createdAt", DESCENDING))
# 		if not records:
# 			return jsonify({"error": "no records found"}), 404
#
# 		csv_content = generate_csv_from_records(records, export_type="corrected")
# 		if not csv_content:
# 			return jsonify({"error": "no data to export"}), 400
#
# 		exports.insert_one({
# 			"type": "corrected_invoice",
# 			"recordCount": len(records),
# 			"createdAt": datetime.now(timezone.utc),
# 			"query": query
# 		})
#
# 		logger.info("CSV export generated: %d records", len(records))
# 		return jsonify({"csv": csv_content, "filename": f"corrected_invoice_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}), 200
# 	except Exception as e:
# 		logger.exception("Export CSV error: %s", e)
# 		return jsonify({"error": "export_failed"}), 500


# @app.post('/api/export/report')
# def export_report():
# 	"""Generate discrepancy report CSV from selected records."""
# 	try:
# 		data = request.get_json(force=True) or {}
# 		record_ids = data.get('recordIds', [])
# 		date_from = data.get('dateFrom')
# 		date_to = data.get('dateTo')
#
# 		query = {}
# 		if record_ids:
# 			query['_id'] = {'$in': [ObjectId(rid) for rid in record_ids]}
# 		if date_from or date_to:
# 			date_q = {}
# 			if date_from:
# 				date_q['$gte'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
# 			if date_to:
# 				date_q['$lte'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
# 			if date_q:
# 				query['createdAt'] = date_q
#
# 		records = list(verifications.find(query).sort("createdAt", DESCENDING))
# 		if not records:
# 			return jsonify({"error": "no records found"}), 404
#
# 		csv_content = generate_csv_from_records(records, export_type="report")
# 		if not csv_content:
# 			return jsonify({"error": "no discrepancies found"}), 400
#
# 		exports.insert_one({
# 			"type": "discrepancy_report",
# 			"recordCount": len(records),
# 			"createdAt": datetime.now(timezone.utc),
# 			"query": query
# 		})
#
# 		logger.info("Report export generated: %d records", len(records))
# 		return jsonify({"csv": csv_content, "filename": f"discrepancy_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}), 200
# 	except Exception as e:
# 		logger.exception("Export report error: %s", e)
# 		return jsonify({"error": "export_failed"}), 500


# @app.get('/api/export/history')
# def export_history():
# 	"""Get export history."""
# 	try:
# 		limit = int(request.args.get('limit', '20'))
# 		items = []
# 		for d in exports.find().sort("createdAt", DESCENDING).limit(limit):
# 			items.append({
# 				"id": str(d["_id"]),
# 				"type": d.get("type"),
# 				"recordCount": d.get("recordCount", 0),
# 				"createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
# 			})
# 		return jsonify({"items": items}), 200
# 	except Exception as e:
# 		logger.exception("Export history error: %s", e)
# 		return jsonify({"error": "history_failed"}), 500


# @app.post('/api/admin/records/clear')
# def clear_records():
# 	if request.headers.get('X-Admin-Key') != os.getenv('ADMIN_KEY', 'dev'):
# 		return jsonify({"error": "unauthorized"}), 401
# 	res = verifications.delete_many({})
# 	return jsonify({"deleted": res.deleted_count})


def get_user_id():
	"""Get user ID - Authentication disabled, returns demo user ID."""
	# Authentication disabled - using demo user
	# In a real app, you'd get this from a session or token
	demo_user_id = "demo_user_123"  # Hardcoded demo user
	
	# Optional: Try to get from token if provided, but don't require it
	auth = request.headers.get('Authorization', '')
	if auth and auth.startswith('Bearer '):
		token = auth.split(' ', 1)[1] if ' ' in auth else auth[7:]
		if token:
			try:
				payload = decode_token(token)
				user_id = payload.get('sub')
				if user_id:
					return user_id
			except:
				pass  # Fall through to demo user
	
	return demo_user_id

# ==================== EduHub API Endpoints ====================

@app.get('/api/eduhub/streak')
def get_streak():
	"""Get user's streak data."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = streaks.find_one({"userId": user_id})
		if not data:
			data = {"current": 0, "longest": 0, "lastDate": None}
		return jsonify({
			"current": data.get("current", 0),
			"longest": data.get("longest", 0),
			"lastDate": data.get("lastDate")
		}), 200
	except Exception as e:
		logger.exception("Get streak error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/streak/update')
def update_streak():
	"""Update user's streak."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		today = datetime.now(timezone.utc).date().isoformat()
		data = streaks.find_one({"userId": user_id})
		if not data:
			data = {"userId": user_id, "current": 0, "longest": 0, "lastDate": None}
		if data.get("lastDate") == today:
			return jsonify({
				"current": data.get("current", 0),
				"longest": data.get("longest", 0),
				"lastDate": data.get("lastDate")
			}), 200
		yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
		is_consecutive = data.get("lastDate") == yesterday
		new_streak = (data.get("current", 0) + 1) if is_consecutive else 1
		longest = max(data.get("longest", 0), new_streak)
		update_data = {
			"current": new_streak,
			"longest": longest,
			"lastDate": today
		}
		streaks.update_one(
			{"userId": user_id},
			{"$set": update_data},
			upsert=True
		)
		return jsonify(update_data), 200
	except Exception as e:
		logger.exception("Update streak error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.get('/api/eduhub/resources')
def get_resources():
	"""Get user's resources."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		items = []
		for r in resources.find({"userId": user_id}).sort("createdAt", DESCENDING):
			r["id"] = str(r["_id"])
			del r["_id"]
			del r["userId"]
			items.append(r)
		return jsonify({"items": items}), 200
	except Exception as e:
		logger.exception("Get resources error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/resources')
def create_resource():
	"""Create a new resource."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = request.get_json(force=True) or {}
		resource = {
			"userId": user_id,
			"type": data.get("type", "youtube"),
			"title": data.get("title", ""),
			"url": data.get("url", ""),
			"description": data.get("description", ""),
			"createdAt": datetime.now(timezone.utc)
		}
		res = resources.insert_one(resource)
		resource["id"] = str(res.inserted_id)
		del resource["_id"]
		del resource["userId"]
		return jsonify(resource), 201
	except Exception as e:
		logger.exception("Create resource error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.delete('/api/eduhub/resources/<resource_id>')
def delete_resource(resource_id):
	"""Delete a resource."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		result = resources.delete_one({"_id": ObjectId(resource_id), "userId": user_id})
		if result.deleted_count:
			return jsonify({"success": True}), 200
		return jsonify({"error": "not_found"}), 404
	except Exception as e:
		logger.exception("Delete resource error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/focus/start')
def start_focus():
	"""Start a focus session."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		session = {
			"userId": user_id,
			"startTime": datetime.now(timezone.utc),
			"duration": 0,
			"status": "active"
		}
		res = focus_sessions.insert_one(session)
		return jsonify({"sessionId": str(res.inserted_id)}), 201
	except Exception as e:
		logger.exception("Start focus error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/focus/stop')
def stop_focus():
	"""Stop a focus session."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = request.get_json(force=True) or {}
		session_id = data.get("sessionId")
		if not session_id:
			return jsonify({"error": "sessionId required"}), 400
		session = focus_sessions.find_one({"_id": ObjectId(session_id), "userId": user_id})
		if not session:
			return jsonify({"error": "not_found"}), 404
		start_time = session["startTime"]
		duration = int((datetime.now(timezone.utc) - start_time).total_seconds())
		focus_sessions.update_one(
			{"_id": ObjectId(session_id)},
			{"$set": {"duration": duration, "status": "completed", "endTime": datetime.now(timezone.utc)}}
		)
		return jsonify({"duration": duration}), 200
	except Exception as e:
		logger.exception("Stop focus error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.get('/api/eduhub/focus/today')
def get_focus_today():
	"""Get today's total focus time."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
		total = 0
		for s in focus_sessions.find({
			"userId": user_id,
			"startTime": {"$gte": today_start},
			"status": "completed"
		}):
			total += s.get("duration", 0)
		return jsonify({"totalSeconds": total}), 200
	except Exception as e:
		logger.exception("Get focus today error: %s", e)
		return jsonify({"error": "failed"}), 500

# ==================== Todos API Endpoints ====================

@app.get('/api/eduhub/todos')
def get_todos():
	"""Get user's todos."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		items = []
		for t in todos.find({"userId": user_id}).sort([("orderIndex", 1), ("createdAt", DESCENDING)]):
			t["id"] = str(t["_id"])
			del t["_id"]
			del t["userId"]
			if t.get("deadline"):
				t["deadline"] = t["deadline"].isoformat() if isinstance(t["deadline"], datetime) else t["deadline"]
			if t.get("createdAt"):
				t["createdAt"] = t["createdAt"].isoformat() if isinstance(t["createdAt"], datetime) else t["createdAt"]
			if t.get("reminderTime"):
				t["reminderTime"] = t["reminderTime"].isoformat() if isinstance(t["reminderTime"], datetime) else t["reminderTime"]
			items.append(t)
		return jsonify({"items": items}), 200
	except Exception as e:
		logger.exception("Get todos error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/todos')
def create_todo():
	"""Create a new todo."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = request.get_json(force=True) or {}
		# Determine next order index
		last = todos.find_one({"userId": user_id}, sort=[("orderIndex", -1)])
		next_order = int((last or {}).get("orderIndex", 0)) + 1
		todo = {
			"userId": user_id,
			"title": data.get("title", ""),
			"completed": data.get("completed", False),
			"deadline": datetime.fromisoformat(data["deadline"].replace('Z', '+00:00')) if data.get("deadline") else None,
			"reminder": data.get("reminder", False),
			"reminderTime": datetime.fromisoformat(data["reminderTime"].replace('Z', '+00:00')) if data.get("reminderTime") else None,
			# New smart scheduling fields
			"difficulty": data.get("difficulty", "medium"),  # easy | medium | hard
			"urgency": int(data.get("urgency", 3)),  # 1 (highest) .. 5 (lowest)
			"estimateMinutes": int(data.get("estimateMinutes", 0)),
			"dependencies": data.get("dependencies", []),
			"source": data.get("source", "manual"),  # manual | calendar | email | integration
			"orderIndex": int(data.get("orderIndex", next_order)),
			"context": data.get("context", {}),  # arbitrary metadata (location, device, notes)
			"createdAt": datetime.now(timezone.utc)
		}
		res = todos.insert_one(todo)
		todo["id"] = str(res.inserted_id)
		del todo["_id"]
		del todo["userId"]
		if todo.get("deadline"):
			todo["deadline"] = todo["deadline"].isoformat()
		if todo.get("createdAt"):
			todo["createdAt"] = todo["createdAt"].isoformat()
		if todo.get("reminderTime"):
			todo["reminderTime"] = todo["reminderTime"].isoformat()
		return jsonify(todo), 201
	except Exception as e:
		logger.exception("Create todo error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.put('/api/eduhub/todos/<todo_id>')
def update_todo(todo_id):
	"""Update a todo."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = request.get_json(force=True) or {}
		update_data = {}
		if "title" in data:
			update_data["title"] = data["title"]
		if "completed" in data:
			update_data["completed"] = data["completed"]
		if "deadline" in data:
			update_data["deadline"] = datetime.fromisoformat(data["deadline"].replace('Z', '+00:00')) if data["deadline"] else None
		if "reminder" in data:
			update_data["reminder"] = data["reminder"]
		if "reminderTime" in data:
			update_data["reminderTime"] = datetime.fromisoformat(data["reminderTime"].replace('Z', '+00:00')) if data.get("reminderTime") else None
		if "difficulty" in data:
			update_data["difficulty"] = data["difficulty"]
		if "urgency" in data:
			update_data["urgency"] = int(data["urgency"]) if data["urgency"] is not None else None
		if "estimateMinutes" in data:
			update_data["estimateMinutes"] = int(data["estimateMinutes"]) if data["estimateMinutes"] is not None else None
		if "dependencies" in data:
			update_data["dependencies"] = data["dependencies"] or []
		if "source" in data:
			update_data["source"] = data["source"]
		if "orderIndex" in data:
			update_data["orderIndex"] = int(data["orderIndex"]) if data["orderIndex"] is not None else None
		if "context" in data:
			update_data["context"] = data["context"] or {}
		
		result = todos.update_one(
			{"_id": ObjectId(todo_id), "userId": user_id},
			{"$set": update_data}
		)
		if result.matched_count:
			todo = todos.find_one({"_id": ObjectId(todo_id)})
			todo["id"] = str(todo["_id"])
			del todo["_id"]
			del todo["userId"]
			if todo.get("deadline"):
				todo["deadline"] = todo["deadline"].isoformat() if isinstance(todo["deadline"], datetime) else todo["deadline"]
			if todo.get("createdAt"):
				todo["createdAt"] = todo["createdAt"].isoformat() if isinstance(todo["createdAt"], datetime) else todo["createdAt"]
			if todo.get("reminderTime"):
				todo["reminderTime"] = todo["reminderTime"].isoformat() if isinstance(todo["reminderTime"], datetime) else todo["reminderTime"]
			return jsonify(todo), 200
		return jsonify({"error": "not_found"}), 404
	except Exception as e:
		logger.exception("Update todo error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.delete('/api/eduhub/todos/<todo_id>')
def delete_todo(todo_id):
	"""Delete a todo."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		result = todos.delete_one({"_id": ObjectId(todo_id), "userId": user_id})
		if result.deleted_count:
			return jsonify({"success": True}), 200
		return jsonify({"error": "not_found"}), 404
	except Exception as e:
		logger.exception("Delete todo error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/todos/reorder')
def reorder_todos():
	"""Reorder the user's todo queue by setting orderIndex based on provided ids.
	Body: { "orderedIds": ["id1","id2", ...] }
	Missing ids keep their relative order after provided ones.
	"""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = request.get_json(force=True) or {}
		ordered_ids = data.get("orderedIds", [])
		# Normalize to ObjectIds where possible
		order_map = {}
		for idx, tid in enumerate(ordered_ids):
			try:
				order_map[ObjectId(tid)] = idx + 1
			except Exception:
				continue
		# Fetch all user's todos and compute new order
		user_todos = list(todos.find({"userId": user_id}).sort([("orderIndex", 1), ("createdAt", DESCENDING)]))
		current = 1
		# First assign provided order
		for t in user_todos:
			if t["_id"] in order_map:
				t["orderIndex"] = order_map[t["_id"]]
		# Then assign remaining in existing order after the max provided
		max_provided = max(order_map.values()) if order_map else 0
		next_order = max_provided + 1
		for t in user_todos:
			if t.get("orderIndex") is None or t["_id"] not in order_map:
				t["orderIndex"] = next_order
				next_order += 1
		# Persist updates
		for t in user_todos:
			todos.update_one({"_id": t["_id"], "userId": user_id}, {"$set": {"orderIndex": int(t["orderIndex"])}})
		return jsonify({"success": True}), 200
	except Exception as e:
		logger.exception("Reorder todos error: %s", e)
		return jsonify({"error": "failed"}), 500

# ==================== Moods API Endpoints ====================

@app.get('/api/eduhub/moods')
def get_moods():
	"""Get user's moods."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		limit = int(request.args.get('limit', '100'))
		items = []
		for m in moods.find({"userId": user_id}).sort("date", DESCENDING).limit(limit):
			m["id"] = str(m["_id"])
			del m["_id"]
			del m["userId"]
			if m.get("date"):
				m["date"] = m["date"].isoformat() if isinstance(m["date"], datetime) else m["date"]
			items.append(m)
		return jsonify({"items": items}), 200
	except Exception as e:
		logger.exception("Get moods error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.post('/api/eduhub/moods')
def create_mood():
	"""Create a new mood entry."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		data = request.get_json(force=True) or {}
		mood = {
			"userId": user_id,
			"mood": data.get("mood", ""),
			"note": data.get("note", ""),
			"date": datetime.fromisoformat(data["date"].replace('Z', '+00:00')) if data.get("date") else datetime.now(timezone.utc)
		}
		res = moods.insert_one(mood)
		mood["id"] = str(res.inserted_id)
		del mood["_id"]
		del mood["userId"]
		if mood.get("date"):
			mood["date"] = mood["date"].isoformat() if isinstance(mood["date"], datetime) else mood["date"]
		return jsonify(mood), 201
	except Exception as e:
		logger.exception("Create mood error: %s", e)
		return jsonify({"error": "failed"}), 500

@app.delete('/api/eduhub/moods/<mood_id>')
def delete_mood(mood_id):
	"""Delete a mood entry."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		result = moods.delete_one({"_id": ObjectId(mood_id), "userId": user_id})
		if result.deleted_count:
			return jsonify({"success": True}), 200
		return jsonify({"error": "not_found"}), 404
	except Exception as e:
		logger.exception("Delete mood error: %s", e)
		return jsonify({"error": "failed"}), 500

# ==================== Medications API Endpoints ====================

@app.get('/api/eduhub/medications')
def get_medications():
	"""Get all medications for the current user."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		limit = int(request.args.get('limit', 100))
		medication_list = list(medications.find({"userId": user_id}).sort("createdAt", DESCENDING).limit(limit))
		
		for med in medication_list:
			med["id"] = str(med["_id"])
			del med["_id"]
			if "userId" in med:
				del med["userId"]
		
		return jsonify({"items": medication_list}), 200
	except Exception as e:
		logger.exception("Get medications error: %s", e)
		return jsonify({"error": "fetch_failed"}), 500

@app.post('/api/eduhub/medications')
def create_medication():
	"""Create a new medication entry."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		name = data.get("name", "").strip()
		if not name:
			return jsonify({"error": "name_required"}), 400
		
		medication_doc = {
			"userId": user_id,
			"name": name,
			"dosage": data.get("dosage", ""),
			"frequency": data.get("frequency", "daily"),  # daily, weekly, as_needed
			"times": data.get("times", []),  # Array of time strings like ["09:00", "21:00"]
			"notes": data.get("notes", ""),
			"takenAt": data.get("takenAt"),  # Optional: when medication was taken
			"createdAt": datetime.now(timezone.utc),
			"updatedAt": datetime.now(timezone.utc)
		}
		
		result = medications.insert_one(medication_doc)
		medication_doc["id"] = str(result.inserted_id)
		del medication_doc["_id"]
		del medication_doc["userId"]
		
		return jsonify(medication_doc), 201
	except Exception as e:
		logger.exception("Create medication error: %s", e)
		return jsonify({"error": "create_failed"}), 500

@app.put('/api/eduhub/medications/<medication_id>')
def update_medication(medication_id):
	"""Update an existing medication."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		
		update_fields = {}
		if "name" in data:
			update_fields["name"] = data["name"].strip()
		if "dosage" in data:
			update_fields["dosage"] = data["dosage"]
		if "frequency" in data:
			update_fields["frequency"] = data["frequency"]
		if "times" in data:
			update_fields["times"] = data["times"]
		if "notes" in data:
			update_fields["notes"] = data["notes"]
		if "takenAt" in data:
			update_fields["takenAt"] = data["takenAt"]
		
		update_fields["updatedAt"] = datetime.now(timezone.utc)
		
		result = medications.update_one(
			{"_id": ObjectId(medication_id), "userId": user_id},
			{"$set": update_fields}
		)
		
		if result.matched_count == 0:
			return jsonify({"error": "medication_not_found"}), 404
		
		# Return updated medication
		updated = medications.find_one({"_id": ObjectId(medication_id)})
		if updated:
			updated["id"] = str(updated["_id"])
			del updated["_id"]
			del updated["userId"]
		
		return jsonify(updated), 200
	except Exception as e:
		logger.exception("Update medication error: %s", e)
		return jsonify({"error": "update_failed"}), 500

@app.delete('/api/eduhub/medications/<medication_id>')
def delete_medication(medication_id):
	"""Delete a medication entry."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		result = medications.delete_one({"_id": ObjectId(medication_id), "userId": user_id})
		if result.deleted_count == 0:
			return jsonify({"error": "medication_not_found"}), 404
		
		return jsonify({"success": True}), 200
	except Exception as e:
		logger.exception("Delete medication error: %s", e)
		return jsonify({"error": "delete_failed"}), 500

@app.post('/api/eduhub/medications/<medication_id>/log')
def log_medication_taken(medication_id):
	"""Log that a medication was taken at a specific time."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		taken_at = data.get("takenAt")
		if not taken_at:
			taken_at = datetime.now(timezone.utc)
		elif isinstance(taken_at, str):
			taken_at = datetime.fromisoformat(taken_at.replace('Z', '+00:00'))
		
		result = medications.update_one(
			{"_id": ObjectId(medication_id), "userId": user_id},
			{"$set": {"takenAt": taken_at, "updatedAt": datetime.now(timezone.utc)}}
		)
		
		if result.matched_count == 0:
			return jsonify({"error": "medication_not_found"}), 404
		
		return jsonify({"success": True, "takenAt": taken_at.isoformat()}), 200
	except Exception as e:
		logger.exception("Log medication error: %s", e)
		return jsonify({"error": "log_failed"}), 500

# ==================== Opportunities API Endpoints (REMOVED) ====================
# Opportunities feature has been removed from the app

# # All opportunities endpoints commented out - feature removed
# @app.get('/api/eduhub/opportunities')
# def get_opportunities():
# 	"""Get all opportunities for the current user."""
# 	try:
# 		user_id = get_user_id()
# 		limit = int(request.args.get('limit', 100))
# 		filter_type = request.args.get('type', 'all')
# 		query = {"userId": user_id}
# 		if filter_type != 'all':
# 			query["type"] = filter_type
# 		opportunity_list = list(opportunities.find(query).sort("createdAt", DESCENDING).limit(limit))
# 		for opp in opportunity_list:
# 			opp["id"] = str(opp["_id"])
# 			del opp["_id"]
# 			if "userId" in opp:
# 				del opp["userId"]
# 		return jsonify({"items": opportunity_list}), 200
# 	except Exception as e:
# 		logger.exception("Get opportunities error: %s", e)
# 		return jsonify({"error": "fetch_failed"}), 500

# @app.post('/api/eduhub/opportunities')
# def create_opportunity():
# 	"""Create a new opportunity entry."""
# 	try:
# 		user_id = get_user_id()
# 		data = request.get_json(force=True) or {}
# 		title = data.get("title", "").strip()
# 		if not title:
# 			return jsonify({"error": "title_required"}), 400
# 		deadline = data.get("deadline")
# 		if deadline and isinstance(deadline, str):
# 			try:
# 				deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
# 			except:
# 				deadline = None
# 		opportunity_doc = {
# 			"userId": user_id,
# 			"title": title,
# 			"company": data.get("company", ""),
# 			"type": data.get("type", "internship"),
# 			"location": data.get("location", ""),
# 			"description": data.get("description", ""),
# 			"link": data.get("link", ""),
# 			"deadline": deadline,
# 			"status": data.get("status", "open"),
# 			"createdAt": datetime.now(timezone.utc),
# 			"updatedAt": datetime.now(timezone.utc)
# 		}
# 		result = opportunities.insert_one(opportunity_doc)
# 		opportunity_doc["id"] = str(result.inserted_id)
# 		del opportunity_doc["_id"]
# 		del opportunity_doc["userId"]
# 		return jsonify(opportunity_doc), 201
# 	except Exception as e:
# 		logger.exception("Create opportunity error: %s", e)
# 		return jsonify({"error": "create_failed"}), 500

# @app.put('/api/eduhub/opportunities/<opportunity_id>')
# def update_opportunity(opportunity_id):
# 	"""Update an existing opportunity."""
# 	try:
# 		user_id = get_user_id()
# 		data = request.get_json(force=True) or {}
# 		update_fields = {}
# 		if "title" in data:
# 			update_fields["title"] = data["title"].strip()
# 		if "company" in data:
# 			update_fields["company"] = data["company"]
# 		if "type" in data:
# 			update_fields["type"] = data["type"]
# 		if "location" in data:
# 			update_fields["location"] = data["location"]
# 		if "description" in data:
# 			update_fields["description"] = data["description"]
# 		if "link" in data:
# 			update_fields["link"] = data["link"]
# 		if "status" in data:
# 			update_fields["status"] = data["status"]
# 		if "deadline" in data:
# 			deadline = data["deadline"]
# 			if deadline and isinstance(deadline, str):
# 				try:
# 					deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
# 				except:
# 					deadline = None
# 			update_fields["deadline"] = deadline
# 		update_fields["updatedAt"] = datetime.now(timezone.utc)
# 		result = opportunities.update_one(
# 			{"_id": ObjectId(opportunity_id), "userId": user_id},
# 			{"$set": update_fields}
# 		)
# 		if result.matched_count == 0:
# 			return jsonify({"error": "opportunity_not_found"}), 404
# 		updated = opportunities.find_one({"_id": ObjectId(opportunity_id)})
# 		if updated:
# 			updated["id"] = str(updated["_id"])
# 			del updated["_id"]
# 			del updated["userId"]
# 		return jsonify(updated), 200
# 	except Exception as e:
# 		logger.exception("Update opportunity error: %s", e)
# 		return jsonify({"error": "update_failed"}), 500

# @app.delete('/api/eduhub/opportunities/<opportunity_id>')
# def delete_opportunity(opportunity_id):
# 	"""Delete an opportunity entry."""
# 	try:
# 		user_id = get_user_id()
# 		result = opportunities.delete_one({"_id": ObjectId(opportunity_id), "userId": user_id})
# 		if result.deleted_count == 0:
# 			return jsonify({"error": "opportunity_not_found"}), 404
# 		return jsonify({"success": True}), 200
# 	except Exception as e:
# 		logger.exception("Delete opportunity error: %s", e)
# 		return jsonify({"error": "delete_failed"}), 500

# ==================== Settings API Endpoints ====================

@app.get('/api/eduhub/settings')
def get_settings():
	"""Get user settings."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		# Check if settings exist
		settings_collection = db['settings']
		user_settings = settings_collection.find_one({"userId": user_id})
		
		if not user_settings:
			# Return default settings
			default_settings = {
				"reconciliationTolerances": {
					"amountPct": "0.5",
					"amountAbs": "25",
					"dateDays": "7"
				},
				"preferences": {
					"currency": "INR",
					"dateFormat": "DD/MM/YYYY",
					"companyName": ""
				},
				"notifications": {
					"email": True,
					"browser": True
				}
			}
			return jsonify(default_settings), 200
		
		del user_settings["_id"]
		del user_settings["userId"]
		
		return jsonify(user_settings.get("settings", {})), 200
	except Exception as e:
		logger.exception("Get settings error: %s", e)
		return jsonify({"error": "fetch_failed"}), 500

@app.put('/api/eduhub/settings')
def update_settings():
	"""Update user settings."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		
		settings_collection = db['settings']
		
		# Upsert settings
		settings_collection.update_one(
			{"userId": user_id},
			{
				"$set": {
					"userId": user_id,
					"settings": data,
					"updatedAt": datetime.now(timezone.utc)
				},
				"$setOnInsert": {
					"createdAt": datetime.now(timezone.utc)
				}
			},
			upsert=True
		)
		
		return jsonify({"success": True, "settings": data}), 200
	except Exception as e:
		logger.exception("Update settings error: %s", e)
		return jsonify({"error": "update_failed"}), 500

# ==================== Gemini AI Advisor Endpoints ====================

@app.post('/api/eduhub/ai/advisor')
def ai_advisor():
	"""Gemini-powered AI advisor that analyzes mood and tasks to suggest optimal work."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		if not gemini_model:
			return jsonify({"error": "AI service unavailable"}), 503
		
		# Get recent mood data
		recent_moods = list(moods.find({"userId": user_id}).sort("date", DESCENDING).limit(10))
		current_mood = recent_moods[0] if recent_moods else None
		
		# Get pending todos
		pending_todos = list(todos.find({"userId": user_id, "completed": False}).sort("createdAt", DESCENDING).limit(20))
		
		# Get focus sessions today
		today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
		today_focus = list(focus_sessions.find({
			"userId": user_id,
			"startTime": {"$gte": today_start},
			"status": "completed"
		}))
		total_focus_today = sum(s.get("duration", 0) for s in today_focus)
		
		# Get current time context
		now = datetime.now(timezone.utc)
		current_hour = now.hour
		time_of_day = "morning" if 5 <= current_hour < 12 else "afternoon" if 12 <= current_hour < 17 else "evening" if 17 <= current_hour < 21 else "night"
		
		# Build context for Gemini
		mood_context = ""
		if current_mood:
			mood_context = f"Current mood: {current_mood.get('mood', 'unknown')}. "
			if current_mood.get('note'):
				mood_context += f"Note: {current_mood['note']}. "
		
		tasks_context = ""
		if pending_todos:
			tasks_context = "Pending tasks:\n"
			for i, todo in enumerate(pending_todos[:10], 1):
				task_info = f"{i}. {todo.get('title', 'Untitled')}"
				if todo.get('deadline'):
					deadline = todo['deadline'] if isinstance(todo['deadline'], datetime) else datetime.fromisoformat(todo['deadline'].replace('Z', '+00:00'))
					days_until = (deadline - now).days
					if days_until < 0:
						task_info += f" (OVERDUE by {abs(days_until)} days)"
					elif days_until == 0:
						task_info += " (due TODAY)"
					elif days_until <= 3:
						task_info += f" (due in {days_until} days)"
				tasks_context += task_info + "\n"
		else:
			tasks_context = "No pending tasks."
		
		# Build prompt for Gemini - make it more natural
		prompt = f"""You're helping someone with their productivity. Give practical, human advice based on their current situation.

Context:
- {mood_context}
- Time of day: {time_of_day} ({current_hour}:00)
- Focus time today: {total_focus_today // 60} minutes
- {tasks_context}

Based on this information, provide:
1. A brief analysis of the user's current state (mood, energy level, productivity window)
2. The top 1-3 tasks they should work on RIGHT NOW, with reasoning
3. A motivational message or productivity tip
4. Suggested break time if needed

Format your response as a JSON object with these keys:
- "analysis": brief analysis text
- "recommendedTasks": array of task objects with "taskTitle" and "reason"
- "motivationalMessage": encouraging message
- "suggestBreak": boolean indicating if a break is recommended
- "breakReason": why a break is suggested (if applicable)

Be concise, empathetic, and actionable. Consider mood-energy-task matching."""
		
		try:
			response = gemini_model.generate_content(prompt)
			response_text = response.text.strip()
		except Exception as gen_error:
			logger.error(f"Gemini API error in advisor: {gen_error}")
			# Return fallback response
			advisor_data = {
				"analysis": "Unable to analyze at the moment. Please try again.",
				"recommendedTasks": [],
				"motivationalMessage": "Stay focused and take breaks when needed!",
				"suggestBreak": False,
				"breakReason": None
			}
			return jsonify({
				"currentMood": current_mood.get("mood") if current_mood else None,
				"timeOfDay": time_of_day,
				"focusTimeToday": total_focus_today,
				"pendingTasksCount": len(pending_todos),
				"advisor": advisor_data
			}), 200
		
		# Try to extract JSON from response
		try:
			# Remove markdown code blocks if present
			if "```json" in response_text:
				response_text = response_text.split("```json")[1].split("```")[0].strip()
			elif "```" in response_text:
				response_text = response_text.split("```")[1].split("```")[0].strip()
			
			advisor_data = json.loads(response_text)
		except:
			# Fallback: return text response if JSON parsing fails
			advisor_data = {
				"analysis": response_text[:200],
				"recommendedTasks": [],
				"motivationalMessage": "Stay focused and take breaks when needed!",
				"suggestBreak": False,
				"breakReason": None
			}
		
		return jsonify({
			"currentMood": current_mood.get("mood") if current_mood else None,
			"timeOfDay": time_of_day,
			"focusTimeToday": total_focus_today,
			"pendingTasksCount": len(pending_todos),
			"advisor": advisor_data
		}), 200
	except Exception as e:
		logger.exception("AI advisor error: %s", e)
		return jsonify({"error": "ai_service_failed"}), 500

@app.post('/api/eduhub/ai/chat')
def ai_chat():
	"""Chat with Gemini AI about productivity and mood."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		if not gemini_model:
			logger.warning("Gemini model not initialized - check GEMINI_API_KEY")
			return jsonify({"error": "AI service unavailable", "message": "Gemini AI is not initialized. Please check GEMINI_API_KEY in .env file."}), 503
		
		data = request.get_json(force=True) or {}
		message = data.get("message", "")
		conversation_history = data.get("history", [])
		
		if not message:
			return jsonify({"error": "message required"}), 400
		
		# Build context-aware prompt - make responses more human and natural
		context = """You are a helpful and friendly productivity companion. When responding:
- Write naturally, as if you're a real person having a conversation
- Use simple, clear language - avoid overly formal or robotic phrases
- Be conversational and warm, but not overly casual
- Keep responses concise and to the point
- Use natural transitions and avoid repetitive phrases
- If explaining something technical, break it down simply
- Show genuine interest in helping, but don't overdo enthusiasm
- Avoid phrases like "I understand", "I'm here to help" - just help directly
- Write in a way that feels human, not like an AI assistant"""
		
		# Add recent context if available
		recent_mood = moods.find_one({"userId": user_id}, sort=[("date", DESCENDING)])
		pending_count = todos.count_documents({"userId": user_id, "completed": False})
		
		if recent_mood:
			context += f"\n\nUser's recent mood: {recent_mood.get('mood', 'unknown')}"
		if pending_count > 0:
			context += f"\n\nUser has {pending_count} pending tasks."
		
		# Build conversation
		full_prompt = context + "\n\n"
		for msg in conversation_history[-5:]:  # Last 5 messages for context
			role = msg.get("role", "user")
			content = msg.get("content", "")
			full_prompt += f"{role.capitalize()}: {content}\n"
		
		full_prompt += f"User: {message}\nAssistant:"
		
		try:
			logger.info(f"Calling Gemini API with prompt length: {len(full_prompt)}")
			logger.debug(f"Prompt preview: {full_prompt[:200]}...")
			
			# Generate content
			response = None
			try:
				response = gemini_model.generate_content(
					full_prompt,
					generation_config={
						"temperature": 0.9,  # Higher temperature for more natural responses
						"top_p": 0.95,
						"top_k": 40,
					}
				)
			except Exception as api_err:
				logger.error(f"Gemini generate_content error: {api_err}")
				raise api_err
			
			# Extract response text
			if hasattr(response, 'text') and response.text:
				response_text = response.text.strip()
			elif hasattr(response, 'candidates') and response.candidates:
				# Try to get text from candidates
				candidate = response.candidates[0]
				if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
					response_text = candidate.content.parts[0].text.strip()
				else:
					response_text = "I received an unexpected response format from the AI."
			else:
				response_text = "I received an empty response from the AI."
			
			logger.info(f"Gemini API response received (length: {len(response_text)})")
		except Exception as gen_error:
			logger.exception(f"Gemini API error: {gen_error}")
			error_msg = str(gen_error)
			if "API key" in error_msg or "authentication" in error_msg.lower():
				response_text = "AI service authentication failed. Please check the API key configuration."
			elif "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
				response_text = "AI service rate limit exceeded. Please try again later."
			else:
				response_text = f"I apologize, but I'm having trouble processing your request. Error: {error_msg[:100]}"
		
		return jsonify({
			"response": response_text,
			"timestamp": datetime.now(timezone.utc).isoformat()
		}), 200
	except Exception as e:
		logger.exception("AI chat error: %s", e)
		return jsonify({"error": "ai_service_failed", "message": str(e)}), 500

# ==================== ML Features API Endpoints ====================

@app.post('/api/ml/recommendations')
def ml_recommendations():
	"""Get ML-powered recommendations for books/playlists."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		item_type = data.get("type", "book")  # "book" or "playlist"
		n_recommendations = int(data.get("limit", 5))
		
		# Get user's ratings/history
		# Assuming you have a ratings collection or resources with ratings
		ratings = list(resources.find({
			"userId": user_id,
			"type": item_type
		}))
		
		# Convert to ratings format for ML
		ratings_data = []
		for r in ratings:
			# If you have rating field, use it; otherwise infer from favorites
			rating = r.get("rating", 4 if r.get("favorite") else 3)
			ratings_data.append({
				"userId": user_id,
				"itemId": str(r["_id"]),
				"rating": float(rating)
			})
		
		# Get all users' ratings for collaborative filtering
		all_ratings = list(resources.find({"type": item_type}).limit(100))
		all_ratings_data = []
		for r in all_ratings:
			rating = r.get("rating", 4 if r.get("favorite") else 3)
			all_ratings_data.append({
				"userId": r.get("userId", ""),
				"itemId": str(r["_id"]),
				"rating": float(rating)
			})
		
		# Get recommendation engine and fit
		engine = get_recommendation_engine(user_id)
		if engine.fit_user_based(all_ratings_data):
			recommended_ids = engine.recommend_for_user(user_id, all_ratings_data, n_recommendations)
			# Fetch recommended items
			recommended_items = []
			for item_id in recommended_ids:
				try:
					item = resources.find_one({"_id": ObjectId(item_id)})
					if item:
						item["id"] = str(item["_id"])
						del item["_id"]
						recommended_items.append(item)
				except:
					continue
			
			return jsonify({"recommendations": recommended_items}), 200
		else:
			return jsonify({"recommendations": [], "message": "Insufficient data for recommendations"}), 200
	except Exception as e:
		logger.exception("ML recommendations error: %s", e)
		return jsonify({"error": "ml_service_failed"}), 500

@app.post('/api/ml/tasks/predict-priority')
def ml_predict_task_priority():
	"""Predict priority for a task using ML."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		task = data.get("task", {})
		
		# Get user's task history for training
		all_tasks = list(todos.find({"userId": user_id}).limit(100))
		
		if len(all_tasks) < 10:
			# Use simple rule-based prediction
			prioritizer = get_task_prioritizer(user_id)
			predicted = prioritizer.predict_priority(task)
			return jsonify({"priority": predicted, "method": "rule-based"}), 200
		
		# Extract priorities from existing tasks (if available)
		# Otherwise, infer from urgency and deadline
		task_list = []
		priorities = []
		for t in all_tasks:
			if t.get("completed"):
				continue
			urgency = int(t.get("urgency", 3))
			deadline = t.get("deadline")
			
			# Infer priority
			if deadline:
				try:
					if isinstance(deadline, datetime):
						deadline_dt = deadline
					else:
						deadline_dt = datetime.fromisoformat(str(deadline).replace('Z', '+00:00'))
					days = (deadline_dt - datetime.now(timezone.utc)).days
					if days < 0 or (days <= 1 and urgency <= 2):
						priority = "high"
					elif days <= 3 or urgency <= 2:
						priority = "medium"
					else:
						priority = "low"
				except:
					priority = "high" if urgency <= 2 else "medium"
			else:
				priority = "high" if urgency <= 2 else "medium" if urgency == 3 else "low"
			
			task_list.append(t)
			priorities.append(priority)
		
		# Fit and predict
		prioritizer = get_task_prioritizer(user_id)
		if prioritizer.fit_priority(task_list, priorities):
			predicted = prioritizer.predict_priority(task)
			return jsonify({"priority": predicted, "method": "ml"}), 200
		else:
			# Fallback to rule-based
			predicted = prioritizer.predict_priority(task)
			return jsonify({"priority": predicted, "method": "rule-based"}), 200
	except Exception as e:
		logger.exception("Task priority prediction error: %s", e)
		return jsonify({"error": "ml_service_failed"}), 500

@app.post('/api/ml/mood/predict')
def ml_predict_mood():
	"""Predict next mood based on patterns."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		# Get user's history
		mood_history = list(moods.find({"userId": user_id}).sort("date", DESCENDING).limit(30))
		medication_history = list(medications.find({"userId": user_id}).sort("takenAt", DESCENDING).limit(30))
		completed_tasks = list(todos.find({"userId": user_id, "completed": True}).sort("createdAt", DESCENDING).limit(30))
		
		# Get focus sessions for today
		today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
		today_focus_sessions = list(focus_sessions.find({
			"userId": user_id,
			"startTime": {"$gte": today_start},
			"status": "completed"
		}))
		
		if len(mood_history) < 10:
			return jsonify({
				"predictedMood": "okay",
				"confidence": 0.0,
				"message": "Need more mood history for accurate predictions"
			}), 200
		
		# Prepare target moods (next day's mood)
		target_moods = []
		for i, mood in enumerate(mood_history[:-1]):
			# Next mood after this one
			if i + 1 < len(mood_history):
				target_moods.append(mood_history[i + 1].get("mood", "okay"))
		
		# Fit model with PCA
		predictor = get_mood_predictor(user_id)
		if predictor.fit(mood_history, medication_history, completed_tasks, target_moods, today_focus_sessions):
			# Build comprehensive current context with all 14 features
			now = datetime.now(timezone.utc)
			current_mood = mood_history[0].get("mood", "okay") if mood_history else "okay"
			mood_map = {
				'great': 9, 'good': 7, 'okay': 5, 'calm': 6,
				'sad': 3, 'very_sad': 1, 'frustrated': 2, 'tired': 4
			}
			mood_value = mood_map.get(current_mood, 5)
			
			today_focus_minutes = sum(s.get("duration", 0) for s in today_focus_sessions) // 60
			tasks_today = len([t for t in completed_tasks if 
				str(t.get("completedAt", "") or t.get("createdAt", "")).startswith(now.date().isoformat())])
			meds_today = len([m for m in medication_history if 
				str(m.get("takenAt", "") or m.get("date", "")).startswith(now.date().isoformat())])
			
			current_context = {
				"mood_value": mood_value,
				"tasks_completed": tasks_today,
				"focus_minutes": today_focus_minutes,
				"medications_taken": meds_today,
				"energy_level": max(1, min(10, mood_value + (tasks_today * 0.5) + (today_focus_minutes / 30))),
				"stress_level": max(1, min(10, 10 - mood_value + (tasks_today * 0.3))),
				"focus_level": min(10, (today_focus_minutes / 60) * 2),
				"productivity": max(1, min(10, (tasks_today * 2) + (today_focus_minutes / 30))),
				"sentiment_score": 5,  # Can be enhanced with note analysis
				"sleep_quality": max(1, min(10, mood_value + 2)),
				"social_activity": 0
			}
			
			predicted = predictor.predict_next_mood(current_context)
			return jsonify({
				"predictedMood": predicted,
				"confidence": 0.7,
				"method": "ml-pca",
				"featuresUsed": 14,
				"componentsReducedTo": 3
			}), 200
		else:
			return jsonify({
				"predictedMood": "okay",
				"confidence": 0.0,
				"method": "default"
			}), 200
	except Exception as e:
		logger.exception("Mood prediction error: %s", e)
		return jsonify({"error": "ml_service_failed"}), 500

@app.post('/api/ml/notes/classify')
def ml_classify_note():
	"""Classify a note by subject using SVM."""
	try:
		user_id = get_user_id()
		# Authentication disabled - user_id always returns demo_user_123
		# if not user_id:
		# 	return jsonify({"error": "unauthorized"}), 401
		
		data = request.get_json(force=True) or {}
		note = data.get("note", {})
		
		# Get user's notes with labels for training
		# Assuming you have a notes collection (you can use resources or create one)
		all_notes = list(resources.find({
			"userId": user_id,
			"type": "note"  # or whatever type you use
		}).limit(100))
		
		if len(all_notes) < 5:
			# Not enough data, return default
			return jsonify({
				"subject": "Other",
				"confidence": 0.0,
				"message": "Need more labeled notes for classification"
			}), 200
		
		# Extract notes and labels (assuming you have a 'subject' or 'category' field)
		notes_list = []
		labels = []
		for n in all_notes:
			if n.get("subject") or n.get("category"):
				notes_list.append({
					"title": n.get("title", ""),
					"content": n.get("description", "")
				})
				labels.append(n.get("subject") or n.get("category") or "Other")
		
		if len(notes_list) < 5:
			return jsonify({
				"subject": "Other",
				"confidence": 0.0
			}), 200
		
		# Fit classifier
		classifier = get_note_classifier(user_id)
		if classifier.fit(notes_list, labels):
			subject, confidence = classifier.predict(note)
			return jsonify({
				"subject": subject,
				"confidence": confidence,
				"method": "ml"
			}), 200
		else:
			return jsonify({
				"subject": "Other",
				"confidence": 0.0,
				"method": "default"
			}), 200
	except Exception as e:
		logger.exception("Note classification error: %s", e)
		return jsonify({"error": "ml_service_failed"}), 500

@app.get('/api/health')
def health():
	return jsonify({"ok": True})

@app.post('/api/eduhub/ai/schedule')
def ai_schedule_optimizer():
	"""Genetic algorithm powered schedule optimizer with Gemini narration."""
	try:
		user_id = get_user_id()
		if not user_id:
			return jsonify({"error": "unauthorized"}), 401

		pending_cursor = todos.find({"userId": user_id, "completed": False}).sort("deadline", DESCENDING)
		pending_todos = list(pending_cursor)

		if not pending_todos:
			return jsonify({
				"schedule": [],
				"metadata": {"fitness": 0.0, "evaluatedGenerations": 0, "prioritySummary": {}},
				"analysis": {
					"summary": "No pending tasks found.",
					"recommendations": [],
					"breakAdvice": None,
					"nextSteps": []
				}
			}), 200

		recent_mood = moods.find_one({"userId": user_id}, sort=[("date", DESCENDING)])
		today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
		today_focus = list(focus_sessions.find({
			"userId": user_id,
			"startTime": {"$gte": today_start},
			"status": "completed"
		}))
		total_focus_today = sum(session.get("duration", 0) for session in today_focus)

		sanitised_tasks = []
		for todo in pending_todos:
			task_data = dict(todo)
			task_data["id"] = str(task_data.get("_id"))
			task_data.pop("_id", None)
			for field in ("deadline", "createdAt", "updatedAt"):
				value = task_data.get(field)
				if isinstance(value, datetime):
					task_data[field] = value.isoformat()
			sanitised_tasks.append(task_data)

		ga_context = {
			"mood": recent_mood.get("mood") if recent_mood else None,
			"focusMinutes": total_focus_today // 60,
		}

		scheduler = get_task_scheduler(user_id)
		ga_result = scheduler.optimize(sanitised_tasks, context=ga_context)

		analysis_payload = {
			"summary": "Genetic optimizer ran without neural narration.",
			"recommendations": [
				{
					"taskTitle": item.get("title", "Untitled"),
					"reason": f"Rank {item.get('gaRank')} with heuristic priority {item.get('heuristicPriority')}"
				}
				for item in ga_result.get("schedule", [])[:3]
			],
			"breakAdvice": None,
			"nextSteps": []
		}

		if gemini_model:
			try:
				heuristic_weights = scheduler.prioritizer.heuristic_weights
				prompt_context = {
					"mood": ga_context.get("mood") or "unknown",
					"focusMinutes": ga_context.get("focusMinutes"),
					"heuristicWeights": heuristic_weights,
					"fuzzyRules": [
						"If mood is 'okay' and task difficulty is 'medium', elevate to high priority",
						"If mood is low (sad/tired) and difficulty is hard, defer unless urgent"
					],
					"schedule": ga_result.get("schedule", []),
					"metadata": ga_result.get("metadata", {}),
				}
				prompt = (
					"You are a neural productivity strategist coordinating with a heuristic "
					"+ genetic algorithm engine."
					" Summarize the optimized schedule, referencing urgency, days until deadlines, "
					"difficulty, and the fuzzy rules provided. Explain how the heuristic baseline "
					"and genetic evolution interacted."
					" Return a JSON object with keys: summary, recommendations (array with taskTitle"
					" and reason), breakAdvice (object with shouldBreak boolean and message), and"
					" nextSteps (array of short actions)."
					f" Context: {json.dumps(prompt_context, ensure_ascii=False)}"
				)
				response = gemini_model.generate_content(prompt)
				analysis_payload = json.loads(response.text)
			except Exception as gen_err:
				logger.error(f"Gemini schedule narration failed: {gen_err}")

		return jsonify({
			"schedule": ga_result.get("schedule", []),
			"metadata": ga_result.get("metadata", {}),
			"analysis": analysis_payload,
		}), 200
	except Exception as e:
		logger.exception("Schedule optimization error: %s", e)
		return jsonify({"error": "schedule_failed"}), 500


if __name__ == '__main__':
	# Disable debug mode on Windows to avoid socket errors
	import sys
	use_debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true' and sys.platform != 'win32'
	app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')), debug=use_debug, use_reloader=use_debug)
