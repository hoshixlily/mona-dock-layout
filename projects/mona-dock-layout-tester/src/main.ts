import { importProvidersFrom } from "@angular/core";

import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
    providers: [importProvidersFrom(FontAwesomeModule), provideAnimations()]
}).catch(err => console.error(err));
