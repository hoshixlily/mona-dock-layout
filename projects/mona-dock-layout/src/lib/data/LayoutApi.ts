import { Priority } from "./Priority";
import { Position } from "./Position";

export interface LayoutApi {
    closePanel(panelId: string): void;

    movePanel(panelId: string, position: Position, priority: Priority): void;

    openPanel(panelId: string): void;

    setPanelVisible(panelId: string, visible: boolean): void;
}
