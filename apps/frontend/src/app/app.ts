import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Raíz de la aplicación. Todo lo visible vive en una ruta: las públicas
 * (/login, /registro) o el layout con el menú del rol.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
