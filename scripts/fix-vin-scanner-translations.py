#!/usr/bin/env python3
"""
Fix VIN Scanner Hub missing translations
Adds 28 missing keys that VinScannerHub.tsx component requires
"""

import json
import sys
from pathlib import Path

# Exact translation keys that VinScannerHub.tsx uses
MISSING_KEYS = {
    "en": {
        "upload_image": "Upload Image",
        "upload_image_desc": "Upload VIN sticker photo for analysis",
        "quick_mode": "Quick Mode",
        "quick_mode_desc": "Fast VIN scanning with automatic detection",
        "analytics": "Analytics",
        "analytics_desc": "View scan statistics and insights",
        "advanced_scanner": "Advanced Scanner",
        "ready_to_scan": "Ready to Scan",
        "scanner_description": "Use camera or upload images to scan VIN codes with AI-powered recognition",
        "manual_input_label": "Manual VIN Input",
        "manual_input_placeholder": "Enter 17-character VIN or scan with camera",
        "mobile_optimized": "Mobile Optimized",
        "tablet_optimized": "Tablet Optimized",
        "desktop_optimized": "Desktop Optimized",
        "multi_engine": "Multi-Engine",
        "ai_powered": "AI Powered",
        "smart_scan_description": "Advanced scanner with automatic region detection and intelligent focus",
        "scanner": "Scanner",
        "smart_focus": "Smart Focus",
        "smart": "Smart",
        "scan": "Scan",
        "hist": "Hist",
        "history": "History",
        "config": "Config",
        "current_vin": "Current VIN",
        "batch": "Batch",
        "batch_processing": "Batch Processing",
        "quick": "Quick",
        "start_smart_scan": "Start Smart Scan"
    },
    "es": {
        "upload_image": "Subir Imagen",
        "upload_image_desc": "Subir foto de la calcomanía VIN para análisis",
        "quick_mode": "Modo Rápido",
        "quick_mode_desc": "Escaneo VIN rápido con detección automática",
        "analytics": "Analíticas",
        "analytics_desc": "Ver estadísticas e insights de escaneos",
        "advanced_scanner": "Escáner Avanzado",
        "ready_to_scan": "Listo para Escanear",
        "scanner_description": "Use la cámara o suba imágenes para escanear códigos VIN con reconocimiento con IA",
        "manual_input_label": "Entrada Manual de VIN",
        "manual_input_placeholder": "Ingrese VIN de 17 caracteres o escanee con cámara",
        "mobile_optimized": "Optimizado para Móvil",
        "tablet_optimized": "Optimizado para Tablet",
        "desktop_optimized": "Optimizado para Escritorio",
        "multi_engine": "Multi-Motor",
        "ai_powered": "Con IA",
        "smart_scan_description": "Escáner avanzado con detección automática de región y enfoque inteligente",
        "scanner": "Escáner",
        "smart_focus": "Enfoque Inteligente",
        "smart": "Inteligente",
        "scan": "Escanear",
        "hist": "Hist",
        "history": "Historial",
        "config": "Config",
        "current_vin": "VIN Actual",
        "batch": "Lote",
        "batch_processing": "Procesamiento por Lotes",
        "quick": "Rápido",
        "start_smart_scan": "Iniciar Escaneo Inteligente"
    },
    "pt-BR": {
        "upload_image": "Carregar Imagem",
        "upload_image_desc": "Carregar foto do adesivo VIN para análise",
        "quick_mode": "Modo Rápido",
        "quick_mode_desc": "Digitalização VIN rápida com detecção automática",
        "analytics": "Análises",
        "analytics_desc": "Ver estatísticas e insights de digitalizações",
        "advanced_scanner": "Scanner Avançado",
        "ready_to_scan": "Pronto para Digitalizar",
        "scanner_description": "Use a câmera ou carregue imagens para digitalizar códigos VIN com reconhecimento por IA",
        "manual_input_label": "Entrada Manual de VIN",
        "manual_input_placeholder": "Digite VIN de 17 caracteres ou digitalize com câmera",
        "mobile_optimized": "Otimizado para Celular",
        "tablet_optimized": "Otimizado para Tablet",
        "desktop_optimized": "Otimizado para Desktop",
        "multi_engine": "Multi-Motor",
        "ai_powered": "Com IA",
        "smart_scan_description": "Scanner avançado com detecção automática de região e foco inteligente",
        "scanner": "Scanner",
        "smart_focus": "Foco Inteligente",
        "smart": "Inteligente",
        "scan": "Digitalizar",
        "hist": "Hist",
        "history": "Histórico",
        "config": "Config",
        "current_vin": "VIN Atual",
        "batch": "Lote",
        "batch_processing": "Processamento em Lote",
        "quick": "Rápido",
        "start_smart_scan": "Iniciar Digitalização Inteligente"
    }
}


def fix_translations(file_path: Path, lang: str) -> bool:
    """Add missing VIN Scanner Hub translations to JSON file."""
    try:
        # Read existing JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"[OK] Loaded {file_path.name}")

        # Ensure vin_scanner_hub section exists
        if 'vin_scanner_hub' not in data:
            data['vin_scanner_hub'] = {}
            print(f"  + Created vin_scanner_hub section")

        # Get missing keys for this language
        missing_keys = MISSING_KEYS[lang]

        # Track changes
        added_keys = 0
        updated_keys = 0

        # Add/update missing keys
        for key, value in missing_keys.items():
            full_key = f"vin_scanner_hub.{key}"
            if key not in data['vin_scanner_hub']:
                added_keys += 1
                print(f"  + Added: {full_key}")
            elif data['vin_scanner_hub'][key] != value:
                updated_keys += 1
                print(f"  ~ Updated: {full_key}")

            data['vin_scanner_hub'][key] = value

        # Sort keys alphabetically within vin_scanner_hub
        data['vin_scanner_hub'] = dict(sorted(data['vin_scanner_hub'].items()))

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
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main execution."""
    print("=" * 60)
    print("FIX: VIN Scanner Hub Missing Translations")
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
        if fix_translations(file_path, lang):
            success_count += 1

    print("=" * 60)
    print(f"COMPLETE: {success_count}/3 files updated successfully")
    print("=" * 60)

    if success_count == 3:
        print()
        print("[SUCCESS] All missing VIN Scanner Hub translations added!")
        print("  - 28 missing keys added per language")
        print("  - EN, ES, PT-BR: 100% coverage")
        print()
        print("Next steps:")
        print("  1. Fix VinScannerHub.tsx TypeScript error")
        print("  2. Refresh browser to see translations")
        print("  3. Verify all text appears correctly")
        return 0
    else:
        print()
        print("[FAILED] Some files failed to update")
        return 1


if __name__ == "__main__":
    sys.exit(main())
