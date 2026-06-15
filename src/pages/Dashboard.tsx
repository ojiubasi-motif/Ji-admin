import { useEffect, useState } from 'react';
import { Package, Scissors, Tag, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { fetchApi } from '../lib/apiClient';
import type { Product, Fabric } from '../types';

interface Stats {
  totalProducts: number;
  activeProducts: number;
  totalFabrics: number;
  activeFabrics: number;
  totalCategories: number;
  lowStockFabrics: number;
}

interface GenderCount { gender: string; count: number }
interface OccasionCount { occasion: string; count: number }

const OCCASION_LABELS: Record<string, string> = {
  'social-events-celebrations': 'Social Events',
  casual: 'Casual',
  corporate: 'Corporate',
  burial: 'Burial',
  wedding: 'Wedding',
};

const GENDER_COLORS: Record<string, string> = {
  men: '#1C1916',
  women: '#C8521A',
  unisex: '#8B7355',
  kids: '#D4A853',
};

function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const size = 120;
  const strokeWidth = 22;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5DFD5" strokeWidth={strokeWidth} />
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const rotation = -90 + cumulativePercent * 360;
          cumulativePercent += pct;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" className="fill-[#1C1916]" fontSize="18" fontWeight="700">
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-[#6B6460] capitalize">{d.label}</span>
            <span className="text-xs font-semibold text-[#1C1916] ml-auto pl-2">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0, activeProducts: 0, totalFabrics: 0,
    activeFabrics: 0, totalCategories: 0, lowStockFabrics: 0,
  });
  const [genderData, setGenderData] = useState<GenderCount[]>([]);
  const [occasionData, setOccasionData] = useState<OccasionCount[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [lowStockList, setLowStockList] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [productsRes, fabricsRes, categoriesRes] = await Promise.all([
          fetchApi('/v1/products?limit=100&isActive=all'),
          fetchApi('/v1/fabrics'),
          fetchApi('/v1/categories'),
        ]);

        const prods = productsRes?.docs || [];
        const fabs: Fabric[] = [];
        (fabricsRes || []).forEach((f: any) => {
          (f.properties || []).forEach((p: any) => {
            fabs.push({
              id: f._id,
              color_name: p.colorName,
              color_code: p.colorCode || null,
              unit: p.unit,
              yards_per_unit: p.yardsPerUnit,
              price_modifier: p.priceModifier,
              in_stock: p.inStock,
              stock_level: p.stockLevel !== undefined ? p.stockLevel : null,
              is_active: p.isActive,
            } as any);
          });
        });

        const catCount = (categoriesRes?.categories || []).length;

        const gMap: Record<string, number> = {};
        const oMap: Record<string, number> = {};
        prods.forEach((p: any) => {
          const gender = p.gender || 'unisex';
          const occasion = p.occasion || 'casual';
          gMap[gender] = (gMap[gender] || 0) + 1;
          oMap[occasion] = (oMap[occasion] || 0) + 1;
        });

        setStats({
          totalProducts: prods.length,
          activeProducts: prods.filter((p: any) => p.isActive).length,
          totalFabrics: fabs.length,
          activeFabrics: fabs.filter(f => f.is_active).length,
          totalCategories: catCount,
          lowStockFabrics: fabs.filter(f => f.stock_level !== null && f.stock_level < 10).length,
        });
        setGenderData(Object.entries(gMap).map(([gender, count]) => ({ gender, count })));
        setOccasionData(Object.entries(oMap).map(([occasion, count]) => ({ occasion, count })));
        
        // Map recent products to match UI
        const mappedRecent = prods.slice(0, 5).map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          gender: p.gender,
          occasion: p.occasion,
          base_price: p.basePrice || p.price,
          is_active: p.isActive !== false,
        }));
        setRecentProducts(mappedRecent);
        
        setLowStockList(fabs.filter(f => f.stock_level !== null && f.stock_level < 10).slice(0, 4));
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, sub: `${stats.activeProducts} active`, icon: <Package size={20} />, color: '#C8521A' },
    { label: 'Total Fabrics', value: stats.totalFabrics, sub: `${stats.activeFabrics} active`, icon: <Scissors size={20} />, color: '#1C1916' },
    { label: 'Categories', value: stats.totalCategories, sub: 'product categories', icon: <Tag size={20} />, color: '#8B7355' },
    { label: 'Low Stock', value: stats.lowStockFabrics, sub: 'fabrics need restocking', icon: <AlertCircle size={20} />, color: '#D4A853' },
  ];

  const genderChartData = genderData.map(g => ({
    label: g.gender,
    value: g.count,
    color: GENDER_COLORS[g.gender] || '#aaa',
  }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#E5DFD5]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#6B6460]">{card.label}</p>
                <p
                  className="text-3xl font-bold text-[#1C1916] mt-1"
                  style={{ fontFamily: "'Georgia', serif" }}
                >
                  {loading ? '—' : card.value}
                </p>
                <p className="text-xs text-[#9A8F87] mt-1">{card.sub}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: card.color }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products by Gender */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD5]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#C8521A]" />
            <h3 className="text-sm font-semibold text-[#1C1916]">Products by Gender</h3>
          </div>
          {loading ? (
            <div className="h-24 flex items-center justify-center text-[#9A8F87] text-sm">Loading…</div>
          ) : genderChartData.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-[#9A8F87] text-sm">No data yet</div>
          ) : (
            <DonutChart data={genderChartData} total={stats.totalProducts} />
          )}
        </div>

        {/* Products by Occasion */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD5] lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#C8521A]" />
            <h3 className="text-sm font-semibold text-[#1C1916]">Products by Occasion</h3>
          </div>
          {loading ? (
            <div className="h-24 flex items-center justify-center text-[#9A8F87] text-sm">Loading…</div>
          ) : occasionData.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-[#9A8F87] text-sm">No data yet</div>
          ) : (
            <div className="space-y-2.5">
              {occasionData.map(o => {
                const pct = stats.totalProducts > 0 ? (o.count / stats.totalProducts) * 100 : 0;
                return (
                  <div key={o.occasion}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6B6460]">{OCCASION_LABELS[o.occasion] || o.occasion}</span>
                      <span className="font-semibold text-[#1C1916]">{o.count}</span>
                    </div>
                    <div className="h-2 bg-[#F7F3EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C8521A] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Products */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD5]">
          <h3 className="text-sm font-semibold text-[#1C1916] mb-4">Recent Products</h3>
          {loading ? (
            <div className="text-sm text-[#9A8F87]">Loading…</div>
          ) : recentProducts.length === 0 ? (
            <div className="text-sm text-[#9A8F87]">No products yet</div>
          ) : (
            <div className="space-y-3">
              {recentProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-[#F7F3EC] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1C1916]">{p.name}</p>
                    <p className="text-xs text-[#9A8F87] capitalize">{p.gender} · {OCCASION_LABELS[p.occasion] || p.occasion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#1C1916]">₦{p.base_price.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-[#F7F3EC] text-[#9A8F87]'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Fabrics */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5DFD5]">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-[#D4A853]" />
            <h3 className="text-sm font-semibold text-[#1C1916]">Low Stock Fabrics</h3>
          </div>
          {loading ? (
            <div className="text-sm text-[#9A8F87]">Loading…</div>
          ) : lowStockList.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle size={16} />
              <span>All fabrics are well stocked</span>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockList.map(f => (
                <div key={f.id} className="flex items-center gap-3 py-2.5 border-b border-[#F7F3EC] last:border-0">
                  {f.color_code && (
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 border border-[#E5DFD5]"
                      style={{ backgroundColor: f.color_code }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1916] truncate">{f.color_name}</p>
                    <p className="text-xs text-[#9A8F87]">{f.unit}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#D4A853] bg-amber-50 px-2 py-0.5 rounded-full">
                    {f.stock_level} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
