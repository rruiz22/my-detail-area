# 🚀 Desplegar Edge Function: send-invitation-email

## Problema Actual
La función `send-invitation-email` necesita ser actualizada con el dominio verificado `mydetailarea.com`.

## Solución: Despliegue Manual via Dashboard

### Pasos para Desplegar:

1. **Abre Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
   - Inicia sesión si es necesario

2. **Navega a Edge Functions**
   - En el menú lateral izquierdo, haz clic en **Edge Functions**
   - Busca la función llamada `send-invitation-email`

3. **Edita la Función**
   - Haz clic en el nombre de la función `send-invitation-email`
   - Haz clic en el botón **Edit Function** o el ícono de edición ✏️

4. **Actualiza el Código**
   - Borra todo el contenido actual del editor
   - Copia TODO el contenido del archivo:
     ```
     supabase/functions/send-invitation-email/index.ts
     ```
   - Pégalo en el editor del Dashboard

5. **Verifica el Dominio**
   - Busca la línea 17 en el código pegado:
   ```typescript
   EMAIL_DOMAIN: 'invitations@mydetailarea.com', // Updated to verified domain
   ```
   - Asegúrate de que diga `mydetailarea.com` (NO `dealerdetailservice.com`)

6. **Guarda y Despliega**
   - Haz clic en el botón **Save** o **Deploy** (según la interfaz)
   - Espera a que aparezca la confirmación de despliegue exitoso

7. **Verifica Variables de Entorno**
   - En la misma página de Edge Functions, ve a la pestaña **Settings** o **Environment Variables**
   - Verifica que exista la variable: `RESEND_API_KEY`
   - Si no existe, agrégala con tu API key de Resend

## Verificación Post-Despliegue

Después de desplegar, prueba lo siguiente:

1. Ve a: http://localhost:8080/dealers/5?tab=invitations
2. Intenta **reenviar** una invitación existente
3. O crea una **nueva invitación**
4. Deberías ver el mensaje: "Invitation email sent successfully" ✅

## Verificación en Resend Dashboard

1. Ve a: https://resend.com/emails
2. Verifica que los emails estén siendo enviados
3. Formato esperado del remitente: `Bmw of Sudbury <invitations@mydetailarea.com>`

## Alternativa: Despliegue via CLI (Avanzado)

Si prefieres usar CLI:

### Requisitos:
1. **Docker Desktop** debe estar corriendo
2. **Autenticación de Supabase CLI**:
   ```bash
   npx supabase login
   ```

### Comando de Despliegue:
```bash
npx supabase functions deploy send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr
```

## Troubleshooting

### Error: "Invalid access token"
- Necesitas autenticarte primero: `npx supabase login`

### Error: "Docker is not running"
- Inicia Docker Desktop antes de ejecutar el comando

### Error: "Failed to send email" después del despliegue
- Verifica que `mydetailarea.com` esté completamente verificado en Resend
- Verifica los registros DNS: SPF, DKIM, DMARC
- Revisa los logs de la Edge Function en Supabase Dashboard

### Error: "RESEND_API_KEY not configured"
- Agrega la variable de entorno en Supabase Dashboard
- Ve a: Edge Functions → send-invitation-email → Settings → Environment Variables

## Contacto

Si tienes problemas con el despliegue, puedes:
1. Revisar los logs en: Supabase Dashboard → Edge Functions → send-invitation-email → Logs
2. Verificar el estado del dominio en: https://resend.com/domains
3. Consultar la documentación de Resend: https://resend.com/docs

---
**Última actualización**: 2025-10-20
**Dominio verificado**: mydetailarea.com
**Función**: send-invitation-email
