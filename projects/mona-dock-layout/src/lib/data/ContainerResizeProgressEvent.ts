import { Position } from "./Position";

export type ContainerResizeProgressEvent =
    | {
          position: Position;
          resizing: true;
      }
    | {
          resizing: false;
      };
