import { Position } from "./Position";

export type PanelResizeProgressEvent =
    | {
          resizing: true;
          position: Position;
      }
    | {
          resizing: false;
      };
