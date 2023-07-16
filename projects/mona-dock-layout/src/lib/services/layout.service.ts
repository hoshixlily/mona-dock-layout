import { Injectable, signal, ViewContainerRef } from "@angular/core";
import { LayoutConfiguration } from "../data/LayoutConfiguration";
import { DefaultLayoutConfiguration } from "../data/DefaultLayoutConfiguration";
import { ReplaySubject, Subject } from "rxjs";
import { Position } from "../data/Position";
import { Panel } from "../data/Panel";
import { PanelMoveEvent } from "../data/PanelMoveEvent";
import { ContainerSizeData, ContainerSizeSaveData } from "../data/ContainerSizeData";
import { LayoutSaveData } from "../data/LayoutSaveData";
import { PanelVisibilityEvent } from "../data/PanelVisibilityEvent";
import { PanelCloseInternalEvent, PanelOpenInternalEvent } from "../data/PanelEvents";

@Injectable()
export class LayoutService {
    private layoutId: string = "";
    public readonly ContainerResizeInProgress$: Subject<boolean> = new Subject<boolean>();
    public readonly ContainerResizeStart$: Subject<Position> = new Subject<Position>();
    public readonly LayoutReady$: ReplaySubject<void> = new ReplaySubject<void>(1);
    public readonly PanelClose$: Subject<PanelCloseInternalEvent> = new Subject<PanelCloseInternalEvent>();
    public readonly PanelMove$: Subject<PanelMoveEvent> = new Subject<PanelMoveEvent>();
    public readonly PanelOpen$: Subject<PanelOpenInternalEvent> = new Subject<PanelOpenInternalEvent>();
    public readonly PanelResizeInProgress$: Subject<boolean> = new Subject<boolean>();
    public readonly PanelVisibility$: Subject<PanelVisibilityEvent> = new Subject<PanelVisibilityEvent>();
    public containerSizeDataMap: Record<Position, ContainerSizeData> = {
        left: {
            styles: signal({
                width: "300px",
                display: "none"
            }),
            panelSizeData: {
                primary: {
                    bottom: "50%"
                },
                secondary: {
                    top: "50%"
                }
            },
            panelGroupResizerStyles: signal({
                top: "50%"
            }),
            lastPanelGroupResizerPosition: signal("50%")
        },
        right: {
            styles: signal({
                width: "300px",
                display: "none"
            }),
            panelSizeData: {
                primary: {
                    bottom: "50%"
                },
                secondary: {
                    top: "50%"
                }
            },
            panelGroupResizerStyles: signal({
                top: "50%"
            }),
            lastPanelGroupResizerPosition: signal("50%")
        },
        top: {
            styles: signal({
                height: "300px",
                display: "none"
            }),
            panelSizeData: {
                primary: {
                    right: "50%"
                },
                secondary: {
                    left: "50%"
                }
            },
            panelGroupResizerStyles: signal({
                left: "50%"
            }),
            lastPanelGroupResizerPosition: signal("50%")
        },
        bottom: {
            styles: signal({
                height: "300px",
                display: "none"
            }),
            panelSizeData: {
                primary: {
                    right: "50%"
                },
                secondary: {
                    left: "50%"
                }
            },
            panelGroupResizerStyles: signal({
                left: "50%"
            }),
            lastPanelGroupResizerPosition: signal("50%")
        }
    };
    public headerStyles: Record<Position, Partial<CSSStyleDeclaration>> = {
        left: {},
        right: {},
        top: {},
        bottom: {}
    };
    public layoutConfig: LayoutConfiguration = { ...DefaultLayoutConfiguration };
    public layoutDomRect!: DOMRect;
    public panelTemplateContentsContainerRef!: ViewContainerRef;
    public panels: Panel[] = [];

    public constructor() {
        this.initialize();
    }

    public getHeaderSize(position: Position): number {
        const headerElement = document.querySelector(`div.layout-header.${position}`) as HTMLElement;
        return position === "left" || position === "right" ? headerElement.offsetWidth : headerElement.offsetHeight;
    }

