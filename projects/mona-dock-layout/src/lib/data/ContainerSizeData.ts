export interface ContainerSizeSaveData {
    lastPanelGroupResizerPosition: string;
    panelGroupResizerStyles: ResizerStyles;
    styles: Partial<CSSStyleDeclaration>;
}

export type ResizerStyles = Partial<CSSStyleDeclaration>;
