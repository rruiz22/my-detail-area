const fs = require('fs');
const path = require('path');

// Translation keys for getReady.analytics
const analyticsTranslations = {
  en: {
    historicalAnalytics: "Historical Analytics",
    historicalTrends: "Historical Trends",
    performanceMetricsOverTime: "Performance metrics over time",
    timeRange: "Time Range",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    last90Days: "Last 90 Days",

    // Chart labels
    timeToLine: "Time to Line",
    throughput: "Throughput",
    slaCompliance: "SLA Compliance",
    days: "days",
    vehicles: "Vehicles",
    completed: "Completed",
    active: "Active",

    // Metrics
    currentAvg: "Current Average",
    currentSLA: "Current SLA",
    trendVsPeriod: "Trend vs Period",
    totalCompleted: "Total Completed",
    avgDaily: "Avg Daily",
    trend: "Trend",
    avgT2L: "Avg T2L",

    // States
    loading: "Loading analytics data...",
    noDataAvailable: "No data available for this time period",
    errorLoadingData: "Error loading analytics data",

    // Bottleneck Analysis
    bottleneckDetection: "Bottleneck Detection",
    actionRequired: "Action Required",
    topBottlenecksIdentified: "Top {{count}} bottlenecks identified",
    bottleneckScore: "Bottleneck Score",
    revisitRate: "Revisit Rate",
    avgTime: "Avg Time",
    backtracks: "Backtracks",
    recommendedActions: "Recommended Actions",
    viewAffectedVehicles: "View Affected Vehicles",
    viewDetails: "View Details",
    summaryTitle: "Summary",
    criticalBottlenecksFound: "Critical bottlenecks found - immediate action required",
    bottlenecksNeedAttention: "Bottlenecks detected that need attention",
    noBottlenecksDetected: "No Bottlenecks Detected",
    "workflowRunningSmoothly": "Workflow running smoothly",

    // Severity
    severity: {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low"
    },

    // Recommendations
    recommendations: {
      reviewQualityControl: "Review quality control processes",
      increaseResources: "Consider increasing resources for this step",
      improveWorkflow: "Improve workflow to reduce backtracks",
      considerParallel: "Consider parallel processing",
      monitorClosely: "Monitor closely for trends"
    },

    // Step Performance Matrix
    stepPerformanceMatrix: "Step Performance Matrix",
    needsAttention: "needs attention",
    revisitRatesAndBacktracks: "Revisit rates and backtrack analysis",
    avgRevisitRate: "Avg Revisit Rate",
    totalBacktracks: "Total Backtracks",
    vehiclesProcessed: "Vehicles Processed",
    stepsAnalyzed: "Steps Analyzed",
    step: "Step",
    maxRevisits: "Max Revisits",
    onRevisit: "on revisit",
    rate: "rate",
    revisitRateSeverity: "Revisit Rate Severity",
    excellent: "Excellent",
    good: "Good",
    needsImprovement: "Needs Improvement",
    critical: "Critical",
    backtrackDetected: "Backtrack detected"
  },

  es: {
    historicalAnalytics: "Análisis Histórico",
    historicalTrends: "Tendencias Históricas",
    performanceMetricsOverTime: "Métricas de rendimiento a lo largo del tiempo",
    timeRange: "Rango de Tiempo",
    last7Days: "Últimos 7 Días",
    last30Days: "Últimos 30 Días",
    last90Days: "Últimos 90 Días",

    // Chart labels
    timeToLine: "Tiempo a Línea",
    throughput: "Rendimiento",
    slaCompliance: "Cumplimiento SLA",
    days: "días",
    vehicles: "Vehículos",
    completed: "Completados",
    active: "Activos",

    // Metrics
    currentAvg: "Promedio Actual",
    currentSLA: "SLA Actual",
    trendVsPeriod: "Tendencia vs Período",
    totalCompleted: "Total Completados",
    avgDaily: "Promedio Diario",
    trend: "Tendencia",
    avgT2L: "T2L Promedio",

    // States
    loading: "Cargando datos de análisis...",
    noDataAvailable: "No hay datos disponibles para este período",
    errorLoadingData: "Error al cargar datos de análisis",

    // Bottleneck Analysis
    bottleneckDetection: "Detección de Cuellos de Botella",
    actionRequired: "Acción Requerida",
    topBottlenecksIdentified: "Top {{count}} cuellos de botella identificados",
    bottleneckScore: "Puntuación de Cuello de Botella",
    revisitRate: "Tasa de Revisita",
    avgTime: "Tiempo Promedio",
    backtracks: "Retrocesos",
    recommendedActions: "Acciones Recomendadas",
    viewAffectedVehicles: "Ver Vehículos Afectados",
    viewDetails: "Ver Detalles",
    summaryTitle: "Resumen",
    criticalBottlenecksFound: "Cuellos de botella críticos encontrados - se requiere acción inmediata",
    bottlenecksNeedAttention: "Cuellos de botella detectados que necesitan atención",
    noBottlenecksDetected: "No Se Detectaron Cuellos de Botella",
    workflowRunningSmoothly: "El flujo de trabajo funciona sin problemas",

    // Severity
    severity: {
      critical: "Crítico",
      high: "Alto",
      medium: "Medio",
      low: "Bajo"
    },

    // Recommendations
    recommendations: {
      reviewQualityControl: "Revisar procesos de control de calidad",
      increaseResources: "Considerar aumentar recursos para este paso",
      improveWorkflow: "Mejorar flujo de trabajo para reducir retrocesos",
      considerParallel: "Considerar procesamiento paralelo",
      monitorClosely: "Monitorear de cerca las tendencias"
    },

    // Step Performance Matrix
    stepPerformanceMatrix: "Matriz de Rendimiento de Pasos",
    needsAttention: "necesita atención",
    revisitRatesAndBacktracks: "Tasas de revisita y análisis de retrocesos",
    avgRevisitRate: "Tasa de Revisita Promedio",
    totalBacktracks: "Retrocesos Totales",
    vehiclesProcessed: "Vehículos Procesados",
    stepsAnalyzed: "Pasos Analizados",
    step: "Paso",
    maxRevisits: "Revisitas Máximas",
    onRevisit: "en revisita",
    rate: "tasa",
    revisitRateSeverity: "Severidad de Tasa de Revisita",
    excellent: "Excelente",
    good: "Bueno",
    needsImprovement: "Necesita Mejora",
    critical: "Crítico",
    backtrackDetected: "Retroceso detectado"
  },

  "pt-BR": {
    historicalAnalytics: "Análise Histórica",
    historicalTrends: "Tendências Históricas",
    performanceMetricsOverTime: "Métricas de desempenho ao longo do tempo",
    timeRange: "Intervalo de Tempo",
    last7Days: "Últimos 7 Dias",
    last30Days: "Últimos 30 Dias",
    last90Days: "Últimos 90 Dias",

    // Chart labels
    timeToLine: "Tempo até Linha",
    throughput: "Rendimento",
    slaCompliance: "Conformidade SLA",
    days: "dias",
    vehicles: "Veículos",
    completed: "Concluídos",
    active: "Ativos",

    // Metrics
    currentAvg: "Média Atual",
    currentSLA: "SLA Atual",
    trendVsPeriod: "Tendência vs Período",
    totalCompleted: "Total Concluído",
    avgDaily: "Média Diária",
    trend: "Tendência",
    avgT2L: "T2L Médio",

    // States
    loading: "Carregando dados de análise...",
    noDataAvailable: "Nenhum dado disponível para este período",
    errorLoadingData: "Erro ao carregar dados de análise",

    // Bottleneck Analysis
    bottleneckDetection: "Detecção de Gargalos",
    actionRequired: "Ação Necessária",
    topBottlenecksIdentified: "Top {{count}} gargalos identificados",
    bottleneckScore: "Pontuação de Gargalo",
    revisitRate: "Taxa de Revisita",
    avgTime: "Tempo Médio",
    backtracks: "Retrocessos",
    recommendedActions: "Ações Recomendadas",
    viewAffectedVehicles: "Ver Veículos Afetados",
    viewDetails: "Ver Detalhes",
    summaryTitle: "Resumo",
    criticalBottlenecksFound: "Gargalos críticos encontrados - ação imediata necessária",
    bottlenecksNeedAttention: "Gargalos detectados que precisam de atenção",
    noBottlenecksDetected: "Nenhum Gargalo Detectado",
    workflowRunningSmoothly: "Fluxo de trabalho funcionando perfeitamente",

    // Severity
    severity: {
      critical: "Crítico",
      high: "Alto",
      medium: "Médio",
      low: "Baixo"
    },

    // Recommendations
    recommendations: {
      reviewQualityControl: "Revisar processos de controle de qualidade",
      increaseResources: "Considerar aumentar recursos para esta etapa",
      improveWorkflow: "Melhorar fluxo de trabalho para reduzir retrocessos",
      considerParallel: "Considerar processamento paralelo",
      monitorClosely: "Monitorar de perto as tendências"
    },

    // Step Performance Matrix
    stepPerformanceMatrix: "Matriz de Desempenho de Etapas",
    needsAttention: "precisa de atenção",
    revisitRatesAndBacktracks: "Taxas de revisita e análise de retrocessos",
    avgRevisitRate: "Taxa de Revisita Média",
    totalBacktracks: "Retrocessos Totais",
    vehiclesProcessed: "Veículos Processados",
    stepsAnalyzed: "Etapas Analisadas",
    step: "Etapa",
    maxRevisits: "Revisitas Máximas",
    onRevisit: "na revisita",
    rate: "taxa",
    revisitRateSeverity: "Severidade da Taxa de Revisita",
    excellent: "Excelente",
    good: "Bom",
    needsImprovement: "Precisa de Melhoria",
    critical: "Crítico",
    backtrackDetected: "Retrocesso detectado"
  }
};

// Function to add translations to a file
function addTranslations(filePath, lang) {
  const content = fs.readFileSync(filePath, 'utf8');
  const translations = JSON.parse(content);

  // Navigate to get_ready section
  if (!translations.get_ready) {
    translations.get_ready = {};
  }

  // Add analytics section
  translations.get_ready.analytics = analyticsTranslations[lang];

  // Write back with proper formatting
  fs.writeFileSync(
    filePath,
    JSON.stringify(translations, null, 2) + '\n',
    'utf8'
  );

  console.log(`✅ Added analytics translations to ${lang}.json`);
}

// Main execution
const translationsDir = path.join(__dirname, '..', 'public', 'translations');

try {
  addTranslations(path.join(translationsDir, 'en.json'), 'en');
  addTranslations(path.join(translationsDir, 'es.json'), 'es');
  addTranslations(path.join(translationsDir, 'pt-BR.json'), 'pt-BR');

  console.log('\n🎉 Successfully added analytics translations to all 3 languages!');
  console.log('   - English (en.json)');
  console.log('   - Spanish (es.json)');
  console.log('   - Portuguese Brazil (pt-BR.json)');
} catch (error) {
  console.error('❌ Error adding translations:', error);
  process.exit(1);
}
