import { Directive, ViewContainerRef } from "@angular/core";

/**
 * Internal usage only. Do not export.
 */
@Directive({
    selector: "[monaPanelContentAnchor]"
})
export class PanelContentAnchorDirective {
    public constructor(public readonly viewContainerRef: ViewContainerRef) {}
}
