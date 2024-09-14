/*
 * Public API Surface of mona-dock-layout
 */

export * from "./lib/data/LayoutReadyEvent";
export * from "./lib/data/LayoutApi";
export { PanelCloseEvent, PanelOpenEvent } from "./lib/data/PanelEvents";
export { Position } from "./lib/data/Position";
export { Priority } from "./lib/data/Priority";

export * from "./lib/directives/panel-content-template.directive";
export * from "./lib/directives/panel-action-template.directive";
export * from "./lib/directives/panel-title-template.directive";
export * from "./lib/directives/layout-content-template.directive";

export * from "./lib/components/dock-panel/dock-panel.component";
export * from "./lib/components/dock-layout/dock-layout.component";
