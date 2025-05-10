import { EmbeddedViewRef, Injectable, signal, TemplateRef, ViewContainerRef, WritableSignal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { ImmutableDictionary, ImmutableList, ImmutableSet } from "@mirei/ts-collections";
import { BehaviorSubject, pairwise, ReplaySubject, startWith, Subject, switchMap } from "rxjs";
import { ContainerResizeProgressEvent } from "../data/ContainerResizeProgressEvent";
import { ContainerSizeSaveData, ResizerStyles } from "../data/ContainerSizeData";
import { LayoutConfiguration } from "../data/LayoutConfiguration";
import { LayoutSaveData, PanelSaveData } from "../data/LayoutSaveData";
import { Panel } from "../data/Panel";
import { PanelActionTemplateContext } from "../data/PanelActionTemplateContext";
import { PanelContentTemplateContext } from "../data/PanelContentTemplateContext";
import { PanelCloseInternalEvent, PanelOpenInternalEvent } from "../data/PanelEvents";
import { PanelMoveEvent } from "../data/PanelMoveEvent";
import { PanelResizeProgressEvent } from "../data/PanelResizeProgressEvent";
import { PanelViewMode } from "../data/PanelViewMode";
import { PanelVisibilityEvent } from "../data/PanelVisibilityEvent";
import { Position } from "../data/Position";
import { PanelContentAnchorDirective } from "../directives/panel-content-anchor.directive";

@Injectable()
export class LayoutService {
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
    #layoutId: string = "";
    public readonly containerResizeInProgress$ = new BehaviorSubject<ContainerResizeProgressEvent>({
        resizing: false
    });
    public readonly containerStyles = signal(
        ImmutableDictionary.create<Position, Partial<CSSStyleDeclaration>>([
            ["left", { width: "300px" }],
            ["right", { width: "300px" }],
            ["top", { height: "300px" }],
            ["bottom", { height: "300px" }]
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
    public readonly openPanels = signal(ImmutableSet.create<Panel>());
    public readonly openPanelsChange$ = toObservable(this.openPanels).pipe(
        startWith(this.openPanels()),
        pairwise(),
        switchMap(([previous, current]) => {
            const closedPanels = previous.except(current);
            const openedPanels = current.except(previous);
            return closedPanels
                .select(p => ({ panel: p, open: false }))
                .concat(openedPanels.select(p => ({ panel: p, open: true })))
                .toArray();
        })
    );
    public readonly panelActionTemplateDict = signal(
        ImmutableDictionary.create<string, ImmutableSet<TemplateRef<PanelActionTemplateContext>>>()
    );
    public readonly panelCloseStart$ = new Subject<PanelCloseInternalEvent>();
    public readonly panelContentAnchors = signal(ImmutableDictionary.create<string, PanelContentAnchorDirective>());
    public readonly panelContentTemplateDict = signal(
        ImmutableDictionary.create<string, TemplateRef<PanelContentTemplateContext>>()
    );
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
    public readonly panelMove$ = new Subject<PanelMoveEvent>();
    public readonly panelMoveEnd$ = new Subject<Panel>();
    public readonly panelOpenStart$ = new Subject<PanelOpenInternalEvent>();
    public readonly panelResizeInProgress$ = new BehaviorSubject<PanelResizeProgressEvent>({ resizing: false });
    public readonly panelTemplateContentContainerRef = signal<ViewContainerRef | null>(null);
    public readonly panelViewModeDict = signal(ImmutableDictionary.create<string, PanelViewMode>());
    public readonly panelViewRefDict = signal(
        ImmutableDictionary.create<string, EmbeddedViewRef<PanelContentTemplateContext>>()
    );
    public readonly panelVisibility$ = new Subject<PanelVisibilityEvent>();
    public readonly panelVisibilityDict = signal(ImmutableDictionary.create<string, boolean>());
    public layoutDomRect!: DOMRect;
    public panels = signal(ImmutableList.create<Panel>());

    public closePanel(panel: Panel): void {
        this.openPanels.update(set => set.remove(panel));
    }

    public getHeaderSize(position: Position): number {
        const headerElement = document.querySelector(`div.layout-header.${position}`) as HTMLElement;
        return position === "left" || position === "right" ? headerElement.offsetWidth : headerElement.offsetHeight;
    }

    public getOpenContainerPanels(position: Position): ImmutableList<Panel> {
        return this.panels()
            .where(p => p.position() === position && this.isPanelOpen(p))
            .toImmutableList();
    }

    public getPanelActionTemplates(panelId: string): ImmutableSet<TemplateRef<PanelActionTemplateContext>> {
        return this.panelActionTemplateDict().get(panelId) ?? ImmutableSet.create();
    }

    public getPanelContentTemplate(panelId: string): TemplateRef<PanelContentTemplateContext> | null {
        return this.panelContentTemplateDict().get(panelId) ?? null;
    }

    public getPanelViewMode(panelId: string): PanelViewMode {
        return this.panelViewModeDict().get(panelId) ?? PanelViewMode.Docked;
    }

    public getStoredSaveData(): LayoutSaveData | null {
        const savedLayoutDataJson = window.localStorage.getItem(`LAYOUT_${this.#layoutId}`);
        if (savedLayoutDataJson) {
            return JSON.parse(savedLayoutDataJson);
        }
        return null;
    }

    public isPanelOpen(panel: string | Panel): boolean {
        if (typeof panel === "string") {
            return this.openPanels().any(p => p.id === panel);
        }
        return this.openPanels().contains(panel);
    }

    public isPanelVisible(panelId: string): boolean {
        return this.panelVisibilityDict().get(panelId) ?? true;
    }

    public loadLayout(): boolean {
        const savedLayoutData = this.getStoredSaveData();
        if (savedLayoutData) {
            this.loadContainerStyles(savedLayoutData);
            this.loadPanelGroupResizerPositions(savedLayoutData);
            this.loadPanelGroupResizerStyles(savedLayoutData);
            return true;
        }
        return false;
    }

    public openPanel(panel: Panel): void {
        this.openPanels.update(set => set.add(panel));
    }

    public saveLayout(): void {
        const sizeData = this.createSizeSaveData();
        const panelSaveData = this.createPanelSaveData();
        const openPanelIdList = this.openPanels()
            .select(p => p.id)
            .toArray();
        const layoutSaveData: LayoutSaveData = {
            openPanelIdList,
            sizeData,
            panelSaveData
        };
        window.localStorage.setItem(`LAYOUT_${this.#layoutId}`, JSON.stringify(layoutSaveData));
    }

    public setLayoutId(layoutId: string): void {
        if (this.#layoutId) {
            throw new Error("Layout id already set.");
        }
        if (!layoutId) {
            throw new Error("Layout id cannot be empty.");
        }
        this.#layoutId = layoutId;
    }

    public setPanelActionTemplates(
        panelId: string,
        templates: Iterable<TemplateRef<PanelActionTemplateContext>>
    ): void {
        this.panelActionTemplateDict.update(dict => dict.put(panelId, ImmutableSet.create(templates)));
    }

    public setPanelContentTemplate(panelId: string, template: TemplateRef<PanelContentTemplateContext>): void {
        this.panelContentTemplateDict.update(dict => dict.put(panelId, template));
    }

    public setPanelViewMode(panelId: string, viewMode: PanelViewMode): void {
        this.panelViewModeDict.update(dict => dict.put(panelId, viewMode));
    }

    public setPanelVisible(panelId: string, visible: boolean): void {
        this.panelVisibilityDict.update(dict => dict.put(panelId, visible));
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

    private createPanelSaveData(): PanelSaveData[] {
        return this.panels()
            .select(panel => {
                const viewMode = this.panelViewModeDict().get(panel.id) ?? PanelViewMode.Docked;
                return {
                    id: panel.id,
                    index: panel.index(),
                    position: panel.position(),
                    priority: panel.priority(),
                    viewMode
                };
            })
            .toArray();
    }

    private createSizeSaveData(): Record<Position, ContainerSizeSaveData> {
        return {
            top: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("top") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("top") ?? { top: "50%" },
                styles: this.containerStyles().get("top") ?? {}
            },
            bottom: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("bottom") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("bottom") ?? { top: "50%" },
                styles: this.containerStyles().get("bottom") ?? {}
            },
            left: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("left") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("left") ?? { top: "50%" },
                styles: this.containerStyles().get("left") ?? {}
            },
            right: {
                lastPanelGroupResizerPosition: this.panelGroupResizerPositions().get("right") ?? "50%",
                panelGroupResizerStyles: this.panelGroupResizerStyles().get("right") ?? { top: "50%" },
                styles: this.containerStyles().get("right") ?? {}
            }
        };
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
}
