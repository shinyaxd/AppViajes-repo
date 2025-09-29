import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule], // importa RouterModule para routerLink, routerLinkActive, etc.
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'] // corregido: styleUrls
})
export class HeaderComponent {}
