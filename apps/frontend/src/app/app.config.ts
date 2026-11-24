import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';

import { authInterceptor } from './core/auth/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // El interceptor va en la raíz para que TODAS las llamadas (facades y
    // futuras) pasen por él sin acordarse de registrarlo en cada pantalla.
    provideHttpClient(withInterceptors([authInterceptor])),
    // Íconos de Material en estilo redondeado (DISEÑO.md sección 7), vía la
    // fuente autoalojada @fontsource/material-icons-round.
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-icons-round' } },
  ],
};
