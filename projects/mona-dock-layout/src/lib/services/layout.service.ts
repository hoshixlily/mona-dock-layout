import { ChangeDetectorRef, inject, Injectable, signal, WritableSignal } from "@angular/core";
import { ImmutableDictionary, ImmutableList } from "@mirei/ts-collections";
import { asyncScheduler, BehaviorSubject, ReplaySubject, Subject } from "rxjs";
import { ContainerSizeSaveData, ResizerStyles } from "../data/ContainerSizeData";
import { LayoutConfiguration } from "../data/LayoutConfiguration";
import { LayoutSaveData } from "../data/LayoutSaveData";
import { Panel } from "../data/Panel";
import { PanelCloseInternalEvent, PanelOpenInternalEvent } from "../data/PanelEvents";
import { PanelMoveEvent } from "../data/PanelMoveEvent";
import { PanelVisibilityEvent } from "../data/PanelVisibilityEvent";
import { Position } from "../data/Position";
import { Priority } from "../data/Priority";
import { PanelContentAnchorDirective } from "../directives/panel-content-anchor.directive";

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
    public readonly containerStyles = signal(
        ImmutableDictionary.create<Position, Partial<CSSStyleDeclaration>>([
            ["left", { width: "300px", display: "none" }],
            ["right", { width: "300px", display: "none" }],
            ["top", { height: "300px", display: "none" }],
            ["bottom", { height: "300px", display: "none" }]
        ])
    );
    public readonly headerStyles = signal(
        ImmutableDictionary.create<Position, WritableSignal<Partial<CSSStyleDeclaration>>>([
            [
                "left",
                signal({
                    width: `${this.#layoutConfig().headerWidth()}px`
                })
            ],
            [
                "right",
                signal({
                    width: `${this.#layoutConfig().headerWidth()}px`
                })
            ],
            [
                "top",
                signal({
                    height: `${this.#layoutConfig().headerHeight()}px`,
                    paddingLeft: `${this.#layoutConfig().headerWidth() - 1}px`,
                    paddingRight: `${this.#layoutConfig().headerWidth() - 1}px`
                })
            ],
            [
                "bottom",
                signal({
                    height: `${this.#layoutConfig().headerHeight()}px`,
                    paddingLeft: `${this.#layoutConfig().headerWidth() - 1}px`,
                    paddingRight: `${this.#layoutConfig().headerWidth() - 1}px`
                })
            ]
        ])
    );
    public readonly layoutConfig = this.#layoutConfig.asReadonly();
    public readonly layoutReady$ = new ReplaySubject<void>(1);
    public readonly panelClose$ = new Subject<PanelCloseInternalEvent>();
    public readonly panelContentAnchors = signal(ImmutableDictionary.create<string, PanelContentAnchorDirective>());
    public readonly panelMove$ = new Subject<PanelMoveEvent>();
    public readonly panelMoveEnd$ = new Subject<Panel>();
    public readonly panelOpen$ = new Subject<PanelOpenInternalEvent>();
    public readonly panelGroupResizerPositions = signal(
        ImmutableDictionary.create<Position, string>([
            ["left", "50%"],
            ["right", "50%"],
            ["top", "50%"],
            ["bottom", "50%"]
        ])
    );
    public readonly panelGroupResizerStyles = signal(
        ImmutableDictionary.create<Position, ResizerStyles>([
            ["left", { top: "50%" }],
            ["right", { top: "50%" }],
            ["top", { left: "50%" }],
            ["bottom", { left: "50%" }]
        ])
    );
    public readonly panelResizeInProgress$ = new BehaviorSubject<boolean>(false);
    public readonly panelSizeStyles = signal(
        ImmutableDictionary.create<Position, Record<Priority, Partial<CSSStyleDeclaration>>>([
            ["left", { primary: { bottom: "50%" }, secondary: { top: "50%" } }],
            ["right", { primary: { bottom: "50%" }, secondary: { top: "50%" } }],
            ["top", { primary: { right: "50%" }, secondary: { left: "50%" } }],
            ["bottom", { primary: { right: "50%" }, secondary: { left: "50%" } }]
        ])
    );
    public readonly panelVisibility$ = new Subject<PanelVisibilityEvent>();
    public layoutDomRect!: DOMRect;
    public panels = signal(ImmutableList.create<Panel>());

    public detachPanelContent(panel: Panel): void {
        const anchor = this.panelContentAnchors().get(panel.id);
        if (!anchor) {
            return;
        }
        const viewRef = panel.viewRef;
        const viewRefIndex = anchor.viewContainerRef.indexOf(viewRef);
        if (viewRefIndex !== -1) {
            anchor.viewContainerRef.detach(viewRefIndex);
        }
    }

    public getHeaderSize(position: Position): number {
        const headerElement = document.querySelector(`div.layout-header.${position}`) as HTMLElement;
        return position === "left" || position === "right" ? headerElement.offsetWidth : headerElement.offsetHeight;
    }

    public getStoredSaveData(): LayoutSaveData | null {
        const savedLayoutDataJson = window.localStorage.getItem(`LAYOUT_${this.layoutId}`);
        if (savedLayoutDataJson) {
            return JSON.parse(savedLayoutDataJson);
        }
        return null;
    }

    private loadContainerStyles(savedLayoutData: LayoutSaveData): void {
        this.containerStyles.update(dict => {
            return dict
                .put("top", { ...dict.get("top"), ...savedLayoutData.sizeData.top.styles })
                .put("bottom", { ...dict.get("bottom"), ...savedLayoutData.sizeData.bottom.styles })
                .put("left", { ...dict.get("left"), ...savedLayoutData.sizeData.left.styles })
                .put("right", { ...dict.get("right"), ...savedLayoutData.sizeData.right.styles });
        });
    }

    public loadLayout(): boolean {
        const savedLayoutData = this.getStoredSaveData();
        if (savedLayoutData) {
            this.loadContainerStyles(savedLayoutData);
            this.loadPanelSizeStyles(savedLayoutData);
            this.loadPanelGroupResizerPositions(savedLayoutData);
            this.loadPanelGroupResizerStyles(savedLayoutData);
            // this.loadPanels(savedLayoutData);
            return true;
        }
        return false;
    }

    private loadPanelGroupResizerPositions(savedLayoutData: LayoutSaveData): void {
        this.panelGroupResizerPositions.update(dict => {
            return dict
                .put("top", savedLayoutData.sizeData.top.lastPanelGroupResizerPosition)
                .put("bottom", savedLayoutData.sizeData.bottom.lastPanelGroupResizerPosition)
                .put("left", savedLayoutData.sizeData.left.lastPanelGroupResizerPosition)
                .put("right", savedLayoutData.sizeData.right.lastPanelGroupResizerPosition);
        });
    }

    private loadPanelGroupResizerStyles(savedLayoutData: LayoutSaveData): void {
        this.panelGroupResizerStyles.update(dict => {
            return dict
                .put("top", savedLayoutData.sizeData.top.panelGroupResizerStyles)
                .put("bottom", savedLayoutData.sizeData.bottom.panelGroupResizerStyles)
                .put("left", savedLayoutData.sizeData.left.panelGroupResizerStyles)
                .put("right", savedLayoutData.sizeData.right.panelGroupResizerStyles);
        });
    }

    private loadPanelSizeStyles(savedLayoutData: LayoutSaveData): void {
        this.panelSizeStyles.update(dict => {
            return dict
                .put("top", {
                    ...dict.get("top"),
                    ...savedLayoutData.sizeData.top.panelSizeData
                })
                .put("bottom", {
                    ...dict.get("bottom"),
                    ...savedLayoutData.sizeData.bottom.panelSizeData
                })
                .put("left", {
                    ...dict.get("left"),
                    ...savedLayoutData.sizeData.left.panelSizeData
                })
                .put("right", {
                    ...dict.get("right"),
                    ...savedLayoutData.sizeData.right.panelSizeData
                });
        });
    }

    public reattachPanelContent(panel: Panel, timeout?: number): void {
        const anchor = this.panelContentAnchors().get(panel.id);
        if (!anchor) {
            return;
        }
        const viewRefIndex = anchor.viewContainerRef.indexOf(panel.viewRef);
        if (viewRefIndex !== -1) {
            const reattach = (): void => {
                anchor.viewContainerRef.insert(panel.viewRef, viewRefIndex);
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
            top: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("top") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("top") ?? { top: "50%" },
                panelSizeData: this.panelSizeStyles().get("top") ?? { primary: {}, secondary: {} },
                styles: this.containerStyles().get("top") ?? {}
            },
            bottom: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("bottom") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("bottom") ?? { top: "50%" },
                panelSizeData: this.panelSizeStyles().get("bottom") ?? { primary: {}, secondary: {} },
                styles: this.containerStyles().get("bottom") ?? {}
            },
            left: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("left") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("left") ?? { top: "50%" },
                panelSizeData: this.panelSizeStyles().get("left") ?? { primary: {}, secondary: {} },
                styles: this.containerStyles().get("left") ?? {}
            },
            right: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("right") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("right") ?? { top: "50%" },
                panelSizeData: this.panelSizeStyles().get("right") ?? { primary: {}, secondary: {} },
                styles: this.containerStyles().get("right") ?? {}
            }
        };
        const layoutSaveData: LayoutSaveData = {
            sizeData,
            panelSaveData:
                this.panels()
                    .select(panel => ({
                        id: panel.id,
                        index: panel.index(),
                        position: panel.position(),
                        priority: panel.priority(),
                        open: panel.open(),
                        viewMode: panel.viewMode()
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
            const panels = this.panels().where(p => p.position() === position);
            const styleText = position === "left" || position === "right" ? "width" : "height";
            const headerStyleText = position === "left" || position === "right" ? "headerWidth" : "headerHeight";
            this.headerStyles.update(dict => {
                const defaultHeaderSize = this.layoutConfig()[headerStyleText]();
                const style = panels.any() ? `${defaultHeaderSize}px` : "0";
                const headerStyle = dict.get(position);
                if (headerStyle) {
                    headerStyle.update(styles => ({ ...styles, [styleText]: style }));
                    return dict.put(position, headerStyle);
                } else {
                    return dict.put(position, signal({ [styleText]: style }));
                }
            });
        }
    }
}
