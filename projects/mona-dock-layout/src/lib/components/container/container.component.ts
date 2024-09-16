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
import { asyncScheduler, debounceTime, EMPTY, fromEvent, map, skipUntil, switchMap, takeUntil, tap } from "rxjs";
import { ResizerStyles } from "../../data/ContainerSizeData";
import { Panel } from "../../data/Panel";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { LayoutService } from "../../services/layout.service";
import { NgStyle } from "@angular/common";
import { PanelGroupComponent } from "../panel-group/panel-group.component";

@Component({
    selector: "mona-container",
    templateUrl: "./container.component.html",
    styleUrls: ["./container.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
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
        const panels = this.layoutService.panels().where(panel => panel.position() === this.position());
        return panels.where(panel => panel.priority() === "primary" && panel.open()).any();
    });
    protected readonly anySecondaryPanelOpen = computed(() => {
        const panels = this.layoutService.panels().where(panel => panel.position() === this.position());
        return panels.where(panel => panel.priority() === "secondary" && panel.open()).any();
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
        const panels = this.layoutService.panels().where(panel => panel.position() === this.position());
        return panels.any(panel => panel.open());
    });
    protected readonly panelGroupResizerStyles = computed<ResizerStyles>(() => {
        const visible = this.panelGroupResizerVisible();
        return {
            ...this.layoutService.panelGroupResizerStyles().get(this.position()),
            display: visible ? "block" : "none",
            zIndex: visible ? "1" : "-1",
            pointerEvents: visible ? "auto" : "none"
        };
    });
    protected readonly panelGroupResizerVisible = computed(() => {
        const openPanels = this.layoutService
            .panels()
            .where(panel => panel.position() === this.position())
            .where(panel => panel.open());
        return openPanels.count() > 1;
    });
    protected readonly primaryPanelStyles = computed(() => {
        const position = this.position();
        return this.layoutService.panelSizeStyles().get(position)?.primary ?? {};
    });
    protected readonly resizing = toSignal(
        this.layoutService.containerResizeInProgress$.pipe(map(event => event.resizing))
    );
    protected readonly resizingPanel = toSignal(
        this.layoutService.panelResizeInProgress$.pipe(map(event => event.resizing))
    );
    protected readonly secondaryPanelStyles = computed(() => {
        const position = this.position();
        return this.layoutService.panelSizeStyles().get(position)?.secondary ?? {};
    });
    public readonly position = input.required<Position>();

    public closePanel(panel: Panel): void {
        panel.open.set(false);
        const containerPanels = this.layoutService.panels().where(panel => panel.position() === this.position());
        const openPanels = containerPanels.where(panel => panel.open());
        if (openPanels.any()) {
            this.updatePanelSizes();
        }
    }

    public ngAfterViewInit(): void {
        this.setEvents();
    }

    public ngOnInit(): void {
        this.setSubscriptions();
        this.updatePanelSizes();
    }

    private getOppositeContainerElement(): HTMLElement {
        return this.getOppositeContainerWrapperElement().querySelector("div.mona-layout-container") as HTMLElement;
    }

    private getOppositeContainerWrapperElement(): HTMLElement {
        const oppositePosition =
            this.position() === "left"
                ? "right"
                : this.position() === "right"
                  ? "left"
                  : this.position() === "top"
                    ? "bottom"
                    : "top";
        const oppositeOrientation =
            this.position() === "left" || this.position() === "right" ? "vertical" : "horizontal";
        const oppositeContainer = document.querySelector(
            `div.layout-container-wrapper.${oppositeOrientation}.${oppositePosition}`
        );
        return oppositeContainer as HTMLElement;
    }

    private openPanel(panel: Panel): void {
        const openPanel = this.layoutService
            .panels()
            .firstOrDefault(p => p.position() === panel.position() && p.priority() === panel.priority() && p.open());
        if (openPanel) {
            this.closePanel(openPanel);
        }
        panel.open.set(true);
        this.updatePanelSizes();
        const oppositeContainerElement = this.getOppositeContainerElement();
        if (oppositeContainerElement.style.display !== "none") {
            window.setTimeout(() => {
                this.updateOppositeContainerSize();
            });
        }
        const openPanels = this.layoutService
            .panels()
            .where(panel => panel.position() === this.position())
            .where(panel => panel.open())
            .toArray();
        if (openPanels.length === 2 && !this.panelGroupResizerVisible()) {
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
            } else if (this.position() === "right") {
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
            } else if (this.position() === "top") {
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
            } else if (this.position() === "bottom") {
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
            this.layoutService.saveLayout();
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
                    this.updatePanelSizes();
                }
            } else {
                let left = ((event.clientX - rectangle.left + 2) * 100.0) / rectangle.width;
                left = left > max ? max : left < min ? min : left;
                if (event.clientX < rectangle.right - offset && event.clientX > rectangle.left + offset) {
                    this.layoutService.panelGroupResizerPositions.update(dict => {
                        return dict.put(this.position(), `calc(${left}% - 4px)`);
                    });
                    this.updatePanelSizes();
                }
            }
            this.layoutService.saveLayout();
        }
    }

    private setContainerResizeEvent(): void {
        this.#zone.runOutsideAngular(() => {
            fromEvent<PointerEvent>(document, "pointermove")
                .pipe(
                    skipUntil(
                        fromEvent<PointerEvent>(this.containerResizer().nativeElement, "pointerdown").pipe(
                            tap(event => {
                                event.preventDefault();
                                this.containerResizer().nativeElement.setPointerCapture(event.pointerId);
                                this.layoutService.containerResizeInProgress$.next({
                                    resizing: true,
                                    position: this.position()
                                });
                            })
                        )
                    ),
                    takeUntil(
                        fromEvent<PointerEvent>(this.containerResizer().nativeElement, "pointerup").pipe(
                            tap(event => {
                                this.containerResizer().nativeElement.releasePointerCapture(event.pointerId);
                                this.layoutService.containerResizeInProgress$.next({ resizing: false });
                                this.setContainerResizeEvent();
                            })
                        )
                    ),
                    debounceTime(0, asyncScheduler),
                    switchMap(event => {
                        if (this.resizing()) {
                            this.resize(event);
                        }
                        return EMPTY;
                    })
                )
                .subscribe();
        });
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

    private setPanelGroupResizerEvent(): void {
        this.#zone.runOutsideAngular(() => {
            const resizerElement = this.panelGroupResizer()?.nativeElement as HTMLElement;
            fromEvent<PointerEvent>(document, "pointermove")
                .pipe(
                    skipUntil(
                        fromEvent<PointerEvent>(resizerElement, "pointerdown").pipe(
                            tap(event => {
                                event.preventDefault();
                                resizerElement.setPointerCapture(event.pointerId);
                                this.layoutService.panelResizeInProgress$.next({
                                    resizing: true,
                                    position: this.position()
                                });
                            })
                        )
                    ),
                    takeUntil(
                        fromEvent<PointerEvent>(resizerElement, "pointerup").pipe(
                            tap(event => {
                                resizerElement.releasePointerCapture(event.pointerId);
                                this.layoutService.panelResizeInProgress$.next({ resizing: false });
                                this.setPanelGroupResizerEvent();
                            })
                        )
                    ),
                    switchMap(event => {
                        if (this.resizingPanel()) {
                            this.resizePanel(event);
                        }
                        return EMPTY;
                    })
                )
                .subscribe();
        });
    }

    private setSubscriptions(): void {
        this.layoutService.panelOpenStart$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
            if (event.panel.position() === this.position()) {
                this.openPanel(event.panel);
                this.layoutService.saveLayout();
            }
        });
        this.layoutService.panelCloseStart$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
            if (event.panel.position() === this.position()) {
                this.closePanel(event.panel);
                this.layoutService.saveLayout();
            }
        });
        this.layoutService.panelMove$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
            const panels = this.layoutService
                .panels()
                .where(panel => panel.position() === event.newPosition && panel.priority() === event.newPriority);
            if (event.newPosition === this.position()) {
                this.layoutService.panelCloseStart$.next({
                    panel: event.panel,
                    viaMove: true
                });
                window.setTimeout(() => {
                    event.panel.position.set(event.newPosition);
                    event.panel.priority.set(event.newPriority);
                    event.panel.index.set(panels.count());
                    this.layoutService
                        .panels()
                        .where(
                            panel => panel.position() === event.newPosition && panel.priority() === event.newPriority
                        )
                        .orderBy(p => p.index())
                        .forEach((p, px) => p.index.set(px));
                    this.layoutService.panels.update(list => list.toImmutableList());
                    if (event.wasOpenBefore) {
                        const containerPanels = this.layoutService
                            .panels()
                            .where(panel => panel.position() === this.position());
                        const priorityPanels = containerPanels.where(panel => panel.priority() === event.newPriority);
                        const openPanels = priorityPanels.where(panel => panel.open());
                        if (!openPanels.any()) {
                            this.openPanel(event.panel);
                        }
                    }
                    this.layoutService.saveLayout();
                    this.layoutService.updateHeaderSizes();
                });
            }
        });
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

    private updatePanelSizeStyles(openPanels: Panel[], isHorizontal: boolean): void {
        if (openPanels.length === 1) {
            if (openPanels[0].priority() === "primary") {
                this.layoutService.panelGroupResizerStyles.update(dict => {
                    return dict.put(this.position(), { top: "100%" });
                });
                this.updatePanelStyles("primary", isHorizontal ? { bottom: "0%" } : { right: "0%" });
            } else if (openPanels[0].priority() === "secondary") {
                this.layoutService.panelGroupResizerStyles.update(dict => {
                    return dict.put(this.position(), { top: "0%" });
                });
                this.updatePanelStyles("secondary", isHorizontal ? { top: "0%" } : { left: "0%" });
            }
        } else if (openPanels.length === 2) {
            const resizerPosition = this.layoutService.panelGroupResizerPositions().get(this.position());
            const primaryPanelStyle = `calc(100% - 4px - ${resizerPosition})`;
            const secondaryPanelStyle = `calc(4px + ${resizerPosition})`;
            this.layoutService.panelGroupResizerStyles.update(dict => {
                return dict.put(this.position(), {
                    [isHorizontal ? "top" : "left"]: resizerPosition ?? undefined
                });
            });
            this.updatePanelStyles("primary", {
                [isHorizontal ? "bottom" : "right"]: primaryPanelStyle
            });
            this.updatePanelStyles("secondary", {
                [isHorizontal ? "top" : "left"]: secondaryPanelStyle
            });
        }
    }

    private updatePanelSizes(): void {
        const containerPanels = this.layoutService.panels().where(panel => panel.position() === this.position());
        const openPanels = containerPanels.where(panel => panel.open()).toArray();
        const isHorizontal = this.position() === "left" || this.position() === "right";
        this.updatePanelSizeStyles(openPanels, isHorizontal);
    }

    private updatePanelStyles(priority: Priority, styles: Partial<CSSStyleDeclaration>): void {
        this.layoutService.panelSizeStyles.update(dict => {
            const style = dict.get(this.position()) ?? { primary: {}, secondary: {} };
            return dict.set(this.position(), {
                ...style,
                [priority]: {
                    ...style[priority],
                    ...styles
                }
            });
        });
    }
}
