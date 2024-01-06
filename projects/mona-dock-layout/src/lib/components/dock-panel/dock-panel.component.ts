import {
    Component,
    ContentChild,
    ContentChildren,
    EventEmitter,
    Input,
    Output,
    QueryList,
    TemplateRef
} from "@angular/core";
import { ReplaySubject, takeUntil } from "rxjs";
import { PanelOptions } from "../../data/Panel";
import { PanelContentTemplateDirective } from "../../directives/panel-content-template.directive";
import { PanelActionTemplateDirective } from "../../directives/panel-action-template.directive";
import { PanelCloseEvent, PanelOpenEvent } from "../../data/PanelEvents";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { PanelTitleTemplateDirective } from "../../directives/panel-title-template.directive";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-dock-panel",
    template: "",
    styleUrls: []
})
export class DockPanelComponent {
    readonly #destroy$: ReplaySubject<void> = new ReplaySubject<void>(1);
    private panelOptions: Partial<PanelOptions> = {};
    private panelVisible: boolean = true;

    @ContentChild(PanelContentTemplateDirective, { read: TemplateRef })
    public content: TemplateRef<void> | null = null;

    @Input()
    public movable: boolean = true;

    @ContentChildren(PanelActionTemplateDirective, { read: TemplateRef })
    public panelActionTemplates: QueryList<TemplateRef<void>> = new QueryList<TemplateRef<void>>();

    @Output()
    public panelClose: EventEmitter<PanelCloseEvent> = new EventEmitter<PanelCloseEvent>();

    @Input()
    public panelId!: string;

    @Output()
    public panelOpen: EventEmitter<PanelOpenEvent> = new EventEmitter<PanelOpenEvent>();

    @Input()
    public position: Position = "left";

    @Input()
    public priority: Priority = "primary";

    @Input()
    public startOpen: boolean = false;

    @Input()
    public title: string = "";

    @ContentChild(PanelTitleTemplateDirective, { read: TemplateRef })
    public titleTemplate: TemplateRef<void> | null = null;

    @Input()
    public set visible(visible: boolean) {
        this.panelVisible = visible;
        this.layoutService.panelVisibility$.next({ panelId: this.panelId, visible });
    }

    public constructor(private readonly layoutService: LayoutService) {}

    public getPanelOptions(): PanelOptions {
        return this.panelOptions as PanelOptions;
    }

    public ngAfterContentInit(): void {
        this.panelOptions.actions = this.panelActionTemplates.toArray() ?? [];
        this.panelOptions.content = this.content ?? null;
        this.panelOptions.id = this.panelId;
        this.panelOptions.position = this.position;
        this.panelOptions.priority = this.priority;
        this.panelOptions.title = this.title;
        this.panelOptions.titleTemplate = this.titleTemplate ?? null;
        this.panelOptions.visible = this.panelVisible;
        this.panelOptions.startOpen = this.panelVisible ? this.startOpen : false;
        this.panelOptions.movable = this.movable ?? true;
    }

    public ngOnDestroy(): void {
        this.#destroy$.next();
        this.#destroy$.complete();
    }

    public ngOnInit(): void {
        if (!this.panelId) {
            throw new Error("Panel id is not defined!");
        }
        this.setSubscriptions();
    }

    private setSubscriptions(): void {
        this.layoutService.layoutReady$.pipe(takeUntil(this.#destroy$)).subscribe(() => {
            this.layoutService.panelClose$.subscribe(event => {
                if (event.panel.Id === this.panelId && (event.viaApi || event.viaUser)) {
                    this.panelClose.emit({
                        panelId: this.panelId,
                        viaApi: event.viaApi,
                        viaUser: event.viaUser
                    });
                }
            });
            this.layoutService.panelOpen$.subscribe(event => {
                if (event.panel.Id === this.panelId && (event.viaApi || event.viaUser)) {
                    this.panelOpen.emit({
                        panelId: this.panelId,
                        viaApi: event.viaApi,
                        viaUser: event.viaUser
                    });
                }
            });
        });
    }
}
