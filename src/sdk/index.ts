// @version 2.2.2
export * from "./llm.js";
export * from "./storage.js";
export * from "./visual.js";

import { llm } from "./llm.js";
import { storage } from "./storage.js";
import { visual } from "./visual.js";

export const tooloo = {
  llm,
  storage,
  visual,
};

export default tooloo;
