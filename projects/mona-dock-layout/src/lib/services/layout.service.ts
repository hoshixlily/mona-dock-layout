import { ChangeDetectorRef, inject, Injectable, signal, ViewContainerRef } from "@angular/core";
import { ImmutableDictionary, ImmutableSet } from "@mirei/ts-collections";
import { asyncScheduler, BehaviorSubject, ReplaySubject, Subject } from "rxjs";
import { ContainerSizeData, ContainerSizeSaveData } from "../data/ContainerSizeData";
import { LayoutConfiguration } from "../data/LayoutConfiguration";
import { LayoutSaveData } from "../data/LayoutSaveData";
import { Panel } from "../data/Panel";
import { PanelCloseInternalEvent, PanelOpenInternalEvent } from "../data/PanelEvents";
import { PanelMoveEvent } from "../data/PanelMoveEvent";
import { PanelVisibilityEvent } from "../data/PanelVisibilityEvent";
import { Position } from "../data/Position";

@Injectable()
export class LayoutService {
    readonly #cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
    readonly #layoutConfig = signal<LayoutConfiguration>({
        containerResizeOffset: signal(120),
        headerHeight: signal(25),
        headerWidth: signal(25),
        maxPanelSize: signal(95),
        minContainerHeight: signal(60),
        minContainerWidth: signal(60),
        minPanelSize: signal(5),
        panelHeaderHeight: signal(25),
        panelResizeOffset: signal(60)
    });
    private layoutId: string = "";
    public readonly containerResizeInProgress$ = new BehaviorSubject<boolean>(false);
    public readonly containerResizeStart$ = new Subject<Position>();
    public readonly headerStyles = signal(
        ImmutableDictionary.create<Position, Partial<CSSStyleDeclaration>>([
            [
                "left",
                {
                    width: `${this.#layoutConfig().headerWidth()}px`
                }
            ],
            [
                "right",
                {
                    width: `${this.#layoutConfig().headerWidth()}px`
                }
            ],
            [
                "top",
                {
                    height: `${this.#layoutConfig().headerHeight()}px`,
                    paddingLeft: `${this.#layoutConfig().headerWidth()}px`,
                    paddingRight: `${this.#layoutConfig().headerWidth()}px`
                }
            ],
            [
                "bottom",
                {
                    height: `${this.#layoutConfig().headerHeight()}px`,
                    paddingLeft: `${this.#layoutConfig().headerWidth()}px`,
                    paddingRight: `${this.#layoutConfig().headerWidth()}px`
                }
            ]
        ])
    );
    public readonly layoutConfig = this.#layoutConfig.asReadonly();
    public readonly layoutReady$ = new ReplaySubject<void>(1);
    public readonly panelClose$ = new Subject<PanelCloseInternalEvent>();
    public readonly panelMove$ = new Subject<PanelMoveEvent>();
    public readonly panelMoveEnd$ = new Subject<Panel>();
    public readonly panelOpen$ = new Subject<PanelOpenInternalEvent>();
    public readonly panelResizeInProgress$ = new BehaviorSubject<boolean>(false);
    public readonly panelVisibility$ = new Subject<PanelVisibilityEvent>();
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
    public layoutDomRect!: DOMRect;
    public panelTemplateContentsContainerRef!: ViewContainerRef;
    public panels = signal(ImmutableSet.create<Panel>());

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
                this.panels()
                    .select(panel => ({
                        id: panel.Id,
                        index: panel.index,
                        pinned: panel.pinned,
                        position: panel.position,
                        priority: panel.priority,
                        open: panel.open
                    }))
                    .toArray() ?? []
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
            const panels = this.panels().where(p => p.position === position);
            const styleText = position === "left" || position === "right" ? "width" : "height";
            const headerStyleText = position === "left" || position === "right" ? "headerWidth" : "headerHeight";
            this.headerStyles.update(dict => {
                const style = panels.any() ? `${this.#layoutConfig()[headerStyleText]}px` : "0";
                return dict.set(position, { [styleText]: style });
            });
        }
    }
}
