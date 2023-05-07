import { v4 } from "uuid";
import { Position } from "./Position";
import { Priority } from "./Priority";
import { EmbeddedViewRef, TemplateRef, ViewContainerRef } from "@angular/core";

export interface PanelOptions {
    actions?: Array<TemplateRef<void>>;
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
    public readonly Id: string = "";
    public readonly Uid: string = v4();
    public actions: Array<TemplateRef<any>> = [];
    public content: TemplateRef<any> | null = null;
    public index: number = 0;
    public movable: boolean = true;
    public open: boolean = false;
    public pinned: boolean = true;
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
        this.Id = options.id ?? "";
        this.actions = options.actions ?? [];
        this.content = options.content ?? null;
        this.index = options.index ?? 0;
        this.movable = options.movable ?? true;
        this.title = options.title ?? "";
        this.pinned = options.pinned ?? true;
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
