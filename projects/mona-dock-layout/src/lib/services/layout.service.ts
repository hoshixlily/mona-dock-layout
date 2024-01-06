import { ChangeDetectorRef, inject, Injectable, signal, ViewContainerRef, WritableSignal } from "@angular/core";
import { LayoutConfiguration } from "../data/LayoutConfiguration";
import { DefaultLayoutConfiguration } from "../data/DefaultLayoutConfiguration";
import { asyncScheduler, ReplaySubject, Subject } from "rxjs";
import { Position } from "../data/Position";
import { Panel } from "../data/Panel";
import { PanelMoveEvent } from "../data/PanelMoveEvent";
import { ContainerSizeData, ContainerSizeSaveData } from "../data/ContainerSizeData";
import { LayoutSaveData } from "../data/LayoutSaveData";
import { PanelVisibilityEvent } from "../data/PanelVisibilityEvent";
import { PanelCloseInternalEvent, PanelOpenInternalEvent } from "../data/PanelEvents";

@Injectable()
export class LayoutService {
    readonly #cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
    private layoutId: string = "";
    public readonly containerResizeInProgress$: Subject<boolean> = new Subject<boolean>();
    public readonly containerResizeStart$: Subject<Position> = new Subject<Position>();
    public readonly layoutReady$: ReplaySubject<void> = new ReplaySubject<void>(1);
    public readonly panelClose$: Subject<PanelCloseInternalEvent> = new Subject<PanelCloseInternalEvent>();
    public readonly panelMove$: Subject<PanelMoveEvent> = new Subject<PanelMoveEvent>();
    public readonly panelMoveEnd$: Subject<Panel> = new Subject<Panel>();
    public readonly panelOpen$: Subject<PanelOpenInternalEvent> = new Subject<PanelOpenInternalEvent>();
    public readonly panelResizeInProgress$: Subject<boolean> = new Subject<boolean>();
    public readonly panelVisibility$: Subject<PanelVisibilityEvent> = new Subject<PanelVisibilityEvent>();
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
    public panels: WritableSignal<Panel[]> = signal([]);

    public constructor() {
        this.initialize();
    }

    public detachPanelContent(panel: Panel): void {
        const viewRef = panel.viewRef;
        const viewRefIndex = panel.vcr.indexOf(viewRef);
        if (viewRefIndex !== -1) {
            panel.vcr.detach(viewRefIndex);
            this.panelTemplateContentsContainerRef.insert(viewRef);
        }
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
            this.panels().forEach(p => {
                const panelSaveData = savedLayoutData.panelSaveData.find(p2 => p2.id === p.Id);
                if (panelSaveData) {
                    p.index = panelSaveData.index;
                    p.pinned = panelSaveData.pinned ?? true;
                    if (panelSaveData.position !== p.position || panelSaveData.priority !== p.priority) {
                        this.panelClose$.next({ panel: p, viaMove: true, viaUser: false });
                        this.detachPanelContent(p);
                        window.setTimeout(() => {
                            this.panelMove$.next({
                                panel: p,
                                oldPosition: p.position,
                                newPosition: panelSaveData.position,
                                oldPriority: p.priority,
                                newPriority: panelSaveData.priority,
                                wasOpenBefore: panelSaveData.open && p.visible && p.pinned
                            });
                        });
                    } else if (panelSaveData.open && p.visible) {
                        this.panelOpen$.next({ panel: p, viaUser: false, viaMove: false });
                    }
                } else if (p.startOpen && p.visible) {
                    this.panelOpen$.next({ panel: p, viaUser: false, viaMove: false });
                }
            });

            return true;
        }
        return false;
    }

    public reattachPanelContent(panel: Panel, timeout?: number): void {
        const viewRefIndex = this.panelTemplateContentsContainerRef.indexOf(panel.viewRef);
        if (viewRefIndex !== -1) {
            this.panelTemplateContentsContainerRef.detach(viewRefIndex);
            const reattach = (): void => {
                panel.vcr.insert(panel.viewRef, viewRefIndex);
                this.#cdr.detectChanges();
                this.panelMoveEnd$.next(panel);
            };
            if (timeout != null) {
                asyncScheduler.schedule(() => reattach(), timeout);
            } else {
                reattach();
            }
        }
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
        const layoutSaveData: LayoutSaveData = {
            sizeData,
            panelSaveData:
                this.panels().map(panel => ({
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
            const panels = this.panels().filter(p => p.position === position);
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
