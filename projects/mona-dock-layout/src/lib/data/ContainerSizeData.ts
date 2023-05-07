import { Priority } from "./Priority";

export interface ContainerSizeData {
    lastPanelGroupResizerPosition: string;
    panelGroupResizerStyles: Partial<CSSStyleDeclaration>;
    panelSizeData: Record<Priority, Partial<CSSStyleDeclaration>>;
    styles: Partial<CSSStyleDeclaration>;
}
