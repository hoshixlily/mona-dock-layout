import {
    Component,
    computed,
    contentChild,
    contentChildren,
    DestroyRef,
    effect,
    inject,
    input,
    OnInit,
    output,
    TemplateRef,
    untracked
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, skipUntil, tap } from "rxjs";
import { PanelOptions } from "../../data/Panel";
import { PanelCloseEvent, PanelOpenEvent } from "../../data/PanelEvents";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { PanelActionTemplateDirective } from "../../directives/panel-action-template.directive";
import { PanelContentTemplateDirective } from "../../directives/panel-content-template.directive";
import { PanelTitleTemplateDirective } from "../../directives/panel-title-template.directive";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-dock-panel",
    template: "",
    styleUrls: [],
    standalone: true
})
export class DockPanelComponent implements OnInit {
    readonly #destroyRef = inject(DestroyRef);
    readonly #layoutService = inject(LayoutService);

    public readonly options = computed<Partial<PanelOptions>>(() => {
        return {
            actions: this.panelActionTemplates() ?? [],
            content: this.content() ?? null,
            id: this.panelId(),
            position: this.position(),
            priority: this.priority(),
            title: this.title(),
            titleTemplate: this.titleTemplate() ?? null,
            visible: this.visible(),
            startOpen: this.visible() ? this.startOpen() : false,
            movable: this.movable() ?? true
        };
    });
    public readonly content = contentChild(PanelContentTemplateDirective, { read: TemplateRef<void> });
    public readonly movable = input(true);
    public readonly panelActionTemplates = contentChildren(PanelActionTemplateDirective, { read: TemplateRef<void> });
    public readonly panelClose = output<PanelCloseEvent>();
    public readonly panelId = input.required<string>();
    public readonly panelOpen = output<PanelOpenEvent>();
    public readonly position = input<Position>("left");
    public readonly priority = input<Priority>("primary");
    public readonly startOpen = input<boolean>(false);
    public readonly title = input<string>("");
    public readonly titleTemplate = contentChild(PanelTitleTemplateDirective, { read: TemplateRef<void> });
    public readonly visible = input<boolean>(true);

    public constructor() {
        effect(() => {
            const visible = this.visible();
            const panelId = this.panelId();
            untracked(() => {
                this.#layoutService.panelVisibility$.next({ panelId, visible });
            });
        });
    }

    public ngOnInit(): void {
        if (!this.panelId) {
            throw new Error("Panel id is not defined!");
        }
        this.setSubscriptions();
    }

    private setSubscriptions(): void {
        this.#layoutService.panelClose$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                skipUntil(this.#layoutService.layoutReady$),
                filter(event => event.panel.id === this.panelId() && (!!event.viaApi || !!event.viaUser)),
                tap(event =>
                    this.panelClose.emit({ panelId: this.panelId(), viaApi: event.viaApi, viaUser: event.viaUser })
                )
            )
            .subscribe();
        this.#layoutService.panelOpen$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                skipUntil(this.#layoutService.layoutReady$),
                filter(event => event.panel.id === this.panelId() && (!!event.viaApi || !!event.viaUser)),
                tap(event =>
                    this.panelOpen.emit({ panelId: this.panelId(), viaApi: event.viaApi, viaUser: event.viaUser })
                )
            )
            .subscribe();
    }
}
