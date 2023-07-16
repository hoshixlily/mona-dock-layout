import { ChangeDetectorRef, Component, ElementRef, Input, NgZone, Renderer2, ViewRef } from "@angular/core";
import { asyncScheduler, ReplaySubject, takeUntil, tap } from "rxjs";
import { Position } from "../../data/Position";
import { LayoutService } from "../../services/layout.service";
import { Panel } from "../../data/Panel";

@Component({
    selector: "mona-container",
    templateUrl: "./container.component.html",
    styleUrls: ["./container.component.scss"]
})
export class ContainerComponent {
    readonly #destroy$: ReplaySubject<void> = new ReplaySubject<void>(1);
    private mouseMoveListener: (() => void) | null = null;
    private mouseUpListener: (() => void) | null = null;
    private movedPanelViewRef: ViewRef | null = null;
    public anyPrimaryPanelOpen: boolean = false;
    public anySecondaryPanelOpen: boolean = false;
    public open: boolean = false;
    public panelGroupResizerVisible: boolean = false;
    public resizing: boolean = false;
    public resizingPanel: boolean = false;

    @Input()
    public position: Position = "left";

    public constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly hostElementRef: ElementRef<HTMLElement>,
        public readonly layoutService: LayoutService,
        private readonly renderer: Renderer2,
        private readonly zone: NgZone
    ) {}

    public closePanel(panel: Panel): void {
        panel.open = false;
        const containerPanels = this.layoutService.panels.filter(panel => panel.position === this.position);
        const openPanels = containerPanels.filter(panel => panel.open);
        if (openPanels.length === 0) {
            this.open = false;
            this.layoutService.containerSizeDataMap[this.position].styles.mutate(value => {
                Object.assign(value, {
                    display: "none",
                    zIndex: "-10"
                });
            });
        } else {
            this.updatePanelSizes();
        }
    }

    public endPanelResize(): void {
        this.layoutService.PanelResizeInProgress$.next(false);
        this.resizingPanel = false;
    }

    public endResize(): void {
        this.layoutService.ContainerResizeInProgress$.next(false);
        this.resizing = false;
    }

    public ngOnDestroy(): void {
        this.mouseMoveListener?.();
        this.mouseUpListener?.();
    }

    public ngOnInit(): void {
        this.setEvents();
        this.setSubscriptions();
        this.updatePanelSizes();
    }

    public startPanelResize(): void {
        this.layoutService.PanelResizeInProgress$.next(true);
        this.resizingPanel = true;
    }

    public startResize(): void {
        this.layoutService.ContainerResizeStart$.next(this.position);
        this.layoutService.ContainerResizeInProgress$.next(true);
        this.resizing = true;
    }

    private getOppositeContainerElement(): HTMLElement {
        return this.getOppositeContainerWrapperElement().querySelector("div.mona-layout-container") as HTMLElement;
    }

    private getOppositeContainerWrapperElement(): HTMLElement {
        const oppositePosition =
            this.position === "left"
                ? "right"
                : this.position === "right"
                ? "left"
                : this.position === "top"
                ? "bottom"
                : "top";
        const oppositeOrientation = this.position === "left" || this.position === "right" ? "vertical" : "horizontal";
        const oppositeContainer = document.querySelector(
            `div.layout-container-wrapper.${oppositeOrientation}.${oppositePosition}`
        );
        return oppositeContainer as HTMLElement;
    }

    private openPanel(panel: Panel): void {
        const openPanel = this.layoutService.panels.find(
            p => p.position === panel.position && p.priority === panel.priority && p.open
        );
        if (openPanel) {
            this.closePanel(openPanel);
        }
        this.open = true;
        this.layoutService.containerSizeDataMap[this.position].styles.mutate(value => {
            Object.assign(value, {
                display: "block",
                zIndex: "0"
            });
        });
        panel.open = true;
        this.updatePanelSizes();
        const oppositeContainerElement = this.getOppositeContainerElement();
        if (oppositeContainerElement.style.display !== "none") {
            window.setTimeout(() => {
                this.updateOppositeContainerSize();
            });
        }
    }

    private resize(event: MouseEvent): void {
        if (this.resizing) {
            const oppositeContainerElement = this.getOppositeContainerWrapperElement();
            const oppositeContainerSize =
                oppositeContainerElement.style.display === "none"
                    ? 0
                    : this.position === "left" || this.position === "right"
                    ? oppositeContainerElement.clientWidth
                    : oppositeContainerElement.clientHeight;
            if (this.position === "left") {
                const offset =
                    this.layoutService.layoutConfig.containerResizeOffset +
                    this.layoutService.getHeaderSize(this.position) +
                    this.layoutService.getHeaderSize("right");
                const width = event.clientX - this.hostElementRef.nativeElement.getBoundingClientRect().left + 4; //this.layoutService.layoutConfig.headerWidth;
                if (
                    this.layoutService.layoutDomRect.width - (width + oppositeContainerSize) > offset &&
                    width > this.layoutService.layoutConfig.minContainerWidth
                ) {
                    this.layoutService.containerSizeDataMap[this.position].styles.set({
                        width: `${width}px`
                    });
                }
            } else if (this.position === "right") {
                const offset =
                    this.layoutService.layoutConfig.containerResizeOffset +
                    this.layoutService.getHeaderSize(this.position) +
                    this.layoutService.getHeaderSize("left");
                const width =
                    this.layoutService.layoutDomRect.width -
                    event.clientX +
                    this.layoutService.layoutDomRect.left -
                    this.layoutService.getHeaderSize(this.position);
                if (
                    this.layoutService.layoutDomRect.width - (width + oppositeContainerSize) > offset &&
                    width > this.layoutService.layoutConfig.minContainerWidth
                ) {
                    this.layoutService.containerSizeDataMap[this.position].styles.set({
                        width: `${width}px`
                    });
                }
            } else if (this.position === "top") {
                const offset =
                    this.layoutService.layoutConfig.containerResizeOffset +
                    this.layoutService.getHeaderSize(this.position) +
                    this.layoutService.getHeaderSize("bottom");
                const height = event.clientY - this.hostElementRef.nativeElement.getBoundingClientRect().top + 4; //this.layoutService.layoutConfig.headerHeight;
                if (
                    this.layoutService.layoutDomRect.height - (height + oppositeContainerSize) > offset &&
                    height > this.layoutService.layoutConfig.minContainerHeight
                ) {
                    this.layoutService.containerSizeDataMap[this.position].styles.set({
                        height: `${height}px`
                    });
                }
            } else if (this.position === "bottom") {
                const offset =
                    this.layoutService.layoutConfig.containerResizeOffset +
                    this.layoutService.getHeaderSize(this.position) +
                    this.layoutService.getHeaderSize("top");
                const height =
                    this.layoutService.layoutDomRect.height -
                    event.clientY +
                    this.layoutService.layoutDomRect.top -
                    this.layoutService.getHeaderSize(this.position);
                if (
                    this.layoutService.layoutDomRect.height - (height + oppositeContainerSize) > offset &&
                    height > this.layoutService.layoutConfig.minContainerHeight
                ) {
                    this.layoutService.containerSizeDataMap[this.position].styles.set({
                        height: `${height}px`
                    });
                }
            }
            this.layoutService.saveLayout();
        }
    }

    private resizePanel(event: MouseEvent): void {
        if (this.resizingPanel) {
            const max = this.layoutService.layoutConfig.maxPanelSize;
            const min = this.layoutService.layoutConfig.minPanelSize;
            const offset = this.layoutService.layoutConfig.panelResizeOffset;
            const rectangle = this.hostElementRef.nativeElement.getBoundingClientRect();
            if (this.position === "left" || this.position === "right") {
                let top = ((event.clientY - rectangle.top - 2) * 100.0) / rectangle.height;
                top = top > max ? max : top < min ? min : top;
                if (event.clientY < rectangle.bottom - offset && event.clientY > rectangle.top + offset) {
                    this.layoutService.containerSizeDataMap[this.position].lastPanelGroupResizerPosition.set(
                        `calc(${top}% - 4px)`
                    );
                    this.updatePanelSizes();
                }
            } else {
                let left = ((event.clientX - rectangle.left + 2) * 100.0) / rectangle.width;
                left = left > max ? max : left < min ? min : left;
                if (event.clientX < rectangle.right - offset && event.clientX > rectangle.left + offset) {
                    this.layoutService.containerSizeDataMap[this.position].lastPanelGroupResizerPosition.set(
                        `calc(${left}% - 4px)`
                    );
                    this.updatePanelSizes();
                }
            }
            this.layoutService.saveLayout();
        }
    }

    private setEvents(): void {
        this.zone.runOutsideAngular(() => {
            this.mouseUpListener = this.renderer.listen("document", "mouseup", () => {
                if (this.resizing) {
                    this.zone.run(() => {
                        this.endResize();
                    });
                }
                if (this.resizingPanel) {
                    this.zone.run(() => {
                        this.endPanelResize();
                    });
                }
            });
            this.mouseMoveListener = this.renderer.listen("document", "mousemove", (event: MouseEvent) => {
                if (this.resizing) {
                    this.zone.run(() => {
                        this.resize(event);
                    });
                }
                if (this.resizingPanel) {
                    this.zone.run(() => {
                        this.resizePanel(event);
                    });
                }
            });
        });
    }

    private setSubscriptions(): void {
        this.layoutService.PanelOpen$.pipe(takeUntil(this.#destroy$)).subscribe(event => {
            if (event.panel.position === this.position) {
                this.openPanel(event.panel);
                this.layoutService.saveLayout();
            }
        });
        this.layoutService.PanelClose$.pipe(takeUntil(this.#destroy$)).subscribe(event => {
            if (event.panel.position === this.position) {
                this.closePanel(event.panel);
                this.layoutService.saveLayout();
            }
        });
        this.layoutService.PanelMove$.pipe(
            takeUntil(this.#destroy$),
            tap(event => {
                if (event.oldPosition === this.position) {
                    this.movedPanelViewRef = event.panel.viewRef;
                    const viewRefIndex = event.panel.vcr.indexOf(event.panel.viewRef);
                    if (viewRefIndex > -1) {
                        event.panel.vcr.detach(event.panel.vcr.indexOf(event.panel.viewRef));
                        this.layoutService.panelTemplateContentsContainerRef.insert(event.panel.viewRef, 0);
                    }
                }
            })
        ).subscribe(event => {
            const panels = this.layoutService.panels.filter(
                panel => panel.position === event.newPosition && panel.priority === event.newPriority
            );
            if (event.newPosition === this.position) {
                this.layoutService.PanelClose$.next({
                    panel: event.panel,
                    viaMove: true
                });
                window.setTimeout(() => {
                    event.panel.position = event.newPosition;
                    event.panel.priority = event.newPriority;
                    event.panel.index = panels.length;
                    const updatedPanels = this.layoutService.panels.filter(
                        panel => panel.position === event.newPosition && panel.priority === event.newPriority
                    );
                    updatedPanels.sort((p1, p2) => p1.index - p2.index).forEach((p, px) => (p.index = px));
                    if (event.wasOpenBefore) {
                        const containerPanels = this.layoutService.panels.filter(
                            panel => panel.position === this.position
                        );
                        const priorityPanels = containerPanels.filter(panel => panel.priority === event.newPriority);
                        const openPanels = priorityPanels.filter(panel => panel.open);
                        if (openPanels.length === 0) {
                            this.openPanel(event.panel);
                        }
                        this.layoutService.saveLayout();
                    }
                    this.layoutService.updateHeaderSizes();
                    asyncScheduler.schedule(() => {
                        const viewRefIndex = this.layoutService.panelTemplateContentsContainerRef.indexOf(
                            event.panel.viewRef
                        );
                        if (viewRefIndex > -1) {
                            this.layoutService.panelTemplateContentsContainerRef.detach(viewRefIndex);
                            event.panel.vcr.insert(event.panel.viewRef, 0);
                        }
                    }, 120); // slight delay is needed, otherwise the panel content is not rendered correctly. TODO: find a better solution
                });
            }
        });
    }

    private updateOppositeContainerSize(): void {
        const size =
            this.position === "left" || this.position === "right"
                ? this.hostElementRef.nativeElement.getBoundingClientRect().width
                : this.hostElementRef.nativeElement.getBoundingClientRect().height;
        const oppositeContainerElement = this.getOppositeContainerElement();
        if (oppositeContainerElement) {
            const oppositeContainerSize =
                this.position === "left" || this.position === "right"
                    ? oppositeContainerElement.clientWidth
                    : oppositeContainerElement.clientHeight;
            const layoutSize =
                this.position === "left" || this.position === "right"
                    ? this.layoutService.layoutDomRect.width
                    : this.layoutService.layoutDomRect.height;
            const headerSize = this.layoutService.getHeaderSize(this.position);
            if (layoutSize - oppositeContainerSize < size) {
                const newSize =
                    layoutSize - size - this.layoutService.layoutConfig.containerResizeOffset - headerSize * 2;
                const property = this.position === "left" || this.position === "right" ? "width" : "height";
                oppositeContainerElement.style.setProperty(property, `${newSize}px`);
            }
        }
    }

    private updatePanelSizes(): void {
        const containerPanels = this.layoutService.panels.filter(panel => panel.position === this.position);
        const openPanels = containerPanels.filter(panel => panel.open);
        if (this.position === "left" || this.position === "right") {
            if (openPanels.length === 1) {
                if (openPanels[0].priority === "primary") {
                    this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles.set({
                        ...this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles,
                        top: "100%"
                    });
                    this.layoutService.containerSizeDataMap[this.position].panelSizeData.primary.bottom = "0%";
                } else if (openPanels[0].priority === "secondary") {
                    this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles.set({
                        ...this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles,
                        top: "0%"
                    });
                    this.layoutService.containerSizeDataMap[this.position].panelSizeData.secondary.top = "0%";
                }
            } else if (openPanels.length === 2) {
                this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles.set({
                    ...this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles,
                    top: this.layoutService.containerSizeDataMap[this.position].lastPanelGroupResizerPosition()
                });
                this.layoutService.containerSizeDataMap[
                    this.position
                ].panelSizeData.primary.bottom = `calc(100% - ${this.layoutService.containerSizeDataMap[
                    this.position
                ].lastPanelGroupResizerPosition()}`;
                this.layoutService.containerSizeDataMap[this.position].panelSizeData.secondary.top =
                    this.layoutService.containerSizeDataMap[this.position].lastPanelGroupResizerPosition();
            }
        } else {
            if (openPanels.length === 1) {
                if (openPanels[0].priority === "primary") {
                    this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles.set({
                        ...this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles,
                        left: "100%"
                    });
                    this.layoutService.containerSizeDataMap[this.position].panelSizeData.primary.right = "0%";
                } else if (openPanels[0].priority === "secondary") {
                    this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles.set({
                        ...this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles,
                        left: "0%"
                    });
                    this.layoutService.containerSizeDataMap[this.position].panelSizeData.secondary.left = "0%";
                }
            } else if (openPanels.length === 2) {
                this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles.set({
                    ...this.layoutService.containerSizeDataMap[this.position].panelGroupResizerStyles,
                    left: this.layoutService.containerSizeDataMap[this.position].lastPanelGroupResizerPosition()
                });
                this.layoutService.containerSizeDataMap[
                    this.position
                ].panelSizeData.primary.right = `calc(100% - ${this.layoutService.containerSizeDataMap[
                    this.position
                ].lastPanelGroupResizerPosition()}`;
                this.layoutService.containerSizeDataMap[this.position].panelSizeData.secondary.left =
                    this.layoutService.containerSizeDataMap[this.position].lastPanelGroupResizerPosition();
            }
        }
        this.anyPrimaryPanelOpen =
            containerPanels.filter(panel => panel.priority === "primary" && panel.open).length > 0;
        this.anySecondaryPanelOpen =
            containerPanels.filter(panel => panel.priority === "secondary" && panel.open).length > 0;
        this.panelGroupResizerVisible = openPanels.length > 1;
    }
}
