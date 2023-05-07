import { Position } from "./Position";
import { Priority } from "./Priority";
import { ContainerSizeData } from "./ContainerSizeData";

export interface LayoutSaveData {
    panelSaveData: PanelSaveData[];
    sizeData: Record<Position, ContainerSizeData>;
}

export interface PanelSaveData {
    id: string;
    index: number;
    open: boolean;
    pinned: boolean;
    position: Position;
    priority: Priority;
}
