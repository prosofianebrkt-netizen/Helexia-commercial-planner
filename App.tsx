import React, { useState, useMemo, useEffect } from 'react';
import { ProjectConfig, ProjectTypology, InjectionType, InvestmentModel, PhaseOverride, SkippedPhases } from './types';
import { calculateProjectTimeline } from './services/scheduler';
import GanttChart from './components/GanttChart';
import { CalendarIcon, ZapIcon, BuildingIcon, SettingsIcon, DownloadIcon, CheckCircleIcon } from './components/Icons';

// Default Factory
const createNewProject = (id: number): ProjectConfig => ({
  id: `prj_${id}`,
  name: `Nouveau Projet ${id}`,
  signatureDate: new Date().toISOString().split('T')[0],
  powerKWc: 500,
  typology: ProjectTypology.ROOF_EXISTING,
  injectionType: InjectionType.TOTAL_INJECTION,
  investmentModel: InvestmentModel.OWN_INVESTMENT,
  isSubcontracted: false,
  overrides: {},
  skippedPhases: {}
});

const App: React.FC = () => {
  // State: Projects List
  const [projects, setProjects] = useState<ProjectConfig[]>(() => {
    const saved = localStorage.getItem('helexia_portfolio_v2');
    if (saved) return JSON.parse(saved);
    return [createNewProject(1)];
  });

  // State: Selection & View
  const [currentId, setCurrentId] = useState<string>(projects[0]?.id || '');
  const [viewMode, setViewMode] = useState<'detail' | 'portfolio'>('detail'); // Toggle between Detail Gantt and Portfolio Master View
  const [sidebarTab, setSidebarTab] = useState<'config' | 'list'>('config'); // Left panel toggle

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Derived State
  const currentProject = useMemo(() => projects.find(p => p.id === currentId) || projects[0], [projects, currentId]);
  
  const timelineData = useMemo(() => {
    return calculateProjectTimeline(currentProject);
  }, [currentProject]);

  // Persist
  useEffect(() => {
    localStorage.setItem('helexia_portfolio_v2', JSON.stringify(projects));
  }, [projects]);

  // Handlers - Project Logic
  const addProject = () => {
    const newId = projects.length + 1;
    const newP = createNewProject(newId);
    setProjects(prev => [...prev, newP]);
    setCurrentId(newP.id);
    setSidebarTab('config');
    setViewMode('detail');
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return; // Prevent deleting last
    const remaining = projects.filter(p => p.id !== id);
    setProjects(remaining);
    if (currentId === id) setCurrentId(remaining[0].id);
  };

  const handleInputChange = (field: keyof ProjectConfig, value: any) => {
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, [field]: value } : p));
  };

  const handleOverrideChange = (field: keyof PhaseOverride, value: string) => {
    const num = parseFloat(value);
    setProjects(prev => prev.map(p => {
        if (p.id !== currentId) return p;
        return {
            ...p,
            overrides: {
                ...p.overrides,
                [field]: isNaN(num) ? undefined : num
            }
        }
    }));
  };

  const toggleSkipPhase = (phase: keyof SkippedPhases) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== currentId) return p;
          const currentSkip = p.skippedPhases || {};
          return {
              ...p,
              skippedPhases: {
                  ...currentSkip,
                  [phase]: !currentSkip[phase]
              }
          }
      }));
  }

  const exportCSV = () => {
    const rows = [
      ['Project', 'Phase', 'Start Date', 'End Date', 'Duration (Months)'],
      [currentProject.name, 'Négociation', timelineData.negotiation?.start.toLocaleDateString() || '-', timelineData.negotiation?.end.toLocaleDateString() || '-', timelineData.negotiation?.durationMonths || 0],
      [currentProject.name, 'Urbanisme', timelineData.urbanism?.start.toLocaleDateString() || '-', timelineData.urbanism?.end.toLocaleDateString() || '-', timelineData.urbanism?.durationMonths || 0],
      ...(timelineData.aoCre ? [[currentProject.name, 'AO CRE', timelineData.aoCre.start.toLocaleDateString(), timelineData.aoCre.end.toLocaleDateString(), timelineData.aoCre.durationMonths]] : []),
      [currentProject.name, 'Raccordement', timelineData.connection.start.toLocaleDateString(), timelineData.connection.end.toLocaleDateString(), timelineData.connection.durationMonths],
      [currentProject.name, 'Construction', timelineData.construction.start.toLocaleDateString(), timelineData.construction.end.toLocaleDateString(), timelineData.construction.durationMonths],
      [currentProject.name, 'COD', timelineData.operation.start.toLocaleDateString(), '-', '-']
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `helexia_plan_${currentProject.name.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#004d73] to-[#001a2b] p-6 lg:p-10 font-sans text-slate-800">
      
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-10 fade-in-up gap-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
            HELEXIA <span className="text-helexia-green italic font-light">Solar Master</span>
          </h1>
          <p className="text-white/60 text-sm lg:text-base font-light tracking-wide max-w-xl">
            Système de planification stratégique unifié. Enterprise Edition.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-helexia-dark/40 p-1 rounded-xl flex border border-white/10 backdrop-blur">
                <button 
                   onClick={() => setViewMode('detail')}
                   className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'detail' ? 'bg-helexia-green text-helexia-dark shadow-lg' : 'text-white/70 hover:text-white'}`}
                >
                    Vue Projet
                </button>
                <button 
                   onClick={() => setViewMode('portfolio')}
                   className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'portfolio' ? 'bg-helexia-green text-helexia-dark shadow-lg' : 'text-white/70 hover:text-white'}`}
                >
                    Vue Portefeuille
                </button>
            </div>

            <button 
            onClick={exportCSV}
            className="bg-white/10 hover:bg-white/20 backdrop-blur text-white border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 font-bold"
            >
            <DownloadIcon className="w-5 h-5" />
            <span className="hidden lg:inline">Export</span>
            </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[800px]">
        
        {/* Left: Dashboard Config / List */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl border border-white/20 flex-1 overflow-hidden flex flex-col">
            
            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setSidebarTab('config')}
                    className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider ${sidebarTab === 'config' ? 'text-helexia-blue border-b-2 border-helexia-blue' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Configuration
                </button>
                <button 
                    onClick={() => setSidebarTab('list')}
                    className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider ${sidebarTab === 'list' ? 'text-helexia-blue border-b-2 border-helexia-blue' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Projets ({projects.length})
                </button>
            </div>

            {/* TAB: CONFIGURATION */}
            {sidebarTab === 'config' && (
             <div className="overflow-y-auto pr-2 space-y-6 flex-1 custom-scrollbar">
              <div className="flex items-center gap-3 text-helexia-blue">
                <SettingsIcon className="w-6 h-6" />
                <h2 className="text-xl font-bold">Paramètres</h2>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nom du Projet</label>
                <input 
                  type="text" 
                  value={currentProject.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-helexia-blue focus:outline-none transition-all"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                   <CalendarIcon className="w-3 h-3" /> Date de Signature (T0)
                </label>
                <input 
                  type="date" 
                  value={currentProject.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-helexia-blue focus:outline-none transition-all"
                />
              </div>

              {/* Power */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <ZapIcon className="w-3 h-3" /> Puissance (kWc)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={currentProject.powerKWc}
                    onChange={(e) => handleInputChange('powerKWc', parseFloat(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-helexia-blue focus:outline-none transition-all"
                  />
                  <span className="absolute right-4 top-3 text-xs font-bold text-gray-400">kWc</span>
                </div>
              </div>

              {/* Typology */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <BuildingIcon className="w-3 h-3" /> Typologie
                </label>
                <select 
                  value={currentProject.typology}
                  onChange={(e) => handleInputChange('typology', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-helexia-blue focus:outline-none transition-all appearance-none"
                >
                  <option value={ProjectTypology.ROOF_EXISTING}>Toiture Existante</option>
                  <option value={ProjectTypology.ROOF_NEW}>Toiture Neuve</option>
                  <option value={ProjectTypology.SHADE}>Ombrière</option>
                  <option value={ProjectTypology.GROUND}>Sol</option>
                </select>
              </div>

              {/* General Toggles */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Tiers-Invest.</span>
                    <button 
                      onClick={() => handleInputChange('investmentModel', currentProject.investmentModel === InvestmentModel.OWN_INVESTMENT ? InvestmentModel.CLIENT_INVESTMENT : InvestmentModel.OWN_INVESTMENT)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${currentProject.investmentModel === InvestmentModel.OWN_INVESTMENT ? 'bg-helexia-blue' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${currentProject.investmentModel === InvestmentModel.OWN_INVESTMENT ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                 </div>
                 
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Sous-traitance</span>
                    <button 
                      onClick={() => handleInputChange('isSubcontracted', !currentProject.isSubcontracted)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${currentProject.isSubcontracted ? 'bg-helexia-green' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${currentProject.isSubcontracted ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                 </div>
              </div>

              {/* Skipped Tasks */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Phases à ignorer</h4>
                  {['negotiation', 'urbanism', 'aoCre', 'leaseManagement', 'construction'].map((key) => {
                      const k = key as keyof SkippedPhases;
                      const skipped = currentProject.skippedPhases?.[k] || false;
                      const labels: Record<string, string> = {
                          negotiation: 'Négociation',
                          urbanism: 'Urbanisme',
                          aoCre: 'AO CRE',
                          leaseManagement: 'Bail',
                          construction: 'Construction'
                      };
                      return (
                        <div key={k} className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${skipped ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{labels[key]}</span>
                            <button 
                                onClick={() => toggleSkipPhase(k)}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${skipped ? 'bg-red-400' : 'bg-gray-300'}`}
                            >
                                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${skipped ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                      )
                  })}
              </div>

              {/* Advanced Mode Toggle */}
              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-helexia-blue underline font-bold"
                >
                  {showAdvanced ? "Masquer options avancées" : "Overrides (Durées forcées)"}
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 grid grid-cols-2 gap-2 animate-pulse-once">
                    {[
                        {label: 'Négociation (mois)', key: 'negotiationDuration'},
                        {label: 'Urbanisme (mois)', key: 'urbanismDuration'},
                        {label: 'AO CRE (mois)', key: 'creDuration'},
                        {label: 'Bail (mois)', key: 'leaseDuration'},
                        {label: 'Raccordement (mois)', key: 'connectionDuration'},
                        {label: 'Construction (mois)', key: 'constructionDuration'}
                    ].map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-[10px] text-gray-400">{field.label}</label>
                            <input 
                                type="number" 
                                placeholder="Auto"
                                className="w-full p-2 bg-white border rounded-lg text-xs"
                                onChange={(e) => handleOverrideChange(field.key as keyof PhaseOverride, e.target.value)}
                            />
                        </div>
                    ))}
                  </div>
                )}
              </div>
             </div>
            )}

            {/* TAB: PROJECT LIST */}
            {sidebarTab === 'list' && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    <button 
                        onClick={addProject}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-helexia-blue/30 text-helexia-blue font-bold text-sm hover:bg-helexia-blue/5 transition-colors flex items-center justify-center gap-2"
                    >
                        + Ajouter un projet
                    </button>
                    
                    {projects.map(p => (
                        <div 
                           key={p.id}
                           onClick={() => { setCurrentId(p.id); setViewMode('detail'); setSidebarTab('config'); }}
                           className={`p-4 rounded-xl cursor-pointer transition-all border ${currentId === p.id ? 'bg-helexia-blue text-white border-helexia-blue shadow-lg' : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-700'}`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm truncate">{p.name}</span>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                                   className={`text-xs opacity-50 hover:opacity-100 ${currentId === p.id ? 'text-white' : 'text-red-500'}`}
                                >✕</button>
                            </div>
                            <div className={`text-xs mt-1 ${currentId === p.id ? 'opacity-80' : 'text-gray-400'}`}>
                                {p.powerKWc} kWc • {new Date(p.signatureDate).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

          </div>
          
          {/* Summary Card - Only visible in Detail Mode */}
          {viewMode === 'detail' && (
            <div className="bg-helexia-green/90 backdrop-blur-md rounded-[2.5rem] p-8 shadow-xl text-helexia-dark">
                <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-black text-2xl">COD Prévue</h3>
                    <p className="opacity-70 text-sm font-medium">Commercial Operation Date</p>
                </div>
                <CheckCircleIcon className="w-8 h-8 opacity-80" />
                </div>
                <div className="mt-6 text-4xl font-black tracking-tighter">
                    {timelineData.milestones.cod.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
                <div className="mt-2 text-sm font-bold opacity-60">
                    Durée totale: {Math.round(timelineData.totalDurationMonths)} mois
                </div>
            </div>
          )}

        </div>

        {/* Right: Gantt Engine */}
        <div className="lg:col-span-9 h-[600px] lg:h-auto">
          <GanttChart 
            mode={viewMode}
            data={timelineData} 
            startDate={new Date(currentProject.signatureDate)}
            subcontracted={currentProject.isSubcontracted}
            projects={projects}
          />
        </div>

      </div>
    </div>
  );
};

export default App;