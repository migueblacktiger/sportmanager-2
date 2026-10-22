import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/api.service';
bootstrapApplication(AppComponent, { providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor]))] }).catch(err => console.error(err));
