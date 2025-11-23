// @version 2.1.37
import { bus } from "../core/event-bus.js";
import { TrainingService } from "./training/index.js";
import { ProviderEngine } from "./provider-engine.js";

export class Precog {
  public training: TrainingService;
  public providers: ProviderEngine;

  constructor() {
    console.log("[Precog] Initializing Predictive Intelligence...");
    this.training = new TrainingService(process.cwd());
    this.providers = new ProviderEngine();
  }

  public async init() {
    console.log("[Precog] Online.");
    bus.publish("precog", "system:ready", { module: "precog" });
  }
}

export const precog = new Precog();
