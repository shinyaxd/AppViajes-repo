import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TourService, TourData } from '../paginas/tour/services/tour.service';

@Component({
  selector: 'app-resultados-tours',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resultados-tours.component.html',
  styleUrl: './resultados-tours.component.css'
})
export class ResultadosTOURSComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tourService = inject(TourService);

  tours: TourData[] = [];

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const params: Record<string,string> = {};
    qp.keys.forEach(k => params[k] = qp.get(k) ?? '');
  this.tourService.getTours(params).subscribe({ next: (data: TourData[]) => this.tours = data, error: (err: any) => console.error(err) });
  }

  verDetalle(t: TourData) {
    this.router.navigate(['/detallesTour', t.id]);
  }
}
