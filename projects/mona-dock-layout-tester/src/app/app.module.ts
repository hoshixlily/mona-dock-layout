import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { AppComponent } from "./app.component";
import { DockLayoutModule } from "mona-dock-layout";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { ButtonModule, GridModule, TabStripModule, TextAreaModule } from "@mirei/mona-ui";

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        DockLayoutModule,
        FontAwesomeModule,
        ButtonModule,
        GridModule,
        TabStripModule,
        TextAreaModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {}
