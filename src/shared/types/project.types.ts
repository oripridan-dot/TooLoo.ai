// @version 3.3.398
/**
 * Project Type Definitions
 *
 * Figma/GitHub-inspired project management types for TooLoo.ai
 * Supports: versioning, branching, collaboration, rich metadata
 *
 * @module shared/types/project
 */

// ============================================================================
// CORE PROJECT TYPES
// ============================================================================

/**
 * Project visibility levels (like GitHub repositories)
 */
export type ProjectVisibility = 'private' | 'internal' | 'public';

/**
 * Project status indicators
 */
export type ProjectStatus = 'active' | 'archived' | 'draft' | 'template';

/**
 * Project type categories
 */
export type ProjectType =
  | 'general'
  | 'web-app'
  | 'api'
  | 'library'
  | 'design-system'
  | 'documentation'
  | 'experiment'
  | 'prototype';

/**
 * Collaborator role (like GitHub/Figma permissions)
 */
export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Branch status
 */
export type BranchStatus = 'active' | 'merged' | 'stale' | 'protected';

// ============================================================================
// COLLABORATOR & ACCESS
// ============================================================================

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: CollaboratorRole;
  addedAt: string;
  lastActiveAt?: string;
}

export interface AccessSettings {
  visibility: ProjectVisibility;
  allowForks: boolean;
  allowComments: boolean;
  requireApproval: boolean;
  collaborators: Collaborator[];
}

// ============================================================================
// VERSIONING & BRANCHING
// ============================================================================

export interface Version {
  id: string;
  number: string; // Semantic version: "1.0.0"
  name?: string; // Optional human-readable name
  description?: string;
  createdAt: string;
  createdBy: string;
  commitHash?: string;
  tags: string[];
  isRelease: boolean;
}

export interface Branch {
  id: string;
  name: string;
  description?: string;
  status: BranchStatus;
  isDefault: boolean;
  isProtected: boolean;
  createdAt: string;
  createdBy: string;
  lastCommitAt?: string;
  aheadBy?: number;
  behindBy?: number;
  parentBranch?: string;
}

export interface Commit {
  id: string;
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  branch: string;
  files: string[];
}

// ============================================================================
// PROJECT METADATA
// ============================================================================

export interface ProjectThumbnail {
  url: string;
  generatedAt: string;
  type: 'auto' | 'custom' | 'ai-generated';
}

export interface ProjectStats {
  stars: number;
  forks: number;
  views: number;
  branches: number;
  commits: number;
  collaborators: number;
  files: number;
  sizeBytes: number;
}

export interface ProjectActivity {
  id: string;
  type: 'commit' | 'branch' | 'merge' | 'comment' | 'star' | 'fork' | 'update' | 'execution' | 'artifact' | 'chat' | string;
  actor: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PROJECT SETTINGS
// ============================================================================

export interface ProjectSettings {
  defaultBranch: string;
  autoSave: boolean;
  autoVersion: boolean;
  requireReview: boolean;
  enableAI: boolean;
  aiAssistLevel: 'minimal' | 'moderate' | 'full';
  notifyOnChanges: boolean;
  theme?: string;
  customFields: Record<string, unknown>;
}

export interface ProjectMemory {
  shortTerm: string;
  longTerm: string;
  context: string[];
  preferences: Record<string, unknown>;
}

// ============================================================================
// MAIN PROJECT INTERFACE
// ============================================================================

export interface Project {
  // Identity
  id: string;
  slug: string; // URL-friendly identifier
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;

  // Visual
  thumbnail?: ProjectThumbnail;
  icon?: string;
  color?: string;

  // Ownership & Access
  owner: string;
  access: AccessSettings;

  // Versioning
  currentVersion: string;
  versions: Version[];
  branches: Branch[];
  defaultBranch: string;

  // Metadata
  tags: string[];
  stats: ProjectStats;
  settings: ProjectSettings;
  memory: ProjectMemory;

  // Activity
  recentActivity: ProjectActivity[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  archivedAt?: string;

  // Relations
  parentId?: string; // If forked
  templateId?: string; // If created from template
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export interface CreateProjectInput {
  name: string;
  description?: string;
  type?: ProjectType;
  visibility?: ProjectVisibility;
  templateId?: string;
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  tags?: string[];
  icon?: string;
  color?: string;
  settings?: Partial<ProjectSettings>;
}

export interface ForkProjectInput {
  sourceId: string;
  name?: string;
  description?: string;
  visibility?: ProjectVisibility;
}

export interface BranchCreateInput {
  projectId: string;
  name: string;
  description?: string;
  fromBranch?: string;
}

export interface CommitInput {
  projectId: string;
  branch: string;
  message: string;
  files: Array<{
    path: string;
    content: string;
    action: 'add' | 'modify' | 'delete';
  }>;
}

// ============================================================================
// PROJECT LISTING & FILTERING
// ============================================================================

export interface ProjectListFilter {
  type?: ProjectType[];
  status?: ProjectStatus[];
  visibility?: ProjectVisibility[];
  tags?: string[];
  owner?: string;
  search?: string;
  starred?: boolean;
  sortBy?: 'name' | 'updatedAt' | 'createdAt' | 'stars' | 'activity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  thumbnail?: ProjectThumbnail;
  icon?: string;
  color?: string;
  owner: string;
  stats: Pick<ProjectStats, 'stars' | 'forks' | 'collaborators'>;
  tags: string[];
  updatedAt: string;
  isStarred?: boolean;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// PROJECT TEMPLATES
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  icon?: string;
  color?: string;
  structure: {
    folders: string[];
    files: Array<{ path: string; template: string }>;
    settings: Partial<ProjectSettings>;
  };
  tags: string[];
  usageCount: number;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ProjectResponse {
  ok: boolean;
  project?: Project;
  error?: string;
}

export interface ProjectsResponse {
  ok: boolean;
  projects?: ProjectListItem[];
  total?: number;
  error?: string;
}

export interface BranchResponse {
  ok: boolean;
  branch?: Branch;
  error?: string;
}

export interface VersionResponse {
  ok: boolean;
  version?: Version;
  error?: string;
}
