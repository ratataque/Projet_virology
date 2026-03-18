#!/usr/bin/env python3
"""
Mock Browser Login Database Generator

Generates a mock_logins.json file on the user's Desktop that simulates
a browser's saved credential database. The passwords are base64-encoded
to simulate DPAPI-encrypted blobs.

Usage:
    python generate_mock_logins.py

    On Windows with DPAPI encryption:
    python generate_mock_logins.py --dpapi
"""

import base64
import json
import os
import sys
import argparse
from datetime import datetime, timedelta
import random

MOCK_CREDENTIALS = [
    {
        "origin_url": "https://accounts.google.com/signin",
        "username_value": "john.doe@gmail.com",
        "password_cleartext": "G00gl3P@ssw0rd!2025",
        "date_created": "2025-01-15T10:30:00Z",
    },
    {
        "origin_url": "https://github.com/login",
        "username_value": "johndoe-dev",
        "password_cleartext": "gh_s3cur3_t0k3n_987!",
        "date_created": "2025-02-01T14:20:00Z",
    },
    {
        "origin_url": "https://twitter.com/login",
        "username_value": "johndoe42",
        "password_cleartext": "Tw1tt3r_X_p@ss!",
        "date_created": "2025-03-10T08:15:00Z",
    },
    {
        "origin_url": "https://login.microsoftonline.com",
        "username_value": "john.doe@outlook.com",
        "password_cleartext": "M$_0ff1c3_2025!sec",
        "date_created": "2025-04-05T16:45:00Z",
    },
    {
        "origin_url": "https://www.facebook.com/login",
        "username_value": "john.doe.fb",
        "password_cleartext": "Fb_m3ta_p@55!",
        "date_created": "2025-05-20T09:00:00Z",
    },
    {
        "origin_url": "https://discord.com/login",
        "username_value": "johndoe#1337",
        "password_cleartext": "D1sc0rd_g@m3r_99!",
        "date_created": "2025-06-12T20:30:00Z",
    },
    {
        "origin_url": "https://www.amazon.com/ap/signin",
        "username_value": "john.doe@gmail.com",
        "password_cleartext": "Amzn_sh0pp3r_2025!",
        "date_created": "2025-07-01T11:15:00Z",
    },
    {
        "origin_url": "https://www.netflix.com/login",
        "username_value": "johndoe_stream",
        "password_cleartext": "N3tfl1x_&_ch1ll!",
        "date_created": "2025-08-18T19:00:00Z",
    },
]


def encrypt_dpapi(plaintext: str) -> bytes:
    """Encrypt using Windows DPAPI (CryptProtectData)"""
    try:
        import ctypes
        import ctypes.wintypes

        class DATA_BLOB(ctypes.Structure):
            _fields_ = [
                ("cbData", ctypes.wintypes.DWORD),
                ("pbData", ctypes.POINTER(ctypes.c_char)),
            ]

        CryptProtectData = ctypes.windll.crypt32.CryptProtectData
        CryptProtectData.restype = ctypes.wintypes.BOOL
        LocalFree = ctypes.windll.kernel32.LocalFree

        data = plaintext.encode("utf-8")
        input_blob = DATA_BLOB(
            len(data),
            ctypes.cast(
                ctypes.create_string_buffer(data, len(data)),
                ctypes.POINTER(ctypes.c_char),
            ),
        )
        output_blob = DATA_BLOB()

        success = CryptProtectData(
            ctypes.byref(input_blob),
            None,  # description
            None,  # optional entropy
            None,  # reserved
            None,  # prompt struct
            0,  # flags
            ctypes.byref(output_blob),
        )

        if not success:
            raise RuntimeError("CryptProtectData failed")

        encrypted = ctypes.string_at(output_blob.pbData, output_blob.cbData)
        LocalFree(output_blob.pbData)
        return encrypted

    except (ImportError, OSError, RuntimeError) as e:
        print(f"[!] DPAPI not available: {e}")
        return None


def encode_mock(plaintext: str) -> str:
    """Simple base64 encoding as mock 'encryption' for non-Windows"""
    return base64.b64encode(plaintext.encode("utf-8")).decode("ascii")


def generate(use_dpapi: bool = False):
    # Determine Desktop path
    if os.name == "nt":
        desktop = os.path.join(os.environ.get("USERPROFILE", ""), "Desktop")
    else:
        desktop = os.path.join(os.environ.get("HOME", ""), "Desktop")

    os.makedirs(desktop, exist_ok=True)
    output_path = os.path.join(desktop, "mock_logins.json")

    logins = []
    for cred in MOCK_CREDENTIALS:
        if use_dpapi:
            encrypted = encrypt_dpapi(cred["password_cleartext"])
            if encrypted:
                password_value = base64.b64encode(encrypted).decode("ascii")
            else:
                print(
                    f"[!] DPAPI failed for {cred['origin_url']}, falling back to base64"
                )
                password_value = encode_mock(cred["password_cleartext"])
        else:
            password_value = encode_mock(cred["password_cleartext"])

        logins.append(
            {
                "origin_url": cred["origin_url"],
                "username_value": cred["username_value"],
                "password_value": password_value,
                "date_created": cred["date_created"],
            }
        )

    with open(output_path, "w") as f:
        json.dump(logins, f, indent=2)

    print(f"[+] Generated {len(logins)} mock credentials")
    print(f"[+] Output: {output_path}")
    print(
        f"[+] Encryption: {'DPAPI (CryptProtectData)' if use_dpapi else 'Base64 (mock)'}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate mock browser login database")
    parser.add_argument(
        "--dpapi",
        action="store_true",
        help="Use Windows DPAPI (CryptProtectData) for real encryption. Only works on Windows.",
    )
    args = parser.parse_args()
    generate(use_dpapi=args.dpapi)
