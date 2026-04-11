import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'sp-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="app-layout">
      <sp-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-background);
    }
    
    .main-content {
      flex: 1;
      margin-left: 260px; 
      width: calc(100% - 260px);
      min-height: 100vh;
    }

    @media (max-width: 768px) {
      .main-content {
        margin-left: 0;
        width: 100%;
      }
    }
  `],
})
export class AppComponent { }
