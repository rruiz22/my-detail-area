# 📋 Configuración de Google Sheets API

## Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con la siguiente configuración:

```env
# URL de tu Google Apps Script Web App
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec

# Configuración opcional de actualización automática (en milisegundos)
VITE_AUTO_REFRESH_INTERVAL=300000
```

### 2. Google Apps Script Setup

Tu Google Apps Script debe devolver datos en uno de estos formatos:

**Formato 1: Array de objetos**
```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const result = rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**Formato 2: Objeto con array de valores**
```javascript
function doGet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const values = sheet.getDataRange().getValues();

  return ContentService
    .createTextOutput(JSON.stringify({ values: values }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 3. Campos Esperados en Google Sheets

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| VIN | Número VIN del vehículo | `1HGBH41JXMN109186` |
| Marca/Make | Marca del vehículo | `Honda` |
| Modelo/Model | Modelo del vehículo | `Civic` |
| Año/Year | Año del vehículo | `2023` |
| Stock | Número de stock | `A-001` |
| Categoria/Category | Categoría de recon | `Mechanical` |
| Grado/Grade | Grado de condición | `Good` |
| Costo/Cost | Costo estimado | `1500` |
| Prioridad/Priority | Prioridad del trabajo | `Normal` |
| Fecha Entrega/Due Date | Fecha de entrega | `2024-01-15` |
| Notas/Notes | Observaciones | `Cambiar aceite` |

## Uso de la Página Pública

### Acceso
- URL: `http://localhost:8080/public/recon-data`
- No requiere autenticación

### Funcionalidades

✅ **Visualización de datos**: Tabla responsiva con todos los datos del Google Sheet
✅ **Búsqueda en tiempo real**: Filtra por cualquier campo
✅ **Selección múltiple**: Checkboxes para seleccionar filas
✅ **Estadísticas**: Resumen de registros, costos, etc.
✅ **Exportar CSV**: Descarga los datos filtrados
✅ **Conversión a órdenes**: Convierte filas seleccionadas a órdenes de recon
✅ **Actualización automática**: Refresca datos cada 5 minutos
✅ **Responsive**: Funciona en móviles y tablets

### Workflow de Conversión

1. Los datos se cargan automáticamente desde Google Sheets
2. Filtra o busca los registros que necesitas
3. Selecciona las filas que quieres convertir (checkboxes)
4. Presiona "Crear Órdenes (X)" donde X es el número seleccionado
5. Las órdenes se crean automáticamente en tu sistema de recon
6. Se generan números de orden únicos (RC-XXX)
7. Los datos se guardan en la tabla `recon_orders`

## Troubleshooting

### Error de CORS
Si tienes errores de CORS, asegúrate de que tu Google Apps Script tenga:
```javascript
function doGet() {
  // Tu código aquí...

  const output = ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);

  // Agregar headers CORS si es necesario
  output.setHeaders({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  });

  return output;
}
```

### Sin datos
1. Verifica que la URL en `.env.local` sea correcta
2. Confirma que el Google Apps Script esté publicado como Web App
3. Verifica que los permisos estén configurados correctamente
4. Revisa la consola del navegador para errores específicos

### Formato de datos incorrecto
El servicio puede manejar diferentes formatos, pero si tienes problemas:
1. Verifica que las columnas tengan nombres consistentes
2. Revisa que las fechas estén en formato válido
3. Confirma que los números no tengan caracteres especiales innecesarios

## Ejemplo de Google Sheet

| VIN | Marca | Modelo | Año | Stock | Categoria | Grado | Costo | Prioridad | Fecha Entrega | Notas |
|-----|-------|--------|-----|--------|-----------|-------|--------|-----------|---------------|--------|
| 1HGBH41JXMN109186 | Honda | Civic | 2023 | A-001 | Mechanical | Good | 1500 | Normal | 2024-01-15 | Cambiar aceite |
| 2T1BURHE8FC123456 | Toyota | Corolla | 2022 | B-002 | Body | Excellent | 2500 | High | 2024-01-10 | Reparar puerta |

## Soporte

Si tienes problemas con la configuración, verifica:
- La URL de Google Apps Script
- Los permisos de acceso
- El formato de datos
- Las variables de entorno
