import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'sp-forgot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="card">
        <div class="brand">
          <span class="prompt">&gt;</span>
          <h1>Predict<span class="accent">Engine</span></h1>
        </div>

        @if (mode() === 'request') {
          <h2 class="title">Reset your password</h2>
          <p class="sub">Enter your email and we'll send a reset link.</p>

          <form [formGroup]="reqForm" (ngSubmit)="sendReset()" class="form">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" type="email" formControlName="email" placeholder="you@example.com"
                [class.err]="reqEmail?.invalid && reqEmail?.touched" />
              @if (reqEmail?.invalid && reqEmail?.touched) {
                <span class="ferr">{{ reqEmail?.hasError('required') ? 'Email is required' : 'Enter a valid email' }}</span>
              }
            </div>

            @if (err()) {
              <div class="ebox"><span class="eico">!</span> {{ err() }}</div>
            }
            @if (success()) {
              <div class="sbox"><span class="sico">&check;</span> {{ success() }}</div>
            }

            <button type="submit" class="btn" [disabled]="loading()">
              @if (loading()) { <span class="dot"></span> Sending... }
              @else { Send Reset Link }
            </button>

            <p class="foot"><a routerLink="/login">Back to sign in</a></p>
          </form>
        }

        @if (mode() === 'reset') {
          <h2 class="title">Set new password</h2>
          <p class="sub">Enter your new password below.</p>

          <form [formGroup]="rstForm" (ngSubmit)="doReset()" class="form">
            <div class="field">
              <label for="pw">New Password</label>
              <input id="pw" type="password" formControlName="newPassword" placeholder="Min 8 characters"
                [class.err]="rstPw?.invalid && rstPw?.touched" />
              @if (rstPw?.invalid && rstPw?.touched) {
                <span class="ferr">{{ rstPw?.hasError('minlength') ? 'Must be at least 8 characters' : 'Password is required' }}</span>
              }
              @if (pwStr() > 0) {
                <div class="bar"><div class="fill" [class.weak]="pwStr()===1" [class.ok]="pwStr()===2" [class.strong]="pwStr()===3" [style.width.%]="pwStr()*33"></div></div>
              }
            </div>

            @if (err()) {
              <div class="ebox"><span class="eico">!</span> {{ err() }}</div>
            }
            @if (success()) {
              <div class="sbox"><span class="sico">&check;</span> {{ success() }}</div>
            }

            <button type="submit" class="btn" [disabled]="loading()">
              @if (loading()) { <span class="dot"></span> Resetting... }
              @else { Reset Password }
            </button>

            <p class="foot"><a routerLink="/login">Back to sign in</a></p>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap{display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;background:var(--color-bg-primary)}
    .card{width:100%;max-width:400px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:2rem}
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
    .bar{height:4px;background:var(--color-bg-tertiary);border-radius:2px;overflow:hidden;margin-top:4px}
    .fill{height:100%;border-radius:2px;transition:all 0.3s}.fill.weak{background:var(--color-danger)}.fill.ok{background:#fbbf24}.fill.strong{background:var(--color-success)}
    .ebox{display:flex;align-items:center;gap:6px;padding:0.625rem 0.75rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-xs);color:#fca5a5;font-family:var(--font-family);font-size:0.75rem}
    .eico{width:18px;height:18px;border-radius:50%;background:rgba(239,68,68,0.2);color:#fca5a5;display:grid;place-items:center;font-size:0.75rem;font-weight:700;flex-shrink:0}
    .sbox{display:flex;align-items:center;gap:6px;padding:0.625rem 0.75rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-xs);color:#6ee7b7;font-family:var(--font-family);font-size:0.75rem}
    .sico{width:18px;height:18px;border-radius:50%;background:rgba(16,185,129,0.2);color:#6ee7b7;display:grid;place-items:center;font-size:0.75rem;font-weight:700;flex-shrink:0}
    .btn{font-family:var(--font-family);font-size:0.875rem;font-weight:600;padding:0.75rem;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
    .btn:hover:not(:disabled){background:#059669;transform:translateY(-1px)}.btn:disabled{opacity:0.6;cursor:default}
    .dot{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:sp 0.6s linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    .foot{text-align:center;font-family:var(--font-family);font-size:0.8125rem;color:var(--color-text-secondary);margin:0.5rem 0 0}
    .foot a{color:var(--color-accent);text-decoration:none;font-weight:600}.foot a:hover{text-decoration:underline}
  `]
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode = signal<'request' | 'reset'>('request');
  token = signal('');
  loading = signal(false);
  err = signal('');
  success = signal('');
  pwStr = signal(0);

  reqForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  rstForm = this.fb.group({ newPassword: ['', [Validators.required, Validators.minLength(8)]] });

  get reqEmail() { return this.reqForm.get('email'); }
  get rstPw() { return this.rstForm.get('newPassword'); }

  constructor() {
    this.route.queryParams.subscribe(p => {
      if (p['token']) { this.mode.set('reset'); this.token.set(p['token']); }
    });
    this.rstPw?.valueChanges.subscribe(v => {
      let s = 0;
      if (v && v.length >= 8) s++;
      if (v && /[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (v && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
      this.pwStr.set(s);
    });
  }

  sendReset() {
    if (this.reqForm.invalid) { this.reqForm.markAllAsTouched(); return; }
    this.loading.set(true); this.err.set(''); this.success.set('');
    this.http.post('/api/auth/forgot-password', { email: this.reqEmail?.value })
      .subscribe({
        next: () => { this.loading.set(false); this.success.set('If an account exists with that email, a reset link has been sent.'); },
        error: () => { this.loading.set(false); this.err.set('Failed to send reset email. Please try again.'); }
      });
  }

  doReset() {
    if (this.rstForm.invalid) { this.rstForm.markAllAsTouched(); return; }
    this.loading.set(true); this.err.set(''); this.success.set('');
    this.http.post('/api/auth/reset-password', { token: this.token(), newPassword: this.rstPw?.value })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Password reset successful!');
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: () => { this.loading.set(false); this.err.set('Reset failed. Invalid token or server error.'); }
      });
  }
}
