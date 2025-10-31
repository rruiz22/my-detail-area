# Notification Delivery Logging - Architecture Diagrams

## System Overview

```mermaid
graph TB
    subgraph "Application Layer"
        A[React Frontend] --> B[Send Notification Request]
    end

    subgraph "Edge Functions Layer"
        B --> C{Channel Router}
        C -->|Push| D[send-notification]
        C -->|Email| E[send-invitation-email]
        C -->|SMS| F[send-sms]
        C -->|In-App| G[notification-engine]
    end

    subgraph "Logging Layer"
        D --> H[NotificationLogger]
        E --> H
        F --> H
        G --> H
        H -->|logDelivery| I[(notification_delivery_log)]
        H -->|updateStatus| I
    end

    subgraph "Provider Layer"
        D --> J[Firebase FCM]
        E --> K[Resend API]
        F --> L[Twilio API]
        G --> M[Supabase DB]
    end

    subgraph "Webhook Layer"
        J -.webhook.-> N[process-notification-webhook]
        K -.webhook.-> N
        L -.webhook.-> N
        N --> H
    end

    subgraph "Retry Layer"
        O[Cron Scheduler] -->|Hourly| P[retry-failed-notifications]
        I -.query failed.-> P
        P --> H
        P --> D
        P --> E
        P --> F
    end

    style H fill:#10b981
    style I fill:#6366f1
    style N fill:#f59e0b
    style P fill:#ef4444
```

## Notification Flow Sequence

```mermaid
sequenceDiagram
    participant App as Application
    participant EF as Edge Function
    participant Logger as NotificationLogger
    participant DB as Database
    participant Provider as FCM/Resend/Twilio
    participant Webhook as Webhook Handler

    App->>EF: Send notification request
    activate EF

    Note over EF,Logger: Pre-send Logging
    EF->>Logger: logDelivery(pending)
    Logger->>DB: INSERT delivery_log
    DB-->>Logger: log_id

    Note over EF,Provider: Send to Provider
    EF->>Provider: Send notification
    Provider-->>EF: Response (success/error)

    alt Success
        EF->>Logger: updateStatus(sent)
        Logger->>DB: UPDATE status=sent
        Note over Provider,Webhook: Async Webhook Events
        Provider->>Webhook: delivery_event
        Webhook->>Logger: updateStatus(delivered)
        Logger->>DB: UPDATE status=delivered
    else Failure
        EF->>Logger: updateStatus(failed)
        Logger->>DB: UPDATE status=failed
        Note over DB: Retry Logic Activates
    end

    EF-->>App: Response
    deactivate EF
```

## Retry System Flow

```mermaid
stateDiagram-v2
    [*] --> Pending: Notification Created

    Pending --> Sent: Provider API Success
    Pending --> Failed: Provider API Error

    Sent --> Delivered: Webhook Confirmation
    Sent --> Failed: Webhook Error

    Delivered --> Clicked: User Action
    Delivered --> Read: User Action (In-App)

    Failed --> Retry1: After 1 hour
    Retry1 --> Sent: Success
    Retry1 --> Retry2: Failed (After 4h)
    Retry2 --> Sent: Success
    Retry2 --> Retry3: Failed (After 12h)
    Retry3 --> Sent: Success
    Retry3 --> PermanentFailure: Failed (Max retries)

    Clicked --> [*]
    Read --> [*]
    PermanentFailure --> [*]

    note right of Retry1
        Exponential Backoff
        1h → 4h → 12h
    end note
```

## Database Schema Relationships

```mermaid
erDiagram
    NOTIFICATION_DELIVERY_LOG {
        uuid id PK
        text dealership_id FK
        text notification_id
        text user_id FK
        text channel
        text status
        timestamptz created_at
        timestamptz sent_at
        timestamptz delivered_at
        timestamptz clicked_at
        timestamptz read_at
        timestamptz failed_at
        text provider
        text provider_message_id
        jsonb provider_response
        integer latency_ms
        integer retry_count
        text error_message
        text error_code
        jsonb error_details
        text notification_title
        text notification_body
        text device_type
        text platform
        jsonb metadata
    }

    DEALERSHIPS {
        bigint id PK
        text name
    }

    PROFILES {
        uuid id PK
        text email
        text phone
    }

    NOTIFICATION_LOG {
        uuid id PK
        uuid user_id FK
        bigint dealer_id FK
        text title
        text message
        text type
        text status
    }

    NOTIFICATION_DELIVERY_LOG ||--o{ DEALERSHIPS : "belongs_to"
    NOTIFICATION_DELIVERY_LOG ||--o{ PROFILES : "sent_to"
    NOTIFICATION_LOG ||--o{ NOTIFICATION_DELIVERY_LOG : "references"
```

