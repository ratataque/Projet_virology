#!/usr/bin/env python3
"""
Wipe Gist completely - DELETE entire Gist (including history)
WARNING: This will delete the entire Gist. You'll need to create a new one.
"""
import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GIST_ID = os.getenv("GIST_ID")

if not GITHUB_TOKEN or not GIST_ID:
    print("[-] ERROR: GITHUB_TOKEN and GIST_ID must be set in .env file")
    print("[!] Copy .env.example to .env and fill in your values")
    sys.exit(1)

GIST_API_URL = f"https://api.github.com/gists/{GIST_ID}"

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}

def delete_gist():
    """Delete entire Gist (including all history)"""
    print("=" * 60)
    print("GIST COMPLETE WIPE (Delete Gist)")
    print("=" * 60)
    
    # Get current gist info
    response = requests.get(GIST_API_URL, headers=HEADERS)
    if response.status_code != 200:
        print(f"[-] Failed to fetch gist: {response.status_code}")
        sys.exit(1)
    
    gist = response.json()
    files = list(gist.get("files", {}).keys())
    description = gist.get("description", "No description")
    
    print(f"\n[*] Gist ID: {GIST_ID}")
    print(f"[*] Description: {description}")
    print(f"[*] Files: {len(files)}")
    print(f"[*] URL: https://gist.github.com/{GIST_ID}")
    
    print("\n⚠️  WARNING: This will DELETE the ENTIRE Gist!")
    print("    - All files will be deleted")
    print("    - All history will be deleted")
    print("    - The Gist URL will become invalid")
    print("    - You'll need to create a NEW Gist")
    print("    - You'll need to UPDATE agent/controller with new Gist ID")
    
    confirm = input("\nType 'DELETE' to confirm complete deletion: ").strip()
    
    if confirm != "DELETE":
        print("[*] Cancelled")
        return
    
    # Delete entire Gist
    print("\n[*] Deleting entire Gist...")
    response = requests.delete(GIST_API_URL, headers=HEADERS)
    
    if response.status_code == 204:
        print("[+] Gist deleted successfully!")
        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("=" * 60)
        print("1. Create new Gist at: https://gist.github.com/")
        print("2. Copy new Gist ID from URL")
        print("3. Update GIST_ID in:")
        print("   - controller.py (line 22)")
        print("   - c2_agent/src/main.rs (line 23)")
        print("   - wipe_gist.py (line 8)")
        print("4. Rebuild agent: cd c2_agent && cargo build --release")
    else:
        print(f"[-] Failed to delete: {response.status_code}")
        print(response.text)
        sys.exit(1)

def clear_files_only():
    """Clear all files but keep Gist (keeps history)"""
    print("=" * 60)
    print("GIST FILE WIPE (Keep History)")
    print("=" * 60)
    
    # Get current gist contents
    response = requests.get(GIST_API_URL, headers=HEADERS)
    if response.status_code != 200:
        print(f"[-] Failed to fetch gist: {response.status_code}")
        sys.exit(1)
    
    gist = response.json()
    files = list(gist.get("files", {}).keys())
    
    if not files:
        print("[*] Gist is already empty")
        return
    
    print(f"[*] Found {len(files)} file(s) in gist:")
    for f in files:
        print(f"    - {f}")
    
    print("\n[*] This will delete all files but KEEP the Gist")
    print("    - Files will be deleted from current version")
    print("    - History will remain (old versions still accessible)")
    print("    - Gist ID stays the same")
    
    confirm = input("\nType 'YES' to confirm: ").strip()
    
    if confirm != "YES":
        print("[*] Cancelled")
        return
    
    # Delete all files
    files_to_delete = {f: None for f in files}
    payload = {"files": files_to_delete}
    
    print("\n[*] Deleting all files...")
    response = requests.patch(GIST_API_URL, headers=HEADERS, json=payload)
    
    if response.status_code == 200:
        print(f"[+] Successfully deleted {len(files)} file(s)")
        print("[+] Gist is now empty (history preserved)")
    else:
        print(f"[-] Failed: {response.status_code}")
        print(response.text)
        sys.exit(1)

def main():
    print("\n" + "=" * 60)
    print("GIST WIPE UTILITY")
    print("=" * 60)
    print("\nChoose option:")
    print("1. Clear files only (keep Gist and history)")
    print("2. Delete entire Gist (complete wipe, including history)")
    print("3. Cancel")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        clear_files_only()
    elif choice == "2":
        delete_gist()
    else:
        print("[*] Cancelled")

if __name__ == "__main__":
    main()
