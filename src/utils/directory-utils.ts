/**
 * Directory operations utilities
 * Includes: size calculation, file counting, comprehensive stats
 * @module utils/directory-utils
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { getExtension } from './platform';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Comprehensive directory statistics
 */
export interface DirectoryStats {
  /** Number of files (not directories) */
  fileCount: number;

  /** Number of subdirectories */
  dirCount: number;

  /** Total size in bytes */
  totalSize: number;

  /** Maximum directory depth found */
  maxDepth: number;

  /** File count by extension (e.g., { ".ts": 45, ".js": 30 }) */
  byExtension: Record<string, number>;
}

/**
 * Options for directory operations
 */
export interface DirectoryOptions {
  /** Maximum depth to traverse (default: Infinity) */
  maxDepth?: number;

  /** Patterns to ignore (default: ['node_modules', '.git', 'dist']) */
  ignore?: string[];

  /** Follow symbolic links (default: false) */
  followSymlinks?: boolean;
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Default ignore patterns
 */
const DEFAULT_IGNORE = ['node_modules', '.git', 'dist', '.svn', '.hg'];

/**
 * Checks if a path should be ignored
 */
function shouldIgnore(itemPath: string, ignorePatterns: string[]): boolean {
  const basename = path.basename(itemPath);
  return ignorePatterns.some(pattern => {
    // Exact match
    if (basename === pattern) return true;
    // Glob-like simple match
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(basename);
    }
    return false;
  });
}

// ============================================================================
// Size Calculation
// ============================================================================

/**
 * Calculates total size of a directory recursively
 *
 * Performance: Uses async iteration to avoid blocking
 *
 * @param dirPath - Directory path
 * @param options - Calculation options
 * @returns Total size in bytes
 *
 * @example
 * ```typescript
 * const size = await calculateDirectorySize('/home/user/project');
 * console.log(size); // 10485760 (10 MB in bytes)
 * ```
 */
export async function calculateDirectorySize(
  dirPath: string,
  options: DirectoryOptions = {}
): Promise<number> {
  const { ignore = DEFAULT_IGNORE, followSymlinks = false } = options;

  let totalSize = 0;

  async function traverse(currentPath: string, depth: number): Promise<void> {
    if (shouldIgnore(currentPath, ignore)) {
      return;
    }

    try {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);

        if (shouldIgnore(itemPath, ignore)) {
          continue;
        }

        try {
          const stat = followSymlinks
            ? await fs.stat(itemPath)
            : await fs.lstat(itemPath);

          if (stat.isDirectory()) {
            await traverse(itemPath, depth + 1);
          } else if (stat.isFile()) {
            totalSize += stat.size;
          }
          // Skip symlinks if not following
        } catch {
          // Skip items we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Check if starting path is a directory
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      return stat.size; // Return file size if it's a file
    }
  } catch {
    return 0; // Path doesn't exist
  }

  await traverse(dirPath, 0);
  return totalSize;
}

// ============================================================================
// File Counting
// ============================================================================

/**
 * Counts files in a directory (excluding subdirectories)
 *
 * @param dirPath - Directory path
 * @param options - Counting options
 * @returns Number of files (not directories)
 *
 * @example
 * ```typescript
 * const count = await countFilesInDirectory('/home/user/project/src');
 * console.log(count); // 42 (files only, not subdirectories)
 * ```
 */
export async function countFilesInDirectory(
  dirPath: string,
  options: DirectoryOptions = {}
): Promise<number> {
  const { ignore = DEFAULT_IGNORE, followSymlinks = false } = options;

  let count = 0;

  async function traverse(currentPath: string): Promise<void> {
    if (shouldIgnore(currentPath, ignore)) {
      return;
    }

    try {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);

        if (shouldIgnore(itemPath, ignore)) {
          continue;
        }

        try {
          const stat = followSymlinks
            ? await fs.stat(itemPath)
            : await fs.lstat(itemPath);

          if (stat.isDirectory()) {
            await traverse(itemPath);
          } else if (stat.isFile()) {
            count++;
          }
        } catch {
          // Skip items we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Check if starting path is a directory
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      return 1; // It's a file, count it as 1
    }
  } catch {
    return 0; // Path doesn't exist
  }

  await traverse(dirPath);
  return count;
}

/**
 * Counts directories in a directory (excluding files)
 *
 * @param dirPath - Directory path
 * @param options - Counting options
 * @returns Number of subdirectories
 */
