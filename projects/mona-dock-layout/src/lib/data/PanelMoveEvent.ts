import { Panel } from "./Panel";
import { Priority } from "./Priority";
import { Position } from "./Position";

export interface PanelMoveEvent {
    newPosition: Position;
    newPriority: Priority;
    oldPosition: Position;
    oldPriority: Priority;
    panel: Panel;
    wasOpenBefore: boolean;
}
