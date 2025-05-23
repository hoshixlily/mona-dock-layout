import { NgStyle, NgTemplateOutlet } from "@angular/common";
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    EmbeddedViewRef,
    inject,
    input,
    NgZone,
    OnInit,
    viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faEllipsisV, faMinus } from "@fortawesome/free-solid-svg-icons";
import { debounceTime, filter, fromEvent, of, switchMap, take, tap } from "rxjs";
import { Panel } from "../../data/Panel";
import { PanelContentTemplateContext } from "../../data/PanelContentTemplateContext";
import { MoveStage } from "../../data/PanelMoveEvent";
import { PanelViewMode } from "../../data/PanelViewMode";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { PanelContentAnchorDirective } from "../../directives/panel-content-anchor.directive";
import { LayoutService } from "../../services/layout.service";
import { PanelContextMenuComponent } from "../panel-context-menu/panel-context-menu.component";

@Component({
    selector: "mona-panel",
    templateUrl: "./panel.component.html",
    styleUrls: ["./panel.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgStyle, NgTemplateOutlet, FaIconComponent, PanelContentAnchorDirective, PanelContextMenuComponent]
})
export class PanelComponent implements OnInit, AfterViewInit {
    readonly #destroyRef = inject(DestroyRef);
    readonly #hostElementRef = inject(ElementRef<HTMLElement>);
    readonly #zone = inject(NgZone);
    protected readonly actions = computed(() => this.layoutService.getPanelActionTemplates(this.panel().id));
    protected readonly hideIcon = faMinus;
    protected readonly layoutService = inject(LayoutService);
    protected readonly menuIcon = faEllipsisV;
    protected readonly panelActionStyles = computed<Partial<CSSStyleDeclaration>>(() => ({
        width: `${this.layoutService.layoutConfig().panelHeaderHeight()}px`
    }));
    protected readonly panelContentAnchor = viewChild.required(PanelContentAnchorDirective);
    protected readonly panelContentStyles = computed<Partial<CSSStyleDeclaration>>(() => ({
        height: `calc(100% - ${this.panelHeaderStyles().height})`
    }));
    protected readonly panelHeaderStyles = computed<Partial<CSSStyleDeclaration>>(() => ({
        height: `${this.layoutService.layoutConfig().panelHeaderHeight()}px`
    }));
    protected readonly titleTemplate = computed(() => this.layoutService.getPanelTitleTemplate(this.panel().id));
    public readonly panel = input.required<Panel>();

    public close(): void {
        this.layoutService.closePanel(this.panel().id);
    }

    public movePanel(position: Position, priority: Priority): void {
        this.layoutService.panelMove$.next({
            panel: this.panel(),
            oldPosition: this.panel().position,
            newPosition: position,
            oldPriority: this.panel().priority,
            newPriority: priority,
            stage: MoveStage.Close,
            wasOpenBefore: this.layoutService.isPanelOpen(this.panel().id)
        });
    }

    public ngAfterViewInit(): void {
        const content = this.layoutService.getPanelContentTemplate(this.panel().id);
        if (content) {
            const panelContentVcr = this.layoutService.panelTemplateContentContainerRef();
            const oldViewRef = this.layoutService.panelViewRefDict().get(this.panel().id);
            if (oldViewRef) {
                if (panelContentVcr) {
                    const index = panelContentVcr.indexOf(oldViewRef);
                    if (index !== -1) {
                        panelContentVcr.detach(index);
                    }
                }
                const newViewRef = this.panelContentAnchor().viewContainerRef.insert(
                    oldViewRef
                ) as EmbeddedViewRef<PanelContentTemplateContext>;
                this.layoutService.panelViewRefDict.update(dict => dict.put(this.panel().id, newViewRef));
            } else {
                const viewRef = this.panelContentAnchor().viewContainerRef.createEmbeddedView(
                    content
                ) as EmbeddedViewRef<PanelContentTemplateContext>;
                this.layoutService.panelViewRefDict.update(dict => dict.put(this.panel().id, viewRef));
            }
        }
        this.layoutService.panelContentAnchors.update(dict => dict.put(this.panel().id, this.panelContentAnchor()));
        this.layoutService.panelMove$
            .pipe(
                take(1),
                filter(e => e.panel.id === this.panel().id && e.stage === MoveStage.Attach),
                tap(e => this.layoutService.panelMove$.next({ ...e, stage: MoveStage.Open }))
            )
            .subscribe();
    }

    public ngOnInit(): void {
        this.setSubscriptions();
        this.layoutService.panelMove$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                filter(event => event.stage === MoveStage.Detach && event.panel.id === this.panel().id),
                tap(e => {
                    const viewRef =
                        this.panelContentAnchor().viewContainerRef.detach() as EmbeddedViewRef<PanelContentTemplateContext>;
                    if (viewRef) {
                        this.layoutService.panelViewRefDict.update(dict => dict.put(this.panel().id, viewRef));
                    }
                    this.layoutService.panelMove$.next({ ...e, stage: MoveStage.Move });
                })
            )
            .subscribe();
    }

    public onPanelToggle(value: boolean): void {
        if (!value) {
            this.close();
        }
    }

    public onViewModeChange(viewMode: PanelViewMode): void {
        this.layoutService.setPanelViewMode(this.panel().id, viewMode);
        this.layoutService.saveLayout();
    }

    private setSubscriptions(): void {
        this.#zone.runOutsideAngular(() => {
            fromEvent(document, "click")
                .pipe(
                    debounceTime(100),
                    takeUntilDestroyed(this.#destroyRef),
                    switchMap(event => {
                        this.#zone.runOutsideAngular(() => {
                            const target = event.target as HTMLElement;
                            const panelElement = target.closest(`div.mona-panel[data-pid="${this.panel().uid}"]`);
                            if (panelElement) {
                                return;
                            }
                            if (
                                target.closest(".layout-header-list > li") ||
                                target.closest("mona-contextmenu-content") ||
                                target.closest(".panel-group-resizer") ||
                                target.closest(".container-resizer")
                            ) {
                                return;
                            }
                            if (this.#hostElementRef.nativeElement.contains(event.target as HTMLElement)) {
                                return;
                            }
                            const viewMode = this.layoutService.getPanelViewMode(this.panel().id);
                            if (viewMode != null && viewMode !== PanelViewMode.Docked) {
                                this.#zone.run(() => this.layoutService.closePanel(this.panel().id));
                            }
                        });
                        return of(event);
                    })
                )
                .subscribe();
        });
    }
}
