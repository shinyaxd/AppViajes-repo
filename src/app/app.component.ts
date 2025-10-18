import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SpinnerComponent } from './shared/components/ui/spinner/spinner.component';
import { Router, Event, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private router: Router) {
    this.router.events.subscribe((e: Event) => {
      if (e instanceof NavigationStart)  console.log('[ROUTER] NavigationStart', e.url);
      if (e instanceof NavigationEnd)    console.log('[ROUTER] NavigationEnd', e.urlAfterRedirects);
      if (e instanceof NavigationCancel) console.warn('[ROUTER] NavigationCancel', e.url);
      if (e instanceof NavigationError)  console.error('[ROUTER] NavigationError', e.error);
    });
  }
}
