/**
 * Security utilities for path validation and access control
 * @module utils/security
 */

import * as path from 'path';

// ============================================================================
// Allowed Paths
// ============================================================================

/**
 * List of allowed base paths for file operations.
 * Prevents path traversal attacks by restricting access to safe directories.
 */
const ALLOWED_PATHS = [
  process.cwd(),
  process.env.HOME || '',
  '/tmp',
].filter(Boolean);

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Checks if a target path is within the allowed directories.
 * Resolves the path to an absolute path before checking.
 * This prevents path traversal attacks (e.g., ../../../etc/passwd).
 *
 * @param targetPath - The path to validate
 * @returns True if the path is within an allowed directory
 *
 * @example
 * ```typescript
 * isPathAllowed('/home/user/file.txt'); // true
 * isPathAllowed('../../../etc/passwd');  // false (if outside allowed paths)
 * ```
 */
export function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return ALLOWED_PATHS.some(allowed => {
    const resolvedAllowed = path.resolve(allowed);
    // Ensure the resolved path starts with the allowed path + separator (or is exactly the allowed path)
    return resolved === resolvedAllowed || resolved.startsWith(resolvedAllowed + path.sep);
  });
}

/**
 * Validates a path and returns an error object if not allowed.
 * Convenience function for tools to use in their handler.
 *
 * @param targetPath - The path to validate
 * @returns An error response object if path is not allowed, null if allowed
 *
 * @example
 * ```typescript
 * const pathError = validatePath('/etc/passwd');
 * if (pathError) return pathError;
 * ```
 */
export function validatePath(targetPath: string): { content: Array<{ type: 'text'; text: string }>; isError: true } | null {
  if (!isPathAllowed(targetPath)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `❌ **Security Error**: Access to path \`${targetPath}\` is not allowed. The path is outside the permitted directories.`,
        },
      ],
      isError: true,
    };
  }
  return null;
}
