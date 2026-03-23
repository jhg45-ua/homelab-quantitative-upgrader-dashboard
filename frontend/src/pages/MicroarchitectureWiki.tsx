import { useEffect, useMemo, useState } from 'preact/hooks';
import type { MetricsState, SystemConfig } from '../types';
import { formatMetric } from '../utils/formatters';

type TabId = 'roofline' | 'cpi' | 'amat' | 'littles' | 'tma';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'roofline', label: 'Roofline Model' },
  { id: 'cpi', label: 'CPI & CPU Performance' },
  { id: 'amat', label: 'Memory Hierarchy' },
  { id: 'littles', label: "Little's Law" },
  { id: 'tma', label: 'Top-Down Analysis' },
];

function hashToTab(hash: string): TabId {
  const normalized = hash.replace('#', '').toLowerCase();
  if (normalized === 'roofline') return 'roofline';
  if (normalized === 'cpi') return 'cpi';
  if (normalized === 'amat') return 'amat';
  if (normalized === 'littles') return 'littles';
  if (normalized === 'tma') return 'tma';
  return 'roofline';
}

export function MicroarchitectureWiki({ metrics, systemConfig }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('roofline');

  useEffect(() => {
    const syncFromHash = () => setActiveTab(hashToTab(window.location.hash));
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const peakMips = systemConfig?.specs.peak_mips ?? 166400;
  const memBw = systemConfig?.specs.max_mem_bw_gbps ?? 102.4;
  const ridgePoint = useMemo(() => (memBw > 0 ? peakMips / memBw : 0), [peakMips, memBw]);
  const littlesWms = useMemo(
    () => (metrics.iops > 0 ? (metrics.queueDepth / metrics.iops) * 1000 : 0),
    [metrics.iops, metrics.queueDepth]
  );

  const backendRecommendation =
    metrics.memBound > metrics.coreBound
      ? 'Memory pressure dominates. Focus cache locality and reduce random accesses.'
      : metrics.coreBound > metrics.memBound
      ? 'Execution pressure dominates. Prioritize vectorization and instruction-level parallelism.'
      : 'Balanced pressure. Validate both memory hierarchy and execution occupancy.';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <header className="px-4">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-100 uppercase">Live Microarchitecture Wiki</h2>
        <div className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-[0.25em] font-black">
          Progressive Disclosure for Metric and Chart Understanding
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-700/60 shadow-xl overflow-hidden">
        <div className="border-b border-slate-700/60 px-3 md:px-6 py-3 flex flex-wrap gap-2 bg-slate-900/80">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs uppercase tracking-widest font-sans transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-500/10 border border-teal-500/40 text-teal-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 bg-slate-900/60 min-h-[360px]">
          {activeTab === 'roofline' && (
            <section className="space-y-5">
              <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">Roofline Model</h3>
              <p className="font-sans text-sm text-slate-300">Que mide: El limite real entre compute y memoria en tu nodo.</p>
              <p className="font-sans text-sm text-slate-300">Por que importa: Te dice si optimizar CPU o ancho de banda de memoria.</p>
              <p className="font-sans text-sm text-slate-300">Como leer tu valor actual: compara tu carga con el punto de quiebre (ridge point).</p>
              <p className="font-sans text-sm text-slate-300">Intensidad operacional (ops/byte) define cuanto trabajo util se obtiene por byte movido. Si esta por debajo del ridge point, la carga es memory-bound y mejorar cache/localidad tiene mayor impacto que subir frecuencia.</p>
              <p className="font-sans text-sm text-slate-300">Segun Hennessy y Patterson, el rendimiento real queda acotado por min(Pico Compute, BW Memoria x Intensidad). Tu techo efectivo cambia cuando varia la jerarquia de memoria o el patron de acceso.</p>
              <p className="font-sans text-sm text-slate-300">Con tus metricas actuales, un aumento de misses de cache reduce intensidad operacional efectiva y desplaza el punto de operacion hacia la pendiente de memoria.</p>
              <div className="font-mono text-sm text-white bg-slate-800 border border-slate-700 p-4">
                Ridge Point = Peak MIPS / Mem BW = {formatMetric(peakMips)} / {formatMetric(memBw)} = {formatMetric(ridgePoint)}
              </div>
            </section>
          )}

          {activeTab === 'cpi' && (
            <section className="space-y-5">
              <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">CPI & CPU Performance</h3>
              <p className="font-sans text-sm text-slate-300">Que mide: ciclos por instruccion para evaluar eficiencia del pipeline.</p>
              <p className="font-sans text-sm text-slate-300">Por que importa: CPI alto implica mas stalls y menos trabajo util por ciclo.</p>
              <p className="font-sans text-sm text-slate-300">Como leer tu valor actual: CPI cercano a 1 suele ser sano para carga general.</p>
              <p className="font-sans text-sm text-slate-300">Ecuacion de rendimiento: Performance = Frequency x IPC, donde IPC = 1/CPI en aproximacion de primer orden. Si CPI sube de {formatMetric(metrics.cpi)}, la capacidad de retiro de instrucciones cae aunque la frecuencia sea constante.</p>
              <p className="font-sans text-sm text-slate-300">Hennessy y Patterson descomponen CPI en base CPI + penalidades por misses, branch mispredicts y hazards estructurales. Por eso CPI es una suma de costos de pipeline, no un indicador aislado.</p>
              <p className="font-sans text-sm text-slate-300">Tu cache miss de {formatMetric(metrics.cacheMiss)}% y el contexto de stalls explican parte del CPI observado; reducir dependencia de memoria y mejorar locality baja el termino de penalidad.</p>
              <div className="font-mono text-sm text-white bg-slate-800 border border-slate-700 p-4">
                CPI = {formatMetric(metrics.cpi)} | IPS = {formatMetric(metrics.ips)} instr/s | Cache Miss = {formatMetric(metrics.cacheMiss)}%
              </div>
            </section>
          )}

          {activeTab === 'amat' && (
            <section className="space-y-5">
              <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">Memory Hierarchy</h3>
              <p className="font-sans text-sm text-slate-300">Que mide: el costo promedio de acceso a memoria en ciclos.</p>
              <p className="font-sans text-sm text-slate-300">Por que importa: subidas de AMAT suelen degradar throughput global.</p>
              <p className="font-sans text-sm text-slate-300">Como leer tu valor actual: si AMAT sube junto a miss rate, hay cuello en cache/RAM.</p>
              <p className="font-sans text-sm text-slate-300">Modelo clasico: AMAT = Hit Time + (Miss Rate x Miss Penalty). Cada nivel L1/L2/L3 agrega una probabilidad de fallo y una penalidad incremental hasta llegar a DRAM o acceso remoto NUMA.</p>
              <p className="font-sans text-sm text-slate-300">En terminos de teoria de jerarquia, pequenas subidas en miss rate pueden multiplicar el costo final por la alta latencia de memoria principal. Por eso optimizar locality tiene efecto desproporcionado.</p>
              <p className="font-sans text-sm text-slate-300">Con miss rate de {formatMetric(metrics.cacheMiss)}% y AMAT de {formatMetric(metrics.amat)} ciclos, el sistema refleja presion en la jerarquia de memoria que impacta directamente el CPI.</p>
              <div className="font-mono text-sm text-white bg-slate-800 border border-slate-700 p-4">
                AMAT = L1_Hit_Time + ({formatMetric(metrics.cacheMiss)}% * Miss_Penalty) = {formatMetric(metrics.amat)} cyc
              </div>
            </section>
          )}

          {activeTab === 'littles' && (
            <section className="space-y-5">
              <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">Little's Law</h3>
              <p className="font-sans text-sm text-slate-300">Que mide: relacion entre carga entrante, cola y tiempo de residencia.</p>
              <p className="font-sans text-sm text-slate-300">Por que importa: anticipa saturacion de I/O antes de que el sistema colapse.</p>
              <p className="font-sans text-sm text-slate-300">Como leer tu valor actual: W crece cuando iops no acompana al queue depth.</p>
              <p className="font-sans text-sm text-slate-300">Ley de Little: L = lambda x W, valida en regimen estable. En almacenamiento, L es queue depth, lambda son IOPS y W es latencia media de residencia por solicitud.</p>
              <p className="font-sans text-sm text-slate-300">Cuando lambda se estabiliza y L sigue aumentando, W crece de forma no lineal y aparece saturacion. Esta transicion explica colas largas y variabilidad de latencia incluso sin subir throughput.</p>
              <p className="font-sans text-sm text-slate-300">Con L={formatMetric(metrics.queueDepth)} e IOPS={formatMetric(metrics.iops)}, la residencia estimada es {formatMetric(littlesWms)} ms. Este valor sirve como alerta temprana de congestion de I/O.</p>
              <div className="font-mono text-sm text-white bg-slate-800 border border-slate-700 p-4">
                L = lambda * W | {formatMetric(metrics.queueDepth)} = {formatMetric(metrics.iops)} * {formatMetric(littlesWms)} ms
              </div>
            </section>
          )}

          {activeTab === 'tma' && (
            <section className="space-y-5">
              <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">Top-Down Analysis</h3>
              <p className="font-sans text-sm text-slate-300">Que mide: distribucion de slots del pipeline entre trabajo util y esperas.</p>
              <p className="font-sans text-sm text-slate-300">Por que importa: identifica rapido si el cuello esta en front-end, speculation o back-end.</p>
              <p className="font-sans text-sm text-slate-300">Como leer tu valor actual: observa Back-End y su desglose Memory/Core para decidir optimizacion.</p>
              <p className="font-sans text-sm text-slate-300">Top-Down divide slots en Retiring, Bad Speculation, Front-End Bound y Back-End Bound. La metodologia prioriza aislar primero donde se pierde capacidad de retiro y luego profundizar por nivel.</p>
              <p className="font-sans text-sm text-slate-300">En L2 de Back-End, Memory Bound separa esperas por datos (latencia/ancho de banda) y Core Bound refleja presion de puertos de ejecucion, dependencias y disponibilidad de unidades funcionales.</p>
              <p className="font-sans text-sm text-slate-300">Tu distribucion actual muestra Retiring {formatMetric(metrics.tmaRetiring)}%, Back-End {formatMetric(metrics.tmaBackEnd)}%, con Memory {formatMetric(metrics.memBound)}% y Core {formatMetric(metrics.coreBound)}% como guia de optimizacion inmediata.</p>
              <div className="font-mono text-sm text-white bg-slate-800 border border-slate-700 p-4 space-y-2">
                <div>Retiring: {formatMetric(metrics.tmaRetiring)}% | Bad Spec: {formatMetric(metrics.tmaBadSpec)}%</div>
                <div>Front-End: {formatMetric(metrics.tmaFrontEnd)}% | Back-End: {formatMetric(metrics.tmaBackEnd)}%</div>
                <div>Back-End L2 = Memory {formatMetric(metrics.memBound)}% + Core {formatMetric(metrics.coreBound)}%</div>
                <div className="text-teal-300">{backendRecommendation}</div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
