import { CdkDragDrop } from "@angular/cdk/drag-drop";
import {
    AfterContentInit,
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ContentChild,
    ContentChildren,
    DestroyRef,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    NgZone,
    OnDestroy,
    OnInit,
    Output,
    QueryList,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewChildren,
    ViewContainerRef
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { delay, delayWhen, tap } from "rxjs";
import { LayoutApi } from "../../data/LayoutApi";
import { LayoutReadyEvent } from "../../data/LayoutReadyEvent";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutContentTemplateDirective } from "../../directives/layout-content-template.directive";
import { PanelTemplateReferenceDirective } from "../../directives/panel-template-reference.directive";
import { LayoutService } from "../../services/layout.service";
import { DockPanelComponent } from "../dock-panel/dock-panel.component";

@Component({
    selector: "mona-dock-layout",
    templateUrl: "./dock-layout.component.html",
    styleUrls: ["./dock-layout.component.scss"],
    providers: [LayoutService]
})
export class DockLayoutComponent implements OnInit, OnDestroy, AfterViewInit, AfterContentInit {
    readonly #destroyRef: DestroyRef = inject(DestroyRef);
    private layoutResizeObserver!: ResizeObserver;
    public layoutMiddleStyles: Partial<CSSStyleDeclaration> = {};
    public resizing: boolean = false;

    @ContentChildren(DockPanelComponent)
    private dockPanelComponents: QueryList<DockPanelComponent> = new QueryList<DockPanelComponent>();

    @ViewChild("layoutElementRef")
    private layoutElementRef!: ElementRef<HTMLDivElement>;

    @ViewChild("panelTemplateContentsContainerRef", { read: ViewContainerRef })
    private panelTemplateContentsContainerRef!: ViewContainerRef;

    @ViewChildren(PanelTemplateReferenceDirective)
    private panelTemplateReferences = new QueryList<PanelTemplateReferenceDirective>();

    @ContentChild(LayoutContentTemplateDirective, { read: TemplateRef })
    public layoutContentTemplateRef: TemplateRef<void> | null = null;

    @Input({ required: true })
    public layoutId!: string;

    @Output()
    public ready: EventEmitter<LayoutReadyEvent> = new EventEmitter<LayoutReadyEvent>();

