/**
 * Utilities for formatting data (file sizes, timestamps, etc.)
 * @module utils/formatters
 */

/**
 * Formats byte count into human-readable string using metric units (1000-based)
 *
 * Examples:
 * - 512 → "512 B"
 * - 1500 → "1.5 KB"
 * - 2500000 → "2.5 MB"
 * - 3000000000 → "3 GB"
 *
 * @param bytes - Number of bytes to format
 * @returns Formatted string with appropriate unit
 * @throws Error if bytes is negative
 *
 * @example
 * ```typescript
 * formatFileSize(1024); // "1 KB"
 * formatFileSize(1536000); // "1.5 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) {
    throw new Error('File size cannot be negative');
  }

  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1000; // Metric: 1000-based (not 1024)

  // Find appropriate unit
  const i = Math.floor(Math.log10(bytes) / Math.log10(k));
  const unit = units[Math.min(i, units.length - 1)];

  // Calculate value in the selected unit
  const value = bytes / Math.pow(k, Math.min(i, units.length - 1));

  // Format: use 2 decimals for MB and up, 0 or 1 for smaller
  if (unit === 'B') {
    return `${bytes} B`;
  } else if (value >= 100) {
    return `${Math.round(value)} ${unit}`;
  } else if (value >= 10) {
    return `${value.toFixed(1)} ${unit}`;
  } else {
    return `${value.toFixed(2)} ${unit}`;
  }
}

/**
 * Counts the number of lines in a string
 *
 * Handles different line ending styles:
 * - Unix (\n)
 * - Windows (\r\n)
 * - Old Mac (\r)
 *
 * @param content - The string content to count lines in
 * @returns Number of lines (at least 1 for non-empty content)
 *
 * @example
 * ```typescript
 * countLines("line1\nline2\nline3"); // 3
 * countLines("single line"); // 1
 * countLines(""); // 0
 * ```
 */
export function countLines(content: string): number {
  if (!content || content.length === 0) {
    return 0;
  }

  // Normalize line endings to \n, then count
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  // Handle trailing newline: "line\n" should count as 1 line, not 2
  if (lines[lines.length - 1] === '' && lines.length > 1) {
    return lines.length - 1;
  }

  return lines.length;
}

/**
 * Formats current timestamp for use in tmp filenames
 *
 * Format: "YYYY-MM-DDTHH-mm-ss" (ISO-like with safe filename characters)
 * Replaces colons with hyphens to ensure filesystem compatibility
 *
 * @returns Formatted timestamp string
 *
 * @example
 * ```typescript
 * formatTimestamp(); // "2026-04-25T03-14-22"
 * ```
 */
export function formatTimestamp(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum allowed length (including ellipsis)
 * @param ellipsis - String to append when truncated (default: "...")
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * truncate("Hello World", 8); // "Hello..."
 * truncate("Hello", 10); // "Hello"
 * ```
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }

  const truncatedLength = maxLength - ellipsis.length;
  if (truncatedLength <= 0) {
    return ellipsis.slice(0, maxLength);
  }

  return str.slice(0, truncatedLength) + ellipsis;
}

/**
 * Converts a Buffer to base64 string for safe storage
 *
 * @param buffer - The buffer to convert
 * @returns Base64 encoded string
 *
 * @example
 * ```typescript
 * const b64 = bufferToBase64(Buffer.from("hello"));
 * ```
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Converts base64 string back to Buffer
 *
 * @param base64 - The base64 string to decode
 * @returns Decoded Buffer
 * @throws Error if base64 string is invalid
 */
export function base64ToBuffer(base64: string): Buffer {
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    throw new Error('Invalid base64 string');
  }
}
