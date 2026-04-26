/**
 * File operations utilities with performance and safety optimizations
 * Includes: metadata reading, binary detection, tmp storage, permission checks
 * @module utils/file-operations
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { formatTimestamp, formatFileSize } from './formatters';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default sample size for binary detection (8KB)
 * Reading only 8KB instead of entire file for performance
 */
export const BINARY_SAMPLE_SIZE = 8000;

/**
 * Maximum number of files to keep in tmp directory
 * Older files are deleted when this limit is exceeded
 */
export const TMP_MAX_FILES = 200;

/**
 * tmp directory path (relative to project root)
 */
export const TMP_DIR = path.resolve(process.cwd(), 'tmp');

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Comprehensive file metadata interface
 * Used across multiple tools for consistent file information
 */
export interface FileMetadata {
  /** Whether the path exists */
  exists: boolean;

  /** Whether the path is a regular file */
  isFile: boolean;

  /** Whether the path is a directory */
  isDirectory: boolean;

  /** Whether the file contains binary content (null bytes detected) */
  isBinary: boolean;

  /** Whether the file/directory is readable by current user */
  isReadable: boolean;

  /** Whether the file/directory is writable by current user */
  isWritable: boolean;

  /** File size in bytes */
  size: number;

  /** Number of lines (for text files only, undefined for binary) */
  lineCount?: number;

  /** File extension including dot, e.g., ".ts" */
  extension: string;

  /** File creation time */
  created: Date;

  /** Last modification time */
  modified: Date;

  /** Last access time */
  accessed: Date;
}

/**
 * Result of tmp cleanup operation
 */
export interface CleanupResult {
  /** Number of files deleted */
  deleted: number;

  /** Number of files remaining after cleanup */
  remaining: number;

  /** Total space freed in bytes */
  freedBytes: number;
}

// ============================================================================
// Binary Detection
// ============================================================================

/**
 * Checks if buffer content appears to be binary
 * Detects null bytes (0x00) which indicate binary content
 *
 * Performance: Only checks first `sampleSize` bytes (default 8KB)
 * instead of reading entire file
 *
 * @param buffer - Buffer to check
 * @param sampleSize - Number of bytes to check (default: 8000)
 * @returns True if null byte detected (likely binary)
 *
 * @example
 * ```typescript
 * const buffer = Buffer.from([0x00, 0x01, 0x02]);
 * isBinaryContent(buffer); // true (null byte present)
 *
 * const textBuffer = Buffer.from("Hello World");
 * isBinaryContent(textBuffer); // false
 * ```
 */
