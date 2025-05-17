import { Panel } from "./Panel";
import { Priority } from "./Priority";
import { Position } from "./Position";

export enum MoveStage {
    Close = 1,
    Detach,
    Move,
    Attach,
    Open,
    End
}

export interface PanelMoveEvent {
    newPosition: Position;
    newPriority: Priority;
    oldPosition: Position;
    oldPriority: Priority;
    panel: Panel;
    stage: MoveStage;
    wasOpenBefore: boolean;
}
