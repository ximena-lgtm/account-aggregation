# Open Finance Colombia — AISP (Openbank)

App de demostración del caso de uso **AISP** (Account Information Service Provider) de Open Finance
Colombia (Decreto 368/2026), diseñada en Figma "Open Finance". Implementa el flujo de **solicitud de
crédito de Openbank** usando datos de **Bancolombia** y **Daviplata** via un Open Finance Hub.

Stack: **React + Vite** (frontend) · **Node + Express + SQLite** (backend) · **Minka Ledger v2** (consentimientos).

## Integración con Minka Ledger

Los consentimientos se registran en el **Minka Ledger** usando el schema `of-consent-v1` con cumplimiento del Decreto 368/2026:

- **Creación de anchors (pending)**: Al seleccionar bancos
- **Activación (active)**: Al autorizar con OTP
- **Proofs inmutables**: Cadena de eventos con tokens y estados
- **Compliance**: Propósito, tratamiento, comercialización, y pseudonimización de titular

## Las 8 pantallas
1. **Home** — Dashboard de Openbank
2. **Apply for Credit** — Explicación de las 3 fuentes de datos
3. **Bank Selector** — Directorio SFC, selección de entidades
4. **SCA (Bancolombia/Daviplata)** — Autenticación fuerte + OTP
5. **Consent Confirm (Bancolombia)** — Autorización de scopes
6. **Consent Confirm (Daviplata)** — Autorización de scopes
7. **Analizando perfil** — El Hub normaliza los datos
8. **Crédito Aprobado** — Decisión y condiciones financieras

## Puertos Fijos

- **Backend:** `http://localhost:4000`
- **Frontend:** `http://localhost:5174`

Los puertos están configurados con `strictPort: true` para asegurar consistencia.

## Cómo correr

**Opción 1: Iniciar todo desde la raíz (recomendado)**
```bash
# Instalar dependencias (solo primera vez)
npm install
npm run install:all

# Cargar datos de bancos (solo primera vez)
npm run seed

# Iniciar backend y frontend en paralelo
npm run dev
```

**Opción 2: Iniciar servicios por separado**

Backend:
```bash
cd backend
npm install
npm run seed     # carga el Directorio SFC (solo primera vez)
npm start        # http://localhost:4000
```

Frontend (en otra terminal):
```bash
cd frontend
npm install
npm run dev      # http://localhost:5174 (proxy /api -> :4000)
```

Abre http://localhost:5174 y recorre el flujo desde "Solicitar crédito".
El OTP de la pantalla SCA acepta cualquier código de 6 dígitos.

## API
- `GET  /api/banks` — Directorio SFC
- `POST /api/applications` — crea solicitud
- `POST /api/applications/:id/banks` — selecciona bancos (crea consentimientos)
- `GET  /api/consents/:id` — detalle del consentimiento
- `POST /api/consents/:id/authorize` — SCA + autoriza (body `{otp}`)
- `POST /api/consents/:id/deny` — niega
- `POST /api/applications/:id/evaluate` — evaluación y decisión
- `GET  /api/applications/:id` — estado completo
