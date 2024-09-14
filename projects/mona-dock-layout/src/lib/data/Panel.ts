import { v4 } from "uuid";
import { PanelActionTemplateContext } from "./PanelActionTemplateContext";
import { PanelContentTemplateContext } from "./PanelContentTemplateContext";
import { PanelTitleTemplateContext } from "./PanelTitleTemplateContext";
import { Position } from "./Position";
import { Priority } from "./Priority";
import { EmbeddedViewRef, signal, TemplateRef, ViewContainerRef } from "@angular/core";

export interface PanelOptions {
    actions?: ReadonlyArray<TemplateRef<PanelActionTemplateContext>>;
    content: TemplateRef<PanelContentTemplateContext> | null;
    id: string;
    index: number;
    movable: boolean;
    pinned: boolean;
    position: Position;
    priority: Priority;
    startOpen?: boolean;
    title?: string;
    titleTemplate?: TemplateRef<PanelTitleTemplateContext> | null;
    visible?: boolean;
}

export class Panel {
    public readonly actions = signal<ReadonlyArray<TemplateRef<PanelActionTemplateContext>>>([]);
    public readonly content = signal<TemplateRef<PanelContentTemplateContext> | null>(null);
    public readonly id: string = "";
    public readonly index = signal(0);
    public readonly open = signal(false);
    public readonly movable = signal(true);
    public readonly pinned = signal(true);
    public readonly position = signal<Position>("bottom");
    public readonly priority = signal<Priority>("primary");
    public readonly startOpen = signal(false);
    public readonly title = signal("");
    public readonly titleTemplate = signal<TemplateRef<PanelTitleTemplateContext> | null>(null);
    public readonly uid: string = v4();
    public readonly visible = signal(true);

    public vcr!: ViewContainerRef; // initialized via component
    public viewRef!: EmbeddedViewRef<void>;
    public wasOpenBeforeHidden: boolean = false;

    public constructor(options: Partial<PanelOptions>) {
        this.id = options.id ?? "";
        this.actions.set(options.actions ?? []);
        this.content.set(options.content ?? null);
        this.index.set(options.index ?? 0);
        this.movable.set(options.movable ?? true);
        this.title.set(options.title ?? "");
        this.pinned.set(options.pinned ?? true);
        this.position.set(options.position ?? "bottom");
        this.priority.set(options.priority ?? "primary");
        this.startOpen.set(options.startOpen ?? false);
        this.visible.set(options.visible ?? true);
        this.titleTemplate.set(options.titleTemplate ?? null);
    }
}
