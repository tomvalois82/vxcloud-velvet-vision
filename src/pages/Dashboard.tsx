import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { DashboardFilters } from '@/features/dashboard/components/DashboardFilters';
import { BalancoCard } from '@/features/dashboard/components/BalancoCard';
import { BalancoGeralCard } from '@/features/dashboard/components/BalancoGeralCard';
import { PatrimonioCard } from '@/features/dashboard/components/PatrimonioCard';
import { CrescimentoCard } from '@/features/dashboard/components/CrescimentoCard';
import { TrendChart } from '@/features/dashboard/components/TrendChart';
import {
  useDashboardData, 
  getDateRangeFromPeriod, 
  DateRange, 
  PeriodOption 
} from '@/features/dashboard/hooks/useDashboardData';

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('mes-atual');
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPeriod('mes-atual'));
  const [isVisible, setIsVisible] = useState(false);

  const dashboardData = useDashboardData(dateRange);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handlePeriodChange = (period: PeriodOption) => {
    setSelectedPeriod(period);
    setDateRange(getDateRangeFromPeriod(period));
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  return (
    <div className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema"
      />

      {/* Filters */}
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
      />

      {/* Main Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BalancoCard
          totalDespesas={dashboardData.totalDespesas}
          lucroVendas={dashboardData.lucroVendas}
          balanco={dashboardData.balanco}
          loading={dashboardData.loading}
        />
        
        <BalancoGeralCard
          totalReceitas={dashboardData.totalReceitas}
          totalDespesasGeral={dashboardData.totalDespesasGeral}
          balancoGeral={dashboardData.balancoGeral}
          loading={dashboardData.loading}
        />
        
        <PatrimonioCard />
        
        <CrescimentoCard />
      </div>

      {/* Trend Chart */}
      <TrendChart />
    </div>
  );
};

export default Dashboard;