export function isBinaryContent(buffer: Buffer, sampleSize: number = BINARY_SAMPLE_SIZE): boolean {
  const end = Math.min(buffer.length, sampleSize);

  for (let i = 0; i < end; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// File Metadata
// ============================================================================

/**
 * Gets comprehensive metadata for a file or directory
 *
 * Performance optimizations:
 * - Binary check reads only 8KB sample, not entire file
 * - Uses fs.stat for size/times
 * - Gracefully handles errors
 *
 * @param filePath - Path to file or directory
 * @returns FileMetadata object with all available information
 *
 * @example
 * ```typescript
 * const meta = await getFileMetadata('/path/to/file.ts');
 * console.log(meta.isBinary); // false
 * console.log(meta.size); // 1024
 * console.log(meta.isWritable); // true
 * ```
 */
export async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const metadata: FileMetadata = {
    exists: false,
    isFile: false,
    isDirectory: false,
    isBinary: false,
    isReadable: false,
    isWritable: false,
    size: 0,
    extension: path.extname(filePath),
    created: new Date(0),
    modified: new Date(0),
    accessed: new Date(0)
  };

  try {
    // Check if exists and get stats
    const stats = await fs.stat(filePath);
    metadata.exists = true;
    metadata.isFile = stats.isFile();
    metadata.isDirectory = stats.isDirectory();
    metadata.size = stats.size;
    metadata.created = stats.birthtime;
    metadata.modified = stats.mtime;
    metadata.accessed = stats.atime;

    // Check permissions
    try {
      await fs.access(filePath, fs.constants.R_OK);
      metadata.isReadable = true;
    } catch {
      metadata.isReadable = false;
    }

    try {
      await fs.access(filePath, fs.constants.W_OK);
      metadata.isWritable = true;
    } catch {
      metadata.isWritable = false;
    }

    // Binary check for files only (not directories)
    if (metadata.isFile && metadata.isReadable) {
      // Read only sample size for binary detection (performance)
      const fd = await fs.open(filePath, 'r');
      try {
        const buffer = Buffer.alloc(Math.min(BINARY_SAMPLE_SIZE, metadata.size));
        await fs.read(fd, buffer, 0, buffer.length, 0);
        metadata.isBinary = isBinaryContent(buffer);

        // Count lines for text files only
        if (!metadata.isBinary) {
          const content = buffer.toString('utf-8');
          metadata.lineCount = content.split('\n').length;
        }
      } finally {
        await fs.close(fd);
      }
    }
  } catch {
    // Path doesn't exist or can't be accessed
    // Return default metadata with exists: false
    metadata.exists = false;
  }

  return metadata;
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * Checks if current user has write permission for a path
 *
 * @param filePath - Path to check
 * @returns True if writable
 *
 * @example
 * ```typescript
 * if (await checkWritePermission('/etc/passwd')) {
 *   // Can write
 * }
 * ```
 */
export async function checkWritePermission(filePath: string): Promise<boolean> {
  try {
    // Check parent directory if file doesn't exist yet
    const pathToCheck = await fs.pathExists(filePath)
      ? filePath
      : path.dirname(filePath);

    await fs.access(pathToCheck, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if current user has read permission for a path
 *
 * @param filePath - Path to check
 * @returns True if readable
 */
export async function checkReadPermission(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Tmp Directory Operations
// ============================================================================

/**
 * Ensures tmp directory exists, creates it if needed
 * Should be called once at server startup
 */
export async function ensureTmpDir(): Promise<void> {
  await fs.ensureDir(TMP_DIR);
}

/**
 * Generates a unique filename for tmp storage
 * Format: {timestamp}-{uuid}.txt
 *
 * @param extension - File extension (default: ".txt")
 * @returns Generated filename
 *
 * @example
 * ```typescript
 * generateTmpFilename(); // "2026-04-25T03-14-22-abc123-def456.txt"
 * generateTmpFilename('.bin'); // "2026-04-25T03-14-22-abc123-def456.bin"
 * ```
 */
export function generateTmpFilename(extension: string = '.txt'): string {
  const timestamp = formatTimestamp();
  const uuid = randomUUID();
  return `${timestamp}-${uuid}${extension}`;
}

/**
 * Saves content to tmp directory
 * Automatically converts Buffer to base64 for safe storage
 * Triggers cleanup after saving
 *
 * @param content - Content to save (string or Buffer)
 * @param reason - Reason for saving (for logging)
 * @returns Full absolute path to saved file
 *
 * @example
 * ```typescript
 * const tmpPath = await saveToTmp("Hello World", "file already exists");
 * // tmpPath: "/project/tmp/2026-04-25T03-14-22-xxx.txt"
 * ```
 */
export async function saveToTmp(
  content: string | Buffer,
  reason: string
): Promise<string> {
  await ensureTmpDir();

  const isBuffer = Buffer.isBuffer(content);
  const extension = isBuffer ? '.bin' : '.txt';
  const filename = generateTmpFilename(extension);
  const tmpPath = path.join(TMP_DIR, filename);

  // Convert Buffer to base64 for safe text storage
  const contentToSave = isBuffer
    ? `BASE64:${content.toString('base64')}`
    : content;

  await fs.writeFile(tmpPath, contentToSave, 'utf-8');

  // Log for debugging
  const sizeStr = formatFileSize(Buffer.byteLength(contentToSave, 'utf-8'));
  console.error(`[tmp] Saved ${sizeStr} due to: ${reason} → ${tmpPath}`);

  // Auto-cleanup after each save
  await cleanupTmp(TMP_MAX_FILES);

  return tmpPath;
}

/**
 * Cleans up old files in tmp directory
 * Deletes oldest files (FIFO) when count exceeds maxFiles
 *
 * @param maxFiles - Maximum files to keep (default: 200)
 * @returns CleanupResult with deletion stats
 *
 * @example
 * ```typescript
 * const result = await cleanupTmp(200);
 * console.log(`Deleted ${result.deleted} files, freed ${result.freedBytes} bytes`);
 * ```
 */
export async function cleanupTmp(maxFiles: number = TMP_MAX_FILES): Promise<CleanupResult> {
  const result: CleanupResult = {
    deleted: 0,
    remaining: 0,
    freedBytes: 0
  };

  try {
    // Check if tmp exists
    if (!(await fs.pathExists(TMP_DIR))) {
      return result;
    }

    // Get all files in tmp
    const files = await fs.readdir(TMP_DIR);
    const fileStats: Array<{ name: string; path: string; mtime: Date; size: number }> = [];

    for (const filename of files) {
      const filePath = path.join(TMP_DIR, filename);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          fileStats.push({
            name: filename,
            path: filePath,
            mtime: stat.mtime,
            size: stat.size
          });
        }
      } catch {
        // Skip files we can't stat
      }
    }

    result.remaining = fileStats.length;

    // If under limit, nothing to do
    if (fileStats.length <= maxFiles) {
      return result;
    }

    // Sort by modification time (oldest first)
    fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

    // Delete oldest files to get under limit
    const toDelete = fileStats.length - maxFiles;
    const filesToDelete = fileStats.slice(0, toDelete);

    for (const file of filesToDelete) {
      try {
        await fs.remove(file.path);
        result.deleted++;
        result.freedBytes += file.size;
        result.remaining--;
      } catch (error) {
        console.error(`[tmp] Failed to delete ${file.path}:`, error);
      }
    }

    if (result.deleted > 0) {
      console.error(
        `[tmp] Cleanup: deleted ${result.deleted} old files, ` +
        `freed ${formatFileSize(result.freedBytes)}, ` +
        `${result.remaining} remaining`
      );
    }
  } catch (error) {
    console.error('[tmp] Cleanup error:', error);
  }

  return result;
}

/**
 * Decodes content from tmp file
 * Handles base64 decoding for binary files
 *
 * @param content - Content read from tmp file
 * @returns Original content (Buffer if it was base64, string otherwise)
 */
export function decodeTmpContent(content: string): string | Buffer {
  if (content.startsWith('BASE64:')) {
    return Buffer.from(content.slice(7), 'base64');
  }
  return content;
}
