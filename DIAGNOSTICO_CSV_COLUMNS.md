# 🔍 Diagnóstico: Columnas del CSV de Max Inventory

## ❗ Problema Detectado

El sistema está mostrando:
```
2023 BMW          ← Year + Make (FALTA MODEL)
xDrive30i         ← Trim
```

**Falta el campo `model` (X3)**

---

## 🎯 Causas Posibles

### 1. La columna se llama diferente en el CSV
Max Inventory puede usar nombres como:
- `Series` (para BMW X3, Mercedes C-Class, etc.)
- `Base Model`
- `Model`
- `Vehicle Model`

### 2. El mapeo no está detectando la columna correctamente

---

## 🔧 Solución: Ver los Logs del Upload

Cuando subes un CSV, el sistema imprime logs en la consola del navegador. Para verlos:

### Pasos:
1. Abre **DevTools** (F12 o Clic derecho → Inspeccionar)
2. Ve a la pestaña **Console**
3. Sube un archivo CSV
4. Busca estos mensajes:

```javascript
📋 Preview for filename.csv: {
  separator: "\t",
  columns: 45,
  rows: 123
}

📊 Parse results: {
  separator: "\t",
  headers: 45,
  rows: 123,
  detectedColumns: {
    "year": "Year",
    "make": "Make",
    // ← BUSCA SI APARECE "model" AQUÍ
    "trim": "Trim",
    "stock_number": "Stock Number",
    "vin": "VIN"
  }
}
```

---

## 📝 ¿Qué Necesito Saber?

**Copia y pégame esta información de los logs:**

1. ¿Qué dice en `detectedColumns`?
2. ¿Aparece `"model"` en la lista?
3. Si NO aparece, ¿cuáles son TODAS las columnas detectadas?

---

## 🔍 Alternativa: Ver las Primeras Líneas del CSV

Si tienes acceso al archivo CSV, mira la primera línea (headers):

**Ejemplo de lo que busco:**
```csv
Stock Number,VIN,Year,Make,Model,Trim,Price,...
# O tal vez:
Stock #,VIN,Year,Manufacturer,Series,Style,Price,...
```

---

## ✅ Variaciones que YA Detectamos

He añadido estas variaciones al mapeo:

**Para `model`:**
- `model`
- `modelo`
- `vehicle model`
- `model name`
- `series` ← NUEVO (para BMW, Mercedes, etc.)
- `base model` ← NUEVO

**Para `trim`:**
- `trim`
- `trim level`
- `trim_level`
- `variant`
- `style` ← NUEVO
- `trim style` ← NUEVO

---

## 🚀 Próximo Paso

**Una vez que me des la información de los logs, podré:**
1. Añadir el nombre exacto de la columna al mapeo
2. O diagnosticar si hay otro problema

**Por favor:**
1. Sube un CSV
2. Abre la Consola (F12)
3. Copia y pega los logs que aparecen con `📊 Parse results:`