    public constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly hostElementRef: ElementRef<HTMLElement>,
        public readonly layoutService: LayoutService,
        private readonly renderer: Renderer2,
        private readonly viewContainerRef: ViewContainerRef,
        private readonly zone: NgZone
    ) {}

    public movePanel(panel: Panel, position: Position, priority: Priority): void {
        this.layoutService.detachPanelContent(panel);
        this.layoutService.panelMove$.next({
            panel: panel,
            oldPosition: panel.position,
            newPosition: position,
            oldPriority: panel.priority,
            newPriority: priority,
            wasOpenBefore: panel.open
        });
    }

    public ngAfterContentInit(): void {
        const panelIds = this.dockPanelComponents.map(p => p.panelId);
        const idSet = new Set(panelIds);
        if (panelIds.length !== idSet.size) {
            throw new Error("Panel IDs must be unique.");
        }
        this.createPanels();
    }

    public ngAfterViewInit(): void {
        this.layoutService.panelTemplateContentsContainerRef = this.panelTemplateContentsContainerRef;
        this.zone.runOutsideAngular(() => {
            this.layoutResizeObserver = new ResizeObserver(() => {
                this.layoutService.layoutDomRect = this.layoutElementRef.nativeElement.getBoundingClientRect();
            });
            this.layoutResizeObserver.observe(this.layoutElementRef.nativeElement);
        });
        for (const panel of this.layoutService.panels()) {
            this.cdr.detectChanges();
            const panelTemplateRef = this.panelTemplateReferences.find(p => p.panel.Uid === panel.Uid);
            if (panelTemplateRef) {
                panel.viewRef = this.panelTemplateContentsContainerRef.createEmbeddedView(panelTemplateRef.templateRef);
            }
        }
        for (const panel of this.layoutService.panels()) {
            this.layoutService.reattachPanelContent(panel);
        }
        window.setTimeout(() => {
            const loaded = this.layoutService.loadLayout();
            if (!loaded) {
                for (const panel of this.layoutService.panels()) {
                    if (panel.startOpen) {
                        this.layoutService.panelOpen$.next({
                            panel
                        });
                    }
                }
                this.layoutService.saveLayout();
            }
            this.ready.emit({
                api: this.createLayoutApi()
            });
            this.layoutService.layoutReady$.next();
            this.layoutService.layoutReady$.complete();
        });
        this.layoutService.updateHeaderSizes();
    }

    public ngOnDestroy(): void {
        // this.layoutService.LayoutReady$.complete();
        this.layoutResizeObserver.disconnect();
    }

    public ngOnInit(): void {
        this.layoutService.setLayoutId(this.layoutId);
        this.updateStyles();
        this.setSubscriptions();
    }

    public onPanelHeaderClicked(panel: Panel): void {
        if (panel.open) {
            this.layoutService.panelClose$.next({ panel, viaUser: true });
        } else {
            this.layoutService.panelOpen$.next({ panel, viaUser: true });
        }
    }

    public onPanelHeadersReordered(event: CdkDragDrop<string>, position: Position, priority: Priority): void {
        const panels = this.layoutService.panels().filter(p => p.position === position && p.priority === priority);
        const panel = panels.find(p => p.index === event.previousIndex);
        if (panel) {
            panels.splice(event.previousIndex, 1);
            panels.splice(event.currentIndex, 0, panel);
            panels.forEach((p, i) => {
                p.index = i;
            });
            this.layoutService.saveLayout();
        }
    }

    public setPanelPinned(panel: Panel, pinned: boolean): void {
        panel.pinned = pinned;
        this.layoutService.saveLayout();
    }

    public togglePanel(panel: Panel, open: boolean): void {
        if (open) {
            this.layoutService.panelOpen$.next({ panel, viaUser: true });
        } else {
            this.layoutService.panelClose$.next({ panel, viaUser: true });
        }
    }

    private createLayoutApi(): LayoutApi {
        const service = this.layoutService;
        return {
            closePanel(panelId: string): void {
                const panel = service.panels().find(p => p.Id === panelId);
                if (panel) {
                    service.panelClose$.next({ panel, viaApi: true });
                }
            },
            movePanel(panelId: string, position: Position, priority: Priority): void {
                const panel = service.panels().find(p => p.Id === panelId);
                if (panel) {
                    if (panel.position === position && panel.priority === priority) {
                        return;
                    }
                    service.detachPanelContent(panel);
                    service.panelMove$.next({
                        panel: panel,
                        oldPosition: panel.position,
                        oldPriority: panel.priority,
                        newPosition: position,
                        newPriority: priority,
                        wasOpenBefore: panel.open
                    });
                }
            },
            openPanel(panelId: string): void {
                const panel = service.panels().find(p => p.Id === panelId);
                if (panel && panel.visible) {
                    service.panelOpen$.next({ panel, viaApi: true });
                }
            },
            setPanelVisible(panelId: string, visible: boolean): void {
                const panel = service.panels().find(p => p.Id === panelId);
                if (panel) {
                    service.panelVisibility$.next({ panelId: panel.Id, visible: visible });
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
        for (const dpc of this.dockPanelComponents) {
            const panel = new Panel(dpc.getPanelOptions());
            panel.index = panelIndexMap[panel.position][panel.priority]++;
            panels = [...panels, panel];
        }
        this.layoutService.panels.set(panels);
    }

    private setSubscriptions(): void {
        this.layoutService.containerResizeStart$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
            this.resizing = true;
        });
        this.layoutService.panelMove$.pipe(takeUntilDestroyed(this.#destroyRef), delay(100)).subscribe(() => {
            this.cdr.detectChanges();
            this.layoutService.panels.update(panels => [...panels]);
        });
        this.layoutService.panelVisibility$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                delayWhen(() => this.layoutService.layoutReady$),
                tap(event => {
                    if (!event.visible) {
                        const panel = this.layoutService.panels().find(p => p.Id === event.panelId);
                        if (panel) {
                            panel.wasOpenBeforeHidden = panel.open;
                            this.layoutService.panelClose$.next({ panel, viaVisibilityChange: true });
                        }
                    } else {
                        const panel = this.layoutService.panels().find(p => p.Id === event.panelId);
                        if (panel) {
                            const panels = this.layoutService
                                .panels()
                                .filter(p => p.position === panel.position && p.priority === panel.priority);
                            panels.sort((p1, p2) => p1.index - p2.index).forEach((p, px) => (p.index = px));
                            const openPanel = panels.find(p => p.open);
                            if (!openPanel && panel.wasOpenBeforeHidden) {
                                this.layoutService.panelOpen$.next({ panel, viaVisibilityChange: true });
                            }
                        }
                    }
                })
            )
            .subscribe(event => {
                const panel = this.layoutService.panels().find(p => p.Id === event.panelId);
                if (panel) {
                    panel.visible = event.visible;
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
        this.layoutMiddleStyles = {
            height: `calc(100% - ${
                this.layoutService.getHeaderSize("top") + this.layoutService.getHeaderSize("bottom")
            }px)`
        };
    }
}
