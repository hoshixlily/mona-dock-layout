import { v4 } from "uuid";
import { Position } from "./Position";
import { Priority } from "./Priority";
import { EmbeddedViewRef, signal, TemplateRef, ViewContainerRef } from "@angular/core";

export interface PanelOptions {
    actions?: ReadonlyArray<TemplateRef<void>>;
    content: TemplateRef<void> | null;
    id: string;
    index: number;
    movable: boolean;
    pinned: boolean;
    position: Position;
    priority: Priority;
    startOpen?: boolean;
    title?: string;
    titleTemplate?: TemplateRef<any> | null;
    visible?: boolean;
}

export class Panel {
    public readonly id: string = "";
    public readonly uid: string = v4();
    public readonly open = signal(false);
    public readonly movable = signal(true);
    public readonly pinned = signal(true);

    public actions: ReadonlyArray<TemplateRef<any>> = [];
    public content: TemplateRef<any> | null = null;
    public index: number = 0;
    public position: Position = "bottom";
    public priority: Priority = "primary";
    public startOpen: boolean = false;
    public title: string = "";
    public titleTemplate: TemplateRef<void> | null = null;
    public vcr!: ViewContainerRef; // initialized via component
    public viewRef!: EmbeddedViewRef<void>;
    public visible: boolean = true;
    public wasOpenBeforeHidden: boolean = false;

    public constructor(options: Partial<PanelOptions>) {
        this.id = options.id ?? "";
        this.actions = options.actions ?? [];
        this.content = options.content ?? null;
        this.index = options.index ?? 0;
        this.movable.set(options.movable ?? true);
        this.title = options.title ?? "";
        this.pinned.set(options.pinned ?? true);
        this.position = options.position ?? "bottom";
        this.priority = options.priority ?? "primary";
        this.startOpen = options.startOpen ?? false;
        this.visible = options.visible ?? true;
        this.titleTemplate = options.titleTemplate ?? null;
    }

    public setOptions(options: Partial<PanelOptions>): void {
        Object.assign(this, options);
    }
}
