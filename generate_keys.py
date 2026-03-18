#!/usr/bin/env python3
"""
RSA Key Pair Generator
Generates public/private key pair for C2 encryption
Also generates AES key for command encryption
"""

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import secrets

def generate_keypair(key_size=2048):
    """Generate RSA key pair"""
    print(f"[*] Generating {key_size}-bit RSA key pair...")
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
        backend=default_backend()
    )
    
    # Generate public key
    public_key = private_key.public_key()
    
    # Serialize private key to PEM format
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key to PEM format
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem, public_pem


def main():
    print("="*60)
    print("C2 Key Generator - RSA + AES")
    print("="*60)
    
    # Generate RSA key pair (for results and signatures)
    private_pem, public_pem = generate_keypair(key_size=2048)
    
    # Generate AES-256 key (for command encryption)
    print("[*] Generating AES-256 key for command encryption...")
    aes_key = secrets.token_bytes(32)  # 256 bits
    aes_key_hex = aes_key.hex()
    
    # Save RSA private key (controller keeps)
    with open('private_key.pem', 'wb') as f:
        f.write(private_pem)
    print("[+] RSA private key saved to: private_key.pem")
    
    # Save RSA public key (agent gets)
    with open('public_key.pem', 'wb') as f:
        f.write(public_pem)
    print("[+] RSA public key saved to: public_key.pem")
    
    # Save AES key (both controller and agent use)
    with open('aes_key.txt', 'w') as f:
        f.write(aes_key_hex)
    print("[+] AES key saved to: aes_key.txt")
    
    print("\n" + "="*60)
    print("KEY USAGE:")
    print("="*60)
    print("RSA KEYS (for results):")
    print("  - Controller: Decrypts results with private_key.pem")
    print("  - Agent: Encrypts results with public_key.pem")
    print("")
    print("AES KEY + RSA SIGNATURE (for commands):")
    print("  - Controller: Encrypts with AES + Signs with private_key.pem")
    print("  - Agent: Decrypts with AES + Verifies signature with public_key.pem")
    print("="*60)
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("1. AGENT (c2_agent/src/main.rs):")
    print("   - PUBLIC_KEY_PEM = content of public_key.pem")
    print("   - AES_KEY = content of aes_key.txt")
    print("")
    print("2. CONTROLLER (controller.py):")
    print("   - Automatically uses private_key.pem")
    print("   - Automatically uses aes_key.txt")
    print("")
    print("⚠️  KEEP private_key.pem AND aes_key.txt SECRET!")
    print("="*60)
    
    print("\n[*] RSA Public Key Preview:")
    print("-"*60)
    print(public_pem.decode('utf-8'))
    print("-"*60)
    
    print("\n[*] AES Key Preview:")
    print("-"*60)
    print(aes_key_hex)
    print("-"*60)
    print("3. The controller.py will automatically use private_key.pem")
    print("\n⚠️  KEEP private_key.pem SECRET! Never commit to Git!")
    print("="*60)
    
    print("\n[*] Public Key Preview:")
    print("-"*60)
    print(public_pem.decode('utf-8'))
    print("-"*60)
    print("   - Uses agent_public_key.pem (for command encryption)")
    print("")
    print("⚠️  KEEP ALL *_private_key.pem FILES SECRET!")
    print("="*60)
    
    print("\n[*] Controller Public Key (for agent):")
    print("-"*60)
    print(controller_public_pem.decode('utf-8'))
    print("-"*60)
    
    print("\n[*] Agent Private Key (for agent):")
    print("-"*60)
    print(agent_private_pem.decode('utf-8'))
    print("-"*60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[-] Error: {e}")
        import traceback
        traceback.print_exc()
