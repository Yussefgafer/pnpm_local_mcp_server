/**
 * Platform-specific utilities and constants
 * Provides cross-platform path handling and OS detection
 * @module utils/platform
 */

import * as os from 'os';
import * as path from 'path';

/**
 * Current operating system platform
 * Detected once at module load time
 */
export const platform: 'linux' | 'darwin' | 'win32' | 'unknown' =
  (['linux', 'darwin', 'win32'].includes(process.platform)
    ? process.platform
    : 'unknown') as 'linux' | 'darwin' | 'win32' | 'unknown';

/**
 * Current username (cached to avoid repeated os.userInfo() calls)
 * Falls back to environment variables if os.userInfo() fails
 */
export const username: string = ((): string => {
  try {
    return os.userInfo().username;
  } catch {
    // Fallback to environment variables
    return process.env.USER || process.env.USERNAME || 'unknown';
  }
})();

/**
 * User's home directory (cached)
 */
export const homeDir: string = os.homedir();

/**
 * Gets the default path for Desktop folder across different platforms
 *
 * Supported platforms:
 * - Linux: ~/Desktop
 * - macOS: /Users/{username}/Desktop
 * - Windows: C:\Users\{username}\Desktop
 *
 * @returns Absolute path to Desktop folder
 * @throws Error if platform is not recognized or Desktop path cannot be determined
 *
 * @example
 * ```typescript
 * // On Linux:
 * getDefaultPath(); // "/home/john/Desktop"
 *
 * // On macOS:
 * getDefaultPath(); // "/Users/john/Desktop"
 *
 * // On Windows:
 * getDefaultPath(); // "C:\Users\john\Desktop"
 * ```
 */
export function getDefaultPath(): string {
  const desktopPath = path.join(homeDir, 'Desktop');
  return desktopPath;
}

/**
 * Checks if a path is absolute (works across platforms)
 *
 * @param filePath - The path to check
 * @returns True if path is absolute
 *
 * @example
 * ```typescript
 * isAbsolutePath("/home/user/file.txt"); // true (Linux/macOS)
 * isAbsolutePath("C:\\Users\\file.txt"); // true (Windows)
 * isAbsolutePath("./file.txt"); // false
 * isAbsolutePath("file.txt"); // false
 * ```
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Resolves a relative path to absolute path
 * Uses current working directory as base
 *
 * @param filePath - The path to resolve (can be relative or absolute)
 * @returns Absolute path
 *
 * @example
 * ```typescript
 * // If CWD is /home/user/project:
 * resolvePath("./src/index.ts"); // "/home/user/project/src/index.ts"
 * resolvePath("/etc/passwd"); // "/etc/passwd" (already absolute)
 * ```
 */
export function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}

/**
 * Normalizes a path for the current platform
 * Converts forward slashes to backslashes on Windows, etc.
 *
 * @param filePath - The path to normalize
 * @returns Normalized path
 *
 * @example
 * ```typescript
 * // On Windows:
 * normalizePath("/home/user/file.txt"); // "\\home\\user\\file.txt"
 *
 * // On Linux/macOS:
 * normalizePath("C:/Users/file.txt"); // "C:/Users/file.txt"
 * ```
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

/**
 * Joins multiple path segments with platform-specific separator
 *
 * @param paths - Path segments to join
 * @returns Joined path
 *
 * @example
 * ```typescript
 * joinPaths("home", "user", "file.txt"); // "home/user/file.txt" or "home\\user\\file.txt"
 * ```
 */
export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * Gets the directory name of a path
 *
 * @param filePath - The file path
 * @returns Directory portion of the path
 *
 * @example
 * ```typescript
 * getDirname("/home/user/file.txt"); // "/home/user"
 * getDirname("file.txt"); // "."
 * ```
 */
export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Gets the basename (filename) from a path
 *
 * @param filePath - The file path
 * @param ext - Optional extension to remove
 * @returns Filename (with or without extension)
 *
 * @example
 * ```typescript
 * getBasename("/home/user/file.txt"); // "file.txt"
 * getBasename("/home/user/file.txt", ".txt"); // "file"
 * ```
 */
export function getBasename(filePath: string, ext?: string): string {
  return ext ? path.basename(filePath, ext) : path.basename(filePath);
}

/**
 * Gets the file extension from a path
 *
 * @param filePath - The file path
 * @returns Extension including the dot, or empty string if none
 *
 * @example
 * ```typescript
 * getExtension("/home/user/file.txt"); // ".txt"
 * getExtension("/home/user/file"); // ""
 * getExtension("/home/user/archive.tar.gz"); // ".gz"
 * ```
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Checks if the current platform is Windows
 */
export function isWindows(): boolean {
  return platform === 'win32';
}

/**
 * Checks if the current platform is macOS
 */
export function isMacOS(): boolean {
  return platform === 'darwin';
}

/**
 * Checks if the current platform is Linux
 */
export function isLinux(): boolean {
  return platform === 'linux';
}

/**
 * Gets platform-specific temporary directory
 *
 * @returns Path to system temp directory
 */
export function getSystemTempDir(): string {
  return os.tmpdir();
}
