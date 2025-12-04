/**
 * QA Registry Module
 * Centralizes knowledge about which files matter for QA checks
 */

export {
  ESSENTIAL_DIRECTORIES,
  ORPHAN_SUBDIRECTORIES,
  EXCLUDED_DIRECTORIES,
  EXCLUDED_FILE_PATTERNS,
  VALID_ENTRY_POINTS,
  IMPLICIT_ENTRY_DIRECTORIES,
  PROTECTED_FILES,
  shouldExcludeFile,
  isValidEntryPoint,
  isEssentialDirectory,
  isProtectedFile,
  getFilePriority,
  REGISTRY_STATS,
} from './essential-files.js';
