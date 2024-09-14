import { Priority } from "./Priority";
export interface ContainerSizeSaveData {
    lastPanelGroupResizerPosition: string;
    panelGroupResizerStyles: ResizerStyles;
    panelSizeData: Record<Priority, Partial<CSSStyleDeclaration>>;
    styles: Partial<CSSStyleDeclaration>;
}

export type ResizerStyles = Partial<CSSStyleDeclaration>;
