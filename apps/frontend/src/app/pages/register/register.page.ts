import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="logo">ENGINE</h1>
          <h2>Create an account</h2>
          <p>Join to start tracking your bets and predictions.</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input 
              type="text" 
              id="firstName" 
              formControlName="firstName" 
              placeholder="e.g. John"
            />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              formControlName="email" 
              placeholder="Enter your email"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password" 
              placeholder="Create a password"
            />
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn-primary" [disabled]="registerForm.invalid || isLoading">
            {{ isLoading ? 'Creating account...' : 'Create Account' }}
          </button>

          <p class="auth-footer">
            Already have an account? <a routerLink="/login">Login here</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: var(--color-bg-primary);
      padding: 1rem;
    }

    .auth-card {
      background-color: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;

      .logo {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.05em;
        background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 1.5rem;
      }

      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--color-text-secondary);
        font-size: 0.875rem;
      }
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
        color: var(--color-text-primary);
        font-size: 0.875rem;
        font-weight: 500;
      }

      input {
        background-color: var(--color-bg-input);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0.75rem 1rem;
        color: var(--color-text-primary);
        font-size: 0.875rem;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px var(--color-accent-subtle);
        }

        &.ng-invalid.ng-touched {
          border-color: var(--color-danger, #ef4444);
        }
      }
    }

    .error-message {
      color: var(--color-danger, #ef4444);
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      text-align: center;
    }

    .btn-primary {
      background-color: var(--color-accent);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 0.875rem;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: 0.5rem;

      &:hover:not(:disabled) {
        background-color: var(--color-accent-hover);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);

      a {
        color: var(--color-accent);
        text-decoration: none;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
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
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  errorMessage = '';

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value as any).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
