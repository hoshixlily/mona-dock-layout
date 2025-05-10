import { signal, TemplateRef } from "@angular/core";
import { v4 } from "uuid";
import { PanelContentTemplateContext } from "./PanelContentTemplateContext";
import { PanelTitleTemplateContext } from "./PanelTitleTemplateContext";
import { Position } from "./Position";
import { Priority } from "./Priority";

export interface PanelOptions {
    id: string;
    index: number;
    movable: boolean;
    position: Position;
    priority: Priority;
    startOpen?: boolean;
    title?: string;
    titleTemplate?: TemplateRef<PanelTitleTemplateContext> | null;
}

export class Panel {
    public readonly id: string = "";
    public readonly index = signal(0);
    public readonly movable = signal(true);
    public readonly position = signal<Position>("bottom");
    public readonly priority = signal<Priority>("primary");
    public readonly startOpen = signal(false);
    public readonly title = signal("");
    public readonly titleTemplate = signal<TemplateRef<PanelTitleTemplateContext> | null>(null);
    public readonly uid: string = v4();

    public wasOpenBeforeHidden: boolean = false;

    public constructor(options: Partial<PanelOptions>) {
        this.id = options.id ?? "";
        this.index.set(options.index ?? 0);
        this.movable.set(options.movable ?? true);
        this.title.set(options.title ?? "");
        this.position.set(options.position ?? "bottom");
        this.priority.set(options.priority ?? "primary");
        this.startOpen.set(options.startOpen ?? false);
        this.titleTemplate.set(options.titleTemplate ?? null);
    }
}
