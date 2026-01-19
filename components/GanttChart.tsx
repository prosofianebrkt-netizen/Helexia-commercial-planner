import React, { useMemo, useRef, useEffect } from 'react';
import { PhaseResult, ChartMonth, DateRange, ProjectConfig } from '../types';
import { isRestrictedMonth, calculateProjectTimeline } from '../services/scheduler';

interface GanttChartProps {
  // If in single mode
  data?: PhaseResult;
  startDate?: Date; 
  subcontracted?: boolean;
  
  // If in portfolio mode
  projects?: ProjectConfig[];
  mode: 'detail' | 'portfolio';
}

const MONTH_WIDTH = 50; // Compacted slightly
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 70; // Increased to fit labels cleanly
const COMPACT_ROW_HEIGHT = 50;
const TOTAL_MONTHS_VIEW = 60; // 5 years for portfolio view

const GanttChart: React.FC<GanttChartProps> = ({ 
  data: singleData, 
  startDate: singleStartDate, 
  subcontracted,
  projects = [],
  mode 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine start date for the chart
  const effectiveStartDate = useMemo(() => {
    if (mode === 'detail' && singleStartDate) {
      const d = new Date(singleStartDate);
      d.setMonth(d.getMonth() - 2);
      return d;
    }
    // In portfolio, find earliest date
    if (projects.length > 0) {
       const dates = projects.map(p => new Date(p.signatureDate).getTime());
       const min = Math.min(...dates);
       const d = new Date(min);
       d.setMonth(d.getMonth() - 2);
       return d;
    }
    return new Date();
  }, [mode, singleStartDate, projects]);

  // Generate timeline grid
  const timeline = useMemo(() => {
    const months: ChartMonth[] = [];
    const start = new Date(effectiveStartDate);
    start.setDate(1); 

    for (let i = 0; i < TOTAL_MONTHS_VIEW; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      months.push({
        date: d,
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        isRestricted: isRestrictedMonth(d),
        year: d.getFullYear(),
        monthIndex: d.getMonth()
      });
    }
    return months;
  }, [effectiveStartDate]);

  // Helpers
  const getPosition = (date: Date) => {
    const startView = timeline[0].date;
    const diffTime = date.getTime() - startView.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24); 
    const pxPerDay = MONTH_WIDTH / 30.44; 
    return diffDays * pxPerDay;
  };

  const getWidth = (range: DateRange) => {
    const diffTime = range.end.getTime() - range.start.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const w = (diffDays * (MONTH_WIDTH / 30.44));
    return w < 0 ? 0 : w;
  };

  // Auto-scroll to start
  useEffect(() => {
    if(scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
    }
  }, [effectiveStartDate]);

  // Prepare render data
  const renderRows = () => {
    if (mode === 'detail' && singleData) {
      const phases = [
        ...(singleData.negotiation ? [{ 
            id: 'negotiation', 
            label: 'Négociation', 
            range: singleData.negotiation, 
            color: 'bg-slate-500', 
            milestone: singleData.milestones.loi, 
            milestoneLabel: 'LOI' 
        }] : []),
        ...(singleData.urbanism ? [{ 
            id: 'urbanism', 
            label: 'Urbanisme', 
            range: singleData.urbanism, 
            color: 'bg-helexia-green',
            milestone: singleData.milestones.urbanismOk,
            milestoneLabel: 'OK'
        }] : []),
        ...(singleData.aoCre ? [{ 
            id: 'cre', 
            label: 'AO CRE', 
            range: singleData.aoCre, 
            color: 'bg-yellow-500',
            milestone: singleData.milestones.laureate,
            milestoneLabel: 'LAURÉAT'
        }] : []),
        ...(singleData.leaseManagement ? [{ 
            id: 'lease', 
            label: 'Sécurisation Bail', 
            range: singleData.leaseManagement, 
            color: 'bg-orange-400',
            milestone: singleData.milestones.leaseSigned,
            milestoneLabel: 'BAIL SIGNÉ'
        }] : []),
        { id: 'connection', label: 'Raccordement', range: singleData.connection, color: 'bg-helexia-blue' },
        { 
            id: 'construction', 
            label: 'Construction', 
            range: singleData.construction, 
            color: 'bg-teal-600',
            milestone: singleData.milestones.constructionCompletion,
            milestoneLabel: 'ACHÈVEMENT'
        },
        { 
            id: 'operation', 
            label: 'Exploitation', 
            range: singleData.operation, 
            color: 'bg-emerald-600',
            milestone: singleData.milestones.cod,
            milestoneLabel: 'COD'
        },
      ];

      return (
        <div className="pt-4 relative z-10">
          {phases.map((phase) => {
             const left = getPosition(phase.range.start);
             const width = getWidth(phase.range);
             const milestoneLeft = phase.milestone ? getPosition(phase.milestone) : 0;
             const isMilestoneVisible = !!phase.milestone;

             return (
               <div key={phase.id} style={{ height: `${ROW_HEIGHT}px` }} className="relative flex items-center group border-b border-gray-50/50">
                 {/* The Phase Bar */}
                 <div 
                   className={`absolute h-10 rounded-xl shadow-lg border border-white/10 flex items-center px-4 text-xs font-bold text-white transition-all duration-300 hover:scale-[1.01] cursor-pointer ${phase.color}`}
                   style={{ left: `${left}px`, width: `${width}px` }}
                 >
                   <span className="truncate drop-shadow-md z-10 relative">{phase.label}</span>
                   <span className="ml-auto opacity-70 text-[10px] hidden lg:inline-block z-10 relative">
                       {Math.round(phase.range.durationMonths * 10) / 10} mois
                   </span>
                 </div>

                 {/* The Dedicated Row Milestone */}
                 {isMilestoneVisible && (
                     <div className="absolute top-1/2 transform -translate-y-1/2 z-30" style={{ left: `${milestoneLeft}px` }}>
                         <div className="relative">
                            {/* Connector Line to Bar End (if offset) - usually milestone is at end */}
                            
                            {/* Diamond */}
                            <div className="w-5 h-5 bg-helexia-dark rotate-45 border-2 border-white shadow-xl transform -translate-x-1/2"></div>
                            
                            {/* Label Tag */}
                            <div className="absolute top-7 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur border border-white/40 text-helexia-dark text-[9px] font-black px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                {phase.milestoneLabel}
                            </div>
                         </div>
                     </div>
                 )}
               </div>
             );
          })}
        </div>
      );
    } 
    
    // PORTFOLIO MODE (Folded)
    else if (mode === 'portfolio') {
      return (
        <div className="pt-2 relative z-10">
          {projects.map((proj, idx) => {
            const tData = calculateProjectTimeline(proj);
            
            // Collect all sub-phases for inline rendering
            const subPhases = [
               ...(tData.negotiation ? [{range: tData.negotiation, color: 'bg-slate-400', label: 'Nego'}] : []),
               ...(tData.urbanism ? [{range: tData.urbanism, color: 'bg-helexia-green', label: 'Urb'}] : []),
               // Parallel tracks stacked slightly by z-index or blended? Inline usually means sequential critical path or layering. 
               // Let's layer them.
               ...(tData.aoCre ? [{range: tData.aoCre, color: 'bg-yellow-500', label: 'CRE'}] : []),
               ...(tData.leaseManagement ? [{range: tData.leaseManagement, color: 'bg-orange-400', label: 'Bail'}] : []),
               {range: tData.connection, color: 'bg-helexia-blue', label: 'Racco'},
               {range: tData.construction, color: 'bg-teal-600', label: 'Const'},
               {range: tData.operation, color: 'bg-emerald-600', label: 'Exp'}
            ];

            return (
              <div key={proj.id} style={{ height: `${COMPACT_ROW_HEIGHT}px` }} className="relative flex items-center border-b border-gray-100 hover:bg-white/50 transition-colors">
                {/* Project Label Sticky */}
                <div className="sticky left-0 z-40 w-48 bg-white/95 backdrop-blur h-full flex flex-col justify-center px-4 border-r border-gray-100 shadow-sm">
                   <span className="text-xs font-bold text-helexia-blue truncate">{proj.name}</span>
                   <span className="text-[10px] text-gray-400">{proj.powerKWc} kWc</span>
                </div>

                {/* Inline Segments */}
                {subPhases.map((phase, pIdx) => {
                    const left = getPosition(phase.range.start);
                    const width = getWidth(phase.range);
                    return (
                        <div 
                           key={pIdx}
                           className={`absolute h-6 top-1/2 transform -translate-y-1/2 rounded-md shadow-sm border border-white/20 flex items-center justify-center text-[8px] text-white font-bold overflow-hidden whitespace-nowrap px-1 z-${10 + pIdx} ${phase.color}`}
                           style={{ left: `${left}px`, width: `${width}px` }}
                           title={`${phase.label}: ${Math.round(phase.range.durationMonths * 10) / 10} mois`}
                        >
                           {width > 30 && ( // Only show label if wide enough
                             <span>{Math.round(phase.range.durationMonths * 10) / 10}m</span>
                           )}
                        </div>
                    )
                })}
              </div>
            )
          })}
        </div>
      )
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden relative">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/40">
        <h2 className="text-xl font-bold text-helexia-blue tracking-tight">
          {mode === 'detail' ? 'Matrix Gantt Engine' : 'Portfolio Master View'}
        </h2>
        {mode === 'detail' && (
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-helexia-green rounded-full"></div> Urbanisme
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-helexia-blue rounded-full"></div> Raccordement
             </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-auto relative scroll-smooth" ref={scrollContainerRef}>
        <div style={{ width: `${timeline.length * MONTH_WIDTH}px`, minHeight: '100%' }} className="relative">
          
          {/* Header Month Grid */}
          <div className="flex border-b border-gray-200 sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm">
            {/* Spacer for sticky col in portfolio mode */}
            {mode === 'portfolio' && <div className="w-48 sticky left-0 bg-white/95 border-r border-gray-200 z-50"></div>}
            
            {timeline.map((m, i) => (
              <div 
                key={i} 
                style={{ width: `${MONTH_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
                className={`flex items-center justify-center text-xs font-medium border-r border-gray-100 ${m.isRestricted && mode === 'detail' && !subcontracted ? 'bg-gray-100 text-gray-400' : 'text-gray-600'}`}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Vertical Grid Lines & Restricted Zones */}
          <div className="absolute top-0 left-0 h-full w-full pointer-events-none flex z-0">
             {mode === 'portfolio' && <div className="w-48 shrink-0"></div>}
             {timeline.map((m, i) => (
               <div 
                 key={i}
                 style={{ width: `${MONTH_WIDTH}px` }}
                 className={`h-full border-r border-gray-100 ${
                   m.isRestricted && mode === 'detail' && !subcontracted 
                   ? "bg-[linear-gradient(45deg,#00000005_25%,transparent_25%,transparent_50%,#00000005_50%,#00000005_75%,transparent_75%,transparent)] bg-[length:10px_10px]" 
                   : ""
                 }`}
               ></div>
            ))}
          </div>

          {/* Current Date Line (Today) */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-red-500 z-0 opacity-40 border-r border-red-500 border-dashed pointer-events-none"
            style={{ left: `${getPosition(new Date()) + (mode==='portfolio'?192:0)}px` }} // 192px is 48 tailwind w-48
          ></div>

          {/* The Content */}
          {renderRows()}

        </div>
      </div>
    </div>
  );
};

export default GanttChart;