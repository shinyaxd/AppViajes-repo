import { Component, OnInit, inject } from '@angular/core'; // 🚨 AGREGAR OnInit e inject
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { SpinnerComponent } from './shared/components/ui/spinner/spinner.component';
import { Router, Event, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { AuthService } from './core/services/auth.service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  // 🚨 IMPLEMENTAR OnInit
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit { // 🚨 IMPLEMENTAR OnInit
  
  // 🚨 Inyectar el AuthService usando inject()
  private authService = inject(AuthService);

  constructor(private router: Router) {
    this.router.events.subscribe((e: Event) => {
      if (e instanceof NavigationStart)  console.log('[ROUTER] NavigationStart', e.url);
      if (e instanceof NavigationEnd)    console.log('[ROUTER] NavigationEnd', e.urlAfterRedirects);
      if (e instanceof NavigationCancel) console.warn('[ROUTER] NavigationCancel', e.url);
      if (e instanceof NavigationError)  console.error('[ROUTER] NavigationError', e.error);
    });
  }

  // 🚨 MÉTODO CRÍTICO: Llamamos a la inicialización aquí
  ngOnInit(): void {
    // La inyección de dependencias ya está completa.
    // Es seguro llamar a un método que utiliza HttpClient.
    this.authService.initializeAuth();
    console.log('✅ Inicializando autenticación (getMe) fuera del constructor.');
  }
}