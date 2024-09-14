import { WritableSignal } from "@angular/core";

export interface LayoutConfiguration {
    containerResizeOffset: WritableSignal<number>;
    headerHeight: WritableSignal<number>;
    headerWidth: WritableSignal<number>;
    maxPanelSize: WritableSignal<number>;
    minContainerHeight: WritableSignal<number>;
    minContainerWidth: WritableSignal<number>;
    minPanelSize: WritableSignal<number>;
    panelHeaderHeight: WritableSignal<number>;
    panelResizeOffset: WritableSignal<number>;
}
