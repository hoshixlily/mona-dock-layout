import { Position } from "./Position";
import { Priority } from "./Priority";

export interface PanelActionTemplateContext {
    id: string;
    position: Position;
    priority: Priority;
}
