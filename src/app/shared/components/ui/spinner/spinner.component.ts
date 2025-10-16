// ==========================================================
// COMPONENTE SPINNER REUTILIZABLE
// ==========================================================
// Spinner global para mostrar estados de carga en toda la aplicación.
// Se controla mediante el LoadingService.

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="spinner-overlay">
        <div class="spinner-container">
          <div class="spinner"></div>
          <p class="spinner-text">{{ loadingService.loadingMessage() }}</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(3px);
    }

    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 5px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner-text {
      color: white;
      font-size: 1rem;
      font-weight: 500;
      margin: 0;
      text-align: center;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `]
})
export class SpinnerComponent {
  loadingService = inject(LoadingService);
}
