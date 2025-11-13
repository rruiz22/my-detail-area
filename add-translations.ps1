# Add missing translations to all language files

$translations = @{
    en = @{
        operational_performance_summary = "Operational Performance Summary"
        key_operational_metrics = "Key operational metrics and efficiency indicators"
        financial_performance_overview = "Financial Performance Overview"
        revenue_insights = "Revenue insights and financial metrics"
        this_week = "This Week"
        last_week = "Last Week"
        two_weeks_ago = "2 Weeks Ago"
        invoice_management = "Invoice Management"
        add_payment = "Add Payment"
        view_details = "View Details"
        delete_invoice = "Delete Invoice"
        loading_services = "Loading services..."
        no_services_available = "No services available"
        add_service_to_exclude = "Add service to exclude..."
    }
    es = @{
        operational_performance_summary = "Resumen de Rendimiento Operacional"
        key_operational_metrics = "Métricas operacionales clave e indicadores de eficiencia"
        financial_performance_overview = "Resumen de Rendimiento Financiero"
        revenue_insights = "Información de ingresos y métricas financieras"
        this_week = "Esta Semana"
        last_week = "Semana Pasada"
        two_weeks_ago = "Hace 2 Semanas"
        invoice_management = "Gestión de Facturas"
        add_payment = "Agregar Pago"
        view_details = "Ver Detalles"
        delete_invoice = "Eliminar Factura"
        loading_services = "Cargando servicios..."
        no_services_available = "No hay servicios disponibles"
        add_service_to_exclude = "Agregar servicio a excluir..."
    }
    pt = @{
        operational_performance_summary = "Resumo de Desempenho Operacional"
        key_operational_metrics = "Métricas operacionais principais e indicadores de eficiência"
        financial_performance_overview = "Visão Geral do Desempenho Financeiro"
        revenue_insights = "Insights de receita e métricas financeiras"
        this_week = "Esta Semana"
        last_week = "Semana Passada"
        two_weeks_ago = "2 Semanas Atrás"
        invoice_management = "Gerenciamento de Faturas"
        add_payment = "Adicionar Pagamento"
        view_details = "Ver Detalhes"
        delete_invoice = "Excluir Fatura"
        loading_services = "Carregando serviços..."
        no_services_available = "Nenhum serviço disponível"
        add_service_to_exclude = "Adicionar serviço para excluir..."
    }
}

$files = @{
    en = "public/translations/en.json"
    es = "public/translations/es.json"
    pt = "public/translations/pt-BR.json"
}

foreach ($lang in @('en', 'es', 'pt')) {
    $file = $files[$lang]
    $content = Get-Content $file -Raw | ConvertFrom-Json

    # Add new keys to reports namespace
    foreach ($key in $translations[$lang].Keys) {
        $content.reports | Add-Member -NotePropertyName $key -NotePropertyValue $translations[$lang][$key] -Force
    }

    # Save with proper formatting
    $content | ConvertTo-Json -Depth 10 | Set-Content $file -Encoding UTF8
}

Write-Host "Translations added successfully to all language files!" -ForegroundColor Green
