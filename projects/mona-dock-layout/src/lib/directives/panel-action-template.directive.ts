import { Directive, TemplateRef } from "@angular/core";

@Directive({
    selector: "ng-template[monaPanelActionTemplate]"
})
export class PanelActionTemplateDirective {
    public constructor(public readonly templateRef: TemplateRef<void>) {}
}
