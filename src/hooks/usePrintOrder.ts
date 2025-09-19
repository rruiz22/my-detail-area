/**
 * Print Order Hook
 *
 * Handles printing and PDF export functionality for dealership work orders.
 * Fetches complete order data and generates professional print layouts.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import print styles
import '@/styles/print.css';

interface OrderData {
  id: string;
  orderNumber?: string;
  order_number?: string;
  custom_order_number?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  customerEmail?: string;
  customer_email?: string;
  vehicle_info?: string;
  vehicleVin?: string;
  vehicle_vin?: string;
  stockNumber?: string;
  stock_number?: string;
  status: string;
  created_at?: string;
  due_date?: string;
  notes?: string;
  internal_notes?: string;
  assignedTo?: string;
  assigned_to?: string;
  assigned_group_id?: string;
  salesperson?: string;
  service_performer?: string;
  advisor?: string;
  total_amount?: number;
  short_link?: string;
  qr_code_url?: string;
  dealer_id?: number;
  services?: any[];
}

interface OrderService {
  id: string;
  name: string;
  price?: number;
  description?: string;
}

interface DealershipInfo {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export const usePrintOrder = () => {

  // Fetch complete order data for printing
  const fetchCompleteOrderData = useCallback(async (orderId: string) => {
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch dealership info and user profiles in parallel
      const [dealershipResult, userProfilesResult] = await Promise.all([
        supabase
          .from('dealerships')
          .select('id, name, address, phone, email, website')
          .eq('id', orderData.dealer_id)
          .single(),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
      ]);

      if (dealershipResult.error) throw dealershipResult.error;

      const dealership = dealershipResult.data as DealershipInfo;

      // Create user lookup map
      const userMap = new Map(
        (userProfilesResult.data || []).map((user) => [
          user.id,
          `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
        ])
      );

      // Resolve assigned person
      let assignedPersonName = 'No one assigned';
      if (orderData.assigned_group_id) {
        assignedPersonName = userMap.get(orderData.assigned_group_id) || 'Unknown User';
      }

      // Fetch services if any
      let services: OrderService[] = [];
      if (orderData.services && Array.isArray(orderData.services) && orderData.services.length > 0) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('dealer_services')
          .select('id, name, description, price')
          .in('id', orderData.services);

        if (!servicesError && servicesData) {
          services = servicesData;
        }
      }

      // Add resolved assigned person to order data
      const enrichedOrder = {
        ...orderData,
        assignedTo: assignedPersonName
      } as OrderData;

      return {
        order: enrichedOrder,
        services,
        dealership
      };

    } catch (error) {
      console.error('Error fetching complete order data:', error);
      throw error;
    }
  }, []);

  // Generate HTML content for printing
  const generatePrintHTML = useCallback((order: OrderData, services: OrderService[], dealership: DealershipInfo) => {
    // Improved order number logic with priority fallback
    const getOrderNumber = (order: OrderData): string => {
      if (order.custom_order_number) return order.custom_order_number;
      if (order.order_number) return order.order_number;
      if (order.orderNumber) return order.orderNumber;
      // Fallback to ID if no order number
      return `ORD-${order.id.slice(-8).toUpperCase()}`;
    };

    // Get assigned person (already resolved in fetchCompleteOrderData)
    const getAssignedPerson = (order: OrderData): string => {
      return order.assignedTo || 'No one assigned';
    };

    const orderNumber = getOrderNumber(order);
    const customerName = order.customerName || order.customer_name || 'Unknown Customer';
    const customerPhone = order.customerPhone || order.customer_phone || '';
    const vehicleVin = order.vehicleVin || order.vehicle_vin || '';
    const stockNumber = order.stockNumber || order.stock_number || '';
    const assignedPerson = getAssignedPerson(order);

    const formatCurrency = (amount: number | null | undefined) => {
      if (!amount) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };

    const servicesHTML = services.map(service => `
      <tr class="service-row">
        <td class="service-name">${service.name}</td>
        <td class="service-description">${service.description || 'Standard service'}</td>
        <td class="service-price" style="text-align: right;">${formatCurrency(service.price)}</td>
      </tr>
    `).join('');

    return `
      <div class="print-order-layout">
        <header class="print-header">
          <div class="dealership-info">
            <h1 class="dealership-name">${dealership.name}</h1>
            ${dealership.address ? `<p class="dealership-address">${dealership.address}</p>` : ''}
            <div class="dealership-contact">
              ${dealership.phone ? `Phone: ${dealership.phone}` : ''}
              ${dealership.email ? ` • Email: ${dealership.email}` : ''}
            </div>
          </div>
          <div class="order-header">
            <h2 class="order-title">WORK ORDER</h2>
            <div class="order-number">#${orderNumber}</div>
            <div class="print-date">Printed: ${new Date().toLocaleDateString()}</div>
          </div>
        </header>

        <section class="customer-vehicle-section">
          <div class="info-grid">
            <div class="customer-info">
              <h3 class="section-title">Customer Information</h3>
              <div class="info-table">
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span class="value">${customerName}</span>
                </div>
                ${customerPhone ? `
                <div class="info-row">
                  <span class="label">Phone:</span>
                  <span class="value">${customerPhone}</span>
                </div>` : ''}
                <div class="info-row">
                  <span class="label">Assigned To:</span>
                  <span class="value">${assignedPerson}</span>
                </div>
              </div>
            </div>

            <div class="vehicle-info">
              <h3 class="section-title">Vehicle Information</h3>
              <div class="info-table">
                <div class="info-row">
                  <span class="label">Vehicle:</span>
                  <span class="value">${order.vehicle_info || 'Not specified'}</span>
                </div>
                ${vehicleVin ? `
                <div class="info-row">
                  <span class="label">VIN:</span>
                  <span class="value">${vehicleVin}</span>
                </div>` : ''}
                ${stockNumber ? `
                <div class="info-row">
                  <span class="label">Stock #:</span>
                  <span class="value">${stockNumber}</span>
                </div>` : ''}
                <div class="info-row">
                  <span class="label">Status:</span>
                  <span class="value status-badge">${order.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        ${services.length > 0 ? `
        <section class="services-section">
          <h3 class="section-title">Services Requested</h3>
          <table class="services-table">
            <thead>
              <tr>
                <th class="service-name">Service</th>
                <th class="service-description">Description</th>
                <th class="service-price" style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${servicesHTML}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2" class="total-label">TOTAL:</td>
                <td class="total-amount" style="text-align: right;">${formatCurrency(order.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </section>` : ''}

        ${order.notes ? `
        <section class="notes-section">
          <div class="notes-block">
            <h3 class="section-title">Customer Notes</h3>
            <div class="notes-content">${order.notes}</div>
          </div>
        </section>` : ''}

        ${order.short_link || order.qr_code_url ? `
        <section class="qr-section">
          <h3 class="section-title">Order Tracking</h3>
          <div class="qr-container" style="text-align: center; margin: 20px 0;">
            ${order.qr_code_url ?
              `<img src="${order.qr_code_url}" alt="QR Code" style="width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px;">` :
              `<div class="qr-placeholder" style="width: 100px; height: 100px; border: 2px dashed #ccc; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 12px; color: #666;">QR Code</div>`
            }
            <p class="qr-instructions" style="margin: 8px 0 4px 0; font-size: 12px; color: #666;">Scan for order status</p>
            <p class="qr-url" style="margin: 0; font-size: 11px; color: #888; word-break: break-all;">${order.short_link || 'N/A'}</p>
          </div>
        </section>` : ''}

        <footer class="print-footer">
          <div class="footer-info">
            <p>Generated by My Detail Area</p>
            <p>Report generated on: ${new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}</p>
            <p>Order ID: ${order.id}</p>
          </div>
        </footer>
      </div>
    `;
  }, []);

  // Print order function
  const printOrder = useCallback(async (order: OrderData, showInternalNotes: boolean = false) => {
    try {
      toast.loading('Preparing order for printing...');

      // Fetch complete data
      const { order: completeOrder, services, dealership } = await fetchCompleteOrderData(order.id);

      // Generate HTML content
      const printContent = generatePrintHTML(completeOrder, services, dealership);

      // Create print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        throw new Error('Failed to open print window. Please allow popups.');
      }

      // Write content to print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Work Order ${completeOrder.custom_order_number || completeOrder.orderNumber || completeOrder.order_number}</title>
            <link rel="stylesheet" href="/src/styles/print.css">
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          toast.success('Print dialog opened');
        }, 500);
      };

    } catch (error) {
      console.error('Print order error:', error);
      toast.error(`Failed to print order: ${error}`);
    }
  }, [fetchCompleteOrderData, generatePrintHTML]);

  // Quick print without internal notes
  const printOrderQuick = useCallback(async (order: OrderData) => {
    await printOrder(order, false);
  }, [printOrder]);

  // Admin print with internal notes
  const printOrderAdmin = useCallback(async (order: OrderData) => {
    await printOrder(order, true);
  }, [printOrder]);

  // Print preview (opens in new tab for review)
  const previewPrint = useCallback(async (order: OrderData) => {
    try {
      const { order: completeOrder, services, dealership } = await fetchCompleteOrderData(order.id);

      // Generate HTML content
      const printContent = generatePrintHTML(completeOrder, services, dealership);

      const previewWindow = window.open('', '_blank', 'width=900,height=700');

      if (!previewWindow) {
        throw new Error('Failed to open preview window');
      }

      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Preview - Order ${completeOrder.custom_order_number || completeOrder.orderNumber || completeOrder.order_number}</title>
            <style>
              body { margin: 20px; background: #f5f5f5; }
              .preview-actions {
                text-align: center;
                margin-bottom: 20px;
                padding: 10px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .preview-actions button {
                margin: 0 8px;
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
              }
              .preview-actions button:hover {
                background: #f0f0f0;
              }
            </style>
            <link rel="stylesheet" href="/src/styles/print.css">
          </head>
          <body>
            <div class="preview-actions">
              <button onclick="window.print()">🖨️ Print Now</button>
              <button onclick="window.close()">❌ Close Preview</button>
            </div>
            ${printContent}
          </body>
        </html>
      `);

      previewWindow.document.close();
      toast.success('Print preview opened');

    } catch (error) {
      console.error('Print preview error:', error);
      toast.error('Failed to open print preview');
    }
  }, [fetchCompleteOrderData, generatePrintHTML]);

  return {
    printOrder: printOrderQuick,
    printOrderAdmin,
    previewPrint,
    isLoading: false // Could add loading state if needed
  };
};