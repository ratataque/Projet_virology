# Windows PrivEsc

---

## Objectif

Escalader les privilèges d'un compte **Administrateur (High Integrity)** vers **`NT AUTHORITY\SYSTEM`** sur Windows 11 (Build 22621/22631) en volant le jeton de sécurité du processus `winlogon.exe`.

```
Administrateur (High Integrity)  →  NT AUTHORITY\SYSTEM
            [Token Stealing via winlogon.exe]
```

> **Prérequis** : le programme doit être lancé depuis une **invite de commande élevée** (clic droit → "Exécuter en tant qu'administrateur").

---

## Technique : Token Impersonation (Token Stealing)

### Principe

Sous Windows, chaque processus possède un **jeton de sécurité (Access Token)** définissant son identité et ses privilèges. Le processus système `winlogon.exe` tourne **toujours** sous l'identité `NT AUTHORITY\SYSTEM` (SID : `S-1-5-18`).

En obtenant un handle sur ce processus, il est possible de **dupliquer son jeton** et d'appeler `ImpersonateLoggedOnUser` pour que le thread courant hérite de l'identité SYSTEM — sans avoir besoin de `SeAssignPrimaryTokenPrivilege`.

---

## Flux d'exécution détaillé

```
privesc.exe (Admin élevé)
    │
    ├─ [0] Vérification SID (S-1-5-18 ?)
    │       Si déjà SYSTEM → écriture de WIN_SYSTEM.txt + sortie
    │
    ├─ [1] AdjustTokenPrivileges("SeDebugPrivilege")
    │       Permet d'ouvrir des processus protégés (winlogon, lsass...)
    │
    ├─ [2] CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS)
    │       Énumère tous les processus en cours
    │       → Process32Next() jusqu'à trouver "winlogon.exe"
    │       → Récupère son PID
    │
    ├─ [3] OpenProcess(PROCESS_QUERY_INFORMATION, PID winlogon)
    │       Ouvre un handle sur le processus winlogon.exe
    │
    ├─ [4] OpenProcessToken(TOKEN_DUPLICATE | TOKEN_QUERY)
    │       Récupère le jeton SYSTEM de winlogon
    │
    ├─ [5] DuplicateTokenEx(SecurityImpersonation, TokenPrimary)
    │       Duplique le jeton SYSTEM → newToken
    │
    ├─ [6] ImpersonateLoggedOnUser(newToken)   ← advapi32.dll
    │       Le thread courant adopte l'identité SYSTEM
    │
    │   ┌── ZONE SYSTEM (thread = NT AUTHORITY\SYSTEM) ──────┐
    │   │   RunSystemFeature()                               │
    │   │   Toutes les opérations I/O utilisent le SID       │
    │   │   S-1-5-18 : fichiers, registre, services...       │
    │   └────────────────────────────────────────────────────┘
    │
    └─ [7] RevertToSelf()
            Retour à l'identité Administrateur
```

---

## Pourquoi `SeDebugPrivilege` est indispensable ?

Par défaut, même un Administrateur ne peut pas ouvrir un handle sur `winlogon.exe` avec les droits nécessaires. `SeDebugPrivilege` contourne cette restriction en autorisant `OpenProcess` sur tous les processus, y compris les processus protégés du système.

Ce privilège **existe** dans le token Admin mais est **désactivé** par défaut. La fonction `enablePrivilege()` l'active via `AdjustTokenPrivileges`.

---

## Compiler

```bash
GOOS=windows GOARCH=amd64 go build -o game.exe privesc.go
```

## Références

- [Token Impersonation — ired.team](https://www.ired.team/offensive-security/privilege-escalation/token-impersonation)
- [ImpersonateLoggedOnUser — MSDN](https://docs.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-impersonateloggedonuser)
- [DuplicateTokenEx — MSDN](https://docs.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-duplicatetokenex)
- [SeDebugPrivilege — MSDN](https://docs.microsoft.com/en-us/windows/security/threat-protection/auditing/audit-privilege-use)
- [golang.org/x/sys/windows](https://pkg.go.dev/golang.org/x/sys/windows)
