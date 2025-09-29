import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BuscadorComponent } from '../../buscador/buscador.component';

@Component({
  selector: 'app-tour',
  templateUrl: './tour.component.html',
  styleUrl: './tour.component.css',
  imports:[
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    BuscadorComponent
  ]
})
export class TourComponent {

}
