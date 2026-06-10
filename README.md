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
- **Storage en memoria**: Los datos del demo (aplicaciones, consentimientos) se almacenan en memoria. Los consentimientos importantes están seguros en Minka Ledger.

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

## Deploy a Vercel

### Requisitos
- Cuenta de [Vercel](https://vercel.com)
- Credenciales de Minka Ledger (SIGNER_PUBLIC y SIGNER_SECRET)

### Pasos

1. **Fork o clona este repositorio**

2. **Conecta con Vercel**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

3. **Configura las variables de entorno en Vercel**

   En el dashboard de Vercel, ve a Settings → Environment Variables y agrega:

   ```
   LEDGER_URL=https://open-finance-1.ldg-dev.one/api/v2
   SIGNER_PUBLIC=tu_clave_publica
   SIGNER_SECRET=tu_clave_secreta
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Nota sobre Storage

Esta aplicación usa **storage en memoria** para el demo. Los datos se reinician en cada deploy, pero los **consentimientos importantes están permanentemente en Minka Ledger**.

## API
- `GET  /api/banks` — Directorio SFC
- `POST /api/applications` — crea solicitud
- `POST /api/applications/:id/banks` — selecciona bancos (crea consentimientos)
- `GET  /api/consents/:id` — detalle del consentimiento
- `POST /api/consents/:id/authorize` — SCA + autoriza (body `{otp}`)
- `POST /api/consents/:id/deny` — niega
- `POST /api/applications/:id/evaluate` — evaluación y decisión
- `GET  /api/applications/:id` — estado completo
