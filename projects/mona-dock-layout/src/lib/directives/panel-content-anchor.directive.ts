import { Directive, ElementRef, inject, input, viewChildren, ViewContainerRef } from "@angular/core";

/**
 * Internal usage only. Do not export.
 */
@Directive({
    selector: "[monaPanelContentAnchor]"
})
export class PanelContentAnchorDirective {
    public readonly viewContainerRef = inject(ViewContainerRef);
}
