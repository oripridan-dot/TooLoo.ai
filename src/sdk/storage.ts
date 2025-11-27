// @version 2.2.2
import { ArtifactLedger } from "../nexus/engine/artifact-ledger.js";

export interface ArtifactData {
  type: "code" | "document" | "design" | "analysis" | "config" | "data";
  title: string;
  content: any;
  description?: string;
  mimeType?: string;
  tags?: string[];
  relatedIntentId?: string;
  relatedTaskId?: string;
}

export class StorageSDK {
  private ledger: ArtifactLedger;

  constructor() {
    // Initialize with default storage directory
    this.ledger = new ArtifactLedger();
  }

  /**
   * Save an artifact to the ledger.
   */
  async saveArtifact(data: ArtifactData) {
    return this.ledger.registerArtifact(data);
  }

  /**
   * Update an existing artifact.
   */
  async updateArtifact(id: string, content: any, changeDescription: string) {
    return this.ledger.updateArtifact(id, content, { changes: changeDescription });
  }

  /**
   * Retrieve an artifact by ID.
   */
  getArtifact(id: string) {
    return this.ledger.getArtifact(id);
  }

  /**
   * Search for artifacts.
   */
  search(query: { type?: string; tag?: string; title?: string }) {
    return this.ledger.searchArtifacts(query);
  }
}

export const storage = new StorageSDK();
