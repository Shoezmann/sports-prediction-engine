import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginDto } from '@sports-prediction-engine/shared-types';

@Component({
  selector: 'sp-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card">
        <div class="brand">
          <span class="prompt">&gt;</span>
          <h1>Predict<span class="accent">Engine</span></h1>
        </div>
        <h2 class="title">Sign in to your account</h2>
        <p class="sub">Enter your credentials to access your dashboard.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="you@example.com"
              [class.err]="email?.invalid && email?.touched" autocomplete="email" />
            @if (email?.invalid && email?.touched) {
              <span class="ferr">{{ email?.hasError('required') ? 'Email is required' : 'Enter a valid email' }}</span>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" placeholder="Enter password"
              [class.err]="password?.invalid && password?.touched" autocomplete="current-password" />
            @if (password?.invalid && password?.touched) {
              <span class="ferr">Password is required</span>
            }
          </div>

          <div class="actions">
            <a routerLink="/forgot" class="link">Forgot password?</a>
          </div>

          @if (err()) {
            <div class="ebox"><span class="eico">!</span> {{ err() }}</div>
          }

          <button type="submit" class="btn" [disabled]="loading()">
            @if (loading()) { <span class="dot"></span> Signing in... }
            @else { Sign In }
          </button>

          <p class="foot">Don't have an account? <a routerLink="/register">Create one</a></p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap{display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;background:var(--color-bg-primary)}
    .card{width:100%;max-width:400px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:2rem;position:relative}
    .brand{display:flex;align-items:center;gap:8px;margin-bottom:1.5rem}.prompt{font-family:var(--font-family);font-size:1.25rem;color:var(--color-accent);font-weight:700}
    h1{font-family:var(--font-family);font-size:1.25rem;font-weight:800;letter-spacing:-0.02em;color:var(--color-text-primary);margin:0}
    .accent{color:var(--color-accent)}
    .title{font-family:var(--font-family);font-size:1.125rem;font-weight:700;color:var(--color-text-primary);margin:0 0 0.25rem}
    .sub{font-family:var(--font-family);font-size:0.8125rem;color:var(--color-text-secondary);margin:0 0 1.5rem}
    .form{display:flex;flex-direction:column;gap:1rem}
    .field{display:flex;flex-direction:column;gap:0.375rem}
    .field label{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.04em}
    .field input{font-family:var(--font-family);font-size:0.875rem;padding:0.75rem 1rem;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-xs);color:var(--color-text-primary);transition:all 0.2s}
    .field input:focus{outline:none;border-color:var(--color-accent);box-shadow:0 0 0 2px var(--color-accent-subtle)}
    .field input::placeholder{color:var(--color-text-muted)}
    .field input.err{border-color:var(--color-danger);box-shadow:0 0 0 2px var(--color-danger-subtle)}
    .ferr{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-danger);margin-top:2px}
    .actions{display:flex;justify-content:flex-end}
    .link{font-family:var(--font-family);font-size:0.75rem;color:var(--color-accent);text-decoration:none}.link:hover{text-decoration:underline}
    .ebox{display:flex;align-items:center;gap:6px;padding:0.625rem 0.75rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-xs);color:#fca5a5;font-family:var(--font-family);font-size:0.75rem}
    .eico{width:18px;height:18px;border-radius:50%;background:rgba(239,68,68,0.2);color:#fca5a5;display:grid;place-items:center;font-size:0.75rem;font-weight:700;flex-shrink:0}
    .btn{font-family:var(--font-family);font-size:0.875rem;font-weight:600;padding:0.75rem;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
    .btn:hover:not(:disabled){background:#059669;transform:translateY(-1px)}.btn:disabled{opacity:0.6;cursor:default}
    .dot{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:sp 0.6s linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    .foot{text-align:center;font-family:var(--font-family);font-size:0.8125rem;color:var(--color-text-secondary);margin:0.5rem 0 0}
    .foot a{color:var(--color-accent);text-decoration:none;font-weight:600}.foot a:hover{text-decoration:underline}
  `]
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  loading = signal(false);
  err = signal('');

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.email?.hasError('email')) this.err.set('Please enter a valid email address');
      else this.err.set('Please fill in all required fields');
      return;
    }
    this.loading.set(true);
    this.err.set('');
    this.auth.login(this.form.value as LoginDto).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (e) => {
        this.loading.set(false);
        const m = e.error?.message;
        this.err.set(Array.isArray(m) ? m.join(', ') : (m || 'Invalid email or password'));
      }
    });
  }
}