## Webhook Processing Flow

```mermaid
flowchart TD
    A[Webhook Received] --> B{Verify Signature}
    B -->|Invalid| C[401 Unauthorized]
    B -->|Valid| D{Parse Provider}

    D -->|FCM| E[Process FCM Event]
    D -->|OneSignal| F[Process OneSignal Event]
    D -->|Twilio| G[Process Twilio Event]
    D -->|Resend| H[Process Resend Event]
    D -->|Unknown| I[400 Bad Request]

    E --> J{Event Type}
    F --> J
    G --> J
    H --> J

    J -->|delivered| K[Update: delivered]
    J -->|clicked| L[Update: clicked]
    J -->|failed| M[Update: failed]
    J -->|bounced| N[Update: bounced]
    J -->|opened| O[Update: read]

    K --> P[Find by provider_message_id]
    L --> P
    M --> P
    N --> P
    O --> P

    P --> Q{Log Found?}
    Q -->|Yes| R[Update Status]
    Q -->|No| S[Log Warning]

    R --> T[200 OK Response]
    S --> T
    C --> U[End]
    I --> U
    T --> U

    style B fill:#f59e0b
    style P fill:#6366f1
    style R fill:#10b981
    style S fill:#ef4444
```

## Component Architecture

```mermaid
graph LR
    subgraph "Helper Module"
        A[NotificationLogger Class]
        A --> B[logDelivery]
        A --> C[updateStatus]
        A --> D[updateStatusByProviderId]
        A --> E[logBulkDelivery]
        A --> F[bulkUpdateStatus]
        A --> G[getFailedDeliveries]
    end

    subgraph "Edge Functions"
        H[send-notification]
        I[process-notification-webhook]
        J[retry-failed-notifications]
    end

    subgraph "Database"
        K[(notification_delivery_log)]
        L[(edge_function_logs)]
    end

    B --> K
    C --> K
    D --> K
    E --> K
    F --> K
    G --> K

    H --> A
    I --> A
    J --> A

    H --> L
    I --> L
    J --> L

    style A fill:#10b981
    style K fill:#6366f1
```

## Status Lifecycle

```mermaid
graph LR
    A[pending] --> B[sent]
    B --> C[delivered]
    C --> D[clicked]
    C --> E[read]

    A --> F[failed]
    B --> F

    F --> G{Retry Count < 3}
    G -->|Yes| H[Retry After Backoff]
    G -->|No| I[Permanent Failure]

    H --> A

    D --> J((End))
    E --> J
    I --> J

    style A fill:#fbbf24
    style B fill:#60a5fa
    style C fill:#34d399
    style D fill:#10b981
    style E fill:#10b981
    style F fill:#ef4444
    style I fill:#991b1b
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        A[Local Supabase] --> B[Edge Functions Dev]
        B --> C[PostgreSQL Dev]
    end

    subgraph "CI/CD"
        D[GitHub Actions] --> E[Run Tests]
        E --> F[Deploy to Staging]
        F --> G[Integration Tests]
        G --> H{Tests Pass?}
        H -->|Yes| I[Deploy to Production]
        H -->|No| J[Rollback]
    end

    subgraph "Production"
        I --> K[Supabase Cloud]
        K --> L[Edge Functions]
        K --> M[PostgreSQL RDS]
        K --> N[Cron Jobs]

        L --> O[Load Balancer]
        O --> P[CDN]

        N --> Q[retry-failed-notifications]
        Q -->|Hourly| L
    end

    subgraph "Monitoring"
        R[Supabase Dashboard]
        S[Custom Analytics]
        T[Error Tracking]

        M --> R
        L --> S
        L --> T
    end

    A --> D

    style I fill:#10b981
    style K fill:#6366f1
    style Q fill:#f59e0b
```

