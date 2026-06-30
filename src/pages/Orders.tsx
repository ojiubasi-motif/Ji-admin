import { useEffect, useState, useRef } from 'react';
import { ShoppingBag, Search, Eye, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { fetchApi } from '../lib/apiClient';
import Modal from '../components/Modal';

interface OrderItem {
  productId: string;
  productName?: string;
  styleOptionName?: string;
  fabricOptionName?: string;
  colorName?: string;
  fabricImgUrl?: string;
  styleImgUrl?: string;
  basePrice: number;
  styleModifier?: number;
  fabricModifier?: number;
  notes?: string;
  // Customization choices
  gender?: string;
  occasion?: string;
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  payment: {
    id: string;
    amount: number;
    status: string;
    reference: string;
    provider: string;
  } | null;
  statusHistory?: {
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }[];
  items?: OrderItem[];
  tailor?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  tailorId?: string | null;
}

export default function Orders({ userRole }: { userRole?: 'ADMIN' | 'TAILOR' }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionError, setActionError] = useState('');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      // Fetch up to 100 orders at once for management view
      const res = await fetchApi('/orders?take=100');
      if (res?.items) {
        setOrders(res.items);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  const [tailors, setTailors] = useState<{ id: string; email: string; firstName: string | null; lastName: string | null }[]>([]);

  async function loadTailors() {
    try {
      const res = await fetchApi('/auth/tailors');
      if (res) {
        setTailors(res);
      }
    } catch (err) {
      console.error('Failed to load tailors:', err);
    }
  }

  async function handleAssignTailor(orderId: string, tailorId: string | null) {
    setUpdatingId(orderId);
    setActionError('');
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: order.status, tailorId }),
      });
      await loadOrders();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign tailor.');
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadOrders();
    if (userRole === 'ADMIN') {
      loadTailors();
    }
  }, [userRole]);

  async function handleStatusChange(orderId: string, newStatus: Order['status']) {
    setUpdatingId(orderId);
    setActionError('');
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      // Reload orders to reflect status changes and history log
      await loadOrders();
      // If modal is open, update selected order state to show fresh status history
      if (selectedOrder && selectedOrder.id === orderId) {
        const freshRes = await fetchApi('/orders?take=100');
        const freshOrder = freshRes?.items?.find((o: Order) => o.id === orderId);
        if (freshOrder) setSelectedOrder(freshOrder);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = orders.filter((o) => {
    // 1. Filter by status
    if (statusFilter !== 'ALL' && o.status !== statusFilter) {
      return false;
    }

    // 2. Filter by search query (Order ID, Customer names, Email, items list, or notes)
    const term = search.toLowerCase().trim();
    if (!term) return true;

    const idMatch = (o.id || '').toLowerCase().includes(term);
    const firstNameMatch = o.user?.firstName?.toLowerCase()?.includes(term) || false;
    const lastNameMatch = o.user?.lastName?.toLowerCase()?.includes(term) || false;
    const emailMatch = o.user?.email?.toLowerCase()?.includes(term) || false;
    const notesMatch = o.notes?.toLowerCase()?.includes(term) || false;

    // Matches product names inside items JSON
    const itemsMatch = o.items?.some(
      (item) =>
        item.productName?.toLowerCase()?.includes(term) ||
        item.notes?.toLowerCase()?.includes(term)
    ) || false;

    return idMatch || firstNameMatch || lastNameMatch || emailMatch || notesMatch || itemsMatch;
  });

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PRODUCTION':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'READY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DISPATCHED':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'DELIVERED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-[#F7F3EC] text-[#6B6460] border-[#E5DFD5]';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1C1916]" style={{ fontFamily: "'Georgia', serif" }}>
            Orders
          </h2>
          <p className="text-sm text-[#6B6460] mt-0.5">
            {orders.length} total · {orders.filter((o) => o.status === 'PENDING').length} pending
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="flex items-center gap-2 border border-[#E5DFD5] text-[#6B6460] bg-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#FAF8F5] transition-colors shrink-0 disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 relative" ref={filterDropdownRef}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F87]" />
          <input
            type="text"
            placeholder="Search by order ID, customer, tailor notes, products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5DFD5] rounded-xl text-sm text-[#1C1916] placeholder-[#9A8F87] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-colors"
          />
        </div>

        <button
          onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
          className="flex items-center justify-center gap-2 bg-white border border-[#E5DFD5] hover:border-[#C8521A] text-[#1C1916] px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors shrink-0"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {statusFilter !== 'ALL' && (
            <span className="w-2 h-2 bg-[#C8521A] rounded-full" />
          )}
        </button>

        {filterDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E5DFD5] rounded-2xl shadow-xl py-4 z-40 space-y-4">
            <div className="px-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#6B6460] mb-2">Order Status</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'IN_PRODUCTION', label: 'In Production' },
                  { value: 'READY', label: 'Ready' },
                  { value: 'DISPATCHED', label: 'Dispatched' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ].map(opt => {
                  const isSel = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setStatusFilter(opt.value); setFilterDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${isSel ? 'bg-[#F7F3EC] text-[#C8521A] font-medium' : 'text-[#1C1916] hover:bg-[#FAF8F5]'}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {actionError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
          {actionError}
        </p>
      )}

      {/* Tables container */}
      <div className="bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#9A8F87]">Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingBag size={32} className="text-[#E5DFD5] mx-auto mb-3" />
            <p className="text-sm text-[#9A8F87]">No orders found matching filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#E5DFD5] bg-[#FAF8F5]">
                  <th className="sticky left-0 bg-[#FAF8F5] z-10 text-left text-xs font-semibold text-[#6B6460] px-5 py-3 border-r border-[#E5DFD5]">Order ID</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Items Ordered</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Status</th>
                  {userRole === 'ADMIN' && <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Assigned Tailor</th>}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const customerName = o.user?.firstName || o.user?.lastName
                    ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim()
                    : 'Guest Customer';

                  const formattedDate = new Date(o.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Generate order items descriptions summary
                  const itemsSummary = o.items
                    ?.map((item) => `${item.productName || 'Garment'}${item.colorName ? ` (${item.colorName})` : ''}`)
                    .join(', ') || 'No customization items';

                  return (
                    <tr
                      key={o.id}
                      className="group border-b border-[#F7F3EC] last:border-0 hover:bg-[#FAF8F5] transition-colors"
                    >
                      <td className="sticky left-0 bg-white z-10 group-hover:bg-[#FAF8F5] transition-colors px-5 py-4 border-r border-[#E5DFD5]">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="text-xs font-mono font-semibold text-[#C8521A] hover:underline text-left block"
                        >
                          {o.id.substring(0, 8).toUpperCase()}…
                        </button>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#6B6460] whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="px-5 py-4 min-w-[150px]">
                        <p className="text-sm font-medium text-[#1C1916]">{customerName}</p>
                        <p className="text-xs text-[#9A8F87] truncate">{o.user?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#6B6460] max-w-[200px] truncate">
                        {itemsSummary}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#1C1916] whitespace-nowrap">
                        ₦{o.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${getStatusColor(o.status)}`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      {userRole === 'ADMIN' && (
                        <td className="px-5 py-4">
                          <select
                            disabled={updatingId === o.id}
                            value={o.tailorId || ''}
                            onChange={(e) => handleAssignTailor(o.id, e.target.value || null)}
                            className="text-xs border border-[#E5DFD5] rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#C8521A] disabled:opacity-55 cursor-pointer shrink-0 font-medium"
                          >
                            <option value="">Unassigned</option>
                            {tailors.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : t.email}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <select
                            disabled={updatingId === o.id || (userRole === 'TAILOR' && ['READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].includes(o.status))}
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value as Order['status'])}
                            className="text-xs border border-[#E5DFD5] rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#C8521A] disabled:opacity-55 cursor-pointer shrink-0 font-medium"
                          >
                             {(userRole !== 'TAILOR' || o.status === 'PENDING') && <option value="PENDING">Pending</option>}
                             {(userRole !== 'TAILOR' || o.status === 'CONFIRMED') && <option value="CONFIRMED">Confirmed</option>}
                             <option value="IN_PRODUCTION">In Production</option>
                             <option value="READY">Ready</option>
                             {(userRole !== 'TAILOR' || o.status === 'DISPATCHED') && <option value="DISPATCHED">Dispatched</option>}
                             {(userRole !== 'TAILOR' || o.status === 'DELIVERED') && <option value="DELIVERED">Delivered</option>}
                             {(userRole !== 'TAILOR' || o.status === 'CANCELLED') && <option value="CANCELLED">Cancelled</option>}
                          </select>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 rounded-lg text-[#6B6460] hover:bg-[#F7F3EC] hover:text-[#C8521A] transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {selectedOrder && (
        <Modal
          title={`Order Details #${selectedOrder.id.substring(0, 8).toUpperCase()}`}
          onClose={() => setSelectedOrder(null)}
          size="lg"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Quick Status / Details summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF8F5] border border-[#E5DFD5] rounded-2xl p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A8F87]">Customer</p>
                <p className="text-sm font-semibold text-[#1C1916]">
                  {selectedOrder.user?.firstName || selectedOrder.user?.lastName
                    ? `${selectedOrder.user.firstName || ''} ${selectedOrder.user.lastName || ''}`.trim()
                    : 'Guest'}
                </p>
                <p className="text-xs text-[#6B6460]">{selectedOrder.user?.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A8F87]">Order Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Customize items listing */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9A8F87] border-b border-[#E5DFD5] pb-1.5">Items & Customizations</h4>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="border border-[#F7F3EC] rounded-xl p-3.5 bg-white space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-[#1C1916]">{item.productName || 'Garment Detail'}</p>
                      <span className="text-xs font-semibold text-[#C8521A]">₦{item.basePrice.toLocaleString()}</span>
                    </div>
                    
                    {/* Render properties if any */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#6B6460]">
                      {item.styleOptionName && (
                        <p>Style: <span className="font-medium text-[#1C1916]">{item.styleOptionName}</span></p>
                      )}
                      {item.fabricOptionName && (
                        <p>Fabric: <span className="font-medium text-[#1C1916]">{item.fabricOptionName}</span></p>
                      )}
                      {item.colorName && (
                        <p>Color: <span className="font-medium text-[#1C1916]">{item.colorName}</span></p>
                      )}
                      {item.gender && (
                        <p>Gender: <span className="font-medium text-[#1C1916] capitalize">{item.gender}</span></p>
                      )}
                      {item.occasion && (
                        <p>Occasion: <span className="font-medium text-[#1C1916] capitalize">{item.occasion}</span></p>
                      )}
                    </div>

                    {/* Style and Fabric Images */}
                    {(item.styleImgUrl || item.fabricImgUrl) && (
                      <div className="flex gap-4 pt-2">
                        {item.styleImgUrl && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-[#9A8F87] font-semibold uppercase">Style Preview</span>
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5DFD5] bg-[#FAF8F5] shrink-0">
                              <img src={item.styleImgUrl} alt={item.styleOptionName} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        {item.fabricImgUrl && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-[#9A8F87] font-semibold uppercase">Fabric Swatch</span>
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5DFD5] bg-[#FAF8F5] shrink-0">
                              <img src={item.fabricImgUrl} alt={item.fabricOptionName} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded-lg p-2 mt-1.5 italic text-[#6B6460]">
                        <strong>Notes:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#9A8F87] italic">No items detailed in this order.</p>
              )}
            </div>

            {/* Delivery Details & Tailor Instructions */}
            {(() => {
              let parsedNotes: any = null;
              let isJsonNotes = false;
              if (selectedOrder.notes) {
                try {
                  parsedNotes = JSON.parse(selectedOrder.notes);
                  isJsonNotes = parsedNotes && typeof parsedNotes === 'object';
                } catch (e) {
                  // Legacy plaintext notes
                }
              }

              return (
                <>
                  {isJsonNotes && parsedNotes?.delivery && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#9A8F87] border-b border-[#E5DFD5] pb-1.5">Delivery Details</h4>
                      <div className="text-xs text-[#6B6460] space-y-1.5 bg-[#FAF8F5] border border-[#E5DFD5] rounded-xl p-3.5">
                        <p><strong>Recipient:</strong> {parsedNotes.delivery.fullName}</p>
                        <p><strong>Phone:</strong> {parsedNotes.delivery.phoneNumber}</p>
                        <p><strong>Address:</strong> {parsedNotes.delivery.address}, {parsedNotes.delivery.city}, {parsedNotes.delivery.state}, {parsedNotes.delivery.country}</p>
                        <p><strong>Method:</strong> <span className="capitalize">{parsedNotes.delivery.deliveryMethod}</span></p>
                        {parsedNotes.promoCode && (
                          <p><strong>Promo Code:</strong> <span className="font-mono bg-green-50 text-green-700 px-1 py-0.5 rounded border border-green-200">{parsedNotes.promoCode}</span></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legacy plaintext notes or global tailor notes inside JSON */}
                  {((selectedOrder.notes && !isJsonNotes) || (isJsonNotes && parsedNotes?.notes)) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#9A8F87] border-b border-[#E5DFD5] pb-1.5">Tailor Instructions / Notes</h4>
                      <p className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[#6B6460] leading-relaxed">
                        {isJsonNotes ? parsedNotes.notes : selectedOrder.notes}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Payment Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9A8F87] border-b border-[#E5DFD5] pb-1.5">Payment Details</h4>
              {selectedOrder.payment ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#6B6460]">
                  <p>Status: <span className={`font-semibold capitalize ${selectedOrder.payment.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}`}>{selectedOrder.payment.status.toLowerCase()}</span></p>
                  <p>Provider: <span className="font-semibold text-[#1C1916]">{selectedOrder.payment.provider}</span></p>
                  <p className="sm:col-span-3 truncate">Reference: <code className="text-xs bg-[#FAF8F5] px-1.5 py-0.5 rounded font-mono">{selectedOrder.payment.reference}</code></p>
                </div>
              ) : (
                <p className="text-xs text-[#9A8F87] italic">No payment record found (Offline / Pending Payment).</p>
              )}
            </div>

            {/* Status History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9A8F87] border-b border-[#E5DFD5] pb-1.5">Status Log History</h4>
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5DFD5]">
                  {selectedOrder.statusHistory.map((log, idx) => (
                    <div key={idx} className="flex gap-4 items-start pl-6 relative">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#C8521A] border-2 border-white" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#1C1916]">
                          Moved to <span className="uppercase text-[#C8521A]">{log.status}</span>
                        </p>
                        {log.note && <p className="text-xs text-[#6B6460] mt-0.5">{log.note}</p>}
                        <span className="text-[10px] text-[#9A8F87] block mt-0.5">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9A8F87] italic">No status changes logged yet.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-5 border-t border-[#E5DFD5] mt-5">
            <button
              onClick={() => setSelectedOrder(null)}
              className="border border-[#E5DFD5] text-[#6B6460] rounded-xl px-5 py-2 text-sm font-semibold hover:bg-[#FAF8F5] transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
