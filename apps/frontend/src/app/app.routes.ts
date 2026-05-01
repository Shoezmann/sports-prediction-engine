import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const appRoutes: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    },
    {
        path: 'system',
        loadComponent: () =>
            import('./pages/system-status/system-status.page').then(
                (m) => m.SystemStatusPage,
            ),
    },
    {
        path: 'live',
        loadComponent: () =>
            import('./pages/live/live.page').then(
                (m) => m.LivePage,
            ),
    },
    {
        path: 'predictions',
        loadComponent: () =>
            import('./pages/predictions/predictions.page').then(
                (m) => m.PredictionsPage,
            ),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.page').then(
                (m) => m.LoginPage,
            ),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./pages/register/register.page').then(
                (m) => m.RegisterPage,
            ),
    },
    {
        path: 'forgot',
        loadComponent: () =>
            import('./pages/forgot-password/forgot-password.page').then(
                (m) => m.ForgotPasswordPage,
            ),
    },
    {
        path: 'performance',
        loadComponent: () =>
            import('./pages/performance/performance.page').then(
                (m) => m.PerformancePage,
            ),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
