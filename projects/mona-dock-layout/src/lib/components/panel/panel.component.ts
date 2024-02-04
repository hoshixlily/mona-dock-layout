import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    Input,
    NgZone,
    OnInit,
    Renderer2,
    ViewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { faEllipsisV, faMinus, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { delay, fromEvent } from "rxjs";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { PanelContentAnchorDirective } from "../../directives/panel-content-anchor.directive";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-panel",
    templateUrl: "./panel.component.html",
    styleUrls: ["./panel.component.scss"]
})
export class PanelComponent implements OnInit, AfterViewInit {
    readonly #destroyRef: DestroyRef = inject(DestroyRef);
    public readonly HideIcon: IconDefinition = faMinus;
    public readonly MenuIcon: IconDefinition = faEllipsisV;
    public panelActionStyles: Partial<CSSStyleDeclaration> = {};
    public panelContentStyles: Partial<CSSStyleDeclaration> = {};
    public panelHeaderStyles: Partial<CSSStyleDeclaration> = {};

    @Input({ required: true })
    public panel!: Panel;

    @ViewChild(PanelContentAnchorDirective)
    public panelContentAnchor!: PanelContentAnchorDirective;

    public constructor(
        private readonly elementRef: ElementRef<HTMLElement>,
        public readonly layoutService: LayoutService,
        private readonly renderer: Renderer2,
        private readonly zone: NgZone
    ) {}

    public close(): void {
        this.layoutService.panelClose$.next({ panel: this.panel, viaUser: true });
    }

    public movePanel(position: Position, priority: Priority): void {
        this.layoutService.detachPanelContent(this.panel);
        this.layoutService.panelMove$.next({
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
        this.zone.runOutsideAngular(() => {
            fromEvent(document, "click")
                .pipe(delay(100), takeUntilDestroyed(this.#destroyRef))
                .subscribe((event: Event) => {
                    this.zone.runOutsideAngular(() => {
                        const target = event.target as HTMLElement;
                        const panelElement = target.closest(`div.mona-panel[data-pid="${this.panel.Uid}"]`);
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
                        if (this.elementRef.nativeElement.contains(event.target as HTMLElement)) {
                            return;
                        }
                        if (!this.panel.pinned) {
                            this.zone.run(() => {
                                this.layoutService.panelClose$.next({ panel: this.panel, viaUser: true });
                            });
                        }
                    });
                });
        });
    }
}
