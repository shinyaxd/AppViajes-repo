import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TourService } from '../paginas/tour/services/tour.service';

@Component({
  selector: 'app-detalles-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalles-tour.component.html',
  styleUrls: ['./detalles-tour.component.css']
})
export class DetallesTourComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tourService = inject(TourService);

  tourId: number | null = null;
  tour: any = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('servicio_id');
    this.tourId = idParam ? Number(idParam) : null;
    if (this.tourId) {
      this.tourService.getTourDetalles(this.tourId).subscribe({
        next: (res: any) => { this.tour = res?.tour ?? res; },
        error: (err: any) => console.error(err)
      });
    }
  }
}
