import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    NgZone,
    OnInit,
    viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { faEllipsisV, faMinus } from "@fortawesome/free-solid-svg-icons";
import { debounceTime, fromEvent, of, switchMap } from "rxjs";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { PanelContentAnchorDirective } from "../../directives/panel-content-anchor.directive";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-panel",
    templateUrl: "./panel.component.html",
    styleUrls: ["./panel.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelComponent implements OnInit, AfterViewInit {
    readonly #destroyRef = inject(DestroyRef);
    readonly #hostElementRef = inject(ElementRef<HTMLElement>);
    readonly #zone = inject(NgZone);
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

    public panel = input.required<Panel>();

    public close(): void {
        this.layoutService.panelClose$.next({ panel: this.panel(), viaUser: true });
    }

    public movePanel(position: Position, priority: Priority): void {
        this.layoutService.detachPanelContent(this.panel());
        this.layoutService.panelMove$.next({
            panel: this.panel(),
            oldPosition: this.panel().position,
            newPosition: position,
            oldPriority: this.panel().priority,
            newPriority: priority,
            wasOpenBefore: this.panel().open()
        });
    }

    public ngAfterViewInit(): void {
        this.panel().vcr = this.panelContentAnchor().viewContainerRef;
    }

    public ngOnInit(): void {
        this.setSubscriptions();
    }

    public setPanelPinned(pinned: boolean): void {
        this.panel().pinned.set(pinned);
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
                            if (!this.panel().pinned()) {
                                this.#zone.run(() => {
                                    this.layoutService.panelClose$.next({ panel: this.panel(), viaUser: true });
                                });
                            }
                        });
                        return of(event);
                    })
                )
                .subscribe();
        });
    }
}
