import { Directive, Input, TemplateRef, ViewContainerRef } from "@angular/core";
import { Panel } from "../data/Panel";

/**
 * Internal usage only. Do not export.
 */
@Directive({
    selector: "[monaPanelTemplateReference]"
})
export class PanelTemplateReferenceDirective {
    @Input() panel!: Panel;

    public constructor(
        public readonly templateRef: TemplateRef<void>,
        public readonly viewContainerRef: ViewContainerRef
    ) {}
}
