import {
    ChangeDetectionStrategy,
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
import { v4 } from "uuid";
import { Panel } from "../../data/Panel";
import { PanelActionTemplateContext } from "../../data/PanelActionTemplateContext";
import { PanelCloseEvent, PanelOpenEvent } from "../../data/PanelEvents";
import { PanelTitleTemplateContext } from "../../data/PanelTitleTemplateContext";
import { Position } from "../../data/Position";
import { Priority } from "../../data/Priority";
import { PanelActionTemplateDirective } from "../../directives/panel-action-template.directive";
import { PanelContentTemplateDirective } from "../../directives/panel-content-template.directive";
import { PanelTitleTemplateDirective } from "../../directives/panel-title-template.directive";
import { LayoutService } from "../../services/layout.service";

@Component({
    selector: "mona-dock-panel",
    template: "",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockPanelComponent implements OnInit {
    readonly #destroyRef = inject(DestroyRef);
    readonly #layoutService = inject(LayoutService);
    public readonly options = computed<Panel>(() => ({
        id: this.panelId(),
        index: 0,
        position: this.position(),
        priority: this.priority(),
        title: this.title(),
        startOpen: this.visible() ? this.startOpen() : false,
        wasOpenBeforeHidden: false,
        uid: v4()
    }));
    public readonly content = contentChild(PanelContentTemplateDirective, {
        read: TemplateRef<PanelActionTemplateContext>
    });
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
        effect(() => {
            const panelId = this.panelId();
            const templates = this.panelActionTemplates();
            untracked(() => {
                this.#layoutService.setPanelActionTemplates(panelId, templates);
            });
        });
        effect(() => {
            const panelId = this.panelId();
            const content = this.content() as TemplateRef<PanelActionTemplateContext>;
            untracked(() => {
                this.#layoutService.setPanelContentTemplate(panelId, content);
            });
        });
        effect(() => {
            const panelId = this.panelId();
            const titleTemplate = this.titleTemplate() as TemplateRef<PanelTitleTemplateContext>;
            untracked(() => {
                this.#layoutService.setPanelTitleTemplate(panelId, titleTemplate);
            });
        });
        effect(() => {
            const panelId = this.panelId();
            const movable = this.movable();
            untracked(() => {
                this.#layoutService.setPanelMovable(panelId, movable);
            });
        });
    }

    public ngOnInit(): void {
        if (!this.panelId()) {
            throw new Error("Panel id is not defined!");
        }
        this.setSubscriptions();
    }

    private setSubscriptions(): void {
        this.#layoutService.panelCloseStart$
            .pipe(
                takeUntilDestroyed(this.#destroyRef),
                skipUntil(this.#layoutService.layoutReady$),
                filter(event => event.panel.id === this.panelId() && (!!event.viaApi || !!event.viaUser)),
                tap(event =>
                    this.panelClose.emit({ panelId: this.panelId(), viaApi: event.viaApi, viaUser: event.viaUser })
                )
            )
            .subscribe();
        this.#layoutService.panelOpenStart$
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
