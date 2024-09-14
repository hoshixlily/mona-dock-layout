import { Directive, inject, ViewContainerRef } from "@angular/core";

/**
 * Internal usage only. Do not export.
 */
@Directive({
    selector: "[monaPanelContentAnchor]",
    standalone: true
})
export class PanelContentAnchorDirective {
    public readonly viewContainerRef = inject(ViewContainerRef);
}
