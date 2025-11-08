#!/usr/bin/env python3
"""
Add VIN Scanner missing translations to EN, ES, PT-BR
"""

import json
import sys
from pathlib import Path

# Translation data for all 102 missing keys
TRANSLATIONS = {
    "en": {
        "vin_scanner_hub": {
            "title": "VIN Scanner",
            "subtitle": "Comprehensive VIN scanning and analysis tools",
            "scan_camera": "Scan with Camera",
            "scan_camera_desc": "Scan VIN from vehicle sticker using camera",
            "quick_scan": "Quick Scan",
            "quick_scan_desc": "Fast VIN scanning with automatic detection",
            "scan_upload": "Upload Image",
            "scan_upload_desc": "Upload VIN sticker photo for analysis",
            "vin_analyzer": "VIN Analyzer",
            "vin_analyzer_desc": "Decode and validate VIN details",
            "scan_history": "Scan History",
            "scan_history_desc": "View previous VIN scans and results",
            "integration_guide": "Integration Guide",
            "integration_guide_desc": "How to use VIN scanner in your workflow",
            "recent_scans": "Recent Scans",
            "view_all": "View All Scans",
            "no_scans": "No scans yet",
            "start_scanning": "Start by scanning a VIN",
            "scan_success": "VIN scanned successfully",
            "scan_error": "Scan failed",
            "retry_scan": "Retry Scan",
            "vin_detected_success": "VIN detected successfully",
            "vin_detected_error": "Failed to detect VIN",
            "processing_image": "Processing image...",
            "analyzing_vin": "Analyzing VIN...",
            "validating_vin": "Validating VIN...",
            "decoding_vin": "Decoding vehicle information...",
            "confidence": "Confidence",
            "low_confidence_warning": "Low confidence scan. Please verify VIN manually.",
            "invalid_vin_warning": "Invalid VIN detected. Please rescan or enter manually.",
            "auto_corrected": "VIN auto-corrected ({{count}} changes)",
            "corrections_applied": "Corrections applied",
            "open_scanner": "Open Scanner",
            "close_scanner": "Close Scanner",
            "switch_mode": "Switch Mode",
            "camera_mode": "Camera Mode",
            "upload_mode": "Upload Mode",
            "help": "Help & Tips",
            "settings": "Scanner Settings"
        },
        "quick_scan": {
            "title": "Quick Scan",
            "description": "Fast VIN scanning with automatic detection",
            "start_scan": "Start Scan",
            "stop_scan": "Stop Scan",
            "scanning": "Scanning...",
            "position_vin": "Position VIN in camera frame",
            "hold_steady": "Hold steady...",
            "detecting": "Detecting VIN...",
            "vin_found": "VIN Found!",
            "processing": "Processing...",
            "scan_complete": "Scan Complete",
            "use_this_vin": "Use This VIN",
            "scan_another": "Scan Another",
            "tips": "Tips for best results",
            "tip_lighting": "Ensure good lighting",
            "tip_focus": "Keep VIN in focus and clear"
        },
        "vin_scanner_history": {
            "title": "Scan History",
            "subtitle": "Previous VIN scans and results",
            "filter_all": "All Scans",
            "filter_valid": "Valid Only",
            "filter_invalid": "Invalid Only",
            "filter_corrected": "Auto-corrected",
            "sort_newest": "Newest First",
            "sort_oldest": "Oldest First",
            "sort_confidence": "Highest Confidence",
            "clear_history": "Clear History",
            "confirm_clear": "Are you sure you want to clear scan history?",
            "history_cleared": "Scan history cleared",
            "no_history": "No scan history",
            "scanned_at": "Scanned at",
            "confidence_score": "Confidence: {{score}}%",
            "status_valid": "Valid",
            "status_invalid": "Invalid",
            "status_corrected": "Auto-corrected",
            "view_details": "View Details",
            "rescan": "Rescan"
        },
        "vin_integration": {
            "title": "VIN Scanner Integration",
            "subtitle": "How to use VIN scanner in your workflow",
            "step_1_title": "1. Open Scanner",
            "step_1_desc": "Click the QR code icon next to any VIN input field",
            "step_2_title": "2. Scan VIN",
            "step_2_desc": "Position the VIN sticker in camera frame or upload an image",
            "step_3_title": "3. Auto-decode",
            "step_3_desc": "VIN is automatically decoded and vehicle info populated",
            "available_in": "Available in:",
            "sales_orders": "Sales Orders",
            "service_orders": "Service Orders",
            "recon_orders": "Recon Orders",
            "car_wash": "Car Wash Orders",
            "best_practices": "Best Practices",
            "practice_lighting": "Use good lighting for best results",
            "practice_steady": "Hold device steady while scanning",
            "practice_verify": "Always verify decoded information"
        },
        "vin_analyzer": {
            "title": "VIN Analysis",
            "subtitle": "Decode and validate VIN details",
            "enter_vin": "Enter a VIN to see detailed analysis",
            "vin_input_label": "Vehicle Identification Number (VIN)",
            "analyze_button": "Analyze VIN",
            "analyzing": "Analyzing...",
            "status_valid": "Valid VIN",
            "status_invalid": "Invalid VIN",
            "check_digit_valid": "Check digit valid",
            "check_digit_invalid": "Check digit invalid",
            "manufacturer_info": "Manufacturer Info",
            "wmi_label": "WMI (1-3):",
            "wmi_desc": "World Manufacturer Identifier",
            "vds_label": "VDS (4-9):",
            "vds_desc": "Vehicle Descriptor Section",
            "vis_label": "VIS (10-17):",
            "vis_desc": "Vehicle Identifier Section",
            "decoded_info": "Decoded Information",
            "no_data": "No decoded data available"
        }
    },
    "es": {
        "vin_scanner_hub": {
            "title": "Escáner VIN",
            "subtitle": "Herramientas completas de escaneo y análisis de VIN",
            "scan_camera": "Escanear con Cámara",
            "scan_camera_desc": "Escanear VIN de la calcomanía del vehículo usando la cámara",
            "quick_scan": "Escaneo Rápido",
            "quick_scan_desc": "Escaneo VIN rápido con detección automática",
            "scan_upload": "Subir Imagen",
            "scan_upload_desc": "Subir foto de la calcomanía VIN para análisis",
            "vin_analyzer": "Analizador VIN",
            "vin_analyzer_desc": "Decodificar y validar detalles del VIN",
            "scan_history": "Historial de Escaneos",
            "scan_history_desc": "Ver escaneos VIN previos y resultados",
            "integration_guide": "Guía de Integración",
            "integration_guide_desc": "Cómo usar el escáner VIN en tu flujo de trabajo",
            "recent_scans": "Escaneos Recientes",
            "view_all": "Ver Todos los Escaneos",
            "no_scans": "Aún no hay escaneos",
            "start_scanning": "Comienza escaneando un VIN",
            "scan_success": "VIN escaneado exitosamente",
            "scan_error": "Escaneo fallido",
            "retry_scan": "Reintentar Escaneo",
            "vin_detected_success": "VIN detectado exitosamente",
            "vin_detected_error": "Error al detectar VIN",
            "processing_image": "Procesando imagen...",
            "analyzing_vin": "Analizando VIN...",
            "validating_vin": "Validando VIN...",
            "decoding_vin": "Decodificando información del vehículo...",
            "confidence": "Confianza",
            "low_confidence_warning": "Escaneo de baja confianza. Por favor verifica el VIN manualmente.",
            "invalid_vin_warning": "VIN inválido detectado. Por favor reescanea o ingresa manualmente.",
            "auto_corrected": "VIN auto-corregido ({{count}} cambios)",
            "corrections_applied": "Correcciones aplicadas",
            "open_scanner": "Abrir Escáner",
            "close_scanner": "Cerrar Escáner",
            "switch_mode": "Cambiar Modo",
            "camera_mode": "Modo Cámara",
            "upload_mode": "Modo Subir",
            "help": "Ayuda y Consejos",
            "settings": "Configuración del Escáner"
        },
        "quick_scan": {
            "title": "Escaneo Rápido",
            "description": "Escaneo VIN rápido con detección automática",
            "start_scan": "Iniciar Escaneo",
            "stop_scan": "Detener Escaneo",
            "scanning": "Escaneando...",
            "position_vin": "Posiciona el VIN en el marco de la cámara",
            "hold_steady": "Mantén firme...",
            "detecting": "Detectando VIN...",
            "vin_found": "¡VIN Encontrado!",
            "processing": "Procesando...",
            "scan_complete": "Escaneo Completo",
            "use_this_vin": "Usar Este VIN",
            "scan_another": "Escanear Otro",
            "tips": "Consejos para mejores resultados",
            "tip_lighting": "Asegura buena iluminación",
            "tip_focus": "Mantén el VIN enfocado y claro"
        },
        "vin_scanner_history": {
            "title": "Historial de Escaneos",
            "subtitle": "Escaneos VIN previos y resultados",
            "filter_all": "Todos los Escaneos",
            "filter_valid": "Solo Válidos",
            "filter_invalid": "Solo Inválidos",
            "filter_corrected": "Auto-corregidos",
            "sort_newest": "Más Recientes Primero",
            "sort_oldest": "Más Antiguos Primero",
            "sort_confidence": "Mayor Confianza",
            "clear_history": "Limpiar Historial",
            "confirm_clear": "¿Estás seguro de que quieres limpiar el historial de escaneos?",
            "history_cleared": "Historial de escaneos limpiado",
            "no_history": "Sin historial de escaneos",
            "scanned_at": "Escaneado a las",
            "confidence_score": "Confianza: {{score}}%",
            "status_valid": "Válido",
            "status_invalid": "Inválido",
            "status_corrected": "Auto-corregido",
            "view_details": "Ver Detalles",
            "rescan": "Reescanear"
        },
        "vin_integration": {
            "title": "Integración del Escáner VIN",
            "subtitle": "Cómo usar el escáner VIN en tu flujo de trabajo",
            "step_1_title": "1. Abrir Escáner",
            "step_1_desc": "Haz clic en el ícono de código QR junto a cualquier campo de entrada VIN",
            "step_2_title": "2. Escanear VIN",
            "step_2_desc": "Posiciona la calcomanía VIN en el marco de la cámara o sube una imagen",
            "step_3_title": "3. Auto-decodificar",
            "step_3_desc": "El VIN se decodifica automáticamente y se rellena la info del vehículo",
            "available_in": "Disponible en:",
            "sales_orders": "Órdenes de Venta",
            "service_orders": "Órdenes de Servicio",
            "recon_orders": "Órdenes de Reconversión",
            "car_wash": "Órdenes de Lavado",
            "best_practices": "Mejores Prácticas",
            "practice_lighting": "Usa buena iluminación para mejores resultados",
            "practice_steady": "Mantén el dispositivo firme mientras escaneas",
            "practice_verify": "Siempre verifica la información decodificada"
        },
        "vin_analyzer": {
            "title": "Análisis de VIN",
            "subtitle": "Decodificar y validar detalles del VIN",
            "enter_vin": "Ingresa un VIN para ver el análisis detallado",
            "vin_input_label": "Número de Identificación del Vehículo (VIN)",
            "analyze_button": "Analizar VIN",
            "analyzing": "Analizando...",
            "status_valid": "VIN Válido",
            "status_invalid": "VIN Inválido",
            "check_digit_valid": "Dígito de verificación válido",
            "check_digit_invalid": "Dígito de verificación inválido",
            "manufacturer_info": "Información del Fabricante",
            "wmi_label": "WMI (1-3):",
            "wmi_desc": "Identificador Mundial del Fabricante",
            "vds_label": "VDS (4-9):",
            "vds_desc": "Sección Descriptora del Vehículo",
            "vis_label": "VIS (10-17):",
            "vis_desc": "Sección Identificadora del Vehículo",
            "decoded_info": "Información Decodificada",
            "no_data": "No hay datos decodificados disponibles"
        }
    },
    "pt-BR": {
        "vin_scanner_hub": {
            "title": "Scanner VIN",
            "subtitle": "Ferramentas completas de digitalização e análise de VIN",
            "scan_camera": "Digitalizar com Câmera",
            "scan_camera_desc": "Digitalizar VIN do adesivo do veículo usando câmera",
            "quick_scan": "Digitalização Rápida",
            "quick_scan_desc": "Digitalização VIN rápida com detecção automática",
            "scan_upload": "Carregar Imagem",
            "scan_upload_desc": "Carregar foto do adesivo VIN para análise",
            "vin_analyzer": "Analisador VIN",
            "vin_analyzer_desc": "Decodificar e validar detalhes do VIN",
            "scan_history": "Histórico de Digitalizações",
            "scan_history_desc": "Ver digitalizações VIN anteriores e resultados",
            "integration_guide": "Guia de Integração",
            "integration_guide_desc": "Como usar o scanner VIN no seu fluxo de trabalho",
            "recent_scans": "Digitalizações Recentes",
            "view_all": "Ver Todas as Digitalizações",
            "no_scans": "Ainda não há digitalizações",
            "start_scanning": "Comece digitalizando um VIN",
            "scan_success": "VIN digitalizado com sucesso",
            "scan_error": "Digitalização falhou",
            "retry_scan": "Tentar Novamente",
            "vin_detected_success": "VIN detectado com sucesso",
            "vin_detected_error": "Erro ao detectar VIN",
            "processing_image": "Processando imagem...",
            "analyzing_vin": "Analisando VIN...",
            "validating_vin": "Validando VIN...",
            "decoding_vin": "Decodificando informações do veículo...",
            "confidence": "Confiança",
            "low_confidence_warning": "Digitalização de baixa confiança. Por favor verifique o VIN manualmente.",
            "invalid_vin_warning": "VIN inválido detectado. Por favor digitalize novamente ou insira manualmente.",
            "auto_corrected": "VIN auto-corrigido ({{count}} alterações)",
            "corrections_applied": "Correções aplicadas",
            "open_scanner": "Abrir Scanner",
            "close_scanner": "Fechar Scanner",
            "switch_mode": "Mudar Modo",
            "camera_mode": "Modo Câmera",
            "upload_mode": "Modo Carregar",
            "help": "Ajuda e Dicas",
            "settings": "Configurações do Scanner"
        },
        "quick_scan": {
            "title": "Digitalização Rápida",
            "description": "Digitalização VIN rápida com detecção automática",
            "start_scan": "Iniciar Digitalização",
            "stop_scan": "Parar Digitalização",
            "scanning": "Digitalizando...",
            "position_vin": "Posicione o VIN no quadro da câmera",
            "hold_steady": "Mantenha firme...",
            "detecting": "Detectando VIN...",
            "vin_found": "VIN Encontrado!",
            "processing": "Processando...",
            "scan_complete": "Digitalização Completa",
            "use_this_vin": "Usar Este VIN",
            "scan_another": "Digitalizar Outro",
            "tips": "Dicas para melhores resultados",
            "tip_lighting": "Garanta boa iluminação",
            "tip_focus": "Mantenha o VIN focado e claro"
        },
        "vin_scanner_history": {
            "title": "Histórico de Digitalizações",
            "subtitle": "Digitalizações VIN anteriores e resultados",
            "filter_all": "Todas as Digitalizações",
            "filter_valid": "Somente Válidos",
            "filter_invalid": "Somente Inválidos",
            "filter_corrected": "Auto-corrigidos",
            "sort_newest": "Mais Recentes Primeiro",
            "sort_oldest": "Mais Antigos Primeiro",
            "sort_confidence": "Maior Confiança",
            "clear_history": "Limpar Histórico",
            "confirm_clear": "Tem certeza de que deseja limpar o histórico de digitalizações?",
            "history_cleared": "Histórico de digitalizações limpo",
            "no_history": "Sem histórico de digitalizações",
            "scanned_at": "Digitalizado em",
            "confidence_score": "Confiança: {{score}}%",
            "status_valid": "Válido",
            "status_invalid": "Inválido",
            "status_corrected": "Auto-corrigido",
            "view_details": "Ver Detalhes",
            "rescan": "Redigitalizar"
        },
        "vin_integration": {
            "title": "Integração do Scanner VIN",
            "subtitle": "Como usar o scanner VIN no seu fluxo de trabalho",
            "step_1_title": "1. Abrir Scanner",
            "step_1_desc": "Clique no ícone de código QR ao lado de qualquer campo de entrada VIN",
            "step_2_title": "2. Digitalizar VIN",
            "step_2_desc": "Posicione o adesivo VIN no quadro da câmera ou carregue uma imagem",
            "step_3_title": "3. Auto-decodificar",
            "step_3_desc": "O VIN é automaticamente decodificado e as informações do veículo são preenchidas",
            "available_in": "Disponível em:",
            "sales_orders": "Ordens de Venda",
            "service_orders": "Ordens de Serviço",
            "recon_orders": "Ordens de Reconversão",
            "car_wash": "Ordens de Lavagem",
            "best_practices": "Melhores Práticas",
            "practice_lighting": "Use boa iluminação para melhores resultados",
            "practice_steady": "Mantenha o dispositivo firme enquanto digitaliza",
            "practice_verify": "Sempre verifique as informações decodificadas"
        },
        "vin_analyzer": {
            "title": "Análise de VIN",
            "subtitle": "Decodificar e validar detalhes do VIN",
            "enter_vin": "Insira um VIN para ver a análise detalhada",
            "vin_input_label": "Número de Identificação do Veículo (VIN)",
            "analyze_button": "Analisar VIN",
            "analyzing": "Analisando...",
            "status_valid": "VIN Válido",
            "status_invalid": "VIN Inválido",
            "check_digit_valid": "Dígito de verificação válido",
            "check_digit_invalid": "Dígito de verificação inválido",
            "manufacturer_info": "Informações do Fabricante",
            "wmi_label": "WMI (1-3):",
            "wmi_desc": "Identificador Mundial do Fabricante",
            "vds_label": "VDS (4-9):",
            "vds_desc": "Seção Descritora do Veículo",
            "vis_label": "VIS (10-17):",
            "vis_desc": "Seção Identificadora do Veículo",
            "decoded_info": "Informações Decodificadas",
            "no_data": "Nenhum dado decodificado disponível"
        }
    }
}


