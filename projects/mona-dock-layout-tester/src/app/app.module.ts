import {NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {
    ButtonDirective,
    GridColumnComponent,
    GridComponent,
    TabComponent,
    TabStripComponent,
    TextAreaDirective
} from "@mirei/mona-ui";
import {DockLayoutModule} from "mona-dock-layout";

import {AppComponent} from "./app.component";

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        DockLayoutModule,
        FontAwesomeModule,
        ButtonDirective,
        GridComponent,
        GridColumnComponent,
        TabStripComponent,
        TabComponent,
        TextAreaDirective
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
