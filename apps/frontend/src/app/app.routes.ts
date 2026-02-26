import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const appRoutes: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    },
    {
        path: 'predictions',
        canActivate: [authGuard],
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
        path: 'my-bets',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/my-bets/my-bets.page').then(
                (m) => m.MyBetsPage,
            ),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
