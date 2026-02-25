import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'sp-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <sp-header />
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    main {
      min-height: calc(100vh - 64px);
    }
  `],
})
export class AppComponent { }