export async function countDirectoriesInDirectory(
  dirPath: string,
  options: DirectoryOptions = {}
): Promise<number> {
  const { ignore = DEFAULT_IGNORE, followSymlinks = false } = options;

  let count = 0;

  async function traverse(currentPath: string, depth: number): Promise<void> {
    if (shouldIgnore(currentPath, ignore)) {
      return;
    }

    try {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);

        if (shouldIgnore(itemPath, ignore)) {
          continue;
        }

        try {
          const stat = followSymlinks
            ? await fs.stat(itemPath)
            : await fs.lstat(itemPath);

          if (stat.isDirectory()) {
            count++;
            await traverse(itemPath, depth + 1);
          }
        } catch {
          // Skip items we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      return 0; // It's a file, no subdirectories
    }
  } catch {
    return 0; // Path doesn't exist
  }

  await traverse(dirPath, 0);
  return count;
}

// ============================================================================
// Comprehensive Stats
// ============================================================================

/**
 * Gets comprehensive statistics for a directory
 *
 * Single-pass traversal that collects all stats at once
 * More efficient than calling individual functions separately
 *
 * @param dirPath - Directory path
 * @param options - Options for traversal
 * @returns DirectoryStats with all information
 *
 * @example
 * ```typescript
 * const stats = await getDirectoryStats('/home/user/project');
 * console.log(stats.fileCount); // 156
 * console.log(stats.dirCount); // 23
 * console.log(stats.totalSize); // 10485760
 * console.log(stats.byExtension['.ts']); // 45
 * ```
 */
export async function getDirectoryStats(
  dirPath: string,
  options: DirectoryOptions = {}
): Promise<DirectoryStats> {
  const {
    maxDepth = 50, // Limit default depth to prevent stack overflow on deep directories
    ignore = DEFAULT_IGNORE,
    followSymlinks = false
  } = options;

  const stats: DirectoryStats = {
    fileCount: 0,
    dirCount: 0,
    totalSize: 0,
    maxDepth: 0,
    byExtension: {}
  };

  async function traverse(currentPath: string, depth: number): Promise<void> {
    // Check depth limit
    if (depth > maxDepth) {
      return;
    }

    // Update max depth
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (shouldIgnore(currentPath, ignore)) {
      return;
    }

    try {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);

        if (shouldIgnore(itemPath, ignore)) {
          continue;
        }

        try {
          const itemStat = followSymlinks
            ? await fs.stat(itemPath)
            : await fs.lstat(itemPath);

          if (itemStat.isDirectory()) {
            stats.dirCount++;
            await traverse(itemPath, depth + 1);
          } else if (itemStat.isFile()) {
            stats.fileCount++;
            stats.totalSize += itemStat.size;

            // Count by extension
            const ext = getExtension(itemPath) || '(no extension)';
            stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
          }
          // Skip symlinks, sockets, etc.
        } catch {
          // Skip items we can't stat
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Check if starting path exists and is a directory
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      // It's a file
      stats.fileCount = 1;
      stats.totalSize = stat.size;
      const ext = getExtension(dirPath) || '(no extension)';
      stats.byExtension[ext] = 1;
      return stats;
    }
  } catch {
    // Path doesn't exist - return empty stats
    return stats;
  }

  await traverse(dirPath, 0);
  return stats;
}

// ============================================================================
// Directory Structure
// ============================================================================

/**
 * Gets the maximum depth of a directory tree
 *
 * @param dirPath - Directory path
 * @param options - Options
 * @returns Maximum depth (0 for empty directory, 1 for directory with files only)
 *
 * @example
 * ```typescript
 * const depth = await getDirectoryDepth('/home/user/project');
 * console.log(depth); // 5
 * ```
 */
export async function getDirectoryDepth(
  dirPath: string,
  options: DirectoryOptions = {}
): Promise<number> {
  const { ignore = DEFAULT_IGNORE, followSymlinks = false } = options;

  let maxDepth = 0;

  async function traverse(currentPath: string, depth: number): Promise<void> {
    if (shouldIgnore(currentPath, ignore)) {
      return;
    }

    maxDepth = Math.max(maxDepth, depth);

    try {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);

        if (shouldIgnore(itemPath, ignore)) {
          continue;
        }

        try {
          const stat = followSymlinks
            ? await fs.stat(itemPath)
            : await fs.lstat(itemPath);

          if (stat.isDirectory()) {
            await traverse(itemPath, depth + 1);
          }
        } catch {
          // Skip items we can't access
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      return 0; // It's a file
    }
  } catch {
    return 0; // Path doesn't exist
  }

  await traverse(dirPath, 0);
  return maxDepth;
}
