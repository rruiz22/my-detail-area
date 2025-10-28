// HERO SECTION MEJORADO - src/pages/Dashboard.tsx (líneas 30-97)
// ============================================================

// CÓDIGO ACTUAL (con problemas):
{/* Hero Section */}
<div className="relative overflow-hidden rounded-xl bg-gradient-primary p-8 text-primary-foreground">
  <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{
    backgroundImage: `url(${dealershipHero})`
  }} />
  <div className="relative z-10">
    <h1 className="text-3xl font-bold mb-2">{t('dashboard.hero.welcome')}</h1>
    <p className="text-xl opacity-90">{t('dashboard.hero.subtitle')}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      {/* Botones... */}
    </div>
  </div>
</div>

// ============================================================
// CÓDIGO MEJORADO (Notion-compliant, Dark mode support):
// ============================================================

{/* Hero Section */}
<div className="relative overflow-hidden rounded-xl bg-gray-900 p-4 sm:p-6 lg:p-8 text-white">
  {/* Imagen de fondo */}
  <div className="absolute inset-0 bg-cover bg-center" style={{
    backgroundImage: `url(${dealershipHero})`
  }} />
  
  {/* Overlay oscuro mejorado y responsive a dark mode */}
  <div className="absolute inset-0 bg-black/40 dark:bg-black/50" />
  
  {/* Contenido con z-index para estar arriba del overlay */}
  <div className="relative z-10">
    <h1 className="text-3xl font-bold mb-2">{t('dashboard.hero.welcome')}</h1>
    <p className="text-xl opacity-90">{t('dashboard.hero.subtitle')}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      {/* New Order - Always show if user has any order type permission */}
      {(hasPermission('sales_orders', 'edit') ||
        hasPermission('service_orders', 'edit') ||
        hasPermission('recon_orders', 'edit') ||
        hasPermission('car_wash', 'edit')) && (
        <Button
          variant="secondary"
          onClick={() => handleQuickAction('create_order', '/vin-scanner')}
          className="button-enhanced"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('dashboard.hero.new_order')}
        </Button>
      )}

      {/* View Pending Orders - Show count from real data */}
      {pendingCount > 0 && (
        <Button
          variant="outline"
          className="border-white/20 dark:border-gray-300/20 text-white hover:bg-white/10 dark:hover:bg-white/5"
          onClick={() => {
            if (hasPermission('sales_orders', 'view')) navigate('/sales?filter=pending');
            else if (hasPermission('service_orders', 'view')) navigate('/service?filter=pending');
            else if (hasPermission('recon_orders', 'view')) navigate('/recon?filter=pending');
            else navigate('/carwash?filter=pending');
          }}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {t('dashboard.hero.view_pending', { count: pendingCount })}
        </Button>
      )}

      {/* Get Ready - Workflow Management */}
      {hasPermission('productivity', 'view') && (
        <Button
          variant="outline"
          className="border-white/20 dark:border-gray-300/20 text-white hover:bg-white/10 dark:hover:bg-white/5"
          onClick={() => handleQuickAction('get_ready', '/get-ready')}
        >
          <Zap className="h-4 w-4 mr-2" />
          {t('dashboard.hero.get_ready')}
        </Button>
      )}

      {/* Team Chat */}
      {hasPermission('chat', 'view') && (
        <Button
          variant="outline"
          className="border-white/20 dark:border-gray-300/20 text-white hover:bg-white/10 dark:hover:bg-white/5"
          onClick={() => handleQuickAction('team_chat', '/chat')}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {t('dashboard.hero.team_chat')}
        </Button>
      )}
    </div>
  </div>
</div>

// ============================================================
// CAMBIOS REALIZADOS Y JUSTIFICACIÓN
// ============================================================

1. bg-gradient-primary → bg-gray-900
   - Problema: bg-gradient-primary NO EXISTE en CSS
   - Solución: Gray-900 es sólido, Notion-compliant (SIN GRADIENTES)
   - Beneficio: Cumple requisito NO-GRADIENTS del proyecto

2. opacity-20 → bg-black/40 dark:bg-black/50
   - Problema: opacity-20 muy bajo, bajo contraste WCAG
   - Solución: Overlay oscuro dinámico que responde a dark mode
   - Beneficio: Mejor contraste, dark mode support

3. text-primary-foreground → text-white
   - Problema: En dark mode es gris oscuro (ilegible)
   - Solución: text-white siempre legible en ambos modos
   - Beneficio: Accesibilidad mejorada (contrast ratio > 4.5:1)

4. p-8 → p-4 sm:p-6 lg:p-8
   - Problema: p-8 demasiado grande en móvil
   - Solución: Padding responsive escalonado
   - Beneficio: Mejor UX en pantallas pequeñas

5. border-white/20 → border-white/20 dark:border-gray-300/20
   - Problema: border-white/20 no funciona bien en dark mode
   - Solución: Dark mode variant con gray-300
   - Beneficio: Botones visibles en ambos modos

6. hover:bg-white/10 → hover:bg-white/10 dark:hover:bg-white/5
   - Problema: Hover muy fuerte en dark mode
   - Solución: Dark mode variant con opacidad menor
   - Beneficio: Coherencia visual en ambos modos

// ============================================================
// TESTING CHECKLIST
// ============================================================

[ ] Light mode
    [ ] Texto visible con buen contraste
    [ ] Imagen visible pero no distrae
    [ ] Botones con hover effect claro
    
[ ] Dark mode
    [ ] Texto completamente legible
    [ ] Overlay oscuro visible
    [ ] Botones con contraste suficiente
    
[ ] Mobile (<640px)
    [ ] Padding p-4 es apropiado
    [ ] Texto no se corta
    [ ] Botones no solapan
    
[ ] Tablet (640px-1024px)
    [ ] Padding p-6 se ve bien
    [ ] Layout flexible
    
[ ] Desktop (>1024px)
    [ ] Padding p-8 es apropiado
    [ ] Imagen visible completamente
    
[ ] Accesibilidad
    [ ] Contrast ratio >= 4.5:1
    [ ] Keyboard navigation funciona
    [ ] Screen reader describe botones correctamente

// ============================================================
// NO SE MODIFICAN
// ============================================================

- Traducciones: Todas existen en EN, ES, PT-BR
- Lógica de permisos: Mantiene mismo funcionamiento
- Estructura HTML: Mantiene z-index y positioning
- Imports: Mantiene todos los imports existentes
