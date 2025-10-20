#!/bin/bash

# Configuración de Secrets para FCM API v1
# Ejecutar después de hacer login: supabase login

echo "Configurando Firebase Service Account secrets..."

# 1. Project ID
supabase secrets set FIREBASE_PROJECT_ID=my-detail-area

# 2. Client Email
supabase secrets set FIREBASE_CLIENT_EMAIL="my-detail-area-push@my-detail-area.iam.gserviceaccount.com"

# 3. Private Key (completa con \n literales)
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2Buxba30KkhbW
pH4EqIfZZjM/uPiGJlMv5/NdREZ0UE9KkY1LDllELa7ytAMj43XYIFMeca40FcNA
BJQTsWW5Cnjm9mYErxHRGOHNmccjtcG43aN6O+wJylZrI2E+do1MSOgXoj+tK779
1hEWxd9xqcm9tMEdI7IcUgPOhwIuVLCtALOXaULBKePDTiVSAZBq4v8bs5VUogyU
Yx26OuY2Q4+SBv4jsKZ7ZBzAQBxxCn6zcmIg+Je+jCUophmBEzPV/j2cf01eYRZ4
f9RfF2T+nOeZJgMsHqLW23vvHBgucaVE9omi1QVhHE+BfWhX3vg+bZbPeVxRl/Sp
O8Bi3W3xAgMBAAECggEAKp+AZP/Mbdc7hdNKtuiHtv5ZbchwWWlL/WHA+Mvt+3p6
tqlSforDmFViK+6+9X5jr9IR5IUWF5go+iqYSew2N5geK2bzCJG+CEpdRXmGyfPb
guBTUWIKqVg52CiWsrur5nsD7dTOOEyQEnw30C9RXRo25TcYKSycnkkOHyQ5/ILu
zM8rkEbUf9ornmGNoelm9dsfka8tKLWctmOPJhO3hfS1RrhmSBQwLsA1GiCE+8HQ
XMFXRrErkXWAQWC/gtGCqwUl+o6i5z7hJuySQ20PuSfb7Va98Izco5tYaaXbgRz/
RSRD/DC57R1+Bgw2cIpeiDZCb0YNCL0VchM7i+RC4QKBgQDrIdknO+IMnOSpg9fB
V5+uPmbJYNPjIsQZ+OpU5kwVZMogl6XP+8ae2eTd1OYZW7UMAGI9NJ7tGQk3ZGnd
pJ1ZAMUeOzH8yAUF4OXGok/0LBAK1wqThj/omD8/68sPlXndc4AMUO5dAA3Hjmrl
6Z11WJPu0e7ylk4TFncflncYHQKBgQDGLomIB4uJLDMnOKuJ6+spJpydnHeNw3QY
G68kSLEIX9VllDmpMYPdnDgVV7CjoAN4qX4cUJnSGvej0V0mJgszEjcSGzHMeAkd
rI8Oo2aIgdEjzZK5Og7zn1UApGzwl8IomqdqVA7K2LV213F0XzqNw8XLQ38Qb+Jz
UfbhVqmM5QKBgEZcI5n87mCt1jLvk/F0IgFHBQT/p4gRUDMhbCWpoFzKgz2Lg3+g
LMg+FaFX4t71tVB5EOyVwXTbiAl+T7uWVctbUqEAP64PwIkIyllNGrXLNaW4wZ5x
jtAwNsUO7v2j0gq1VDzbPuivanArqstPw+FodyQAyArpdUV69HyMTuj1AoGBALbj
u4gNbnfokkxfv+5ICXywZVgOTUZGWZzl73tMmhNgXU6gu5WoXEjnIdqQUjKuOIXh
5L+8ojeDK4XCcHQEJ9G5vZi3//zxyXfZByw7HyRaqOahkAXfzmyFXax6EQ72/fb6
wgUeDYik9NH3gHwkZaTuRlqOr3Q7zH8f5PWPRGkBAoGAKhJFNdkM1WLV0P+Z5/VH
Yj0qPAdbgozeUCEempg1b/eporyEhWGP5ak9DKzzJDawZbHkB5+lFdbDkPdzTQvn
TziUn6sYDHACSSAfrJOTmNdMKTw1qJte2BxulInoSPm6ls6KzboogLtGBjHGMnZp
olLhyNMjjo+WEEUZESDdX24=
-----END PRIVATE KEY-----
"

echo "✅ Secrets configurados"
echo ""
echo "Ahora despliega la función:"
echo "  supabase functions deploy push-notification-fcm"