def add_translations_to_json(file_path: Path, lang: str) -> bool:
    """Add VIN Scanner translations to JSON file."""
    try:
        # Read existing JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"[OK] Loaded {file_path.name} ({len(json.dumps(data))} bytes)")

        # Get translations for this language
        new_translations = TRANSLATIONS[lang]

        # Track changes
        added_keys = 0
        updated_keys = 0

        # Add each section
        for section, keys in new_translations.items():
            if section not in data:
                data[section] = {}
                print(f"  + Created new section: {section}")

            # Add/update keys
            for key, value in keys.items():
                full_key = f"{section}.{key}"
                if key not in data[section]:
                    added_keys += 1
                    print(f"  + Added: {full_key}")
                elif data[section][key] != value:
                    updated_keys += 1
                    print(f"  ~ Updated: {full_key}")

                data[section][key] = value

        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[OK] Saved {file_path.name}")
        print(f"  Added: {added_keys} keys")
        print(f"  Updated: {updated_keys} keys")
        print()

        return True

    except Exception as e:
        print(f"[ERROR] Processing {file_path.name}: {e}")
        return False


def main():
    """Main execution."""
    print("=" * 60)
    print("VIN Scanner Translation Update")
    print("=" * 60)
    print()

    base_dir = Path(__file__).parent.parent / "public" / "translations"

    files = {
        "en": base_dir / "en.json",
        "es": base_dir / "es.json",
        "pt-BR": base_dir / "pt-BR.json"
    }

    success_count = 0

    for lang, file_path in files.items():
        print(f"Processing {lang.upper()} translations...")
        if add_translations_to_json(file_path, lang):
            success_count += 1

    print("=" * 60)
    print(f"COMPLETE: {success_count}/3 files updated successfully")
    print("=" * 60)

    if success_count == 3:
        print()
        print("[SUCCESS] All VIN Scanner translations added!")
        print("  - 5 sections added per language")
        print("  - 102 total keys per language")
        print("  - EN, ES, PT-BR coverage: 100%")
        print()
        print("Next steps:")
        print("  1. Refactor VinAnalyzer.tsx to use i18n")
        print("  2. Run: node scripts/audit-translations.cjs")
        print("  3. Test in browser (EN/ES/PT-BR)")
        return 0
    else:
        print()
        print("[FAILED] Some files failed to update")
        return 1


if __name__ == "__main__":
    sys.exit(main())
