/**
 * Windows recognition for Remote Link Children.
 *
 * Remote Link drives its Child through a POSIX `sh` prelude, so a Windows Child is refused
 * before any link key is issued or tunnel started. A Windows OpenSSH server shows up in one of
 * three ways, depending on its default shell:
 * - Git Bash, MSYS2 or Cygwin: `uname -s` reports MINGW*, MSYS*, CYGWIN* (or Windows*), and the
 *   ocx prelude exits with REMOTE_PLATFORM_UNSUPPORTED.
 * - cmd.exe: a POSIX command such as `true` or `sh` is "not recognized as an internal or
 *   external command".
 * - PowerShell: the same command "is not recognized as the name of a cmdlet".
 *
 * Hub mode (`ocx hub invite` on a Hub, `ocx connect` on the client) supports Windows clients, so
 * every refusal points there.
 */
import { REMOTE_PLATFORM_UNSUPPORTED } from "./ssh-argv";
import type { SshRunResult } from "./ssh-runner";

export type RemotePlatform = "windows" | "posix" | "unknown";

const WINDOWS_UNAME = /^(?:Windows|MSYS|MINGW|CYGWIN)/i;
const POSIX_UNAME = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const WINDOWS_SHELL_REFUSAL = /is not recognized as (?:an internal or external command|the name of a cmdlet)/i;

/** Remote argv that prints the kernel name; under cmd or PowerShell, `sh` itself is refused. */
export const REMOTE_UNAME_ARGV: readonly string[] = ["sh", "-c", "uname -s 2>/dev/null", "ocx-platform"];

/** Server-side refusal text, shared by the dashboard and the CLI's JSON consumers. */
export const WINDOWS_CHILD_REFUSAL = "Remote Link Children require macOS or Linux; Windows is unsupported. Connect a Windows computer in Hub mode: run ocx hub invite on a Hub, then the printed ocx connect command on the Windows computer.";

/** Does this output come from cmd.exe or PowerShell refusing a POSIX command? */
export function isWindowsShellRefusal(output: string): boolean {
  return WINDOWS_SHELL_REFUSAL.test(output);
}

/** Classify one remote command result. Transport failures and odd output stay unknown. */
export function classifyRemotePlatform(result: SshRunResult): RemotePlatform {
  if (result.code === REMOTE_PLATFORM_UNSUPPORTED) return "windows";
  if (isWindowsShellRefusal(result.stderr) || isWindowsShellRefusal(result.stdout)) return "windows";
  if (result.code !== 0) return "unknown";
  const name = result.stdout.trim().split(/\r?\n/)[0] ?? "";
  if (WINDOWS_UNAME.test(name)) return "windows";
  return POSIX_UNAME.test(name) ? "posix" : "unknown";
}

/** The CLI sentence for a refused Windows Child. */
export function windowsChildRefusal(alias: string): string {
  return `${alias} is a Windows computer. Remote Link Children require macOS or Linux, so no link key was issued and no tunnel was started. `
    + `Connect it in Hub mode instead: run 'ocx hub invite' on a Hub, then run the printed 'ocx connect' command on ${alias}.`;
}
