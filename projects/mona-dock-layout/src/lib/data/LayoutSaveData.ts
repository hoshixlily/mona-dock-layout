import { Position } from "./Position";
import { Priority } from "./Priority";
import { ContainerSizeSaveData } from "./ContainerSizeData";
import { PanelViewMode } from "./PanelViewMode";

export interface LayoutSaveData {
    openPanelIdList: string[];
    panelSaveData: PanelSaveData[];
    sizeData: Record<Position, ContainerSizeSaveData>;
}

export interface PanelSaveData {
    id: string;
    index: number;
    position: Position;
    priority: Priority;
    viewMode: PanelViewMode;
}
