# PHOS frontend ↔ backend contract (initial)

Backend base URL (dev): `http://localhost:4000/api/v1`  
Source of truth: NestJS controllers + Swagger at `/api/docs`.

## Auth (B2)

### POST /auth/login

**Public.** Throttled.

Request:

```json
{ "email": "string", "password": "string (min 8)" }
```

Response:

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": { "id": "uuid", "email": "string", "role": "Role enum" }
}
```

Also sets httpOnly cookie `phos_refresh` (path `/api/v1/auth`).

Errors: `401 Invalid credentials`

### POST /auth/refresh

**Public.**

Request:

```json
{ "refreshToken": "string" }
```

Response: same shape as login.

### POST /auth/logout

**Bearer required.**

Request:

```json
{ "refreshToken": "string" }
```

Response: `204 No Content`

## Users (B3)

### GET /users/me

**Bearer required.**

Response: user profile (`id`, `email`, `phone`, `firstName`, `lastName`, `role`, `status`, `departmentId`, timestamps).

## Role enum

`CEO`, `ADMIN`, `DOCTOR`, `NURSE`, `LAB_TECH`, `LAB_SUPERVISOR`, `PHARMACIST`, `STOREKEEPER`, `RECEPTIONIST`, `CASHIER`, `REPORTING_OFFICER`, `IT_ADMIN`

## Error envelope

```json
{
  "statusCode": 400,
  "error": "optional string",
  "details": { "message": "string | string[]" },
  "path": "/api/v1/...",
  "timestamp": "ISO-8601"
}
```

## Facilities (B4)

### GET /facilities

Response: `Facility[]`

### GET /departments?facilityId=

Response: `Department[]`

## Patients (B5)

### GET /patients?search=&page=&limit=

Response:

```json
{ "items": [], "total": 0, "page": 1, "limit": 20 }
```

### POST /patients

Roles: `CEO`, `ADMIN`, `RECEPTIONIST`

Request: `CreatePatientDto` fields (see backend).  
Conflict `409`: `{ details: { message, matches: [...] } }`

### GET /patients/:id

Response: patient + `encounters[]` (recent).

## Notifications (B17)

### GET /notifications?unreadOnly=true

Response: `Notification[]` (max 100, newest first).

### PATCH /notifications/:id/read

Marks one notification read for the current user.

### PATCH /notifications/read-all

Marks all unread notifications read.

Fields: `id`, `type` (`NotificationType` enum), `title`, `message`, `entityType`, `entityId`, `readAt`, `createdAt`.

Realtime: Socket.IO is not exposed yet; frontend polls and invalidates TanStack Query caches.

## Users admin (B3)

Roles `CEO`, `ADMIN`, `IT_ADMIN`:

- `GET /users?search=`
- `POST /users` — `CreateUserDto`
- `GET /users/:id`
- `PATCH /users/:id` — `UpdateUserDto`
- `PATCH /users/:id/status` — `{ status: UserStatus }`

## Facilities admin (B4)

Write roles `CEO`, `ADMIN`:

- `POST /facilities`, `POST /departments`, `POST /services`
- `PATCH /departments/:id/status`, `PATCH /services/:id/status` — `{ active: boolean }`

## Audit

Audit rows are written server-side only; no read API yet.

## Reports

No dedicated reporting module; `/reports` aggregates permitted list endpoints (patients total, encounters, lab, Rx, inventory).

---

*Backend code wins on conflict.*
