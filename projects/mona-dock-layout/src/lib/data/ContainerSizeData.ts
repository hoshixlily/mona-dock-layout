import { Priority } from "./Priority";
import { WritableSignal } from "@angular/core";

export interface ContainerSizeSaveData {
    lastPanelGroupResizerPosition: string;
    panelGroupResizerStyles: ResizerStyles;
    panelSizeData: Record<Priority, Partial<CSSStyleDeclaration>>;
    styles: Partial<CSSStyleDeclaration>;
}

export type ResizerStyles = Partial<CSSStyleDeclaration>;
