import { Directive, inject, input, Input, TemplateRef, ViewContainerRef } from "@angular/core";
import { Panel } from "../data/Panel";

/**
 * Internal usage only. Do not export.
 */
@Directive({
    selector: "[monaPanelTemplateReference]"
})
export class PanelTemplateReferenceDirective {
    public readonly panel = input.required<Panel>();
    public readonly templateRef = inject(TemplateRef<void>);
}
