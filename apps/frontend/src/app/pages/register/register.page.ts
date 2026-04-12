import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterDto } from '@sports-prediction-engine/shared-types';

@Component({
  selector: 'sp-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-glow"></div>
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <span class="material-symbols-rounded auth-logo__icon">analytics</span>
          </div>
          <h1 class="logo">Predict<span class="logo-accent">Engine</span></h1>
          <h2>Create an account</h2>
          <p>Join to start tracking your predictions and performance.</p>
        </div>

        <!-- Social Registration -->
        <div class="social-buttons">
          <button class="social-btn social-btn--google" (click)="socialRegister('google')" type="button">
            <svg class="social-btn__icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button class="social-btn social-btn--github" (click)="socialRegister('github')" type="button">
            <svg class="social-btn__icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
          <button class="social-btn social-btn--apple" (click)="socialRegister('apple')" type="button">
            <svg class="social-btn__icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple
          </button>
        </div>

        <div class="divider">
          <span class="divider__line"></span>
          <span class="divider__text">or register with email</span>
          <span class="divider__line"></span>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <div class="input-wrapper">
              <span class="material-symbols-rounded input-icon">person</span>
              <input 
                type="text" 
                id="firstName" 
                formControlName="firstName" 
                placeholder="e.g. John"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <div class="input-wrapper">
              <span class="material-symbols-rounded input-icon">mail</span>
              <input 
                type="email" 
                id="email" 
                formControlName="email" 
                placeholder="you&#64;example.com"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <span class="material-symbols-rounded input-icon">lock</span>
              <input 
                type="password" 
                id="password" 
                formControlName="password" 
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          @if (errorMessage) {
            <div class="error-message">
              <span class="material-symbols-rounded" style="font-size: 16px; vertical-align: text-bottom; margin-right: 4px;">error</span>
              {{ errorMessage }}
            </div>
          }

          <button type="submit" class="btn-primary btn-submit" [disabled]="registerForm.invalid || isLoading">
            @if (isLoading) {
              <span class="spinner-sm"></span> Creating account...
            } @else {
              Create Account
            }
          </button>

          <p class="auth-footer">
            Already have an account? <a routerLink="/login">Login</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @keyframes float-glow {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
      50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.6; }
    }

    @keyframes card-enter {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes spin-sm {
      to { transform: rotate(360deg); }
    }

    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: var(--color-bg-primary);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }

    .auth-glow {
      position: absolute;
      top: 40%;
      left: 50%;
      width: 460px;
      height: 460px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
      transform: translate(-50%, -50%);
      animation: float-glow 6s ease-in-out infinite;
      pointer-events: none;
    }

    .auth-card {
      position: relative;
      background: var(--color-bg-card);
      backdrop-filter: blur(24px) saturate(150%);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow: var(--shadow-lg);
      animation: card-enter 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .auth-logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #059669, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
    }

    .auth-logo__icon {
      color: white;
      font-size: 28px;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--color-text-primary);
      margin-bottom: 1.25rem;
    }

    .logo-accent {
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
      margin-left: 2px;
    }

    .auth-header h2 {
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 0.375rem;
    }

    .auth-header p {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    // ─── Social Buttons ──────────────────────
    .social-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 0;
    }

    .social-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.03);
      color: var(--color-text-secondary);
      font-size: 0.6875rem;
      font-weight: 600;
      font-family: var(--font-family);
      cursor: pointer;
      transition: all var(--transition-fast);
      letter-spacing: 0.02em;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      &--google:hover {
        border-color: rgba(66, 133, 244, 0.3);
        box-shadow: 0 2px 12px rgba(66, 133, 244, 0.15);
      }

      &--github:hover {
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0 2px 12px rgba(255, 255, 255, 0.1);
      }

      &--apple:hover {
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0 2px 12px rgba(255, 255, 255, 0.1);
      }
    }

    .social-btn__icon {
      width: 20px;
      height: 20px;
    }

    // ─── Divider ─────────────────────────────
    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
    }

    .divider__line {
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }

    .divider__text {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      letter-spacing: 0.03em;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        color: var(--color-text-secondary);
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.875rem;
      font-size: 18px;
      color: var(--color-text-muted);
      pointer-events: none;
      transition: color 0.2s;
    }

    .input-wrapper:focus-within .input-icon {
      color: #10b981;
    }

    .input-wrapper input {
      width: 100%;
      background: var(--color-bg-input);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.8125rem 1rem 0.8125rem 2.75rem;
      color: var(--color-text-primary);
      font-size: 0.9375rem;
      font-family: var(--font-family);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-subtle), 0 0 20px var(--color-accent-glow);
        background: var(--color-bg-input-solid);
      }

      &.ng-invalid.ng-touched {
        border-color: var(--color-danger);
        box-shadow: 0 0 0 3px var(--color-danger-subtle);
      }
    }

    .error-message {
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      text-align: center;
    }

    .btn-submit {
      margin-top: 0.5rem;
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin-sm 0.6s linear infinite;
      display: inline-block;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);

      a {
        color: #10b981;
        text-decoration: none;
        font-weight: 600;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 2rem 1.5rem;
        border-radius: var(--radius-lg);
      }

      .auth-glow {
        width: 300px;
        height: 300px;
      }
    }
  `]
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    firstName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  isLoading = false;
  errorMessage = '';

  socialRegister(provider: 'google' | 'github' | 'apple') {
    // Placeholder: redirect to OAuth endpoint
    this.errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth not yet configured. Use email registration for now.`;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      if (this.registerForm.get('password')?.hasError('minlength')) {
        this.errorMessage = 'Password must be at least 8 characters.';
      } else {
        this.errorMessage = 'Please fill in all required fields correctly.';
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formVal = this.registerForm.value;
    this.authService.register({ ...formVal, firstName: formVal.firstName || undefined } as RegisterDto).subscribe({
      next: () => { this.isLoading = false; this.router.navigate(['/']); },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message;
        this.errorMessage = Array.isArray(msg) ? msg.join(', ') : (msg || 'Registration failed. Please try again.');
      }
    });
  }
}
