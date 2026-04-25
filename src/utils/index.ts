/**
 * Utilities barrel file
 * Central export point for all utility modules
 *
 * Usage:
 * ```typescript
 * // Import specific utilities
 * import { formatFileSize, getFileMetadata } from './utils';
 *
 * // Or import from specific modules for tree-shaking
 * import { formatFileSize } from './utils/formatters';
 * ```
 *
 * @module utils
 */

// ============================================================================
// Formatters
// ============================================================================

export {
  formatFileSize,
  countLines,
  formatTimestamp,
  truncate,
  bufferToBase64,
  base64ToBuffer
} from './formatters';

// ============================================================================
// Platform
// ============================================================================

export {
  platform,
  username,
  homeDir,
  getDefaultPath,
  isAbsolutePath,
  resolvePath,
  normalizePath,
  joinPaths,
  getDirname,
  getBasename,
  getExtension,
  isWindows,
  isMacOS,
  isLinux,
  getSystemTempDir
} from './platform';

// ============================================================================
// File Operations
// ============================================================================

export {
  BINARY_SAMPLE_SIZE,
  TMP_MAX_FILES,
  TMP_DIR,
  isBinaryContent,
  getFileMetadata,
  checkWritePermission,
  checkReadPermission,
  ensureTmpDir,
  generateTmpFilename,
  saveToTmp,
  cleanupTmp,
  decodeTmpContent
} from './file-operations';

// Types must be exported separately for isolatedModules
export type { FileMetadata, CleanupResult } from './file-operations';

// ============================================================================
// Directory Utilities
// ============================================================================

export {
  calculateDirectorySize,
  countFilesInDirectory,
  countDirectoriesInDirectory,
  getDirectoryStats,
  getDirectoryDepth
} from './directory-utils';

// Types must be exported separately for isolatedModules
export type { DirectoryStats, DirectoryOptions } from './directory-utils';