## Data Flow: Single Notification

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend
    participant API as Edge Function
    participant L as Logger
    participant DB as Database
    participant P as Provider (FCM)
    participant W as Webhook

    U->>F: Trigger notification (e.g., order update)
    F->>API: POST /functions/v1/send-notification

    Note over API,L: Phase 1: Pre-send Logging
    API->>L: logDelivery(pending)
    L->>DB: INSERT delivery_log
    DB-->>L: {id: "abc-123"}
    L-->>API: log_id

    Note over API,P: Phase 2: Provider Delivery
    API->>P: POST /v1/projects/x/messages:send
    P-->>API: {name: "fcm-msg-456"}

    API->>L: updateStatus(sent)
    L->>DB: UPDATE status=sent, provider_message_id=fcm-msg-456

    API-->>F: {success: true, sent: 1}
    F-->>U: Notification sent confirmation

    Note over P,W: Phase 3: Async Webhook (Minutes Later)
    P->>W: POST /process-notification-webhook
    Note right of P: Event: delivered
    W->>L: updateStatusByProviderId(fcm-msg-456, delivered)
    L->>DB: UPDATE status=delivered, delivered_at=NOW()
    W-->>P: 200 OK

    Note over U: Phase 4: User Interaction
    U->>U: Click notification
    U->>F: Open app via deep link
    F->>W: POST /process-notification-webhook
    Note right of F: Event: clicked
    W->>L: updateStatusByProviderId(fcm-msg-456, clicked)
    L->>DB: UPDATE status=clicked, clicked_at=NOW()
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Notification Request] --> B[Create Log: pending]
    B --> C{Send to Provider}

    C -->|Network Error| D[Exception Caught]
    C -->|API Error 4xx| E[Client Error]
    C -->|API Error 5xx| F[Server Error]
    C -->|Success| G[Update: sent]

    D --> H{Retry Count < 3?}
    E --> I{Permanent Error?}
    F --> H

    I -->|Yes: UNREGISTERED| J[Update: failed<br/>Mark token invalid]
    I -->|No: Transient| H

    H -->|Yes| K[Schedule Retry<br/>Backoff: 1h/4h/12h]
    H -->|No| L[Update: permanent_failure]

    K --> M[retry-failed-notifications<br/>Cron Job]
    M --> A

    G --> N[Webhook Updates]
    N --> O{Event Type}
    O -->|delivered| P[Update: delivered]
    O -->|failed| Q[Update: failed]
    O -->|clicked| R[Update: clicked]

    J --> S((End))
    L --> S
    P --> S
    Q --> T{Auto-retry?}
    T -->|Yes| K
    T -->|No| S
    R --> S

    style D fill:#ef4444
    style E fill:#f59e0b
    style F fill:#ef4444
    style J fill:#991b1b
    style K fill:#fbbf24
    style M fill:#6366f1
```

## Analytics & Monitoring

```mermaid
graph TB
    subgraph "Data Sources"
        A[(notification_delivery_log)]
        B[(edge_function_logs)]
        C[(notification_analytics)]
    end

    subgraph "Real-time Queries"
        D[Success Rate by Channel]
        E[Average Latency by Provider]
        F[Failed Deliveries]
        G[Retry Effectiveness]
        H[Top Error Codes]
    end

    subgraph "Dashboards"
        I[Supabase Dashboard]
        J[Custom React Dashboard]
        K[Analytics API]
    end

    subgraph "Alerts"
        L[High Failure Rate]
        M[Slow Provider Response]
        N[Stuck Notifications]
    end

    A --> D
    A --> E
    A --> F
    A --> G
    A --> H

    B --> I
    C --> I

    D --> J
    E --> J
    F --> J
    G --> J
    H --> J

    J --> K

    F --> L
    E --> M
    F --> N

    style A fill:#6366f1
    style J fill:#10b981
    style L fill:#ef4444
    style M fill:#f59e0b
    style N fill:#ef4444
```

## Security Architecture

```mermaid
graph TB
    subgraph "External Requests"
        A[Provider Webhook] --> B{Signature Check}
        C[Client Request] --> D{Auth Check}
    end

    subgraph "Verification Layer"
        B -->|Valid| E[Process Webhook]
        B -->|Invalid| F[401 Unauthorized]
        D -->|Valid JWT| G[Edge Function]
        D -->|Invalid| H[401 Unauthorized]
    end

    subgraph "Authorization Layer"
        E --> I{Provider Match?}
        G --> J{RLS Check}

        I -->|Yes| K[Update Delivery Log]
        I -->|No| L[403 Forbidden]

        J -->|Pass| M[Access Granted]
        J -->|Fail| N[403 Forbidden]
    end

    subgraph "Data Layer"
        K --> O[(Database)]
        M --> O

        O --> P[RLS Policies]
        P --> Q[Dealership Scoped]
        P --> R[User Scoped]
        P --> S[Service Role Access]
    end

    style B fill:#f59e0b
    style D fill:#f59e0b
    style F fill:#ef4444
    style H fill:#ef4444
    style L fill:#ef4444
    style N fill:#ef4444
    style P fill:#10b981
```

---

## Legend

### Colors
- 🟢 **Green** - Success states, active components
- 🔵 **Blue** - Database, data storage
- 🟡 **Yellow** - Warning states, retry logic
- 🔴 **Red** - Error states, failures
- 🟠 **Orange** - Processing, webhooks

### Symbols
- `→` Synchronous call
- `-.->` Asynchronous webhook
- `-->` Data flow
- `{}` Decision point
- `||--o{` One-to-many relationship
- `((End))` Terminal state

---

**Generated:** 2025-01-15
**Version:** 1.0.0
**Format:** Mermaid Diagrams (GitHub compatible)
