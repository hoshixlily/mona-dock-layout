import {
    AfterContentInit,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
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
import { combineLatestWith, delay, delayWhen, map, tap } from "rxjs";
import { LayoutApi } from "../../data/LayoutApi";
import { LayoutReadyEvent } from "../../data/LayoutReadyEvent";
import { LayoutSaveData } from "../../data/LayoutSaveData";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutContentTemplateDirective } from "../../directives/layout-content-template.directive";
import { LayoutService } from "../../services/layout.service";
import { DockPanelComponent } from "../dock-panel/dock-panel.component";
import { NgStyle, NgTemplateOutlet } from "@angular/common";
import { PanelHeaderListComponent } from "../panel-header-list/panel-header-list.component";
import { ContainerComponent } from "../container/container.component";

@Component({
    selector: "mona-dock-layout",
    templateUrl: "./dock-layout.component.html",
    styleUrls: ["./dock-layout.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [LayoutService],
    standalone: true,
    imports: [NgStyle, PanelHeaderListComponent, ContainerComponent, NgTemplateOutlet]
})
export class DockLayoutComponent implements OnInit, OnDestroy, AfterViewInit, AfterContentInit {
    readonly #cdr = inject(ChangeDetectorRef);
    readonly #destroyRef: DestroyRef = inject(DestroyRef);
    readonly #layoutService = inject(LayoutService);
    readonly #zone = inject(NgZone);
    #layoutResizeObserver!: ResizeObserver;
    private readonly dockPanelComponents = contentChildren(DockPanelComponent);
    private readonly layoutElementRef = viewChild.required<ElementRef<HTMLDivElement>>("layoutElementRef");
    private readonly panelTemplateContentsContainerRef = viewChild.required("panelTemplateContentsContainerRef", {
        read: ViewContainerRef
    });
    protected readonly bottomHeaderStyles = computed(() => {
        return this.layoutService.headerStyles().get("bottom")?.() ?? {};
    });
    protected readonly layoutContentTemplateRef = contentChild(LayoutContentTemplateDirective, {
        read: TemplateRef
    });
    protected readonly layoutMiddleStyles = signal<Partial<CSSStyleDeclaration>>({});
    protected readonly layoutReady = toSignal(this.#layoutService.layoutReady$.pipe(map(() => true)), {
        initialValue: false
    });
    protected readonly layoutService = this.#layoutService;
    protected readonly leftHeaderStyles = computed(() => {
        return this.layoutService.headerStyles().get("left")?.() ?? {};
    });
    protected readonly rightHeaderStyles = computed(() => {
        return this.layoutService.headerStyles().get("right")?.() ?? {};
    });
    protected readonly resizing = toSignal(
        this.layoutService.containerResizeInProgress$.pipe(
            combineLatestWith(this.layoutService.panelResizeInProgress$),
            map(([container, panel]) => container || panel)
        )
    );
    protected readonly topHeaderStyles = computed(() => {
        return this.layoutService.headerStyles().get("top")?.() ?? {};
    });
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
        window.setTimeout(() => {
            const loaded = this.layoutService.loadLayout();
            if (!loaded) {
                for (const panel of this.layoutService.panels()) {
                    if (panel.startOpen()) {
                        this.layoutService.panelOpen$.next({
                            panel
                        });
                    }
                }
                this.layoutService.saveLayout();
            }
            this.layoutService.layoutReady$.next();
            this.layoutService.layoutReady$.complete();
            this.ready.emit({
                api: this.createLayoutApi()
            });
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
                    service.panelClose$.next({ panel, viaApi: true });
                }
            },
            movePanel(panelId: string, position: Position, priority: Priority): void {
                const panel = service.panels().firstOrDefault(p => p.id === panelId);
                if (panel) {
                    if (panel.position() === position && panel.priority() === priority) {
                        return;
                    }
                    service.detachPanelContent(panel);
                    service.panelMove$.next({
                        panel: panel,
                        oldPosition: panel.position(),
                        oldPriority: panel.priority(),
                        newPosition: position,
                        newPriority: priority,
                        wasOpenBefore: panel.open()
                    });
                }
            },
            openPanel(panelId: string): void {
                const panel = service.panels().firstOrDefault(p => p.id === panelId);
                if (panel && panel.visible()) {
                    service.panelOpen$.next({ panel, viaApi: true });
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
            const panel = new Panel(dpc.options());
            const loaded = this.loadSavedPanelData(layoutSaveData, panel);
            if (loaded) {
                if (panelIndexMap[panel.position()][panel.priority()] === panel.index()) {
                    panelIndexMap[panel.position()][panel.priority()] = panel.index() + 1;
                }
            } else {
                panel.index.set(panelIndexMap[panel.position()][panel.priority()]++);
            }
            panels = [...panels, panel];
        }
        this.layoutService.panels.update(set => set.clear().addAll(panels));
    }

    private loadSavedPanelData(savedLayoutData: LayoutSaveData | null, panel: Panel): boolean {
        if (!savedLayoutData) {
            return false;
        }
        const savedPanelData = savedLayoutData.panelSaveData.find(p => p.id === panel.id);
        if (savedPanelData) {
            panel.index.set(savedPanelData.index);
            panel.open.set(savedPanelData.open);
            panel.position.set(savedPanelData.position);
            panel.priority.set(savedPanelData.priority);
            panel.viewMode.set(savedPanelData.viewMode ?? panel.viewMode());
            return true;
        }
        return false;
    }

    private setSubscriptions(): void {
        this.layoutService.panelMove$.pipe(takeUntilDestroyed(this.#destroyRef), delay(100)).subscribe(() => {
            this.#cdr.detectChanges();
            this.layoutService.panels.update(list => list.toImmutableList());
        });
        this.layoutService.panelVisibility$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                delayWhen(() => this.layoutService.layoutReady$),
                tap(event => {
                    if (!event.visible) {
                        const panel = this.layoutService.panels().firstOrDefault(p => p.id === event.panelId);
                        if (panel) {
                            panel.wasOpenBeforeHidden = panel.open();
                            this.layoutService.panelClose$.next({ panel, viaVisibilityChange: true });
                        }
                    } else {
                        const panel = this.layoutService.panels().firstOrDefault(p => p.id === event.panelId);
                        if (panel) {
                            const panels = this.layoutService
                                .panels()
                                .where(p => p.position() === panel.position() && p.priority() === panel.priority())
                                .orderBy(p => p.index())
                                .toArray();
                            panels.forEach((p, px) => p.index.set(px));
                            const openPanel = panels.find(p => p.open);
                            if (!openPanel && panel.wasOpenBeforeHidden) {
                                this.layoutService.panelOpen$.next({ panel, viaVisibilityChange: true });
                            }
                        }
                    }
                })
            )
            .subscribe(event => {
                const panel = this.layoutService.panels().firstOrDefault(p => p.id === event.panelId);
                if (panel) {
                    panel.visible.set(event.visible);
                }
            });
        this.layoutService.panelMoveEnd$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                delayWhen(() => this.layoutService.layoutReady$)
            )
            .subscribe(() => this.updateStyles());
    }

    private updateStyles(): void {
        this.layoutMiddleStyles.update(style => {
            const totalHeaderHeight =
                this.layoutService.getHeaderSize("top") + this.layoutService.getHeaderSize("bottom");
            const height = `calc(100% - ${totalHeaderHeight}px)`;
            return { ...style, height };
        });
    }
}
