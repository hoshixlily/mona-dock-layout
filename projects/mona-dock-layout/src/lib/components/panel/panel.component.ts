import { Component, ElementRef, Input, NgZone, Renderer2, ViewChild } from "@angular/core";
import { delay, fromEvent, ReplaySubject, takeUntil } from "rxjs";
import { Panel } from "../../data/Panel";
import { PanelContentAnchorDirective } from "../../directives/panel-content-anchor.directive";
import { LayoutService } from "../../services/layout.service";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { faEllipsisV, faMinus, IconDefinition } from "@fortawesome/free-solid-svg-icons";

@Component({
    selector: "mona-panel",
    templateUrl: "./panel.component.html",
    styleUrls: ["./panel.component.scss"]
})
export class PanelComponent {
    readonly #destroy$: ReplaySubject<void> = new ReplaySubject(1);
    public readonly HideIcon: IconDefinition = faMinus;
    public readonly MenuIcon: IconDefinition = faEllipsisV;
    public panelActionStyles: Partial<CSSStyleDeclaration> = {};
    public panelContentStyles: Partial<CSSStyleDeclaration> = {};
    public panelHeaderStyles: Partial<CSSStyleDeclaration> = {};
    @Input() public panel!: Panel;
    @ViewChild(PanelContentAnchorDirective) public panelContentAnchor!: PanelContentAnchorDirective;

    public constructor(
        private readonly elementRef: ElementRef<HTMLElement>,
        public readonly layoutService: LayoutService,
        private readonly renderer: Renderer2,
        private readonly zone: NgZone
    ) {}

    public close(): void {
        this.layoutService.PanelClose$.next({ panel: this.panel, viaUser: true });
    }

    public movePanel(position: Position, priority: Priority): void {
        this.layoutService.PanelMove$.next({
            panel: this.panel,
            oldPosition: this.panel.position,
            newPosition: position,
            oldPriority: this.panel.priority,
            newPriority: priority,
            wasOpenBefore: this.panel.open
        });
    }

    public ngAfterViewInit(): void {
        this.panel.vcr = this.panelContentAnchor.viewContainerRef;
    }

    public ngOnDestroy(): void {
        this.#destroy$.next();
        this.#destroy$.complete();
    }

    public ngOnInit(): void {
        this.setStyles();
        this.setSubscriptions();
    }

    public setPanelPinned(pinned: boolean): void {
        this.panel.pinned = pinned;
        this.layoutService.saveLayout();
    }

    private setStyles(): void {
        this.panelHeaderStyles = {
            height: `${this.layoutService.layoutConfig.panelHeaderHeight}px`
        };
        this.panelActionStyles = {
            width: `${this.layoutService.layoutConfig.panelHeaderHeight}px`
        };
        this.panelContentStyles = {
            height: `calc(100% - ${this.panelHeaderStyles.height})`
        };
    }

    private setSubscriptions(): void {
        fromEvent(document, "click")
            .pipe(delay(100), takeUntil(this.#destroy$))
            .subscribe((event: Event) => {
                this.zone.runOutsideAngular(() => {
                    const target = event.target as HTMLElement;
                    const panelElement = target.closest(`div.xp-panel[data-pid="${this.panel.Uid}"]`);
                    if (panelElement) {
                        return;
                    }
                    if (
                        target.closest(".layout-header-list > li") ||
                        target.closest("xp-contextmenu-content") ||
                        target.closest(".panel-group-resizer") ||
                        target.closest(".container-resizer")
                    ) {
                        return;
                    }
                    if (this.elementRef.nativeElement.contains(event.target as HTMLElement)) {
                        return;
                    }
                    if (!this.panel.pinned) {
                        this.zone.run(() => {
                            this.layoutService.PanelClose$.next({ panel: this.panel, viaUser: true });
                        });
                    }
                });
            });
    }
}
