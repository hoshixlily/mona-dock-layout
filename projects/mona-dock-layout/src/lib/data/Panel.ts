import { Position } from "./Position";
import { Priority } from "./Priority";

export interface Panel {
    id: string;
    index: number;
    position: Position;
    priority: Priority;
    startOpen?: boolean;
    title?: string;
    uid: string;
    wasOpenBeforeHidden: boolean;
}
