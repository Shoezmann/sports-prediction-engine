import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    },
    {
        path: 'predictions',
        loadComponent: () =>
            import('./pages/predictions/predictions.page').then(
                (m) => m.PredictionsPage,
            ),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
