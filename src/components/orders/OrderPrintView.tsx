/**
 * Order Print View Component
 *
 * Professional print layout for dealership work orders.
 * Optimized for 8.5x11" paper with clean, business-appropriate design.
 */

import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';

// Interfaces
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
  salesperson?: string;
  total_amount?: number;
  short_link?: string;
  qr_code_url?: string;
}

interface OrderPrintViewProps {
  order: OrderData;
  services: OrderService[];
  dealership: DealershipInfo;
  showInternalNotes?: boolean;
}

export function OrderPrintView({
  order,
  services,
  dealership,
  showInternalNotes = false
}: OrderPrintViewProps) {
  const orderNumber = order.custom_order_number || order.orderNumber || order.order_number || 'N/A';
  const customerName = order.customerName || order.customer_name || 'Unknown Customer';
  const customerPhone = order.customerPhone || order.customer_phone || '';
  const customerEmail = order.customerEmail || order.customer_email || '';
  const vehicleVin = order.vehicleVin || order.vehicle_vin || '';
  const stockNumber = order.stockNumber || order.stock_number || '';
  const assignedPerson = order.assignedTo || order.assigned_to || order.salesperson || 'Unassigned';

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'MMMM dd, yyyy \'at\' h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="print-order-layout">
      {/* Header Section */}
      <header className="print-header">
        <div className="dealership-info">
          <h1 className="dealership-name">{dealership.name}</h1>
          {dealership.address && <p className="dealership-address">{dealership.address}</p>}
          <div className="dealership-contact">
            {dealership.phone && <span>Phone: {dealership.phone}</span>}
            {dealership.email && <span> • Email: {dealership.email}</span>}
          </div>
        </div>

        <div className="order-header">
          <h2 className="order-title">WORK ORDER</h2>
          <div className="order-number">#{orderNumber}</div>
          <div className="print-date">Printed: {format(new Date(), 'MM/dd/yyyy')}</div>
        </div>
      </header>

      {/* Customer & Vehicle Information */}
      <section className="customer-vehicle-section">
        <div className="info-grid">
          {/* Customer Information */}
          <div className="customer-info">
            <h3 className="section-title">Customer Information</h3>
            <div className="info-table">
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{customerName}</span>
              </div>
              {customerPhone && (
                <div className="info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{customerPhone}</span>
                </div>
              )}
              {customerEmail && (
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{customerEmail}</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Assigned To:</span>
                <span className="value">{assignedPerson}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="vehicle-info">
            <h3 className="section-title">Vehicle Information</h3>
            <div className="info-table">
              <div className="info-row">
                <span className="label">Vehicle:</span>
                <span className="value">{order.vehicle_info || 'Not specified'}</span>
              </div>
              {vehicleVin && (
                <div className="info-row">
                  <span className="label">VIN:</span>
                  <span className="value">{vehicleVin}</span>
                </div>
              )}
              {stockNumber && (
                <div className="info-row">
                  <span className="label">Stock #:</span>
                  <span className="value">{stockNumber}</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Status:</span>
                <span className="value status-badge">{order.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {services.length > 0 && (
        <section className="services-section">
          <h3 className="section-title">Services Requested</h3>
          <table className="services-table">
            <thead>
              <tr>
                <th className="service-name">Service</th>
                <th className="service-description">Description</th>
                <th className="service-price">Price</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="service-row">
                  <td className="service-name">{service.name}</td>
                  <td className="service-description">{service.description || 'Standard service'}</td>
                  <td className="service-price">{formatCurrency(service.price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={2} className="total-label">TOTAL:</td>
                <td className="total-amount">{formatCurrency(order.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Order Details */}
      <section className="order-details-section">
        <div className="details-grid">
          <div className="dates-info">
            <h3 className="section-title">Important Dates</h3>
            <div className="info-table">
              <div className="info-row">
                <span className="label">Created:</span>
                <span className="value">{formatDate(order.created_at)}</span>
              </div>
              {order.due_date && (
                <div className="info-row">
                  <span className="label">Due Date:</span>
                  <span className="value">{formatDate(order.due_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="qr-section">
            <h3 className="section-title">Order Tracking</h3>
            {order.short_link && (
              <div className="qr-container">
                <QRCodeCanvas
                  value={order.short_link}
                  size={100}
                  level="M"
                  includeMargin={true}
                />
                <p className="qr-instructions">Scan for order status</p>
                <p className="qr-url">{order.short_link}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Notes Section */}
      {(order.notes || (showInternalNotes && order.internal_notes)) && (
        <section className="notes-section">
          {order.notes && (
            <div className="notes-block">
              <h3 className="section-title">Customer Notes</h3>
              <div className="notes-content">{order.notes}</div>
            </div>
          )}

          {showInternalNotes && order.internal_notes && (
            <div className="notes-block">
              <h3 className="section-title">Internal Notes</h3>
              <div className="notes-content internal-notes">{order.internal_notes}</div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="print-footer">
        <div className="footer-info">
          <p>This work order was generated by {dealership.name}</p>
          <p>Order ID: {order.id}</p>
          {dealership.website && <p>Visit us at: {dealership.website}</p>}
        </div>
      </footer>
    </div>
  );
}