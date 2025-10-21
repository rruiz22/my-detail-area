import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export const Breadcrumbs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const { dealerships } = useAccessibleDealerships();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with home
    breadcrumbs.push({
      label: t('breadcrumbs.home'),
      href: '/dashboard',
    });

    // Parse path segments
    if (pathSegments.length === 0) {
      return breadcrumbs;
    }

    // Map route segments to breadcrumbs
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const isLast = i === pathSegments.length - 1;

      // Admin/Dealerships
      if (segment === 'admin') {
        const dealerId = pathSegments[i + 1];

        breadcrumbs.push({
          label: t('breadcrumbs.administration'),
          href: '/admin',
        });

        // Specific dealership
        if (dealerId && !isNaN(Number(dealerId))) {
          const dealer = dealerships.find(d => d.id === Number(dealerId));
          breadcrumbs.push({
            label: dealer?.name || `Dealer ${dealerId}`,
            href: `/admin/${dealerId}`,
            isCurrentPage: isLast || pathSegments[i + 2] === undefined,
          });

          // Skip dealer ID in next iteration
          i++;
        }
      }
      // Sales Orders
      else if (segment === 'sales-orders') {
        breadcrumbs.push({
          label: t('breadcrumbs.sales_orders'),
          href: '/sales-orders',
          isCurrentPage: isLast,
        });

        // Specific order
        if (pathSegments[i + 1] && !isNaN(Number(pathSegments[i + 1]))) {
          breadcrumbs.push({
            label: `${t('breadcrumbs.order')} #${pathSegments[i + 1]}`,
            isCurrentPage: true,
          });
          i++;
        }
      }
      // Service Orders
      else if (segment === 'service-orders') {
        breadcrumbs.push({
          label: t('breadcrumbs.service_orders'),
          href: '/service-orders',
          isCurrentPage: isLast,
        });

        if (pathSegments[i + 1] && !isNaN(Number(pathSegments[i + 1]))) {
          breadcrumbs.push({
            label: `${t('breadcrumbs.order')} #${pathSegments[i + 1]}`,
            isCurrentPage: true,
          });
          i++;
        }
      }
      // Recon Orders
      else if (segment === 'recon-orders') {
        breadcrumbs.push({
          label: t('breadcrumbs.recon_orders'),
          href: '/recon-orders',
          isCurrentPage: isLast,
        });

        if (pathSegments[i + 1] && !isNaN(Number(pathSegments[i + 1]))) {
          breadcrumbs.push({
            label: `${t('breadcrumbs.order')} #${pathSegments[i + 1]}`,
            isCurrentPage: true,
          });
          i++;
        }
      }
      // Car Wash
      else if (segment === 'car-wash') {
        breadcrumbs.push({
          label: t('breadcrumbs.car_wash'),
          href: '/car-wash',
          isCurrentPage: isLast,
        });
      }
      // Contacts
      else if (segment === 'contacts') {
        breadcrumbs.push({
          label: t('breadcrumbs.contacts'),
          href: '/contacts',
          isCurrentPage: isLast,
        });

        if (pathSegments[i + 1] && !isNaN(Number(pathSegments[i + 1]))) {
          breadcrumbs.push({
            label: `${t('breadcrumbs.contact')} #${pathSegments[i + 1]}`,
            isCurrentPage: true,
          });
          i++;
        }
      }
      // Users
      else if (segment === 'users') {
        breadcrumbs.push({
          label: t('breadcrumbs.users'),
          href: '/users',
          isCurrentPage: isLast,
        });

        if (pathSegments[i + 1] && !isNaN(Number(pathSegments[i + 1]))) {
          breadcrumbs.push({
            label: `${t('breadcrumbs.user')} #${pathSegments[i + 1]}`,
            isCurrentPage: true,
          });
          i++;
        }
      }
      // Settings
      else if (segment === 'settings') {
        breadcrumbs.push({
          label: t('breadcrumbs.settings'),
          href: '/settings',
          isCurrentPage: isLast,
        });
      }
      // Reports
      else if (segment === 'reports') {
        breadcrumbs.push({
          label: t('breadcrumbs.reports'),
          href: '/reports',
          isCurrentPage: isLast,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't render if only home
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 px-6 py-3 text-sm bg-background border-b">
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            {breadcrumb.isCurrentPage ? (
              <span className="font-medium text-foreground" aria-current="page">
                {index === 0 && <Home className="h-4 w-4 inline mr-1" />}
                {breadcrumb.label}
              </span>
            ) : breadcrumb.href ? (
              <Link
                to={breadcrumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {index === 0 && <Home className="h-4 w-4" />}
                {breadcrumb.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">
                {breadcrumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
