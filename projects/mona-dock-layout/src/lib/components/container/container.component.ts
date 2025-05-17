import { NgStyle } from "@angular/common";
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    NgZone,
    OnInit,
    untracked,
    viewChild
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { asyncScheduler, debounceTime, filter, fromEvent, map, switchMap, takeUntil, tap } from "rxjs";
import { ResizerStyles } from "../../data/ContainerSizeData";
import { MoveStage } from "../../data/PanelMoveEvent";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";
import { PanelGroupComponent } from "../panel-group/panel-group.component";

@Component({
    selector: "mona-container",
    templateUrl: "./container.component.html",
    styleUrls: ["./container.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgStyle, PanelGroupComponent]
})
export class ContainerComponent implements OnInit, AfterViewInit {
    readonly #destroyRef = inject(DestroyRef);
    readonly #hostElementRef = inject(ElementRef<HTMLElement>);
    readonly #injector = inject(Injector);
    readonly #zone = inject(NgZone);
    private readonly containerResizer = viewChild.required<ElementRef<HTMLElement>>("containerResizer");
    private readonly panelGroupResizer = viewChild<ElementRef<HTMLElement>>("panelGroupResizer");
    protected readonly anyPrimaryPanelOpen = computed(() => {
        const panels = this.layoutService.panels().where(panel => panel.position === this.position());
        return panels.where(panel => panel.priority === "primary" && this.layoutService.isPanelOpen(panel.id)).any();
    });
    protected readonly anySecondaryPanelOpen = computed(() => {
        const panels = this.layoutService.panels().where(panel => panel.position === this.position());
        return panels.where(panel => panel.priority === "secondary" && this.layoutService.isPanelOpen(panel.id)).any();
    });
    protected readonly containerStyles = computed<Partial<CSSStyleDeclaration>>(() => {
        const styles = this.layoutService.containerStyles().get(this.position()) ?? {};
        const displayStyles: Partial<CSSStyleDeclaration> = this.open()
            ? { display: "block", zIndex: "0" }
            : { display: "none", zIndex: "-10" };
        return { ...styles, ...displayStyles };
    });
    protected readonly layoutService = inject(LayoutService);
    protected readonly open = computed(() => {
        const panels = this.layoutService.panels().where(panel => panel.position === this.position());
        return panels.any(panel => this.layoutService.isPanelOpen(panel.id));
    });
    protected readonly panelGroupResizerStyles = computed<ResizerStyles>(() => {
        const position = this.position();
        const visible = this.panelGroupResizerVisible();
        const resizerPos = this.layoutService.panelGroupResizerPositions().get(this.position());
        const horizontal = position === "left" || position === "right";
        const positionText = horizontal ? "top" : "left";
        return {
            [positionText]: resizerPos ?? undefined,
            display: visible ? "block" : "none",
            zIndex: visible ? "1" : "-1",
            pointerEvents: visible ? "auto" : "none"
        };
    });
    protected readonly panelGroupResizerVisible = computed(() => {
        return (
            this.layoutService
                .panels()
                .where(panel => panel.position === this.position() && this.layoutService.isPanelOpen(panel.id))
                .count() > 1
        );
    });
    protected readonly primaryPanelStyles = computed<Partial<CSSStyleDeclaration>>(() => {
        return this.getPanelStylesByPriority("primary");
    });

    protected readonly resizing = toSignal(
        this.layoutService.containerResizeInProgress$.pipe(map(event => event.resizing))
    );
    protected readonly resizingPanel = toSignal(
        this.layoutService.panelResizeInProgress$.pipe(map(event => event.resizing))
    );
    protected readonly secondaryPanelStyles = computed(() => {
        return this.getPanelStylesByPriority("secondary");
    });
    public readonly position = input.required<Position>();

    public ngAfterViewInit(): void {
        this.setEvents();
    }

    public ngOnInit(): void {
        this.setSubscriptions();
    }

    private getOppositeContainerElement(): HTMLElement {
        return this.getOppositeContainerWrapperElement().querySelector("div.mona-layout-container") as HTMLElement;
    }

    private getOppositeContainerWrapperElement(): HTMLElement {
        const oppositePosition = this.getOppositePosition();
        const oppositeOrientation = this.getOppositeOrientation();
        const oppositeContainer = document.querySelector(
            `div.layout-container-wrapper.${oppositeOrientation}.${oppositePosition}`
        );
        return oppositeContainer as HTMLElement;
    }

    private getOppositeOrientation(): "vertical" | "horizontal" {
        return this.position() === "left" || this.position() === "right" ? "vertical" : "horizontal";
    }

    private getOppositePosition(): Position {
        switch (this.position()) {
            case "left":
                return "right";
            case "right":
                return "left";
            case "top":
                return "bottom";
            case "bottom":
                return "top";
        }
    }

    private getPanelStylesByPriority(priority: Priority): Partial<CSSStyleDeclaration> {
        const position = this.position();
        const horizontal = position === "left" || position === "right";
        const positionText = priority === "primary" ? (horizontal ? "bottom" : "right") : horizontal ? "top" : "left";
        const openPanels = this.layoutService.getOpenContainerPanels(position);
        if (openPanels.count() === 1) {
            if (openPanels.first().priority === priority) {
                return { display: "block", [positionText]: "0%" };
            }
        } else if (openPanels.count() === 2) {
            const resizerPosition = this.layoutService.panelGroupResizerPositions().get(position);
            const panelStyle =
                priority === "primary" ? `calc(100% - 4px - ${resizerPosition})` : `calc(4px + ${resizerPosition})`;
            return { display: "block", [positionText]: panelStyle };
        }
        return { display: "none" };
    }

    private openPanel(panelId: string): void {
        const panel = this.layoutService.panels().firstOrDefault(p => p.id === panelId);
        if (!panel) {
            return;
        }
        const openedPanel = this.layoutService
            .panels()
            .firstOrDefault(
                p =>
                    p.id !== panelId &&
                    p.position === panel.position &&
                    p.priority === panel.priority &&
                    this.layoutService.isPanelOpen(p.id)
            );
        if (openedPanel) {
            this.layoutService.closePanel(openedPanel.id);
        }
        const oppositeContainerElement = this.getOppositeContainerElement();
        if (oppositeContainerElement.style.display !== "none") {
            window.setTimeout(() => {
                this.updateOppositeContainerSize();
            });
        }
        const openPanels = this.layoutService
            .panels()
            .where(panel => panel.position === this.position() && this.layoutService.isPanelOpen(panel.id));
        if (openPanels.count() === 2 && !this.panelGroupResizerVisible()) {
            this.setPanelGroupResizerEvent();
        }
    }

    private resize(event: MouseEvent): void {
        if (this.resizing()) {
            const oppositeContainerElement = this.getOppositeContainerWrapperElement();
            const oppositeContainerSize =
                oppositeContainerElement.style.display === "none"
                    ? 0
                    : this.position() === "left" || this.position() === "right"
                      ? oppositeContainerElement.clientWidth
                      : oppositeContainerElement.clientHeight;
            if (this.position() === "left") {
                this.resizeLeft(event, oppositeContainerSize);
            } else if (this.position() === "right") {
                this.resizeRight(event, oppositeContainerSize);
            } else if (this.position() === "top") {
                this.resizeTop(event, oppositeContainerSize);
            } else if (this.position() === "bottom") {
                this.resizeBottom(event, oppositeContainerSize);
            }
            this.layoutService.saveLayout();
        }
    }

    private resizeBottom(event: MouseEvent, oppositeContainerSize: number): void {
        const offset =
            this.layoutService.layoutConfig().containerResizeOffset() +
            this.layoutService.getHeaderSize(this.position()) +
            this.layoutService.getHeaderSize("top");
        const height =
            this.layoutService.layoutDomRect.height -
            event.clientY +
            this.layoutService.layoutDomRect.top -
            this.layoutService.getHeaderSize(this.position());
        if (
            this.layoutService.layoutDomRect.height - (height + oppositeContainerSize) > offset &&
            height > this.layoutService.layoutConfig().minContainerHeight()
        ) {
            this.updateContainerStyles({
                height: `${height}px`
            });
        }
    }

    private resizeLeft(event: MouseEvent, oppositeContainerSize: number): void {
        const offset =
            this.layoutService.layoutConfig().containerResizeOffset() +
            this.layoutService.getHeaderSize(this.position()) +
            this.layoutService.getHeaderSize("right");
        const width = event.clientX - this.#hostElementRef.nativeElement.getBoundingClientRect().left + 4;
        if (
            this.layoutService.layoutDomRect.width - (width + oppositeContainerSize) > offset &&
            width > this.layoutService.layoutConfig().minContainerWidth()
        ) {
            this.updateContainerStyles({
                width: `${width}px`
            });
        }
    }

    private resizePanel(event: MouseEvent): void {
        if (this.resizingPanel()) {
            const max = this.layoutService.layoutConfig().maxPanelSize();
            const min = this.layoutService.layoutConfig().minPanelSize();
            const offset = this.layoutService.layoutConfig().panelResizeOffset();
            const rectangle = this.#hostElementRef.nativeElement.getBoundingClientRect();
            if (this.position() === "left" || this.position() === "right") {
                let top = ((event.clientY - rectangle.top - 2) * 100.0) / rectangle.height;
                top = top > max ? max : top < min ? min : top;
                if (event.clientY < rectangle.bottom - offset && event.clientY > rectangle.top + offset) {
                    this.layoutService.panelGroupResizerPositions.update(dict => {
                        return dict.put(this.position(), `calc(${top}% - 4px)`);
                    });
                }
            } else {
                let left = ((event.clientX - rectangle.left + 2) * 100.0) / rectangle.width;
                left = left > max ? max : left < min ? min : left;
                if (event.clientX < rectangle.right - offset && event.clientX > rectangle.left + offset) {
                    this.layoutService.panelGroupResizerPositions.update(dict => {
                        return dict.put(this.position(), `calc(${left}% - 4px)`);
                    });
                }
            }
            this.layoutService.saveLayout();
        }
    }

    private resizeRight(event: MouseEvent, oppositeContainerSize: number): void {
        const offset =
            this.layoutService.layoutConfig().containerResizeOffset() +
            this.layoutService.getHeaderSize(this.position()) +
            this.layoutService.getHeaderSize("left");
        const width =
            this.layoutService.layoutDomRect.width -
            event.clientX +
            this.layoutService.layoutDomRect.left -
            this.layoutService.getHeaderSize(this.position());
        if (
            this.layoutService.layoutDomRect.width - (width + oppositeContainerSize) > offset &&
            width > this.layoutService.layoutConfig().minContainerWidth()
        ) {
            this.updateContainerStyles({
                width: `${width}px`
            });
        }
    }

    private resizeTop(event: MouseEvent, oppositeContainerSize: number): void {
        const offset =
            this.layoutService.layoutConfig().containerResizeOffset() +
            this.layoutService.getHeaderSize(this.position()) +
            this.layoutService.getHeaderSize("bottom");
        const height = event.clientY - this.#hostElementRef.nativeElement.getBoundingClientRect().top + 4;
        if (
            this.layoutService.layoutDomRect.height - (height + oppositeContainerSize) > offset &&
            height > this.layoutService.layoutConfig().minContainerHeight()
        ) {
            this.updateContainerStyles({
                height: `${height}px`
            });
        }
    }

    private setContainerResizeEvent(): void {
        const resizer = this.containerResizer().nativeElement as HTMLElement;
        const pointerDown$ = fromEvent<PointerEvent>(resizer, "pointerdown").pipe(
            tap(e => {
                e.preventDefault();
                resizer.setPointerCapture(e.pointerId);
                this.layoutService.containerResizeInProgress$.next({
                    resizing: true,
                    position: this.position()
                });
            })
        );

        const pointerUp$ = fromEvent<PointerEvent>(resizer, "pointerup").pipe(
            tap(e => {
                if (resizer.hasPointerCapture(e.pointerId)) {
                    resizer.releasePointerCapture(e.pointerId);
                }
                this.layoutService.containerResizeInProgress$.next({ resizing: false });
            })
        );

        const pointerMove$ = fromEvent<PointerEvent>(resizer, "pointermove").pipe(
            debounceTime(0, asyncScheduler),
            tap(e => this.resize(e)),
            takeUntil(pointerUp$)
        );

        this.#zone.runOutsideAngular(() =>
            pointerDown$
                .pipe(
                    switchMap(() => pointerMove$),
                    takeUntilDestroyed(this.#destroyRef)
                )
                .subscribe()
        );
    }

    private setEvents(): void {
        this.setContainerResizeEvent();
        const e = effect(
            () => {
                const panelGroupResizer = this.panelGroupResizer();
                const panelGroupResizerVisible = this.panelGroupResizerVisible();
                untracked(() => {
                    if (panelGroupResizer && panelGroupResizerVisible) {
                        this.setPanelGroupResizerEvent();
                        e.destroy();
                    }
                });
            },
            { injector: this.#injector }
        );
    }

    private setOpenPanelsChangeSubscription(): void {
        this.layoutService.openPanelsChange$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                map(p => this.layoutService.panels().first(pn => pn.id === p.panel)),
                filter(p => p.position === this.position()),
                tap(p => {
                    if (this.layoutService.isPanelOpen(p.id)) {
                        this.openPanel(p.id);
                    }
                    this.layoutService.saveLayout();
                })
            )
            .subscribe();
    }

    private setPanelGroupResizerEvent(): void {
        const resizer = this.panelGroupResizer()?.nativeElement as HTMLElement;
        const pointerDown$ = fromEvent<PointerEvent>(resizer, "pointerdown").pipe(
            tap(e => {
                e.preventDefault();
                resizer.setPointerCapture(e.pointerId);
                this.layoutService.panelResizeInProgress$.next({
                    resizing: true,
                    position: this.position()
                });
            })
        );

        const pointerUp$ = fromEvent<PointerEvent>(resizer, "pointerup").pipe(
            tap(e => {
                if (resizer.hasPointerCapture(e.pointerId)) {
                    resizer.releasePointerCapture(e.pointerId);
                }
                this.layoutService.panelResizeInProgress$.next({ resizing: false });
            })
        );

        const pointerMove$ = fromEvent<PointerEvent>(resizer, "pointermove").pipe(
            debounceTime(0, asyncScheduler),
            tap(e => this.resizePanel(e)),
            takeUntil(pointerUp$)
        );

        this.#zone.runOutsideAngular(() =>
            pointerDown$
                .pipe(
                    switchMap(() => pointerMove$),
                    takeUntilDestroyed(this.#destroyRef)
                )
                .subscribe()
        );
    }

    private setPanelMoveCloseStageSubscription(): void {
        this.layoutService.panelMove$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                filter(e => e.stage === MoveStage.Close && e.oldPosition === this.position()),
                tap(e => {
                    const panel = this.layoutService
                        .panels()
                        .firstOrDefault(
                            panel =>
                                panel.position === e.oldPosition &&
                                panel.priority === e.oldPriority &&
                                panel.id === e.panel.id
                        );
                    if (panel) {
                        this.layoutService.closePanel(panel.id);
                    }
                    this.layoutService.panelMove$.next({ ...e, stage: MoveStage.Detach });
                })
            )
            .subscribe();
    }

    private setPanelMoveOpenStageSubscription(): void {
        this.layoutService.panelMove$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                filter(e => e.stage === MoveStage.Open && e.newPosition === this.position()),
                tap(e => {
                    if (e.wasOpenBefore) {
                        this.layoutService.openPanel(e.panel.id);
                    }
                    this.layoutService.panelMove$.next({ ...e, stage: MoveStage.End });
                })
            )
            .subscribe();
    }

    private setSubscriptions(): void {
        this.setOpenPanelsChangeSubscription();
        this.setPanelMoveCloseStageSubscription();
        this.setPanelMoveOpenStageSubscription();
    }

    private updateContainerStyles(styles: Partial<CSSStyleDeclaration>): void {
        this.layoutService.containerStyles.update(dict => {
            return dict.set(this.position(), {
                ...dict.get(this.position()),
                ...styles
            });
        });
    }

    private updateOppositeContainerSize(): void {
        const size =
            this.position() === "left" || this.position() === "right"
                ? this.#hostElementRef.nativeElement.getBoundingClientRect().width
                : this.#hostElementRef.nativeElement.getBoundingClientRect().height;
        const oppositeContainerElement = this.getOppositeContainerElement();
        if (oppositeContainerElement) {
            const oppositeContainerSize =
                this.position() === "left" || this.position() === "right"
                    ? oppositeContainerElement.clientWidth
                    : oppositeContainerElement.clientHeight;
            const layoutSize =
                this.position() === "left" || this.position() === "right"
                    ? this.layoutService.layoutDomRect.width
                    : this.layoutService.layoutDomRect.height;
            const headerSize = this.layoutService.getHeaderSize(this.position());
            if (layoutSize - oppositeContainerSize < size) {
                const newSize =
                    layoutSize - size - this.layoutService.layoutConfig().containerResizeOffset() - headerSize * 2;
                const property = this.position() === "left" || this.position() === "right" ? "width" : "height";
                oppositeContainerElement.style.setProperty(property, `${newSize}px`);
            }
        }
    }
}
