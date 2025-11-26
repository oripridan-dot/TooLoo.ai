// @version 2.1.295
import { Response } from "express";
import { bus, Event } from "../core/event-bus.js";

export const request = (event: string, payload: Record<string, any>, res: Response, timeout = 5000) => {
  const requestId =
    payload.requestId ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const listener = (evt: Event) => {
    if (evt.payload.requestId === requestId) {
      if (evt.payload.error) {
        res
          .status(evt.payload.status || 500)
          .json({ error: evt.payload.error });
      } else {
        res.json(evt.payload.data || evt.payload.response);
      }
      bus.off("cortex:response", listener);
    }
  };

  bus.on("cortex:response", listener);

  bus.publish("nexus", event, { ...payload, requestId });

  setTimeout(() => {
    bus.off("cortex:response", listener);
    if (!res.headersSent) {
      res.status(504).json({ error: "Request timed out" });
    }
  }, timeout);
};