    public loadLayout(): boolean {
        const savedLayoutDataJson = window.localStorage.getItem(`LAYOUT_${this.layoutId}`);
        if (savedLayoutDataJson) {
            const savedLayoutData: LayoutSaveData = JSON.parse(savedLayoutDataJson);
            this.containerSizeDataMap = {
                ...savedLayoutData.sizeData,
                top: {
                    ...savedLayoutData.sizeData.top,
                    lastPanelGroupResizerPosition: signal(savedLayoutData.sizeData.top.lastPanelGroupResizerPosition),
                    panelGroupResizerStyles: signal(savedLayoutData.sizeData.top.panelGroupResizerStyles),
                    styles: signal(savedLayoutData.sizeData.top.styles)
                },
                bottom: {
                    ...savedLayoutData.sizeData.bottom,
                    lastPanelGroupResizerPosition: signal(
                        savedLayoutData.sizeData.bottom.lastPanelGroupResizerPosition
                    ),
                    panelGroupResizerStyles: signal(savedLayoutData.sizeData.bottom.panelGroupResizerStyles),
                    styles: signal(savedLayoutData.sizeData.bottom.styles)
                },
                left: {
                    ...savedLayoutData.sizeData.left,
                    lastPanelGroupResizerPosition: signal(savedLayoutData.sizeData.left.lastPanelGroupResizerPosition),
                    panelGroupResizerStyles: signal(savedLayoutData.sizeData.left.panelGroupResizerStyles),
                    styles: signal(savedLayoutData.sizeData.left.styles)
                },
                right: {
                    ...savedLayoutData.sizeData.right,
                    lastPanelGroupResizerPosition: signal(savedLayoutData.sizeData.right.lastPanelGroupResizerPosition),
                    panelGroupResizerStyles: signal(savedLayoutData.sizeData.right.panelGroupResizerStyles),
                    styles: signal(savedLayoutData.sizeData.right.styles)
                }
            };
            this.panels.forEach(p => {
                const panelSaveData = savedLayoutData.panelSaveData.find(p2 => p2.id === p.Id);
                if (panelSaveData) {
                    p.index = panelSaveData.index;
                    p.pinned = panelSaveData.pinned ?? true;
                    if (panelSaveData.position !== p.position || panelSaveData.priority !== p.priority) {
                        this.PanelClose$.next({ panel: p, viaMove: true, viaUser: false });
                        window.setTimeout(() => {
                            this.PanelMove$.next({
                                panel: p,
                                oldPosition: p.position,
                                newPosition: panelSaveData.position,
                                oldPriority: p.priority,
                                newPriority: panelSaveData.priority,
                                wasOpenBefore: panelSaveData.open && p.visible && p.pinned
                            });
                        });
                    } else {
                        if (panelSaveData.open && p.visible) {
                            this.PanelOpen$.next({ panel: p, viaUser: false, viaMove: false });
                        }
                    }
                } else {
                    if (p.startOpen && p.visible) {
                        this.PanelOpen$.next({ panel: p, viaUser: false, viaMove: false });
                    }
                }
            });

            return true;
        }
        return false;
    }

    public saveLayout(): void {
        const sizeData: Record<Position, ContainerSizeSaveData> = {
            ...this.containerSizeDataMap,
            top: {
                ...this.containerSizeDataMap.top,
                lastPanelGroupResizerPosition: this.containerSizeDataMap.top.lastPanelGroupResizerPosition(),
                panelGroupResizerStyles: this.containerSizeDataMap.top.panelGroupResizerStyles(),
                styles: this.containerSizeDataMap.top.styles()
            },
            bottom: {
                ...this.containerSizeDataMap.bottom,
                lastPanelGroupResizerPosition: this.containerSizeDataMap.bottom.lastPanelGroupResizerPosition(),
                panelGroupResizerStyles: this.containerSizeDataMap.bottom.panelGroupResizerStyles(),
                styles: this.containerSizeDataMap.bottom.styles()
            },
            left: {
                ...this.containerSizeDataMap.left,
                lastPanelGroupResizerPosition: this.containerSizeDataMap.left.lastPanelGroupResizerPosition(),
                panelGroupResizerStyles: this.containerSizeDataMap.left.panelGroupResizerStyles(),
                styles: this.containerSizeDataMap.left.styles()
            },
            right: {
                ...this.containerSizeDataMap.right,
                lastPanelGroupResizerPosition: this.containerSizeDataMap.right.lastPanelGroupResizerPosition(),
                panelGroupResizerStyles: this.containerSizeDataMap.right.panelGroupResizerStyles(),
                styles: this.containerSizeDataMap.right.styles()
            }
        };
        sizeData.top.styles;
        const layoutSaveData: LayoutSaveData = {
            sizeData,
            panelSaveData:
                this.panels.map(panel => ({
                    id: panel.Id,
                    index: panel.index,
                    pinned: panel.pinned,
                    position: panel.position,
                    priority: panel.priority,
                    open: panel.open
                })) ?? []
        };
        window.localStorage.setItem(`LAYOUT_${this.layoutId}`, JSON.stringify(layoutSaveData));
    }

    public setLayoutId(layoutId: string): void {
        if (this.layoutId) {
            throw new Error("Layout id already set.");
        }
        if (!layoutId) {
            throw new Error("Layout id cannot be empty.");
        }
        this.layoutId = layoutId;
    }

    public updateHeaderSizes(): void {
        const positions = ["left", "right", "top", "bottom"] as Position[];
        for (const position of positions) {
            const panels = this.panels.filter(p => p.position === position);
            const styleText = position === "left" || position === "right" ? "width" : "height";
            const headerStyleText = position === "left" || position === "right" ? "headerWidth" : "headerHeight";
            this.headerStyles[position][styleText] =
                panels.length === 0 ? "0" : `${this.layoutConfig[headerStyleText]}px`;
        }
    }

    private initialize(): void {
        this.headerStyles.left = {
            width: `${this.layoutConfig.headerWidth}px`
        };
        this.headerStyles.right = {
            width: `${this.layoutConfig.headerWidth}px`
        };
        this.headerStyles.top = {
            height: `${this.layoutConfig.headerHeight}px`,
            paddingLeft: `${this.layoutConfig.headerWidth}px`,
            paddingRight: `${this.layoutConfig.headerWidth}px`
        };
        this.headerStyles.bottom = {
            height: `${this.layoutConfig.headerHeight}px`,
            paddingLeft: `${this.layoutConfig.headerWidth}px`,
            paddingRight: `${this.layoutConfig.headerWidth}px`
        };
    }
}
