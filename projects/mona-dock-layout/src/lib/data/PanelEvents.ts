import { Panel } from "./Panel";

export interface PanelCloseBaseEvent {
    viaApi?: boolean;
    viaUser?: boolean;
}

export interface PanelCloseInternalEvent extends PanelCloseBaseEvent {
    panel: Panel;
    viaMove?: boolean;
    viaVisibilityChange?: boolean;
}

export interface PanelCloseEvent extends PanelCloseBaseEvent {
    panelId: string;
}

export interface PanelOpenBaseEvent {
    viaApi?: boolean;
    viaUser?: boolean;
}

export interface PanelOpenInternalEvent extends PanelOpenBaseEvent {
    panel: Panel;
    viaMove?: boolean;
    viaVisibilityChange?: boolean;
}

export interface PanelOpenEvent extends PanelOpenBaseEvent {
    panelId: string;
}
