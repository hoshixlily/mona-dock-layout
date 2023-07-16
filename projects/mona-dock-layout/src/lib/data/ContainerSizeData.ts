import { Priority } from "./Priority";
import { WritableSignal } from "@angular/core";

export interface ContainerSizeData {
    lastPanelGroupResizerPosition: WritableSignal<string>;
    panelGroupResizerStyles: WritableSignal<Partial<CSSStyleDeclaration>>;
    panelSizeData: Record<Priority, Partial<CSSStyleDeclaration>>;
    styles: WritableSignal<Partial<CSSStyleDeclaration>>;
}

export interface ContainerSizeSaveData {
    lastPanelGroupResizerPosition: string;
    panelGroupResizerStyles: Partial<CSSStyleDeclaration>;
    panelSizeData: Record<Priority, Partial<CSSStyleDeclaration>>;
    styles: Partial<CSSStyleDeclaration>;
}
