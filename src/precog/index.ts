// @version 2.1.38
import { bus } from "../core/event-bus.js";
import { TrainingService } from "./training/index.js";
import { ProviderEngine } from "./provider-engine.js";
import { registry } from "../core/module-registry.js";
import { SYSTEM_VERSION } from "../core/system-info.js";

export class Precog {
  public training: TrainingService;
  public providers: ProviderEngine;

  constructor() {
    console.log("[Precog] Initializing Predictive Intelligence...");
    
    registry.register({
        name: "precog",
        version: SYSTEM_VERSION,
        status: "booting"
    });

    this.training = new TrainingService(process.cwd());
    this.providers = new ProviderEngine();
  }

  public async init() {
    console.log("[Precog] Online.");
    bus.publish("precog", "system:ready", { module: "precog" });
  }
}

export const precog = new Precog();
