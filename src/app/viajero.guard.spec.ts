import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { viajeroGuard } from './viajero.guard';

describe('viajeroGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => viajeroGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
