import { NgStyle, NgTemplateOutlet } from "@angular/common";
import {
    AfterContentInit,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    contentChildren,
    DestroyRef,
    ElementRef,
    inject,
    input,
    NgZone,
    OnDestroy,
    OnInit,
    output,
    signal,
    TemplateRef,
    viewChild,
    ViewContainerRef
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { combineLatestWith, delayWhen, filter, map, tap } from "rxjs";
import { LayoutApi } from "../../data/LayoutApi";
import { LayoutReadyEvent } from "../../data/LayoutReadyEvent";
import { LayoutSaveData } from "../../data/LayoutSaveData";
import { Panel } from "../../data/Panel";
import { MoveStage } from "../../data/PanelMoveEvent";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutContentTemplateDirective } from "../../directives/layout-content-template.directive";
import { LayoutService } from "../../services/layout.service";
import { ContainerComponent } from "../container/container.component";
import { DockPanelComponent } from "../dock-panel/dock-panel.component";
import { PanelHeaderListComponent } from "../panel-header-list/panel-header-list.component";

@Component({
    selector: "mona-dock-layout",
    templateUrl: "./dock-layout.component.html",
    styleUrls: ["./dock-layout.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [LayoutService],
    imports: [NgStyle, PanelHeaderListComponent, ContainerComponent, NgTemplateOutlet]
})
export class DockLayoutComponent implements OnInit, OnDestroy, AfterViewInit, AfterContentInit {
    readonly #destroyRef: DestroyRef = inject(DestroyRef);
    readonly #layoutService = inject(LayoutService);
    readonly #zone = inject(NgZone);
    #layoutResizeObserver!: ResizeObserver;
    private readonly dockPanelComponents = contentChildren(DockPanelComponent);
    private readonly layoutElementRef = viewChild.required<ElementRef<HTMLDivElement>>("layoutElementRef");
    private readonly panelTemplateContentsContainerRef = viewChild.required("panelTemplateContentsContainerRef", {
        read: ViewContainerRef
    });
    protected readonly bottomHeaderStyles = computed(() => this.layoutService.headerStyles().get("bottom")?.() ?? {});
    protected readonly layoutContentTemplateRef = contentChild(LayoutContentTemplateDirective, {
        read: TemplateRef
    });
    protected readonly layoutMiddleStyles = signal<Partial<CSSStyleDeclaration>>({});
    protected readonly layoutReady = toSignal(this.#layoutService.layoutReady$.pipe(map(() => true)), {
        initialValue: false
    });
    protected readonly layoutService = this.#layoutService;
    protected readonly leftHeaderStyles = computed(() => this.layoutService.headerStyles().get("left")?.() ?? {});
    protected readonly rightHeaderStyles = computed(() => this.layoutService.headerStyles().get("right")?.() ?? {});
    protected readonly resizing = toSignal(
        this.layoutService.containerResizeInProgress$.pipe(
            combineLatestWith(this.layoutService.panelResizeInProgress$),
            map(([containerEvent, panel]) => containerEvent.resizing || panel)
        )
    );
    protected readonly topHeaderStyles = computed(() => this.layoutService.headerStyles().get("top")?.() ?? {});
    public readonly layoutId = input.required<string>();
    public readonly ready = output<LayoutReadyEvent>();

    public ngAfterContentInit(): void {
        const panelIds = this.dockPanelComponents().map(p => p.panelId);
        const idSet = new Set(panelIds);
        if (panelIds.length !== idSet.size) {
            throw new Error("Panel IDs must be unique.");
        }
        this.createPanels();
    }

    public ngAfterViewInit(): void {
        this.layoutService.panelTemplateContentContainerRef.set(this.panelTemplateContentsContainerRef());
        this.#zone.runOutsideAngular(() => {
            this.#layoutResizeObserver = new ResizeObserver(() => {
                this.layoutService.layoutDomRect = this.layoutElementRef().nativeElement.getBoundingClientRect();
            });
            this.#layoutResizeObserver.observe(this.layoutElementRef().nativeElement);
        });
        const loaded = this.layoutService.loadLayout();
        if (!loaded) {
            for (const panel of this.layoutService.panels()) {
                if (panel.startOpen) {
                    this.layoutService.openPanel(panel.id);
                }
            }
            this.layoutService.saveLayout();
        }
        this.layoutService.layoutReady$.next();
        this.layoutService.layoutReady$.complete();
        this.ready.emit({
            api: this.createLayoutApi()
        });
        this.layoutService.updateHeaderSizes();
    }

    public ngOnDestroy(): void {
        this.#layoutResizeObserver.disconnect();
    }

    public ngOnInit(): void {
        const id = this.layoutId();
        if (id) {
            this.layoutService.setLayoutId(id);
        }
        this.updateStyles();
        this.setSubscriptions();
    }

    private createLayoutApi(): LayoutApi {
        const service = this.layoutService;
        return {
            closePanel(panelId: string): void {
                const panel = service.panels().firstOrDefault(p => p.id === panelId);
                if (panel) {
                    service.closePanel(panelId);
                }
            },
            movePanel(panelId: string, position: Position, priority: Priority): void {
                const panel = service.panels().firstOrDefault(p => p.id === panelId);
                if (panel) {
                    if (panel.position === position && panel.priority === priority) {
                        return;
                    }
                    service.panelMove$.next({
                        panel: panel,
                        oldPosition: panel.position,
                        oldPriority: panel.priority,
                        newPosition: position,
                        newPriority: priority,
                        stage: MoveStage.Close,
                        wasOpenBefore: service.isPanelOpen(panel.id)
                    });
                }
            },
            openPanel(panelId: string): void {
                const panel = service.panels().firstOrDefault(p => p.id === panelId);
                if (panel && service.isPanelVisible(panelId)) {
                    service.openPanel(panelId);
                }
            },
            setPanelVisible(panelId: string, visible: boolean): void {
                const panel = service.panels().firstOrDefault(p => p.id === panelId);
                if (panel) {
                    service.panelVisibility$.next({ panelId: panel.id, visible: visible });
                }
            }
        };
    }

    private createPanels(): void {
        let panels: Panel[] = [];
        const panelIndexMap: Record<Position, Record<Priority, number>> = {
            left: {
                primary: 0,
                secondary: 0
            },
            right: {
                primary: 0,
                secondary: 0
            },
            top: {
                primary: 0,
                secondary: 0
            },
            bottom: {
                primary: 0,
                secondary: 0
            }
        };
        const layoutSaveData = this.layoutService.getStoredSaveData();
        for (const dpc of this.dockPanelComponents()) {
            const panel = dpc.options();
            let loadedPanel = this.loadSavedPanelData(layoutSaveData, panel);
            if (loadedPanel) {
                if (panelIndexMap[panel.position][panel.priority] === loadedPanel.index) {
                    panelIndexMap[panel.position][panel.priority] = loadedPanel.index + 1;
                }
            } else {
                panel.index = panelIndexMap[panel.position][panel.priority]++;
                loadedPanel = panel;
            }
            if (loadedPanel) {
                panels = [...panels, loadedPanel];
            }
        }
        this.layoutService.panels.update(set => set.clear().addAll(panels));
        this.loadOpenPanels(layoutSaveData);
    }

    private loadOpenPanels(savedLayoutData: LayoutSaveData | null): void {
        if (!savedLayoutData) {
            return;
        }
        const openPanelIds = savedLayoutData.openPanelIdList;
        if (openPanelIds == null || !Array.isArray(openPanelIds)) {
            return;
        }
        const openPanels = this.layoutService
            .panels()
            .where(p => openPanelIds.includes(p.id))
            .select(p => p.id)
            .toArray();
        this.layoutService.openPanels.update(set => set.clear().addAll(openPanels));
    }

    private loadSavedPanelData(savedLayoutData: LayoutSaveData | null, panel: Panel): Panel | null {
        if (!savedLayoutData) {
            return null;
        }
        const savedPanelData = savedLayoutData.panelSaveData.find(p => p.id === panel.id);
        if (savedPanelData) {
            const index = savedPanelData.index;
            const position = savedPanelData.position;
            const priority = savedPanelData.priority;
            this.layoutService.setPanelViewMode(panel.id, savedPanelData.viewMode);
            return { ...panel, index, position, priority };
        }
        return null;
    }

    private setPanelMoveSubscriptions(): void {
        this.layoutService.panelMove$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                filter(e => e.stage === MoveStage.Move),
                tap(e => {
                    const panels = this.layoutService
                        .panels()
                        .where(panel => panel.position === e.newPosition && panel.priority === e.newPriority);
                    this.layoutService.updatePanel({
                        id: e.panel.id,
                        index: panels.count(),
                        position: e.newPosition,
                        priority: e.newPriority
                    });
                    this.layoutService
                        .panels()
                        .where(panel => panel.position === e.oldPosition && panel.priority === e.oldPriority)
                        .orderBy(p => p.index)
                        .forEach((p, px) => this.layoutService.updatePanel({ id: p.id, index: px }));
                    this.layoutService
                        .panels()
                        .where(panel => panel.position === e.newPosition && panel.priority === e.newPriority)
                        .orderBy(p => p.index)
                        .forEach((p, px) => this.layoutService.updatePanel({ id: p.id, index: px }));
                    this.layoutService.panelMove$.next({ ...e, stage: MoveStage.Attach });
                })
            )
            .subscribe();

        this.layoutService.panelMove$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                filter(e => e.stage === MoveStage.End),
                tap(() => {
                    this.updateStyles();
                    this.layoutService.saveLayout();
                })
            )
            .subscribe();
    }

    private setPanelVisibilitySubscription(): void {
        this.layoutService.panelVisibility$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                delayWhen(() => this.layoutService.layoutReady$),
                tap(event => {
                    if (!event.visible) {
                        const panel = this.layoutService.panels().firstOrDefault(p => p.id === event.panelId);
                        if (panel) {
                            panel.wasOpenBeforeHidden = this.layoutService.isPanelOpen(panel.id);
                            this.layoutService.closePanel(event.panelId);
                        }
                    } else {
                        const panel = this.layoutService.panels().firstOrDefault(p => p.id === event.panelId);
                        if (panel) {
                            const panels = this.layoutService
                                .panels()
                                .where(p => p.position === panel.position && p.priority === panel.priority)
                                .orderBy(p => p.index)
                                .toArray();
                            panels.forEach((p, px) => (p.index = px));
                            const openPanel = this.layoutService
                                .openPanels()
                                .firstOrDefault(pid => pid === event.panelId);
                            if (!openPanel && panel.wasOpenBeforeHidden) {
                                this.layoutService.openPanel(event.panelId);
                            }
                        }
                    }
                })
            )
            .subscribe(event => {
                const panel = this.layoutService.panels().firstOrDefault(p => p.id === event.panelId);
                if (panel) {
                    this.layoutService.setPanelVisible(panel.id, event.visible);
                }
            });
    }

    private setSubscriptions(): void {
        this.setPanelMoveSubscriptions();
        this.setPanelVisibilitySubscription();
    }

    private updateStyles(): void {
        this.layoutService.updateHeaderSizes();
        this.layoutMiddleStyles.update(style => {
            const totalHeaderHeight =
                this.layoutService.getHeaderSize("top") + this.layoutService.getHeaderSize("bottom");
            const height = `calc(100% - ${totalHeaderHeight}px)`;
            return { ...style, height };
        });
    }
}
