// @version 2.1.11
import { bus } from "../core/event-bus.js";
import { TrainingService } from "./training/index.js";

export class Precog {
  public training: TrainingService;

  constructor() {
    console.log("[Precog] Initializing Predictive Intelligence...");
    this.training = new TrainingService(process.cwd());
  }

  public async init() {
    console.log("[Precog] Online.");
    bus.publish("precog", "system:ready", { module: "precog" });
  }
}

export const precog = new Precog();
