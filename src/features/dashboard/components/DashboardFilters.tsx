import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange, PERIOD_OPTIONS, PeriodOption } from '../hooks/useDashboardData';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedPeriod: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
}

export function DashboardFilters({
  dateRange,
  onDateRangeChange,
  selectedPeriod,
  onPeriodChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-card/30 rounded-lg mb-6">
      <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
        <SelectTrigger className="w-[180px] bg-background/50">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal bg-background/50',
                !dateRange.from && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
              ) : (
                <span>Data inicial</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={(date) => date && onDateRangeChange({ ...dateRange, from: date })}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-muted-foreground">até</span>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal bg-background/50',
                !dateRange.to && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.to ? (
                format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })
              ) : (
                <span>Data final</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={(date) => date && onDateRangeChange({ ...dateRange, to: date })}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
